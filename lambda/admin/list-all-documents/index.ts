// lambda/admin/list-all-documents/index.ts

import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "@shared/db/client";
import { PermissionChecker } from "@shared/utils/permissions";
import { Logger } from "@shared/utils/logger";
import type { AppSyncEvent } from "../../shared/types";

const logger = new Logger("ListAllDocuments");

export const handler = async (event: AppSyncEvent) => {
  logger.info("Listing all documents (admin)", { event });

  try {
    // Only admin/compliance can see all documents
    PermissionChecker.requireCompliance(event);

    const args = event.arguments || {};

    // Build filter
    let filterExpression = "isCurrent = :current";
    const expressionValues: any = {
      ":current": "CURRENT",
    };

    if (args.investorId) {
      filterExpression += " AND investorId = :investorId";
      expressionValues[":investorId"] = args.investorId;
    }

    if (args.status) {
      filterExpression += " AND #status = :status";
      expressionValues[":status"] = args.status;
    }

    if (args.documentType) {
      filterExpression += " AND documentType = :documentType";
      expressionValues[":documentType"] = args.documentType;
    }

    const result = await docClient.send(
      new ScanCommand({
        TableName: process.env.DOCUMENTS_TABLE!,
        FilterExpression: filterExpression,
        ExpressionAttributeNames: args.status ? {
          "#status": "status"
        } : undefined,
        ExpressionAttributeValues: expressionValues,
      })
    );

    const documents = result.Items || [];

    // Sort by status priority and date
    const statusPriority = {
      "UPLOADED": 1,
      "PENDING_UPLOAD": 2,
      "VERIFIED": 3,
      "SUPERSEDED": 4,
      "WITHDRAWN": 5,
    };

    documents.sort((a, b) => {
      const priorityDiff = 
        (statusPriority[a.status] || 99) - 
        (statusPriority[b.status] || 99);
      
      if (priorityDiff !== 0) return priorityDiff;
      
      return new Date(b.uploadedAt || b.createdAt).getTime() - 
             new Date(a.uploadedAt || a.createdAt).getTime();
    });

    logger.info("All documents listed", {
      count: documents.length,
      filters: args,
    });

    return {
      documents,
    };

  } catch (error) {
    logger.error("Error listing all documents", error);
    throw error;
  }
};