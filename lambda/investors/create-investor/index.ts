// lambda/investors/create-investor/index.ts
import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  AdminAddUserToGroupCommand,
} from "@aws-sdkclient-cognito-identity-provider";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "../../shared/db/client";
import { Logger } from "../../shared/utils/logger";
import { validateEmail, validateRequired } from "../../shared/utils/validators";
import { handleError } from "../../shared/utils/errors";
import { v4 as uuidv4 } from "uuid";
import type { AppSyncEvent } from "../../shared/types";

const logger = new Logger("CreateInvestor");
const cognito = new CognitoIdentityProviderClient({});

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

    // Validate inputs
    validateRequired(input.email, "email");
    validateEmail(input.email);
    validateRequired(input.firstName, "firstName");
    validateRequired(input.lastName, "lastName");
    validateRequired(input.temporaryPassword, "temporaryPassword");

    // Check authorization (only admins can create investors)
    const groups = event.identity.claims["cognito:groups"] || [];
    if (!groups.includes("Admin")) {
      throw new Error("Only administrators can create investors");
    }

    const investorId = uuidv4();
    const now = new Date().toISOString();

    // 1. Create Cognito user
    logger.info("Creating Cognito user", { email: input.email });

    const createUserCommand = new AdminCreateUserCommand({
      UserPoolId: process.env.USER_POOL_ID!,
      Username: input.email,
      UserAttributes: [
        { Name: "email", Value: input.email },
        { Name: "email_verified", Value: "true" },
        { Name: "given_name", Value: input.firstName },
        { Name: "family_name", Value: input.lastName },
        { Name: "custom:investorId", Value: investorId },
        { Name: "custom:role", Value: "Investor" },
        ...(input.phone ? [{ Name: "phone_number", Value: input.phone }] : []),
      ],
      TemporaryPassword: input.temporaryPassword,
      MessageAction: "SUPPRESS", // Don't send welcome email (we'll send custom one)
    });

    const cognitoUser = await cognito.send(createUserCommand);
    logger.info("Cognito user created", {
      username: cognitoUser.User?.Username,
    });

    // 2. Set permanent password
    const setPasswordCommand = new AdminSetUserPasswordCommand({
      UserPoolId: process.env.USER_POOL_ID!,
      Username: input.email,
      Password: input.temporaryPassword,
      Permanent: false, // User must change on first login
    });

    await cognito.send(setPasswordCommand);

    // 3. Add user to Investor group
    const addToGroupCommand = new AdminAddUserToGroupCommand({
      UserPoolId: process.env.USER_POOL_ID!,
      Username: input.email,
      GroupName: "Investor",
    });

    await cognito.send(addToGroupCommand);
    logger.info("User added to Investor group");

    // 4. Create investor record in DynamoDB
    const investor = {
      id: investorId,
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone || null,
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
      })
    );

    logger.info("Investor created successfully", { investorId });

    return investor;
  } catch (error) {
    logger.error("Error creating investor", error);
    return handleError(error);
  }
};
