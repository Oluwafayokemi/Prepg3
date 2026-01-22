// lambda/admin/list-pending-kyc/index.ts

import { QueryCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "@shared/db/client";
import { Logger } from "@shared/utils/logger";
import { UnauthorizedError } from "@shared/utils/errors";
import type { AppSyncEvent } from "../../shared/types";

const logger = new Logger("ListPendingKYC");

interface ListPendingKYCArgs {
  limit?: number;
  nextToken?: string;
}

export const handler = async (event: AppSyncEvent) => {
  logger.info("Listing pending KYC", { event });

  try {
    const args: ListPendingKYCArgs = event.arguments || {};
    const limit = args.limit || 50;
    const nextToken = args.nextToken;

    // Authorization: Only admins or compliance officers
    const groups = event.identity?.claims?.["cognito:groups"] || [];
    const isAdmin = groups.includes("Admin");
    const isCompliance = groups.includes("Compliance");

    if (!isAdmin && !isCompliance) {
      throw new UnauthorizedError("Only admins or compliance officers can view pending KYC");
    }

    // Query investors with KYC status = PENDING or IN_PROGRESS
    // Option 1: If you have a GSI on kycStatus
    /*
    const result = await docClient.send(
      new QueryCommand({
        TableName: process.env.INVESTORS_TABLE!,
        IndexName: "byKYCStatus",
        KeyConditionExpression: "kycStatus = :status",
        ExpressionAttributeValues: {
          ":status": "PENDING",
        },
        Limit: limit,
        ExclusiveStartKey: nextToken ? JSON.parse(Buffer.from(nextToken, 'base64').toString()) : undefined,
      })
    );
    */

    // Option 2: If NO GSI, use Scan with filter (slower but works)
    const result = await docClient.send(
      new ScanCommand({
        TableName: process.env.INVESTORS_TABLE!,
        FilterExpression: "kycStatus IN (:pending, :inProgress) AND isCurrent = :current",
        ExpressionAttributeValues: {
          ":pending": "PENDING",
          ":inProgress": "IN_PROGRESS",
          ":current": "CURRENT", // Only get current versions
        },
        Limit: limit,
        ExclusiveStartKey: nextToken ? JSON.parse(Buffer.from(nextToken, 'base64').toString()) : undefined,
      })
    );

    const investors = result.Items || [];

    // Sort by submission date (most recent first)
    investors.sort((a, b) => {
      const dateA = new Date(a.updatedAt || a.createdAt).getTime();
      const dateB = new Date(b.updatedAt || b.createdAt).getTime();
      return dateB - dateA;
    });

    // Create next token if there are more results
    const responseNextToken = result.LastEvaluatedKey
      ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64')
      : null;

    logger.info("Pending KYC list retrieved", {
      count: investors.length,
      hasMore: !!responseNextToken,
    });

    return {
      items: investors,
      nextToken: responseNextToken,
      total: investors.length,
    };

  } catch (error) {
    logger.error("Error listing pending KYC", error);
    throw error;
  }
};