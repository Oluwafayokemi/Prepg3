import { PutCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "@shared/db/client";
import { Logger } from "@shared/utils/logger";
import { validateRequired, validateEmail } from "@shared/utils/validators";
import { ChangeReasonHandler } from "@shared/utils/change-reason-handler";
import {
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "@shared/utils/errors";
import type { AppSyncEvent } from "../../shared/types";

const logger = new Logger("UpdateInvestor");

interface UpdateInvestorInput {
  id: string;
  
  // Basic Information
  firstName?: string;
  lastName?: string;
  middleName?: string;
  title?: string;
  dateOfBirth?: string;
  
  // Contact Information
  email?: string;
  phone?: string;
  mobilePhone?: string;
  workPhone?: string;
  preferredContactMethod?: string;
  
  // Address Information
  address?: {
    addressLine1: string;
    addressLine2?: string;
    city: string;
    county?: string;
    postcode: string;
    country: string;
    residencySince?: string;
    isCurrentAddress: boolean;
  };
  mailingAddress?: any;
  
  // Employment Information
  employmentStatus?: string;
  occupation?: string;
  employer?: string;
  annualIncome?: string;
  sourceOfFunds?: string;
  sourceOfWealth?: string;
  
  // Investment Profile
  investorType?: string;
  investorCategory?: string;
  riskTolerance?: string;
  investmentObjectives?: string[];
  investmentExperience?: string;
  
  // Tax Information
  taxResidency?: string;
  isFATCAReportable?: boolean;
  
  // KYC/Compliance (Admin/Compliance only)
  kycStatus?: string;
  amlCheckStatus?: string;
  sanctionsCheckStatus?: string;
  
  // PEP Information
  isPEP?: boolean;
  pepDetails?: string;
  pepPosition?: string;
  pepCountry?: string;
  
  // Account Status (Admin only)
  accountStatus?: string;
  accountTier?: string;
  
  // Communication Preferences
  communicationPreferences?: {
    receiveEmail: boolean;
    receiveSMS: boolean;
    receivePhone: boolean;
    receivePost: boolean;
    emailFrequency: string;
    preferredLanguage: string;
  };
  
  // Consents
  marketingConsent?: boolean;
  
  // Admin notes (Admin only)
  notes?: string;
  
  // Change tracking
  changeReason?: string;
}

export const handler = async (event: AppSyncEvent) => {
  logger.info("Updating investor", { event });

  try {
    const input: UpdateInvestorInput = event.arguments.input;
    validateRequired(input.id, "id");

    // Get user context
    const userId = event.identity?.sub || event.identity?.username;
    const userEmail = event.identity?.claims?.email;
    const groups = event.identity?.claims?.["cognito:groups"] || [];
    const isAdmin = groups.includes("Admin");
    const isCompliance = groups.includes("Compliance");

    if (!userId) {
      throw new UnauthorizedError("Not authenticated");
    }

    // STEP 1: Get current version
    const currentResult = await docClient.send(
      new QueryCommand({
        TableName: process.env.INVESTORS_TABLE!,
        IndexName: "currentVersions",
        KeyConditionExpression: "id = :id AND isCurrent = :current",
        ExpressionAttributeValues: {
          ":id": input.id,
          ":current": "CURRENT",
        },
        Limit: 1,
      })
    );

    if (!currentResult.Items || currentResult.Items.length === 0) {
      throw new NotFoundError("Investor not found");
    }

    const currentVersion = currentResult.Items[0];

    // STEP 2: Authorization checks
    const investorUserId = currentVersion.userId || currentVersion.id;

    // Users can only update their own profile
    if (!isAdmin && !isCompliance && investorUserId !== userId) {
      throw new UnauthorizedError("You can only update your own profile");
    }

    // Check field-level permissions
    validateFieldPermissions(input, isAdmin, isCompliance);

    // STEP 3: Validate inputs
    validateInputs(input);

    // STEP 4: Calculate what changed
    const changedFields: string[] = [];
    const newData: any = { ...currentVersion };

    // Compare each field
    Object.keys(input).forEach((key) => {
      if (key === 'id' || key === 'changeReason') return;
      
      const newValue = input[key as keyof UpdateInvestorInput];
      const currentValue = currentVersion[key];
      
      if (newValue !== undefined && JSON.stringify(newValue) !== JSON.stringify(currentValue)) {
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
      { userId: userEmail || userId }
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
      entityType: "INVESTOR",
    };

    // STEP 7: Atomic operations
    // First: Mark old version as HISTORICAL
    await docClient.send(
      new UpdateCommand({
        TableName: process.env.INVESTORS_TABLE!,
        Key: {
          id: input.id,
          version: currentVersion.version,
        },
        UpdateExpression: "SET isCurrent = :historical",
        ExpressionAttributeValues: {
          ":historical": "HISTORICAL",
        },
      })
    );

    // Second: INSERT new version
    await docClient.send(
      new PutCommand({
        TableName: process.env.INVESTORS_TABLE!,
        Item: newVersion,
      })
    );

    logger.info("Investor updated successfully", {
      investorId: input.id,
      version: newVersionNumber,
      changedFields,
      reason: changeReason,
    });

    return newVersion;

  } catch (error) {
    logger.error("Error updating investor", error);
    throw error;
  }
};

// Helper: Validate field-level permissions
function validateFieldPermissions(
  input: UpdateInvestorInput,
  isAdmin: boolean,
  isCompliance: boolean
): void {
  // Email changes - Admin only
  if (input.email !== undefined && !isAdmin) {
    throw new UnauthorizedError("Only admins can change email addresses");
  }

  // KYC status - Admin or Compliance only
  if (input.kycStatus !== undefined && !isAdmin && !isCompliance) {
    throw new UnauthorizedError("Only admins or compliance officers can update KYC status");
  }

  // AML status - Admin or Compliance only
  if (input.amlCheckStatus !== undefined && !isAdmin && !isCompliance) {
    throw new UnauthorizedError("Only admins or compliance officers can update AML status");
  }

  // Sanctions status - Admin or Compliance only
  if (input.sanctionsCheckStatus !== undefined && !isAdmin && !isCompliance) {
    throw new UnauthorizedError("Only admins or compliance officers can update sanctions status");
  }

  // Account status - Admin only
  if (input.accountStatus !== undefined && !isAdmin) {
    throw new UnauthorizedError("Only admins can change account status");
  }

  // Account tier - Admin only
  if (input.accountTier !== undefined && !isAdmin) {
    throw new UnauthorizedError("Only admins can change account tier");
  }

  // Investor category - Admin only
  if (input.investorCategory !== undefined && !isAdmin) {
    throw new UnauthorizedError("Only admins can change investor category");
  }

  // Admin notes - Admin only
  if (input.notes !== undefined && !isAdmin) {
    throw new UnauthorizedError("Only admins can add notes");
  }
}

// Helper: Validate inputs
function validateInputs(input: UpdateInvestorInput): void {
  // Email validation
  if (input.email !== undefined) {
    validateEmail(input.email);
  }

  // Name validation
  if (input.firstName !== undefined && !input.firstName.trim()) {
    throw new ValidationError("First name cannot be empty");
  }
  if (input.lastName !== undefined && !input.lastName.trim()) {
    throw new ValidationError("Last name cannot be empty");
  }

  // Phone validation
  if (input.phone !== undefined && input.phone) {
    const phoneRegex = /^[\d\s\-\+\(\)]+$/;
    if (!phoneRegex.test(input.phone)) {
      throw new ValidationError("Invalid phone number format");
    }
  }

  // Address validation
  if (input.address !== undefined) {
    validateRequired(input.address.addressLine1, "address.addressLine1");
    validateRequired(input.address.city, "address.city");
    validateRequired(input.address.postcode, "address.postcode");
    validateRequired(input.address.country, "address.country");

    // UK postcode validation
    const postcodeRegex = /^[A-Z]{1,2}[0-9]{1,2}[A-Z]?\s?[0-9][A-Z]{2}$/i;
    if (!postcodeRegex.test(input.address.postcode)) {
      throw new ValidationError("Invalid UK postcode format");
    }
  }

  // Date of birth validation (must be 18+)
  if (input.dateOfBirth !== undefined) {
    const birthDate = new Date(input.dateOfBirth);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    if (age < 18) {
      throw new ValidationError("Investor must be at least 18 years old");
    }
  }
}