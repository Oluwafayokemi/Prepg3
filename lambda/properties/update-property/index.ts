// VERSIONED UPDATE - Never overwrites, always creates new version

import { PutCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "@shared/db/client";
import { Logger } from "@shared/utils/logger";
import { validateRequired } from "@shared/utils/validators";
import { ChangeReasonHandler } from "@shared/utils/change-reason-handler";
import {
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "@shared/utils/errors";
import type { AppSyncEvent } from "../../shared/types";
import { PermissionChecker } from "@shared/utils/permissions";

const logger = new Logger("UpdateProperty");

interface UpdatePropertyInput {
  id: string;

  // Basic Information
  propertyName?: string;
  description?: string;
  developmentName?: string;

  // Location
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  county?: string;
  postcode?: string;
  country?: string;

  // Property Details
  propertyType?: string;
  bedrooms?: number;
  bathrooms?: number;
  squareFeet?: number;
  yearBuilt?: number;

  // Financial Information
  purchasePrice?: number;
  currentValue?: number;
  estimatedRentalIncome?: number;
  annualAppreciation?: number;

  // Investment Details
  totalShares?: number;
  pricePerShare?: number;
  minimumInvestment?: number;
  maximumInvestment?: number;
  targetFundingAmount?: number;

  // Status (Admin only)
  status?: string;
  listingStatus?: string;

  // Dates
  acquisitionDate?: string;
  listingDate?: string;
  fundingDeadline?: string;

  // Media
  images?: string[];
  documents?: string[];
  virtualTourUrl?: string;

  // Features
  features?: string[];
  amenities?: string[];

  // Risks
  riskLevel?: string;
  riskFactors?: string[];

  // Admin
  notes?: string;

  // Change tracking (REQUIRED for critical fields)
  changeReason?: string;
}

export const handler = async (event: AppSyncEvent) => {
  logger.info("Updating property", { event });

  try {
    const input: UpdatePropertyInput = event.arguments.input;
    validateRequired(input.id, "id");

    // Get user context
    const userId = PermissionChecker.getUserId(event);
    const userEmail = PermissionChecker.getUserEmail(event);
    const isPropertyManager = PermissionChecker.isPropertyManager(event);
    const isAdmin = PermissionChecker.isAdmin(event);
    
    if (!userId) {
      throw new UnauthorizedError("Not authenticated");
    }

    // Only admins and property managers can update properties
    if (!isPropertyManager) {
      throw new UnauthorizedError(
        "Only admins or property managers can update properties",
      );
    }

    // STEP 1: Get current version
    const currentResult = await docClient.send(
      new QueryCommand({
        TableName: process.env.PROPERTIES_TABLE!,
        IndexName: "currentVersions",
        KeyConditionExpression: "id = :id AND isCurrent = :current",
        ExpressionAttributeValues: {
          ":id": input.id,
          ":current": "CURRENT",
        },
        Limit: 1,
      }),
    );

    if (!currentResult.Items || currentResult.Items.length === 0) {
      throw new NotFoundError("Property not found");
    }

    const currentVersion = currentResult.Items[0];

    // STEP 2: Validate field permissions
    validateFieldPermissions(input, isAdmin);

    // STEP 3: Validate inputs
    validateInputs(input);

    // STEP 4: Calculate what changed
    const changedFields: string[] = [];
    const newData: any = { ...currentVersion };

    Object.keys(input).forEach((key) => {
      if (key === "id" || key === "changeReason") return;

      const newValue = input[key as keyof UpdatePropertyInput];
      const currentValue = currentVersion[key];

      if (
        newValue !== undefined &&
        JSON.stringify(newValue) !== JSON.stringify(currentValue)
      ) {
        newData[key] = newValue;
        changedFields.push(key);
      }
    });

    if (changedFields.length === 0) {
      logger.info("No changes detected");
      return currentVersion;
    }

    logger.info("Fields changed", { changedFields });

    // STEP 5: Get/validate change reason
    const changeReason = ChangeReasonHandler.getChangeReason(
      changedFields,
      input.changeReason,
      { userId: userEmail || userId },
    );

    const now = new Date().toISOString();
    const newVersionNumber = (currentVersion.version || 0) + 1;

    // STEP 6: Create new version record
    const newVersion = {
      ...newData,
      id: input.id,
      version: newVersionNumber,
      isCurrent: "CURRENT",
      updatedAt: now,
      updatedBy: userEmail || userId,
      changedFields,
      changeReason,
      previousVersion: currentVersion.version,
      entityType: "PROPERTY",
    };

    // STEP 7: Atomic operations
    // First: Mark old version as HISTORICAL
    await docClient.send(
      new UpdateCommand({
        TableName: process.env.PROPERTIES_TABLE!,
        Key: {
          id: input.id,
          version: currentVersion.version,
        },
        UpdateExpression: "SET isCurrent = :historical",
        ExpressionAttributeValues: {
          ":historical": "HISTORICAL",
        },
      }),
    );

    // Second: INSERT new version
    await docClient.send(
      new PutCommand({
        TableName: process.env.PROPERTIES_TABLE!,
        Item: newVersion,
      }),
    );

    logger.info("Property updated successfully", {
      propertyId: input.id,
      version: newVersionNumber,
      changedFields,
      reason: changeReason,
    });

    return newVersion;
  } catch (error) {
    logger.error("Error updating property", error);
    throw error;
  }
};

// Helper: Validate field-level permissions
function validateFieldPermissions(
  input: UpdatePropertyInput,
  isAdmin: boolean,
): void {
  // Status changes - Admin only
  if (input.status !== undefined && !isAdmin) {
    throw new UnauthorizedError("Only admins can change property status");
  }

  if (input.listingStatus !== undefined && !isAdmin) {
    throw new UnauthorizedError("Only admins can change listing status");
  }

  // Financial changes - Admin only
  if (input.currentValue !== undefined && !isAdmin) {
    throw new UnauthorizedError("Only admins can update current value");
  }

  if (input.pricePerShare !== undefined && !isAdmin) {
    throw new UnauthorizedError("Only admins can change price per share");
  }

  // Shares - Admin only
  if (input.totalShares !== undefined && !isAdmin) {
    throw new UnauthorizedError("Only admins can change total shares");
  }
}

// Helper: Validate inputs
function validateInputs(input: UpdatePropertyInput): void {
  // Name validation
  if (input.propertyName !== undefined && !input.propertyName.trim()) {
    throw new ValidationError("Property name cannot be empty");
  }

  // Postcode validation (UK format)
  if (input.postcode) {
    const postcodeRegex = /^[A-Z]{1,2}[0-9]{1,2}[A-Z]?\s?[0-9][A-Z]{2}$/i;
    if (!postcodeRegex.test(input.postcode)) {
      throw new ValidationError("Invalid UK postcode format");
    }
  }

  // Financial validation
  if (input.purchasePrice !== undefined && input.purchasePrice < 0) {
    throw new ValidationError("Purchase price cannot be negative");
  }

  if (input.currentValue !== undefined && input.currentValue < 0) {
    throw new ValidationError("Current value cannot be negative");
  }

  if (input.pricePerShare !== undefined && input.pricePerShare <= 0) {
    throw new ValidationError("Price per share must be positive");
  }

  // Bedrooms/bathrooms validation
  if (
    input.bedrooms !== undefined &&
    (input.bedrooms < 0 || input.bedrooms > 20)
  ) {
    throw new ValidationError("Bedrooms must be between 0 and 20");
  }

  if (
    input.bathrooms !== undefined &&
    (input.bathrooms < 0 || input.bathrooms > 20)
  ) {
    throw new ValidationError("Bathrooms must be between 0 and 20");
  }

  // Shares validation
  if (input.totalShares !== undefined && input.totalShares <= 0) {
    throw new ValidationError("Total shares must be positive");
  }
}
