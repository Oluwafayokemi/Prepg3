import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "@shared/db/client";
import { Logger } from "@shared/utils/logger";
import type { AppSyncEvent } from "../../shared/types";

const logger = new Logger("GetInvestorVersions");

export const handler = async (event: AppSyncEvent) => {
  const investorId = event.arguments.investorId;

  // Get all versions, sorted newest first
  const result = await docClient.send(
    new QueryCommand({
      TableName: process.env.INVESTORS_TABLE!,
      KeyConditionExpression: "id = :id",
      ExpressionAttributeValues: {
        ":id": investorId,
      },
      ScanIndexForward: false, // Descending order (newest first)
    })
  );

  const versions = result.Items || [];

  // Build change timeline for UI
  const timeline = versions.map((current, index) => {
    const previous = versions[index + 1]; // Next item is previous version

    // Compare and show what changed
    const changes = current.changedFields?.map((field: string) => ({
      field,
      oldValue: previous ? previous[field] : null,
      newValue: current[field],
    })) || [];

    return {
      version: current.version,
      timestamp: current.updatedAt,
      user: current.updatedBy,
      reason: current.changeReason,
      isCurrent: current.isCurrent === "CURRENT",
      changes,
      fullData: current, // For detailed view
    };
  });

  logger.info("Retrieved versions", {
    investorId,
    totalVersions: versions.length,
  });

  return {
    investorId,
    currentVersion: versions[0]?.version || 0,
    totalVersions: versions.length,
    timeline,
  };
};
