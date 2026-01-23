import { QueryCommand, UpdateCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "@shared/db/client";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Logger } from "@shared/utils/logger";
import { ValidationError, UnauthorizedError } from "@shared/utils/errors";
import type { AppSyncEvent } from "../../shared/types";
import { v4 as uuidv4 } from "uuid";
import { PermissionChecker } from "@shared/utils/permissions";

const s3 = new S3Client({});
const logger = new Logger("ReplaceDocument");

interface ReplaceDocumentInput {
  documentIdToReplace: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  reason: string; // Why replacing
}

export const handler = async (event: AppSyncEvent) => {
  logger.info("Replacing document", { event });

  try {
    const input: ReplaceDocumentInput = event.arguments.input;
    const userId = PermissionChecker.getUserId(event);
    const userEmail = event.identity?.claims?.email;

    if (!userId) {
      throw new UnauthorizedError("Not authenticated");
    }

    // Validate reason (compliance)
    if (!input.reason || input.reason.trim().length < 10) {
      throw new ValidationError("Reason for replacement must be at least 10 characters");
    }

    // Get current document version
    const currentResult = await docClient.send(
      new QueryCommand({
        TableName: process.env.DOCUMENTS_TABLE!,
        KeyConditionExpression: "id = :id",
        ExpressionAttributeValues: {
          ":id": input.documentIdToReplace,
        },
        ScanIndexForward: false, // Get latest version first
        Limit: 1,
      })
    );

    if (!currentResult.Items || currentResult.Items.length === 0) {
      throw new Error("Document not found");
    }

    const currentDoc = currentResult.Items[0];

    // Check ownership
    if (currentDoc.investorId !== userId) {
      throw new UnauthorizedError("You can only replace your own documents");
    }

    // Check if document can be replaced
    if (currentDoc.status === "WITHDRAWN") {
      throw new ValidationError("Cannot replace withdrawn document");
    }

    const now = new Date().toISOString();
    const newDocumentId = uuidv4();
    const newVersion = (currentDoc.version || 0) + 1;

    // Generate S3 key for new version
    const s3Key = `investors/${userId}/documents/${newDocumentId}/v${newVersion}/${input.fileName}`;

    // Generate presigned URL
    const command = new PutObjectCommand({
      Bucket: process.env.DOCUMENTS_BUCKET!,
      Key: s3Key,
      ContentType: input.mimeType,
      Metadata: {
        investorId: userId,
        documentId: newDocumentId,
        version: newVersion.toString(),
        replacesDocumentId: input.documentIdToReplace,
        replacesVersion: currentDoc.version.toString(),
      },
    });

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 900 });

    // Step 1: Mark old version as SUPERSEDED
    await docClient.send(
      new UpdateCommand({
        TableName: process.env.DOCUMENTS_TABLE!,
        Key: {
          id: input.documentIdToReplace,
          version: currentDoc.version,
        },
        UpdateExpression:
          "SET #status = :superseded, " +
          "isCurrent = :historical, " +
          "supersededBy = :newId, " +
          "supersededAt = :now, " +
          "supersededReason = :reason",
        ExpressionAttributeNames: {
          "#status": "status",
        },
        ExpressionAttributeValues: {
          ":superseded": "SUPERSEDED",
          ":historical": "HISTORICAL",
          ":newId": newDocumentId,
          ":now": now,
          ":reason": input.reason,
        },
      })
    );

    // Step 2: Create new version
    const newDocument = {
      id: newDocumentId,
      version: newVersion,
      investorId: userId,
      documentType: currentDoc.documentType,
      fileName: input.fileName,
      fileSize: input.fileSize,
      mimeType: input.mimeType,
      s3Key,
      s3Bucket: process.env.DOCUMENTS_BUCKET!,
      status: "PENDING_UPLOAD",
      isCurrent: "CURRENT",
      
      // Link to previous version
      replacesDocumentId: input.documentIdToReplace,
      replacesVersion: currentDoc.version,
      replacementReason: input.reason,
      
      // Metadata
      uploadedBy: userEmail || userId,
      createdAt: now,
      updatedAt: now,
    };

    await docClient.send(
      new PutCommand({
        TableName: process.env.DOCUMENTS_TABLE!,
        Item: newDocument,
      })
    );

    const expiresAt = new Date(Date.now() + 900 * 1000).toISOString();

    logger.info("Document replacement initiated", {
      oldDocumentId: input.documentIdToReplace,
      oldVersion: currentDoc.version,
      newDocumentId,
      newVersion,
      reason: input.reason,
    });

    return {
      documentId: newDocumentId,
      uploadUrl,
      expiresAt,
      document: newDocument,
      replacedDocument: {
        id: input.documentIdToReplace,
        version: currentDoc.version,
        status: "SUPERSEDED",
      },
    };

  } catch (error) {
    logger.error("Error replacing document", error);
    throw error;
  }
};
