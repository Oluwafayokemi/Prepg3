import { QueryCommand, UpdateCommand as UpdateCmd } from "@aws-sdk/lib-dynamodb";
import { docClient as db } from "@shared/db/client";
import {
  CognitoIdentityProviderClient,
  AdminDisableUserCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { PermissionChecker as PC } from "@shared/utils/permissions";
import { Logger as Log } from "@shared/utils/logger";
import { ValidationError as VE } from "@shared/utils/errors";
import type { AppSyncEvent as Event } from "../../shared/types";

const cognito = new CognitoIdentityProviderClient({});
const log = new Log("BulkSuspendAccounts");

interface BulkOpResult {
  totalProcessed: number;
  successCount: number;
  failureCount: number;
  errors: Array<{ investorId: string; error: string }>;
}

export const suspendHandler = async (event: Event): Promise<BulkOpResult> => {
  log.info("Bulk suspending accounts", { event });

  try {
    const investorIds: string[] = event.arguments.investorIds || [];
    const reason: string = event.arguments.reason;

    // Validation
    if (!reason || reason.trim().length < 10) {
      throw new VE("Suspension reason must be at least 10 characters");
    }

    // Authorization
    PC.requireAdmin(event);

    const performedBy = event.identity?.claims?.email || event.identity?.claims?.sub;

    const result: BulkOpResult = {
      totalProcessed: investorIds.length,
      successCount: 0,
      failureCount: 0,
      errors: [],
    };

    // Process each investor
    for (const investorId of investorIds) {
      try {
        await suspendInvestor(investorId, reason, performedBy);
        result.successCount++;
      } catch (error) {
        result.failureCount++;
        result.errors.push({
          investorId,
          error: error instanceof Error ? error.message : "Unknown error",
        });
        log.error("Failed to suspend account", { investorId, error });
      }
    }

    log.info("Bulk suspension completed", {
      total: result.totalProcessed,
      success: result.successCount,
      failed: result.failureCount,
    });

    return result;

  } catch (error) {
    log.error("Error in bulk suspend accounts", error);
    throw error;
  }
};

async function suspendInvestor(
  investorId: string,
  reason: string,
  performedBy: string
): Promise<void> {
  const now = new Date().toISOString();

  // Get current investor
  const currentResult = await db.send(
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

  if (currentVersion.accountStatus === "SUSPENDED") {
    throw new Error("Account already suspended");
  }

  const newVersionNumber = (currentVersion.version || 0) + 1;

  // Mark old version as HISTORICAL
  await db.send(
    new UpdateCmd({
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

  // Create new version with SUSPENDED status
  await db.send(
    new UpdateCmd({
      TableName: process.env.INVESTORS_TABLE!,
      Key: {
        id: investorId,
        version: newVersionNumber,
      },
      UpdateExpression:
        "SET #accountStatus = :suspended, " +
        "#suspensionReason = :reason, " +
        "#suspendedAt = :now, " +
        "#suspendedBy = :by, " +
        "#updatedAt = :now, " +
        "#updatedBy = :by, " +
        "#isCurrent = :current, " +
        "#version = :version",
      ExpressionAttributeNames: {
        "#accountStatus": "accountStatus",
        "#suspensionReason": "suspensionReason",
        "#suspendedAt": "suspendedAt",
        "#suspendedBy": "suspendedBy",
        "#updatedAt": "updatedAt",
        "#updatedBy": "updatedBy",
        "#isCurrent": "isCurrent",
        "#version": "version",
      },
      ExpressionAttributeValues: {
        ":suspended": "SUSPENDED",
        ":reason": reason,
        ":now": now,
        ":by": performedBy,
        ":current": "CURRENT",
        ":version": newVersionNumber,
      },
    })
  );

  // Disable in Cognito
  try {
    await cognito.send(
      new AdminDisableUserCommand({
        UserPoolId: process.env.USER_POOL_ID!,
        Username: currentVersion.email,
      })
    );
  } catch (error) {
    log.warn("Failed to disable Cognito user", { investorId, error });
  }
}