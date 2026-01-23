// lambda/documents/get-document-history/index.ts

import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "@shared/db/client";
import { PermissionChecker } from "@shared/utils/permissions";
import { Logger } from "@shared/utils/logger";
import type { AppSyncEvent } from "../../shared/types";

const logger = new Logger("GetDocumentHistory");

export const handler = async (event: AppSyncEvent) => {
  logger.info("Getting document history", { event });

  try {
    const documentId = event.arguments.documentId;
    const userId = PermissionChecker.getUserId(event);
    const isAdmin = PermissionChecker.isAdmin(event);

    // Get all versions of this document
    const result = await docClient.send(
      new QueryCommand({
        TableName: process.env.DOCUMENTS_TABLE!,
        KeyConditionExpression: "id = :id",
        ExpressionAttributeValues: {
          ":id": documentId,
        },
        ScanIndexForward: false, // Newest first
      })
    );

    const versions = result.Items || [];

    if (versions.length === 0) {
      throw new Error("Document not found");
    }

    // Check ownership (unless admin)
    if (!isAdmin && versions[0].investorId !== userId) {
      throw new Error("Unauthorized");
    }

    // Build timeline
    const timeline = versions.map((doc, index) => ({
      version: doc.version,
      fileName: doc.fileName,
      status: doc.status,
      uploadedAt: doc.uploadedAt,
      uploadedBy: doc.uploadedBy,
      verifiedAt: doc.verifiedAt,
      verifiedBy: doc.verifiedBy,
      supersededAt: doc.supersededAt,
      supersededReason: doc.supersededReason,
      withdrawnAt: doc.withdrawnAt,
      withdrawnReason: doc.withdrawnReason,
      isCurrent: doc.isCurrent === "CURRENT",
    }));

    logger.info("Document history retrieved", {
      documentId,
      versionCount: versions.length,
    });

    return {
      documentId,
      currentVersion: versions[0].version,
      totalVersions: versions.length,
      timeline,
    };

  } catch (error) {
    logger.error("Error getting document history", error);
    throw error;
  }
};