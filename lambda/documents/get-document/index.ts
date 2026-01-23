import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { docClient as db } from "@shared/db/client";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl as getUrl } from "@aws-sdk/s3-request-presigner";
import { Logger as Log } from "@shared/utils/logger";
import { UnauthorizedError as UnAuth, NotFoundError } from "@shared/utils/errors";
import { PermissionChecker as PC } from "@shared/utils/permissions";
import type { AppSyncEvent as Evt } from "../../shared/types";

const s3Client = new S3Client({});
const log = new Log("GetDocument");

export const getDocumentHandler = async (event: Evt) => {
  log.info("Getting document", { event });

  try {
    const documentId = event.arguments.documentId;
    const userId = event.identity?.claims?.sub;
    const isAdmin = PC.isAdmin(event);

    if (!userId) {
      throw new UnAuth("Not authenticated");
    }

    // Get document
    const result = await db.send(
      new GetCommand({
        TableName: process.env.DOCUMENTS_TABLE!,
        Key: { id: documentId },
      })
    );

    if (!result.Item) {
      throw new NotFoundError("Document not found");
    }

    const document = result.Item;

    // Authorization: User can only access their own documents (unless admin)
    if (document.investorId !== userId && !isAdmin) {
      throw new UnAuth("You can only access your own documents");
    }

    // Generate download URL (valid for 5 minutes)
    const downloadUrl = await getUrl(
      s3Client,
      new GetObjectCommand({
        Bucket: document.s3Bucket,
        Key: document.s3Key,
      }),
      { expiresIn: 300 }
    );

    log.info("Document retrieved", {
      documentId,
      investorId: document.investorId,
    });

    return {
      ...document,
      downloadUrl,
      downloadUrlExpiresAt: new Date(Date.now() + 300 * 1000).toISOString(),
    };

  } catch (error) {
    log.error("Error getting document", error);
    throw error;
  }
};