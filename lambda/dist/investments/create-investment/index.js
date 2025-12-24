"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
// lambda/investments/create-investment/index.ts
// lambda/investments/create-investment/index.ts
const client_1 = require("@shared/db/client");
const logger_1 = require("@shared/utils/logger");
const validators_1 = require("@shared/utils/validators");
const errors_1 = require("@shared/utils/errors");
const uuid_1 = require("uuid");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const logger = new logger_1.Logger('CreateInvestment');
const handler = async (event) => {
    logger.info("Creating investment", { event });
    try {
        const input = event.arguments.input;
        // Validate inputs
        (0, validators_1.validateRequired)(input.investorId, "investorId");
        (0, validators_1.validateRequired)(input.propertyId, "propertyId");
        (0, validators_1.validatePositiveNumber)(input.investmentAmount, "investmentAmount");
        (0, validators_1.validatePercentage)(input.equityPercentage, "equityPercentage");
        // Authorization check
        const groups = event.identity.claims["cognito:groups"] || [];
        const isAdmin = groups.includes("Admin");
        const currentInvestorId = event.identity.claims["custom:investorId"];
        if (!isAdmin && currentInvestorId !== input.investorId) {
            throw new Error("You can only create investments for yourself");
        }
        const investmentId = (0, uuid_1.v4)();
        const now = new Date().toISOString();
        const today = now.split("T")[0];
        // 1. Verify investor exists
        const investorResult = await client_1.docClient.send(new lib_dynamodb_1.GetCommand({
            TableName: process.env.INVESTORS_TABLE,
            Key: { id: input.investorId },
        }));
        if (!investorResult.Item) {
            throw new errors_1.NotFoundError("Investor");
        }
        // 2. Verify property exists
        const propertyResult = await client_1.docClient.send(new lib_dynamodb_1.GetCommand({
            TableName: process.env.PROPERTIES_TABLE,
            Key: { id: input.propertyId },
        }));
        if (!propertyResult.Item) {
            throw new errors_1.NotFoundError("Property");
        }
        // 3. Create investment record
        const investment = {
            id: investmentId,
            investorId: input.investorId,
            propertyId: input.propertyId,
            investmentAmount: input.investmentAmount,
            equityPercentage: input.equityPercentage,
            investmentDate: today,
            currentValue: input.investmentAmount, // Initially same as investment
            roi: 0, // Will be calculated by ROI Lambda
            status: "ACTIVE",
            createdAt: now,
            updatedAt: now,
        };
        await client_1.docClient.send(new lib_dynamodb_1.PutCommand({
            TableName: process.env.INVESTMENTS_TABLE,
            Item: investment,
        }));
        logger.info("Investment record created", { investmentId });
        // 4. Update property totalInvested
        await client_1.docClient.send(new lib_dynamodb_1.UpdateCommand({
            TableName: process.env.PROPERTIES_TABLE,
            Key: { id: input.propertyId },
            UpdateExpression: "SET totalInvested = if_not_exists(totalInvested, :zero) + :amount, updatedAt = :now",
            ExpressionAttributeValues: {
                ":amount": input.investmentAmount,
                ":zero": 0,
                ":now": now,
            },
        }));
        logger.info("Property updated with investment", {
            propertyId: input.propertyId,
        });
        // 5. Update investor totalInvested
        await client_1.docClient.send(new lib_dynamodb_1.UpdateCommand({
            TableName: process.env.INVESTORS_TABLE,
            Key: { id: input.investorId },
            UpdateExpression: "SET totalInvested = if_not_exists(totalInvested, :zero) + :amount, updatedAt = :now",
            ExpressionAttributeValues: {
                ":amount": input.investmentAmount,
                ":zero": 0,
                ":now": now,
            },
        }));
        logger.info("Investor updated with investment", {
            investorId: input.investorId,
        });
        // 6. Create transaction record
        const transaction = {
            id: (0, uuid_1.v4)(),
            investorId: input.investorId,
            propertyId: input.propertyId,
            type: "INVESTMENT",
            amount: input.investmentAmount,
            description: `Investment in property at ${propertyResult.Item.address}`,
            date: today,
            reference: investmentId,
            createdAt: now,
        };
        await client_1.docClient.send(new lib_dynamodb_1.PutCommand({
            TableName: process.env.TRANSACTIONS_TABLE,
            Item: transaction,
        }));
        logger.info("Transaction record created");
        // 7. Create notification
        const notification = {
            id: (0, uuid_1.v4)(),
            investorId: input.investorId,
            title: "Investment Confirmed",
            message: `Your investment of £${input.investmentAmount.toLocaleString()} in ${propertyResult.Item.address} has been confirmed.`,
            type: "INVESTMENT_UPDATE",
            isRead: false,
            createdAt: now,
            link: `/investments/${investmentId}`,
            ttl: Math.floor(Date.now() / 1000) + 90 * 24 * 60 * 60, // 90 days
        };
        await client_1.docClient.send(new lib_dynamodb_1.PutCommand({
            TableName: process.env.NOTIFICATIONS_TABLE,
            Item: notification,
        }));
        logger.info("Notification created");
        logger.info("Investment created successfully", { investmentId });
        return investment;
    }
    catch (error) {
        logger.error("Error creating investment", error);
        return (0, errors_1.handleError)(error);
    }
};
exports.handler = handler;
//# sourceMappingURL=index.js.map