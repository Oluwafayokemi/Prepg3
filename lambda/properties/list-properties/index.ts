// lambda/properties/list-properties/index.ts

import { ScanCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "@shared/db/client";
import { Logger } from "@shared/utils/logger";
import type { AppSyncEvent } from "../../shared/types";

const logger = new Logger("ListProperties");

interface ListPropertiesArgs {
  limit?: number;
  nextToken?: string;
  status?: string;
  listingStatus?: string;
}

export const handler = async (event: AppSyncEvent) => {
  logger.info("Listing properties", { event });

  try {
    const args: ListPropertiesArgs = event.arguments || {};
    const limit = args.limit || 50;

    // OPTION 1: Use GSI for current versions (Fast)
    if (process.env.USE_CURRENT_VERSIONS_GSI === 'true') {
      return await listUsingGSI(args, limit);
    }

    // OPTION 2: Scan with filter (Works without GSI)
    return await listUsingScan(args, limit);

  } catch (error) {
    logger.error("Error listing properties", error);
    throw error;
  }
};

/**
 * FAST: Query GSI for current versions only
 * Requires: GSI on entityType + isCurrent
 */
async function listUsingGSI(args: ListPropertiesArgs, limit: number) {
  logger.info("Using GSI for current versions");

  const result = await docClient.send(
    new QueryCommand({
      TableName: process.env.PROPERTIES_TABLE!,
      IndexName: "currentVersions",
      KeyConditionExpression: "entityType = :type AND isCurrent = :current",
      ExpressionAttributeValues: {
        ":type": "PROPERTY",
        ":current": "CURRENT",
      },
      Limit: limit,
      ExclusiveStartKey: args.nextToken 
        ? JSON.parse(Buffer.from(args.nextToken, 'base64').toString()) 
        : undefined,
    })
  );

  let items = result.Items || [];

  // Apply additional filters if provided
  if (args.status) {
    items = items.filter(item => item.status === args.status);
  }

  if (args.listingStatus) {
    items = items.filter(item => item.listingStatus === args.listingStatus);
  }

  const nextToken = result.LastEvaluatedKey
    ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64')
    : null;

  logger.info("Properties retrieved", { count: items.length });

  return {
    items,
    nextToken,
    total: items.length,
  };
}

/**
 * SLOWER: Scan with filter
 * Works without GSI but scans entire table
 */
async function listUsingScan(args: ListPropertiesArgs, limit: number) {
  logger.info("Using Scan with filter");

  // Build filter expression
  const filterParts: string[] = ["isCurrent = :current"];
  const expressionValues: Record<string, any> = {
    ":current": "CURRENT",
  };

  if (args.status) {
    filterParts.push("#status = :status");
    expressionValues[":status"] = args.status;
  }

  if (args.listingStatus) {
    filterParts.push("listingStatus = :listingStatus");
    expressionValues[":listingStatus"] = args.listingStatus;
  }

  const result = await docClient.send(
    new ScanCommand({
      TableName: process.env.PROPERTIES_TABLE!,
      FilterExpression: filterParts.join(" AND "),
      ExpressionAttributeNames: args.status ? {
        "#status": "status" // Reserved word
      } : undefined,
      ExpressionAttributeValues: expressionValues,
      Limit: limit,
      ExclusiveStartKey: args.nextToken 
        ? JSON.parse(Buffer.from(args.nextToken, 'base64').toString()) 
        : undefined,
    })
  );

  const items = result.Items || [];

  const nextToken = result.LastEvaluatedKey
    ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64')
    : null;

  logger.info("Properties retrieved", { count: items.length });

  return {
    items,
    nextToken,
    total: items.length,
  };
}