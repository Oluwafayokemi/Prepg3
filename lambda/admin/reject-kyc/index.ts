// lambda/investors/reject-kyc/index.ts

import { UpdateCommand, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "@shared/db/client";
import { Logger } from "@shared/utils/logger";
import { validateRequired } from "@shared/utils/validators";
import { UnauthorizedError, NotFoundError } from "@shared/utils/errors";
import type { AppSyncEvent } from "../../shared/types";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { v4 as uuidv4 } from "uuid";

const logger = new Logger("RejectKYC");
const sesClient = new SESClient({});

export const handler = async (event: AppSyncEvent) => {
  logger.info("Rejecting KYC", { event });

  try {
    const investorId: string = event.arguments.investorId;
    const reason: string = event.arguments.reason;

    validateRequired(investorId, "investorId");
    validateRequired(reason, "reason");

    // Authorization
    const groups = event.identity?.claims?.["cognito:groups"] || [];
    const isAdmin = groups.includes("Admin");
    const isCompliance = groups.includes("Compliance");

    if (!isAdmin && !isCompliance) {
      throw new UnauthorizedError("Only admins or compliance officers can reject KYC");
    }

    const rejectedBy = event.identity?.claims?.email || event.identity?.claims?.sub;

    // Get investor
    const getResult = await docClient.send(
      new GetCommand({
        TableName: process.env.INVESTORS_TABLE!,
        Key: { id: investorId },
      })
    );

    if (!getResult.Item) {
      throw new NotFoundError("Investor not found");
    }

    const investor = getResult.Item;
    const now = new Date().toISOString();

    // Update investor KYC status to REJECTED
    const result = await docClient.send(
      new UpdateCommand({
        TableName: process.env.INVESTORS_TABLE!,
        Key: { id: investorId },
        UpdateExpression: `
          SET kycStatus = :kycStatus,
              kycRejectionReason = :reason,
              updatedAt = :updatedAt,
              updatedBy = :updatedBy
        `,
        ExpressionAttributeValues: {
          ":kycStatus": "REJECTED",
          ":reason": reason,
          ":updatedAt": now,
          ":updatedBy": rejectedBy,
        },
        ReturnValues: "ALL_NEW",
      })
    );

    logger.info("KYC rejected", { investorId, rejectedBy });

    // Send notification
    await sendKYCRejectedNotification(investor, reason);

    // Send email
    await sendRejectionEmail(investor, reason);

    // Create audit log
    await createAuditLog({
      investorId,
      action: "KYC_REJECTED",
      performedBy: rejectedBy,
      details: reason,
    });

    return result.Attributes;

  } catch (error) {
    logger.error("Error rejecting KYC", error);
    throw error;
  }
};

async function sendKYCRejectedNotification(investor: any, reason: string) {
  try {
    const notification = {
      id: uuidv4(),
      investorId: investor.id,
      title: "KYC Verification - Action Required",
      message: `Your verification was unsuccessful. ${reason}`,
      type: "KYC_STATUS_CHANGE",
      isRead: false,
      createdAt: new Date().toISOString(),
      link: "/dashboard/kyc",
    };

    await docClient.send(
      new PutCommand({
        TableName: process.env.NOTIFICATIONS_TABLE!,
        Item: notification,
      })
    );
  } catch (error) {
    logger.error("Error creating notification", error);
  }
}

async function sendRejectionEmail(investor: any, reason: string) {
  try {
    const emailParams = {
      Destination: { ToAddresses: [investor.email] },
      Message: {
        Body: {
          Html: {
            Data: `
              <h2>KYC Verification Update</h2>
              <p>Hi ${investor.firstName},</p>
              <p>Unfortunately, we were unable to verify your documents for the following reason:</p>
              <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin: 20px 0;">
                <p><strong>${reason}</strong></p>
              </div>
              <p><strong>Next Steps:</strong></p>
              <ol>
                <li>Review the reason above</li>
                <li>Prepare corrected documents</li>
                <li>Re-submit your verification</li>
              </ol>
              <p><a href="${process.env.APP_URL}/dashboard/kyc" style="background: #1a73e8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Re-submit Documents</a></p>
              <p>If you have questions, please contact our support team.</p>
            `,
          },
        },
        Subject: { Data: "PREPG3 - KYC Verification Update" },
      },
      Source: process.env.FROM_EMAIL || "noreply@prepg3.com",
    };

    await sesClient.send(new SendEmailCommand(emailParams));
  } catch (error) {
    logger.error("Error sending rejection email", error);
  }
}

async function createAuditLog(params: any) {
  try {
    await docClient.send(
      new PutCommand({
        TableName: process.env.AUDIT_TABLE!,
        Item: {
          id: uuidv4(),
          timestamp: new Date().toISOString(),
          userId: params.performedBy,
          action: params.action,
          entityType: "INVESTOR",
          entityId: params.investorId,
          status: "SUCCESS",
          details: params.details,
        },
      })
    );
  } catch (error) {
    logger.error("Error creating audit log", error);
  }
}


// ==========================================
// REQUEST MORE INFO LAMBDA
// ==========================================
// lambda/investors/request-more-info/index.ts

export const requestMoreInfoHandler = async (event: AppSyncEvent) => {
  logger.info("Requesting more info", { event });

  try {
    const investorId: string = event.arguments.investorId;
    const message: string = event.arguments.message;

    validateRequired(investorId, "investorId");
    validateRequired(message, "message");

    // Authorization
    const groups = event.identity?.claims?.["cognito:groups"] || [];
    const isAdmin = groups.includes("Admin");
    const isCompliance = groups.includes("Compliance");

    if (!isAdmin && !isCompliance) {
      throw new UnauthorizedError("Only admins or compliance officers can request more info");
    }

    const requestedBy = event.identity?.claims?.email || event.identity?.sub;
    // Get investor
    const getResult = await docClient.send(
      new GetCommand({
        TableName: process.env.INVESTORS_TABLE!,
        Key: { id: investorId },
      })
    );

    if (!getResult.Item) {
      throw new NotFoundError("Investor not found");
    }

    const investor = getResult.Item;
    const now = new Date().toISOString();

    // Update KYC status to MORE_INFO_REQUIRED
    const result = await docClient.send(
      new UpdateCommand({
        TableName: process.env.INVESTORS_TABLE!,
        Key: { id: investorId },
        UpdateExpression: `
          SET kycStatus = :kycStatus,
              kycRejectionReason = :message,
              updatedAt = :updatedAt,
              updatedBy = :updatedBy
        `,
        ExpressionAttributeValues: {
          ":kycStatus": "MORE_INFO_REQUIRED",
          ":message": message,
          ":updatedAt": now,
          ":updatedBy": requestedBy,
        },
        ReturnValues: "ALL_NEW",
      })
    );

    logger.info("More info requested", { investorId, requestedBy });

    // Send notification
    const notification = {
      id: uuidv4(),
      investorId: investor.id,
      title: "Additional Information Required",
      message: message,
      type: "KYC_STATUS_CHANGE",
      isRead: false,
      createdAt: now,
      link: "/dashboard/kyc",
    };

    await docClient.send(
      new PutCommand({
        TableName: process.env.NOTIFICATIONS_TABLE!,
        Item: notification,
      })
    );

    // Send email
    const emailParams = {
      Destination: { ToAddresses: [investor.email] },
      Message: {
        Body: {
          Html: {
            Data: `
              <h2>Additional Information Required</h2>
              <p>Hi ${investor.firstName},</p>
              <p>We need some additional information to complete your verification:</p>
              <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0;">
                <p><strong>${message}</strong></p>
              </div>
              <p><a href="${process.env.APP_URL}/dashboard/kyc" style="background: #1a73e8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Provide Information</a></p>
            `,
          },
        },
        Subject: { Data: "PREPG3 - Additional Information Required" },
      },
      Source: process.env.FROM_EMAIL || "noreply@prepg3.com",
    };

    await sesClient.send(new SendEmailCommand(emailParams));

    return result.Attributes;

  } catch (error) {
    logger.error("Error requesting more info", error);
    throw error;
  }
};