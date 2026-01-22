// lambda/investors/approve-kyc/index.ts

import { UpdateCommand, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "@shared/db/client";
import { Logger } from "@shared/utils/logger";
import { validateRequired } from "@shared/utils/validators";
import {
  UnauthorizedError,
  NotFoundError,
  ValidationError,
} from "@shared/utils/errors";
import { MetricsService } from "@shared/utils/metrics";
import type { AppSyncEvent } from "../../shared/types";
import {
  CognitoIdentityProviderClient,
  AdminAddUserToGroupCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { v4 as uuidv4 } from "uuid";
import { PermissionChecker } from "@shared/utils/permissions";

const logger = new Logger("ApproveKYC");
const cognitoClient = new CognitoIdentityProviderClient({});
const sesClient = new SESClient({});

export const handler = async (event: AppSyncEvent) => {
  logger.info("Approving KYC", { event });

  try {
    const investorId: string = event.arguments.investorId;
    const notes: string | undefined = event.arguments.notes;

    validateRequired(investorId, "investorId");

    const isCompliance = PermissionChecker.isCompliance(event);

    if (!isCompliance) {
      throw new UnauthorizedError(
        "Only admins or compliance officers can approve KYC",
      );
    }

    const approvedBy =
      PermissionChecker.getUserEmail(event) ||
      PermissionChecker.getUserId(event) || "system";
    const approverName = event.identity?.claims?.name || approvedBy;

    // Get current investor version
    const getResult = await docClient.send(
      new GetCommand({
        TableName: process.env.INVESTORS_TABLE!,
        Key: { id: investorId, version: "CURRENT" }, // Adjust based on your table structure
      }),
    );

    if (!getResult.Item) {
      throw new NotFoundError("Investor not found");
    }

    const investor = getResult.Item;

    // 📊 LOG METRICS: Approval + Processing Time
    const verificationMethod =
      investor.identityVerification?.verificationMethod || "MANUAL";

    await MetricsService.logKYCDecision("APPROVED", verificationMethod);

    // Log processing time
    if (investor.identityVerification?.submittedAt) {
      await MetricsService.logKYCProcessingTime(
        investor.identityVerification.submittedAt,
        new Date().toISOString(),
        verificationMethod,
      );
    }
    // Validate investor has submitted required documents
    if (!investor.identityVerification) {
      throw new ValidationError(
        "Investor has not submitted identity documents",
      );
    }

    if (!investor.proofOfAddress) {
      throw new ValidationError("Investor has not submitted proof of address");
    }

    const now = new Date().toISOString();
    const kycExpiryDate = new Date();
    kycExpiryDate.setFullYear(kycExpiryDate.getFullYear() + 1); // KYC valid for 1 year

    // Update investor KYC status (create new version)
    const newVersion = {
      ...investor,
      version: (investor.version || 0) + 1,
      kycStatus: "APPROVED",
      kycVerifiedDate: now,
      kycExpiryDate: kycExpiryDate.toISOString(),
      accountStatus: "ACTIVE",
      verificationLevel: "FULLY_VERIFIED",
      updatedAt: now,
      updatedBy: approvedBy,
      changeReason: `KYC approved by ${approverName}. ${notes || ""}`,
      changedFields: ["kycStatus", "accountStatus", "verificationLevel"],
      identityVerification: {
        ...investor.identityVerification,
        verifiedBy: approvedBy,
        verifiedDate: now,
      },
      proofOfAddress: {
        ...investor.proofOfAddress,
        verifiedBy: approvedBy,
        verifiedDate: now,
      },
    };

    // Mark old version as historical
    await docClient.send(
      new UpdateCommand({
        TableName: process.env.INVESTORS_TABLE!,
        Key: { id: investorId, version: investor.version },
        UpdateExpression: "SET isCurrent = :historical",
        ExpressionAttributeValues: {
          ":historical": "HISTORICAL",
        },
      }),
    );

    // Insert new version
    await docClient.send(
      new PutCommand({
        TableName: process.env.INVESTORS_TABLE!,
        Item: newVersion,
      }),
    );

    logger.info("KYC approved successfully", {
      investorId,
      approvedBy,
    });

    // 1. Upgrade Cognito user group to "VerifiedInvestors"
    try {
      await cognitoClient.send(
        new AdminAddUserToGroupCommand({
          UserPoolId: process.env.USER_POOL_ID!,
          Username: investor.email,
          GroupName: "VerifiedInvestors",
        }),
      );
      logger.info("User added to VerifiedInvestors group");
    } catch (cognitoError) {
      logger.error("Error updating Cognito group", cognitoError);
      // Don't fail the whole operation
    }

    // 2. Send notification to investor
    await sendKYCApprovedNotification(investor);

    // 3. Create audit log entry
    await createAuditLog({
      investorId,
      action: "KYC_APPROVED",
      performedBy: approvedBy,
      performerName: approverName,
      details: notes,
    });

    // 4. Send welcome email
    await sendWelcomeEmail(investor);

    return newVersion;
  } catch (error) {
    logger.error("Error approving KYC", error);
    throw error;
  }
};

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * 1. Send in-app notification to investor
 */
async function sendKYCApprovedNotification(investor: any) {
  logger.info("Sending KYC approved notification", { investorId: investor.id });

  try {
    const notification = {
      id: uuidv4(),
      investorId: investor.id,
      title: "KYC Verification Complete! 🎉",
      message:
        "Your identity has been verified. You can now start investing in properties.",
      type: "KYC_STATUS_CHANGE",
      isRead: false,
      createdAt: new Date().toISOString(),
      link: "/dashboard/investments",
    };

    await docClient.send(
      new PutCommand({
        TableName: process.env.NOTIFICATIONS_TABLE!,
        Item: notification,
      }),
    );

    logger.info("Notification created", { notificationId: notification.id });
  } catch (error) {
    logger.error("Error creating notification", error);
    // Don't fail - notification is not critical
  }
}

/**
 * 2. Create audit log entry
 */
async function createAuditLog(params: {
  investorId: string;
  action: string;
  performedBy: string;
  performerName: string;
  details?: string;
}) {
  logger.info("Creating audit log", params);

  try {
    const auditLog = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      userId: params.performedBy,
      userName: params.performerName,
      userRole: "Compliance", // Or extract from event
      action: params.action,
      entityType: "INVESTOR",
      entityId: params.investorId,
      changes: {
        kycStatus: { old: "PENDING", new: "APPROVED" },
        accountStatus: { old: "PENDING_VERIFICATION", new: "ACTIVE" },
      },
      status: "SUCCESS",
      details: params.details || "KYC verification approved",
    };

    await docClient.send(
      new PutCommand({
        TableName: process.env.AUDIT_TABLE!,
        Item: auditLog,
      }),
    );

    logger.info("Audit log created", { auditLogId: auditLog.id });
  } catch (error) {
    logger.error("Error creating audit log", error);
    // Don't fail - audit log is important but not critical for user experience
  }
}

/**
 * 3. Send welcome email with next steps
 */
async function sendWelcomeEmail(investor: any) {
  logger.info("Sending welcome email", { email: investor.email });

  try {
    const emailParams = {
      Destination: {
        ToAddresses: [investor.email],
      },
      Message: {
        Body: {
          Html: {
            Charset: "UTF-8",
            Data: `
              <!DOCTYPE html>
              <html>
              <head>
                <style>
                  body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                  .header { background: #1a73e8; color: white; padding: 30px; text-align: center; }
                  .content { padding: 30px; background: #f9f9f9; }
                  .button { 
                    display: inline-block; 
                    padding: 12px 30px; 
                    background: #1a73e8; 
                    color: white; 
                    text-decoration: none; 
                    border-radius: 5px;
                    margin: 20px 0;
                  }
                  .next-steps { background: white; padding: 20px; margin: 20px 0; border-left: 4px solid #1a73e8; }
                  .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <h1>🎉 Welcome to PREPG3!</h1>
                    <p>Your verification is complete</p>
                  </div>
                  
                  <div class="content">
                    <h2>Hi ${investor.firstName},</h2>
                    
                    <p>Great news! Your identity verification has been approved. You're now ready to start investing in our curated property portfolio.</p>
                    
                    <div class="next-steps">
                      <h3>📋 Next Steps:</h3>
                      <ol>
                        <li><strong>Browse Properties</strong> - Explore our current investment opportunities</li>
                        <li><strong>Add Payment Details</strong> - Set up your bank account for investments</li>
                        <li><strong>Make Your First Investment</strong> - Start building your property portfolio</li>
                        <li><strong>Track Your Returns</strong> - Monitor your investments in real-time</li>
                      </ol>
                    </div>
                    
                    <p style="text-align: center;">
                      <a href="${process.env.APP_URL}/dashboard" class="button">
                        Go to Dashboard
                      </a>
                    </p>
                    
                    <p><strong>Your Account Details:</strong></p>
                    <ul>
                      <li>Account Status: <strong style="color: green;">Active ✓</strong></li>
                      <li>Verification Level: <strong>Fully Verified</strong></li>
                      <li>KYC Valid Until: <strong>${new Date(
                        investor.kycExpiryDate,
                      ).toLocaleDateString()}</strong></li>
                    </ul>
                    
                    <p>If you have any questions, our support team is here to help.</p>
                    
                    <p>Happy investing!</p>
                    <p><strong>The PREPG3 Team</strong></p>
                  </div>
                  
                  <div class="footer">
                    <p>PREPG3 Property Investment Platform</p>
                    <p>This email was sent to ${investor.email}</p>
                    <p><a href="${
                      process.env.APP_URL
                    }/unsubscribe">Unsubscribe</a></p>
                  </div>
                </div>
              </body>
              </html>
            `,
          },
          Text: {
            Charset: "UTF-8",
            Data: `
Hi ${investor.firstName},

Great news! Your identity verification has been approved. You're now ready to start investing in our curated property portfolio.

Next Steps:
1. Browse Properties - Explore our current investment opportunities
2. Add Payment Details - Set up your bank account for investments
3. Make Your First Investment - Start building your property portfolio
4. Track Your Returns - Monitor your investments in real-time

Go to Dashboard: ${process.env.APP_URL}/dashboard

Your Account Details:
- Account Status: Active ✓
- Verification Level: Fully Verified
- KYC Valid Until: ${new Date(investor.kycExpiryDate).toLocaleDateString()}

If you have any questions, our support team is here to help.

Happy investing!
The PREPG3 Team
            `,
          },
        },
        Subject: {
          Charset: "UTF-8",
          Data: "🎉 Your PREPG3 Account is Now Active!",
        },
      },
      Source: process.env.FROM_EMAIL || "noreply@prepg3.com",
    };

    await sesClient.send(new SendEmailCommand(emailParams));
    logger.info("Welcome email sent successfully");
  } catch (error) {
    logger.error("Error sending welcome email", error);
    // Don't fail - email is important but not critical
  }
}
