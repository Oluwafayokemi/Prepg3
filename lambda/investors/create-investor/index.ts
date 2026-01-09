// lambda/investors/create-investor/index.ts

import { PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "@shared/db/client";
import { Logger } from "@shared/utils/logger";
import { validateRequired, validateEmail } from "@shared/utils/validators";
import {
  ValidationError,
  UnauthorizedError,
  ConflictError,
} from "@shared/utils/errors";
import type { AppSyncEvent } from "../../shared/types";
import { v4 as uuidv4 } from "uuid";
import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminAddUserToGroupCommand,
  MessageActionType,
} from "@aws-sdk/client-cognito-identity-provider";

const logger = new Logger("CreateInvestor");
const cognitoClient = new CognitoIdentityProviderClient({});

interface CreateInvestorInput {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  temporaryPassword: string;
}

export const handler = async (event: AppSyncEvent) => {
  logger.info("Creating investor", { event });

  try {
    const input: CreateInvestorInput = event.arguments.input;

    // Validate required fields
    validateRequired(input.email, "email");
    validateRequired(input.firstName, "firstName");
    validateRequired(input.lastName, "lastName");
    validateRequired(input.temporaryPassword, "temporaryPassword");

    // Validate email format
    validateEmail(input.email);

    // Authorization check - only admins can create investors
    const groups = event.identity?.claims?.["cognito:groups"] || [];
    const isAdmin = groups.includes("Admin");

    if (!isAdmin) {
      logger.error("Authorization failed - not an admin");
      throw new UnauthorizedError("Only admins can create investor accounts");
    }

    logger.info("Authorization passed");

    // Check if email already exists in DynamoDB
    const existingInvestorResult = await docClient.send(
      new QueryCommand({
        TableName: process.env.INVESTORS_TABLE!,
        IndexName: "byEmail",
        KeyConditionExpression: "email = :email",
        ExpressionAttributeValues: {
          ":email": input.email.toLowerCase().trim(),
        },
        Limit: 1,
      })
    );

    if (
      existingInvestorResult.Items &&
      existingInvestorResult.Items.length > 0
    ) {
      throw new ConflictError("An investor with this email already exists");
    }

    // Generate unique ID
    const investorId = uuidv4();
    const now = new Date().toISOString();

    // Create Cognito user
    try {
      logger.info("Creating Cognito user", { email: input.email });

      await cognitoClient.send(
        new AdminCreateUserCommand({
          UserPoolId: process.env.USER_POOL_ID!,
          Username: investorId, // Use investorId as username for consistency
          UserAttributes: [
            { Name: "email", Value: input.email.toLowerCase().trim() },
            { Name: "email_verified", Value: "true" },
            { Name: "given_name", Value: input.firstName },
            { Name: "family_name", Value: input.lastName },
            ...(input.phone
              ? [{ Name: "phone_number", Value: input.phone }]
              : []),
          ],
          TemporaryPassword: input.temporaryPassword,
          MessageAction: MessageActionType.SUPPRESS, // Don't send email (you can change this)
          DesiredDeliveryMediums: ["EMAIL"],
        })
      );

      logger.info("Cognito user created successfully");

      // Add user to Investors group
      await cognitoClient.send(
        new AdminAddUserToGroupCommand({
          UserPoolId: process.env.USER_POOL_ID!,
          Username: investorId,
          GroupName: "Investors",
        })
      );

      logger.info("User added to Investors group");
    } catch (cognitoError: any) {
      logger.error("Error creating Cognito user", cognitoError);

      // Handle specific Cognito errors
      if (cognitoError.name === "UsernameExistsException") {
        throw new ConflictError("A user with this email already exists");
      }

      throw new ValidationError(
        `Failed to create user account: ${cognitoError.message}`
      );
    }

    // Create investor record in DynamoDB
    const investor = {
      id: investorId,
      email: input.email.toLowerCase().trim(),
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      phone: input.phone?.trim() || null,
      address: input.address?.trim() || null,
      totalInvested: 0,
      portfolioValue: 0,
      totalROI: 0,
      createdAt: now,
      updatedAt: now,
    };

    await docClient.send(
      new PutCommand({
        TableName: process.env.INVESTORS_TABLE!,
        Item: investor,
        ConditionExpression: "attribute_not_exists(id)", // Prevent overwrite
      })
    );

    logger.info("Investor created successfully in DynamoDB", {
      investorId: investor.id,
      email: investor.email,
    });

    return investor;
  } catch (error) {
    logger.error("Error creating investor", error);
    throw error;
  }
};
