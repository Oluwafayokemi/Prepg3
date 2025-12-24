"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
// lambda/investors/create-investor/index.ts
const client_cognito_identity_provider_1 = require("@aws-sdk/client-cognito-identity-provider");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const client_1 = require("../../shared/db/client");
const logger_1 = require("../../shared/utils/logger");
const validators_1 = require("../../shared/utils/validators");
const errors_1 = require("../../shared/utils/errors");
const uuid_1 = require("uuid");
const logger = new logger_1.Logger("CreateInvestor");
const cognito = new client_cognito_identity_provider_1.CognitoIdentityProviderClient({});
const handler = async (event) => {
    logger.info("Creating investor", { event });
    try {
        const input = event.arguments.input;
        // Validate inputs
        (0, validators_1.validateRequired)(input.email, "email");
        (0, validators_1.validateEmail)(input.email);
        (0, validators_1.validateRequired)(input.firstName, "firstName");
        (0, validators_1.validateRequired)(input.lastName, "lastName");
        (0, validators_1.validateRequired)(input.temporaryPassword, "temporaryPassword");
        // Check authorization (only admins can create investors)
        const groups = event.identity.claims["cognito:groups"] || [];
        if (!groups.includes("Admin")) {
            throw new Error("Only administrators can create investors");
        }
        const investorId = (0, uuid_1.v4)();
        const now = new Date().toISOString();
        // 1. Create Cognito user
        logger.info("Creating Cognito user", { email: input.email });
        const createUserCommand = new client_cognito_identity_provider_1.AdminCreateUserCommand({
            UserPoolId: process.env.USER_POOL_ID,
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
        const setPasswordCommand = new client_cognito_identity_provider_1.AdminSetUserPasswordCommand({
            UserPoolId: process.env.USER_POOL_ID,
            Username: input.email,
            Password: input.temporaryPassword,
            Permanent: false, // User must change on first login
        });
        await cognito.send(setPasswordCommand);
        // 3. Add user to Investor group
        const addToGroupCommand = new client_cognito_identity_provider_1.AdminAddUserToGroupCommand({
            UserPoolId: process.env.USER_POOL_ID,
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
        await client_1.docClient.send(new lib_dynamodb_1.PutCommand({
            TableName: process.env.INVESTORS_TABLE,
            Item: investor,
        }));
        logger.info("Investor created successfully", { investorId });
        return investor;
    }
    catch (error) {
        logger.error("Error creating investor", error);
        return (0, errors_1.handleError)(error);
    }
};
exports.handler = handler;
//# sourceMappingURL=index.js.map