// lambda/investors/submit-identity-document/index.ts

import { UpdateCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "@shared/db/client";
import { Logger } from "@shared/utils/logger";
import { validateRequired } from "@shared/utils/validators";
import {
  ValidationError,
  UnauthorizedError,
  NotFoundError,
} from "@shared/utils/errors";
import type { AppSyncEvent } from "../../shared/types";

const logger = new Logger("SubmitIdentityDocument");

interface SubmitIdentityInput {
  investorId: string;
  documentType: string; // PASSPORT, DRIVING_LICENSE, NATIONAL_ID, RESIDENCE_PERMIT
  documentNumber: string;
  issuingCountry: string;
  issueDate?: string;
  expiryDate: string;
  documentImages: string[]; // S3 keys
}

interface KYCSubmissionResponse {
  success: boolean;
  message: string;
  kycStatus: string;
  estimatedReviewTime: string;
}

export const handler = async (
  event: AppSyncEvent
): Promise<KYCSubmissionResponse> => {
  logger.info("Submitting identity document", { event });

  try {
    const input: SubmitIdentityInput = event.arguments.input;

    // Validate required fields
    validateRequired(input.investorId, "investorId");
    validateRequired(input.documentType, "documentType");
    validateRequired(input.documentNumber, "documentNumber");
    validateRequired(input.issuingCountry, "issuingCountry");
    validateRequired(input.expiryDate, "expiryDate");
    validateRequired(input.documentImages, "documentImages");

    if (!input.documentImages || input.documentImages.length === 0) {
      throw new ValidationError("At least one document image is required");
    }

    // Validate expiry date is in the future
    const expiryDate = new Date(input.expiryDate);
    const today = new Date();
    if (expiryDate <= today) {
      throw new ValidationError(
        "Document has expired. Please provide a valid document."
      );
    }

    // Authorization check
    const userId = event.identity?.sub || event.identity?.username;

    if (!userId) {
      throw new UnauthorizedError("Not authenticated");
    }

    // Get investor
    const getResult = await docClient.send(
      new GetCommand({
        TableName: process.env.INVESTORS_TABLE!,
        Key: { id: input.investorId },
      })
    );

    if (!getResult.Item) {
      throw new NotFoundError("Investor not found");
    }

    // Check authorization
    const investorUserId = getResult.Item.userId || getResult.Item.id;
    const groups = event.identity?.claims?.["cognito:groups"] || [];
    const isAdmin = groups.includes("Admin");

    if (investorUserId !== userId && !isAdmin) {
      throw new UnauthorizedError(
        "You can only submit documents for your own account"
      );
    }

    const now = new Date().toISOString();

    // Update investor with identity verification details
    const result = await docClient.send(
      new UpdateCommand({
        TableName: process.env.INVESTORS_TABLE!,
        Key: { id: input.investorId },
        UpdateExpression: `
          SET #identityVerification = :identityVerification,
              #kycStatus = :kycStatus,
              #verificationLevel = :verificationLevel,
              #updatedAt = :updatedAt
        `,
        ExpressionAttributeNames: {
          "#identityVerification": "identityVerification",
          "#kycStatus": "kycStatus",
          "#verificationLevel": "verificationLevel",
          "#updatedAt": "updatedAt",
        },
        ExpressionAttributeValues: {
          ":identityVerification": {
            documentType: input.documentType,
            documentNumber: input.documentNumber, // In production, encrypt this
            issuingCountry: input.issuingCountry,
            issueDate: input.issueDate || null,
            expiryDate: input.expiryDate,
            documentImages: input.documentImages,
            verificationMethod: "MANUAL_REVIEW", // Will be updated after review
            verificationProvider: null,
            verifiedBy: null,
            verifiedDate: null,
          },
          ":kycStatus": "IN_PROGRESS",
          ":verificationLevel": "ID_VERIFIED",
          ":updatedAt": now,
        },
        ReturnValues: "ALL_NEW",
      })
    );

    logger.info("Identity document submitted successfully", {
      investorId: input.investorId,
      documentType: input.documentType,
    });

    // TODO: Trigger KYC review workflow
    // - Send notification to compliance team
    // - Create audit log entry
    // - If using third-party service (Onfido, Jumio), initiate verification

    return {
      success: true,
      message:
        "Identity document submitted successfully. Our compliance team will review it shortly.",
      kycStatus: "IN_PROGRESS",
      estimatedReviewTime: "1-3 business days",
    };
  } catch (error) {
    logger.error("Error submitting identity document", error);
    throw error;
  }
};
