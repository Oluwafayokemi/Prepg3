// lambda/documents/withdraw-document/index.ts

import { UpdateCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "@shared/db/client";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { Logger } from "@shared/utils/logger";
import { ValidationError, UnauthorizedError } from "@shared/utils/errors";
import type { AppSyncEvent } from "../../shared/types";
import { v4 as uuidv4 } from "uuid";

const logger = new Logger("WithdrawDocument");

interface WithdrawDocumentInput {
  documentId: string;
  reason: string; // Required for compliance
}

export const handler = async (event: AppSyncEvent) => {
  logger.info("Withdrawing document", { event });

  try {
    const input: WithdrawDocumentInput = event.arguments.input;
    const userId = event.identity?.claims?.sub;
    const userEmail = event.identity?.claims?.email;

    if (!userId) {
      throw new UnauthorizedError("Not authenticated");
    }

    // Validate reason
    if (!input.reason || input.reason.trim().length < 10) {
      throw new ValidationError(
        "Reason for withdrawal must be at least 10 characters"
      );
    }

    // Get current document
    const result = await docClient.send(
      new QueryCommand({
        TableName: process.env.DOCUMENTS_TABLE!,
        KeyConditionExpression: "id = :id",
        ExpressionAttributeValues: {
          ":id": input.documentId,
        },
        ScanIndexForward: false,
        Limit: 1,
      })
    );

    if (!result.Items || result.Items.length === 0) {
      throw new Error("Document not found");
    }

    const document = result.Items[0];

    // Check ownership
    if (document.investorId !== userId) {
      throw new UnauthorizedError("You can only withdraw your own documents");
    }

    // Prevent withdrawal of verified KYC documents (compliance!)
    if (document.documentType === "IDENTITY_DOCUMENT" && document.status === "VERIFIED") {
      throw new ValidationError(
        "Cannot withdraw verified identity documents. This is required for regulatory compliance. " +
        "Please upload a replacement document instead or contact support."
      );
    }

    const now = new Date().toISOString();

    // Mark as WITHDRAWN (soft delete)
    await docClient.send(
      new UpdateCommand({
        TableName: process.env.DOCUMENTS_TABLE!,
        Key: {
          id: input.documentId,
          version: document.version,
        },
        UpdateExpression:
          "SET #status = :withdrawn, " +
          "withdrawnAt = :now, " +
          "withdrawnBy = :by, " +
          "withdrawnReason = :reason, " +
          "updatedAt = :now",
        ExpressionAttributeNames: {
          "#status": "status",
        },
        ExpressionAttributeValues: {
          ":withdrawn": "WITHDRAWN",
          ":now": now,
          ":by": userEmail || userId,
          ":reason": input.reason,
        },
      })
    );

    // Create audit log
    await docClient.send(
      new PutCommand({
        TableName: process.env.AUDIT_TABLE!,
        Item: {
          id: uuidv4(),
          timestamp: now,
          action: "DOCUMENT_WITHDRAWN",
          performedBy: userEmail || userId,
          entityType: "DOCUMENT",
          entityId: input.documentId,
          details: `Document withdrawn: ${document.fileName}. Reason: ${input.reason}`,
          documentType: document.documentType,
          investorId: userId,
        },
      })
    );

    logger.info("Document withdrawn", {
      documentId: input.documentId,
      investorId: userId,
      reason: input.reason,
    });

    return {
      success: true,
      documentId: input.documentId,
      status: "WITHDRAWN",
      message: "Document withdrawn. It will no longer appear in your documents list.",
    };

  } catch (error) {
    logger.error("Error withdrawing document", error);
    throw error;
  }
};