import { UpdateCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "@shared/db/client";
import { Logger } from "@shared/utils/logger";
import { validateRequired } from "@shared/utils/validators";
import {
  ValidationError,
  UnauthorizedError,
  NotFoundError,
} from "@shared/utils/errors";
import { MetricsService } from "@shared/utils/metrics";
import type { AppSyncEvent } from "../../shared/types";
import { kycVerificationService } from "@shared/services/kyc-verification-service";
import { PermissionChecker } from "@shared/utils/permissions";

const logger = new Logger("SubmitIdentityDocument");

interface SubmitIdentityInput {
  investorId: string;
  documentType: string;
  documentNumber: string;
  issuingCountry: string;
  issueDate?: string;
  expiryDate: string;
  documentImages: string[];
}

interface KYCSubmissionResponse {
  success: boolean;
  message: string;
  kycStatus: string;
  verificationMethod: string;
  estimatedReviewTime?: string;
}

export const handler = async (
  event: AppSyncEvent
): Promise<KYCSubmissionResponse> => {
  logger.info("Submitting identity document", { event });

  try {
    const input: SubmitIdentityInput = event.arguments.input;

    validateRequired(input.investorId, "investorId");
    validateRequired(input.documentType, "documentType");
    validateRequired(input.documentNumber, "documentNumber");
    validateRequired(input.issuingCountry, "issuingCountry");
    validateRequired(input.expiryDate, "expiryDate");
    validateRequired(input.documentImages, "documentImages");

    if (!input.documentImages || input.documentImages.length === 0) {
      throw new ValidationError("At least one document image is required");
    }

    // Validate expiry date
    const expiryDate = new Date(input.expiryDate);
    const today = new Date();
    if (expiryDate <= today) {
      throw new ValidationError(
        "Document has expired. Please provide a valid document."
      );
    }

    // Authorization check
    const userId = PermissionChecker.getUserId(event);
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

    const investor = getResult.Item;

    // Check authorization
    const investorUserId = investor.userId || investor.id;
    const isAdmin = PermissionChecker.isAdmin(event);

    if (investorUserId !== userId && !isAdmin) {
      throw new UnauthorizedError(
        "You can only submit documents for your own account"
      );
    }

    const now = new Date().toISOString();
    logger.info("Authorization passed");

    // ============================================
    // USE KYC VERIFICATION SERVICE
    // ============================================

    const verificationResult = await kycVerificationService.verify({
      investorId: input.investorId,
      firstName: investor.firstName,
      lastName: investor.lastName,
      email: investor.email,
      dateOfBirth: investor.dateOfBirth,
      documents: {
        identityDocument: {
          type: input.documentType,
          images: input.documentImages,
          documentNumber: input.documentNumber,
          expiryDate: input.expiryDate,
        },
        proofOfAddress: investor.proofOfAddress || {},
      },
    });

    await MetricsService.logKYCVerificationMethod(
      verificationResult.method,
      verificationResult.status
    );

    logger.info("Verification result", verificationResult);

    // ============================================
    // UPDATE INVESTOR RECORD
    // ============================================

    const updateExpression: string[] = [];
    const attributeNames: Record<string, string> = {};
    const attributeValues: Record<string, any> = {};

    // Store document details
    updateExpression.push("#identityVerification = :identityVerification");
    attributeNames["#identityVerification"] = "identityVerification";
    attributeValues[":identityVerification"] = {
      documentType: input.documentType,
      documentNumber: input.documentNumber,
      issuingCountry: input.issuingCountry,
      issueDate: input.issueDate || null,
      expiryDate: input.expiryDate,
      documentImages: input.documentImages,
      verificationMethod: verificationResult.method,
      verificationProvider: verificationResult.provider || null,
      checkId: verificationResult.checkId || null,
      submittedAt: now,
    };

    // Update KYC status based on verification result
    updateExpression.push("#kycStatus = :kycStatus");
    attributeNames["#kycStatus"] = "kycStatus";
    attributeValues[":kycStatus"] = verificationResult.status;

    // Update verification level
    updateExpression.push("#verificationLevel = :verificationLevel");
    attributeNames["#verificationLevel"] = "verificationLevel";
    attributeValues[":verificationLevel"] = "ID_SUBMITTED";

    // Update timestamp
    updateExpression.push("#updatedAt = :updatedAt");
    attributeNames["#updatedAt"] = "updatedAt";
    attributeValues[":updatedAt"] = now;

    await docClient.send(
      new UpdateCommand({
        TableName: process.env.INVESTORS_TABLE!,
        Key: { id: input.investorId },
        UpdateExpression: `SET ${updateExpression.join(", ")}`,
        ExpressionAttributeNames: attributeNames,
        ExpressionAttributeValues: attributeValues,
        ReturnValues: "ALL_NEW",
      })
    );

    logger.info("Identity document submitted successfully", {
      investorId: input.investorId,
      method: verificationResult.method,
      status: verificationResult.status,
    });

    // ============================================
    // PREPARE RESPONSE BASED ON METHOD
    // ============================================

    let message: string;
    let estimatedReviewTime: string | undefined;

    if (verificationResult.method === "AUTOMATED") {
      if (verificationResult.status === "APPROVED") {
        message = "Identity verified successfully! Your account is now active.";
      } else if (verificationResult.status === "IN_PROGRESS") {
        message =
          "Identity verification in progress. You'll receive a notification shortly.";
        estimatedReviewTime = "1-5 minutes";
      } else if (verificationResult.reviewRequired) {
        message =
          "Your documents require manual review. Our team will review them shortly.";
        estimatedReviewTime = "1-3 business days";
      } else {
        message =
          "Identity verification failed. Please check the issues and resubmit.";
      }
    } else {
      // Manual
      message =
        "Identity document submitted successfully. Our compliance team will review it shortly.";
      estimatedReviewTime = "1-3 business days";
    }

    return {
      success: true,
      message,
      kycStatus: verificationResult.status,
      verificationMethod: verificationResult.method,
      estimatedReviewTime,
    };
  } catch (error) {
    logger.error("Error submitting identity document", error);
    throw error;
  }
};
