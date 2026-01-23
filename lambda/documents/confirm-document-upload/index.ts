import { UpdateCommand as Upd } from "@aws-sdk/lib-dynamodb";
import { docClient as dc } from "@shared/db/client";
import { Logger as L } from "@shared/utils/logger";
import type { AppSyncEvent as Ev } from "../../shared/types";

const l = new L("ConfirmDocumentUpload");

export const confirmUploadHandler = async (event: Ev) => {
  l.info("Confirming document upload", { event });

  try {
    const documentId = event.arguments.documentId;
    const now = new Date().toISOString();

    // Update document status to UPLOADED
    await dc.send(
      new Upd({
        TableName: process.env.DOCUMENTS_TABLE!,
        Key: { id: documentId },
        UpdateExpression: 
          "SET #status = :uploaded, " +
          "uploadedAt = :now, " +
          "updatedAt = :now",
        ExpressionAttributeNames: {
          "#status": "status",
        },
        ExpressionAttributeValues: {
          ":uploaded": "UPLOADED",
          ":now": now,
        },
      })
    );

    l.info("Document upload confirmed", { documentId });

    return {
      success: true,
      documentId,
      status: "UPLOADED",
    };

  } catch (error) {
    l.error("Error confirming upload", error);
    throw error;
  }
};