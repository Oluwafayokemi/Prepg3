// lambda/documents/list-my-documents/index.ts
// UPDATED to exclude withdrawn documents

import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "@shared/db/client";
import { Logger } from "@shared/utils/logger";
import { UnauthorizedError } from "@shared/utils/errors";
import type { AppSyncEvent } from "../../shared/types";
import { PermissionChecker } from "@shared/utils/permissions";

const logger = new Logger("ListMyDocuments");

export const handler = async (event: AppSyncEvent) => {
  logger.info("Listing user documents", { event });

  try {
    const userId = PermissionChecker.getUserGroups(event);
    const includeWithdrawn = event.arguments.includeWithdrawn || false;

    if (!userId) {
      throw new UnauthorizedError("Not authenticated");
    }

    // Get only CURRENT versions for this user
    const result = await docClient.send(
      new QueryCommand({
        TableName: process.env.DOCUMENTS_TABLE!,
        IndexName: "currentVersions",
        KeyConditionExpression: "investorId = :investorId AND isCurrent = :current",
        ExpressionAttributeValues: {
          ":investorId": userId,
          ":current": "CURRENT",
        },
      })
    );

    let documents = result.Items || [];

    // Filter out withdrawn documents (unless explicitly requested)
    if (!includeWithdrawn) {
      documents = documents.filter(doc => doc.status !== "WITHDRAWN");
    }

    // Sort by upload date (newest first)
    documents.sort((a, b) => 
      new Date(b.uploadedAt || b.createdAt).getTime() - 
      new Date(a.uploadedAt || a.createdAt).getTime()
    );

    logger.info("Documents listed", {
      investorId: userId,
      count: documents.length,
      includeWithdrawn,
    });

    return {
      documents,
    };

  } catch (error) {
    logger.error("Error listing documents", error);
    throw error;
  }
};