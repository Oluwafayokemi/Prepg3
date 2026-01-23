// lambda/admin/bulk-reject-kyc/index.ts

import { QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "@shared/db/client";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { PermissionChecker } from "@shared/utils/permissions";
import { Logger } from "@shared/utils/logger";
import { ValidationError } from "@shared/utils/errors";
import type { AppSyncEvent } from "../../shared/types";

const ses = new SESClient({});
const logger = new Logger("BulkRejectKYC");

interface BulkOperationResult {
  totalProcessed: number;
  successCount: number;
  failureCount: number;
  errors: Array<{ investorId: string; error: string }>;
}

export const handler = async (event: AppSyncEvent): Promise<BulkOperationResult> => {
  logger.info("Bulk rejecting KYC", { event });

  try {
    const investorIds: string[] = event.arguments.investorIds || [];
    const reason: string = event.arguments.reason;

    // Validation
    if (!reason || reason.trim().length < 20) {
      throw new ValidationError("Rejection reason must be at least 20 characters");
    }

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
        await rejectInvestorKYC(investorId, reason, performedBy);
        result.successCount++;
      } catch (error) {
        result.failureCount++;
        result.errors.push({
          investorId,
          error: error instanceof Error ? error.message : "Unknown error",
        });
        logger.error("Failed to reject KYC", { investorId, error });
      }
    }

    logger.info("Bulk KYC rejection completed", {
      total: result.totalProcessed,
      success: result.successCount,
      failed: result.failureCount,
    });

    return result;

  } catch (error) {
    logger.error("Error in bulk reject KYC", error);
    throw error;
  }
};

/**
 * Reject single investor KYC
 */
async function rejectInvestorKYC(
  investorId: string,
  reason: string,
  performedBy: string
): Promise<void> {
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

  // Check if already rejected
  if (currentVersion.kycStatus === "REJECTED") {
    throw new Error("KYC already rejected");
  }

  const newVersionNumber = (currentVersion.version || 0) + 1;

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

  // Create new version with REJECTED status
  await docClient.send(
    new UpdateCommand({
      TableName: process.env.INVESTORS_TABLE!,
      Key: {
        id: investorId,
        version: newVersionNumber,
      },
      UpdateExpression:
        "SET #kycStatus = :rejected, " +
        "#kycRejectionReason = :reason, " +
        "#kycRejectedAt = :now, " +
        "#kycRejectedBy = :by, " +
        "#updatedAt = :now, " +
        "#updatedBy = :by, " +
        "#isCurrent = :current, " +
        "#version = :version",
      ExpressionAttributeNames: {
        "#kycStatus": "kycStatus",
        "#kycRejectionReason": "kycRejectionReason",
        "#kycRejectedAt": "kycRejectedAt",
        "#kycRejectedBy": "kycRejectedBy",
        "#updatedAt": "updatedAt",
        "#updatedBy": "updatedBy",
        "#isCurrent": "isCurrent",
        "#version": "version",
      },
      ExpressionAttributeValues: {
        ":rejected": "REJECTED",
        ":reason": reason,
        ":now": now,
        ":by": performedBy,
        ":current": "CURRENT",
        ":version": newVersionNumber,
      },
    })
  );

  // Send rejection email
  try {
    await ses.send(
      new SendEmailCommand({
        Source: process.env.FROM_EMAIL!,
        Destination: {
          ToAddresses: [currentVersion.email],
        },
        Message: {
          Subject: {
            Data: "KYC Verification - Additional Information Required",
          },
          Body: {
            Html: {
              Data: `
                <h2>KYC Verification Update</h2>
                <p>Unfortunately, we couldn't verify your identity at this time.</p>
                <p><strong>Reason:</strong> ${reason}</p>
                <p>Please review the requirements and resubmit your documents.</p>
                <p><a href="${process.env.APP_URL}/kyc/resubmit">Resubmit Documents</a></p>
              `,
            },
          },
        },
      })
    );
  } catch (error) {
    logger.warn("Failed to send email", { investorId, error });
  }
}