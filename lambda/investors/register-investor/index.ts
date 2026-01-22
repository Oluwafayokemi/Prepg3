// lambda/investors/register-investor/index.ts

import { PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "@shared/db/client";
import { Logger } from "@shared/utils/logger";
import { validateRequired, validateEmail } from "@shared/utils/validators";
import { ValidationError, ConflictError } from "@shared/utils/errors";
import type { AppSyncEvent } from "../../shared/types";
import { v4 as uuidv4 } from "uuid";
import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  AdminConfirmSignUpCommand,
} from "@aws-sdk/client-cognito-identity-provider";

const logger = new Logger("RegisterInvestor");
const cognitoClient = new CognitoIdentityProviderClient({});

interface RegisterInvestorInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  dateOfBirth: string; // AWSDate format: YYYY-MM-DD
  address: {
    addressLine1: string;
    addressLine2?: string;
    city: string;
    county?: string;
    postcode: string;
    country: string;
    residencySince?: string;
    isCurrentAddress: boolean;
  };
  investorType: string; // INDIVIDUAL, JOINT, COMPANY, etc.
  marketingConsent: boolean;
  termsAccepted: boolean;
}

interface RegistrationResponse {
  investor: any;
  message: string;
  nextSteps: string[];
}

export const handler = async (event: AppSyncEvent): Promise<RegistrationResponse> => {
  logger.info("Registering new investor", { email: event.arguments.input.email });

  try {
    const input: RegisterInvestorInput = event.arguments.input;

    // Validate required fields
    validateRequired(input.email, "email");
    validateRequired(input.password, "password");
    validateRequired(input.firstName, "firstName");
    validateRequired(input.lastName, "lastName");
    validateRequired(input.phone, "phone");
    validateRequired(input.dateOfBirth, "dateOfBirth");
    validateRequired(input.investorType, "investorType");
    validateEmail(input.email);

    // Validate terms acceptance
    if (!input.termsAccepted) {
      throw new ValidationError("You must accept the terms and conditions to register");
    }

    // Validate address
    validateRequired(input.address?.addressLine1, "address.addressLine1");
    validateRequired(input.address?.city, "address.city");
    validateRequired(input.address?.postcode, "address.postcode");
    validateRequired(input.address?.country, "address.country");

    // Validate age (must be 18+)
    const birthDate = new Date(input.dateOfBirth);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    if (age < 18) {
      throw new ValidationError("You must be at least 18 years old to register");
    }

    const email = input.email.toLowerCase().trim();

    // Check if email already exists in DynamoDB
    const existingInvestor = await docClient.send(
      new QueryCommand({
        TableName: process.env.INVESTORS_TABLE!,
        IndexName: "byEmail",
        KeyConditionExpression: "email = :email",
        ExpressionAttributeValues: {
          ":email": email,
        },
        Limit: 1,
      })
    );

    if (existingInvestor.Items && existingInvestor.Items.length > 0) {
      throw new ConflictError("An account with this email already exists");
    }

    const investorId = uuidv4();
    const now = new Date().toISOString();

    // Create Cognito user account
    try {
      logger.info("Creating Cognito user", { email });

      const signUpResult = await cognitoClient.send(
        new SignUpCommand({
          ClientId: process.env.COGNITO_CLIENT_ID!,
          Username: email,
          Password: input.password,
          UserAttributes: [
            { Name: "email", Value: email },
            { Name: "given_name", Value: input.firstName.trim() },
            { Name: "family_name", Value: input.lastName.trim() },
            { Name: "phone_number", Value: input.phone.trim() },
            { Name: "custom:investor_id", Value: investorId },
            { Name: "birthdate", Value: input.dateOfBirth },
          ],
        })
      );

      logger.info("Cognito user created", { userSub: signUpResult.UserSub });

      // Auto-confirm for now (in production, send email verification)
      // await cognitoClient.send(
      //   new AdminConfirmSignUpCommand({
      //     UserPoolId: process.env.USER_POOL_ID!,
      //     Username: email,
      //   })
      // );

    } catch (cognitoError: any) {
      logger.error("Error creating Cognito user", cognitoError);

      if (cognitoError.name === "UsernameExistsException") {
        throw new ConflictError("An account with this email already exists");
      }

      throw new ValidationError(
        `Failed to create user account: ${cognitoError.message}`
      );
    }

    // Create investor record in DynamoDB
    const investor = {
      id: investorId,
      
      // Basic Information
      email,
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      phone: input.phone.trim(),
      dateOfBirth: input.dateOfBirth,
      
      // Address
      address: {
        addressLine1: input.address.addressLine1.trim(),
        addressLine2: input.address.addressLine2?.trim() || null,
        city: input.address.city.trim(),
        county: input.address.county?.trim() || null,
        postcode: input.address.postcode.trim().toUpperCase(),
        country: input.address.country.trim(),
        residencySince: input.address.residencySince || now.split('T')[0],
        isCurrentAddress: input.address.isCurrentAddress ?? true,
      },
      
      // Investor Type
      investorType: input.investorType,
      investorCategory: "RETAIL", // Default to retail, can be upgraded
      
      // Investment Information (defaults)
      totalInvested: 0,
      portfolioValue: 0,
      totalROI: 0,
      
      // KYC Status (pending verification)
      kycStatus: "PENDING",
      amlCheckStatus: "PENDING",
      sanctionsCheckStatus: "NOT_CHECKED",
      verificationLevel: "EMAIL_VERIFIED",
      
      // Account Status
      accountStatus: "PENDING_VERIFICATION",
      accountTier: "BASIC",
      emailVerified: false, // Will be true after email confirmation
      phoneVerified: false,
      
      // Consents
      marketingConsent: input.marketingConsent,
      dataProcessingConsent: true,
      termsAcceptedDate: now,
      privacyPolicyAcceptedDate: now,
      
      // Communication Preferences (defaults)
      communicationPreferences: {
        receiveEmail: true,
        receiveSMS: false,
        receivePhone: false,
        receivePost: false,
        emailFrequency: "REAL_TIME",
        preferredLanguage: "en-GB",
      },
      
      // Metadata
      createdAt: now,
      updatedAt: now,
    };

    await docClient.send(
      new PutCommand({
        TableName: process.env.INVESTORS_TABLE!,
        Item: investor,
        ConditionExpression: "attribute_not_exists(id)",
      })
    );

    logger.info("Investor registered successfully", {
      investorId: investor.id,
      email: investor.email,
    });

    // Prepare response
    const response: RegistrationResponse = {
      investor,
      message: "Registration successful! Please check your email to verify your account.",
      nextSteps: [
        "Verify your email address",
        "Complete your investor profile",
        "Submit identity documents for KYC verification",
        "Add bank account details",
        "Start investing!",
      ],
    };

    return response;

  } catch (error) {
    logger.error("Error registering investor", error);
    throw error;
  }
};