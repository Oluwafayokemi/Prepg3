// lambda/properties/get-property-versions/index.ts

import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "@shared/db/client";
import { Logger } from "@shared/utils/logger";
import type { AppSyncEvent } from "../../shared/types";

const logger = new Logger("GetPropertyVersions");

export const handler = async (event: AppSyncEvent) => {
  const propertyId = event.arguments.propertyId;

  logger.info("Getting property versions", { propertyId });

  // Get all versions, sorted newest first
  const result = await docClient.send(
    new QueryCommand({
      TableName: process.env.PROPERTIES_TABLE!,
      KeyConditionExpression: "id = :id",
      ExpressionAttributeValues: {
        ":id": propertyId,
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

  logger.info("Retrieved property versions", {
    propertyId,
    totalVersions: versions.length,
  });

  return {
    propertyId,
    currentVersion: versions[0]?.version || 0,
    totalVersions: versions.length,
    timeline,
  };
};

