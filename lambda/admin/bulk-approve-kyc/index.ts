// lambda/admin/bulk-approve-kyc/index.ts

import { QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "@shared/db/client";
import {
  CognitoIdentityProviderClient,
  AdminAddUserToGroupCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { PermissionChecker } from "@shared/utils/permissions";
import { Logger } from "@shared/utils/logger";
import type { AppSyncEvent } from "../../shared/types";

const cognito = new CognitoIdentityProviderClient({});
const ses = new SESClient({});
const logger = new Logger("BulkApproveKYC");

interface BulkOperationResult {
  totalProcessed: number;
  successCount: number;
  failureCount: number;
  errors: Array<{ investorId: string; error: string }>;
}

export const handler = async (event: AppSyncEvent): Promise<BulkOperationResult> => {
  logger.info("Bulk approving KYC", { event });

  try {
    const investorIds: string[] = event.arguments.investorIds || [];

    // Authorization
    PermissionChecker.requireCompliance(event);

    const performedBy = event.identity?.claims?.email || event.identity?.claims?.sub;

    const result: BulkOperationResult = {
      totalProcessed: investorIds.length,
      successCount: 0,
      failureCount: 0,
      errors: [],
    };

    // Process each investor
    for (const investorId of investorIds) {
      try {
        await approveInvestorKYC(investorId, performedBy);
        result.successCount++;
      } catch (error) {
        result.failureCount++;
        result.errors.push({
          investorId,
          error: error instanceof Error ? error.message : "Unknown error",
        });
        logger.error("Failed to approve KYC", { investorId, error });
      }
    }

    logger.info("Bulk KYC approval completed", {
      total: result.totalProcessed,
      success: result.successCount,
      failed: result.failureCount,
    });

    return result;

  } catch (error) {
    logger.error("Error in bulk approve KYC", error);
    throw error;
  }
};

/**
 * Approve single investor KYC
 * (Extracted logic from approve-kyc Lambda)
 */
async function approveInvestorKYC(investorId: string, performedBy: string): Promise<void> {
  const now = new Date().toISOString();

  // Get current investor version
  const currentResult = await docClient.send(
    new QueryCommand({
      TableName: process.env.INVESTORS_TABLE!,
      IndexName: "currentVersions",
      KeyConditionExpression: "id = :id AND isCurrent = :current",
      ExpressionAttributeValues: {
        ":id": investorId,
        ":current": "CURRENT",
      },
      Limit: 1,
    })
  );

  if (!currentResult.Items || currentResult.Items.length === 0) {
    throw new Error(`Investor ${investorId} not found`);
  }

  const currentVersion = currentResult.Items[0];

  // Check if already approved
  if (currentVersion.kycStatus === "APPROVED") {
    throw new Error("KYC already approved");
  }

  // Check if documents submitted
  if (!currentVersion.identityVerification || !currentVersion.proofOfAddress) {
    throw new Error("Documents not submitted");
  }

  const newVersionNumber = (currentVersion.version || 0) + 1;
  const kycExpiryDate = new Date();
  kycExpiryDate.setFullYear(kycExpiryDate.getFullYear() + 1); // 1 year from now

  // Mark old version as HISTORICAL
  await docClient.send(
    new UpdateCommand({
      TableName: process.env.INVESTORS_TABLE!,
      Key: {
        id: investorId,
        version: currentVersion.version,
      },
      UpdateExpression: "SET isCurrent = :historical",
      ExpressionAttributeValues: {
        ":historical": "HISTORICAL",
      },
    })
  );

  // Create new version with APPROVED status
  const newVersion = {
    ...currentVersion,
    version: newVersionNumber,
    isCurrent: "CURRENT",
    kycStatus: "APPROVED",
    accountStatus: "ACTIVE",
    verificationLevel: "FULL",
    kycApprovedAt: now,
    kycApprovedBy: performedBy,
    kycExpiryDate: kycExpiryDate.toISOString(),
    updatedAt: now,
    updatedBy: performedBy,
    changedFields: ["kycStatus", "accountStatus", "verificationLevel"],
    changeReason: `KYC approved via bulk operation by ${performedBy}`,
    previousVersion: currentVersion.version,
  };

  await docClient.send(
    new UpdateCommand({
      TableName: process.env.INVESTORS_TABLE!,
      Key: {
        id: investorId,
        version: newVersionNumber,
      },
      UpdateExpression:
        "SET #kycStatus = :approved, " +
        "#accountStatus = :active, " +
        "#verificationLevel = :full, " +
        "#kycApprovedAt = :now, " +
        "#kycApprovedBy = :by, " +
        "#kycExpiryDate = :expiry, " +
        "#updatedAt = :now, " +
        "#updatedBy = :by, " +
        "#isCurrent = :current, " +
        "#version = :version",
      ExpressionAttributeNames: {
        "#kycStatus": "kycStatus",
        "#accountStatus": "accountStatus",
        "#verificationLevel": "verificationLevel",
        "#kycApprovedAt": "kycApprovedAt",
        "#kycApprovedBy": "kycApprovedBy",
        "#kycExpiryDate": "kycExpiryDate",
        "#updatedAt": "updatedAt",
        "#updatedBy": "updatedBy",
        "#isCurrent": "isCurrent",
        "#version": "version",
      },
      ExpressionAttributeValues: {
        ":approved": "APPROVED",
        ":active": "ACTIVE",
        ":full": "FULL",
        ":now": now,
        ":by": performedBy,
        ":expiry": kycExpiryDate.toISOString(),
        ":current": "CURRENT",
        ":version": newVersionNumber,
      },
    })
  );

  // Add to VerifiedInvestors Cognito group
  try {
    await cognito.send(
      new AdminAddUserToGroupCommand({
        UserPoolId: process.env.USER_POOL_ID!,
        Username: currentVersion.email,
        GroupName: "VerifiedInvestors",
      })
    );
  } catch (error) {
    logger.warn("Failed to add to Cognito group", { investorId, error });
    // Don't fail the whole operation
  }

  // Send approval email (optional - can be skipped for bulk to save time)
  try {
    await ses.send(
      new SendEmailCommand({
        Source: process.env.FROM_EMAIL!,
        Destination: {
          ToAddresses: [currentVersion.email],
        },
        Message: {
          Subject: {
            Data: "Your KYC Verification is Approved",
          },
          Body: {
            Html: {
              Data: `
                <h2>Congratulations!</h2>
                <p>Your KYC verification has been approved.</p>
                <p>You can now invest in properties.</p>
                <p><a href="${process.env.APP_URL}">Go to Dashboard</a></p>
              `,
            },
          },
        },
      })
    );
  } catch (error) {
    logger.warn("Failed to send email", { investorId, error });
    // Don't fail the whole operation
  }
} 