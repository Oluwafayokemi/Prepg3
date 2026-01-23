import { DeleteCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { docClient } from "@shared/db/client";
import { PermissionChecker } from "@shared/utils/permissions";
import { Logger } from "@shared/utils/logger";
import type { AppSyncEvent } from "@shared/types";

const s3 = new S3Client({});
const logger = new Logger("PermanentlyDeleteDocument");

export const handler = async (event: AppSyncEvent) => {
  logger.info("Permanently deleting document", { event });

  try {
    const documentId = event.arguments.documentId;
    const confirmDangerous = event.arguments.confirmDangerous;

    // CRITICAL: Only SuperAdmin can permanently delete
    PermissionChecker.requireSuperAdmin(event);

    if (!confirmDangerous) {
      throw new Error("Must confirm dangerous operation");
    }

    // Get document
    const result = await docClient.send(
      new QueryCommand({
        TableName: process.env.DOCUMENTS_TABLE!,
        KeyConditionExpression: "id = :id",
        ExpressionAttributeValues: {
          ":id": documentId,
        },
      })
    );

    if (!result.Items || result.Items.length === 0) {
      throw new Error("Document not found");
    }

    const document = result.Items[0];

    // Check if retention period has expired
    const uploadDate = new Date(document.uploadedAt || document.createdAt);
    const sevenYearsAgo = new Date();
    sevenYearsAgo.setFullYear(sevenYearsAgo.getFullYear() - 7);

    if (uploadDate > sevenYearsAgo) {
      throw new Error(
        `Cannot delete. Document must be retained until ${
          new Date(uploadDate.getTime() + 7 * 365 * 24 * 60 * 60 * 1000)
        }`
      );
    }

    // Delete from S3
    await s3.send(
      new DeleteObjectCommand({
        Bucket: document.s3Bucket,
        Key: document.s3Key,
      })
    );

    // Delete from DynamoDB
    await docClient.send(
      new DeleteCommand({
        TableName: process.env.DOCUMENTS_TABLE!,
        Key: {
          id: documentId,
          version: document.version,
        },
      })
    );

    logger.info("Document permanently deleted", {
      documentId,
      uploadedAt: document.uploadedAt,
    });

    return {
      success: true,
      documentId,
      message: "Document permanently deleted after retention period",
    };

  } catch (error) {
    logger.error("Error permanently deleting document", error);
    throw error;
  }
};