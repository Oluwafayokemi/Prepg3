"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
// lambda/transactions/create-transaction/index.ts
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const client_1 = require("../../shared/db/client");
const logger_1 = require("../../shared/utils/logger");
const validators_1 = require("../../shared/utils/validators");
const errors_1 = require("../../shared/utils/errors");
const uuid_1 = require("uuid");
const logger = new logger_1.Logger('CreateTransaction');
const handler = async (event) => {
    logger.info('Creating transaction', { event });
    try {
        const input = event.arguments.input;
        // Validate inputs
        (0, validators_1.validateRequired)(input.investorId, 'investorId');
        (0, validators_1.validateRequired)(input.type, 'type');
        (0, validators_1.validatePositiveNumber)(input.amount, 'amount');
        (0, validators_1.validateRequired)(input.description, 'description');
        // Authorization check
        const groups = event.identity.claims['cognito:groups'] || [];
        const isAdmin = groups.includes('Admin');
        const currentInvestorId = event.identity.claims['custom:investorId'];
        if (!isAdmin && currentInvestorId !== input.investorId) {
            throw new Error('You can only view your own transactions');
        }
        // Verify investor exists
        const investorResult = await client_1.docClient.send(new lib_dynamodb_1.GetCommand({
            TableName: process.env.INVESTORS_TABLE,
            Key: { id: input.investorId },
        }));
        if (!investorResult.Item) {
            throw new errors_1.NotFoundError('Investor');
        }
        const transactionId = (0, uuid_1.v4)();
        const now = new Date().toISOString();
        const transactionDate = input.date || now.split('T')[0];
        // Create transaction record
        const transaction = {
            id: transactionId,
            investorId: input.investorId,
            propertyId: input.propertyId || null,
            type: input.type,
            amount: input.amount,
            description: input.description,
            date: transactionDate,
            reference: input.reference || null,
            createdAt: now,
        };
        await client_1.docClient.send(new lib_dynamodb_1.PutCommand({
            TableName: process.env.TRANSACTIONS_TABLE,
            Item: transaction,
        }));
        logger.info('Transaction created successfully', { transactionId });
        // Update investor balance based on transaction type
        if (input.type === 'DIVIDEND' || input.type === 'PROFIT_SHARE') {
            // Positive transactions - don't update totalInvested
            logger.info('Positive transaction, no investor update needed');
        }
        else if (input.type === 'WITHDRAWAL' || input.type === 'FEE') {
            // Negative transactions
            await client_1.docClient.send(new lib_dynamodb_1.UpdateCommand({
                TableName: process.env.INVESTORS_TABLE,
                Key: { id: input.investorId },
                UpdateExpression: 'SET totalInvested = totalInvested - :amount, updatedAt = :now',
                ExpressionAttributeValues: {
                    ':amount': input.amount,
                    ':now': now,
                },
            }));
        }
        return transaction;
    }
    catch (error) {
        logger.error('Error creating transaction', error);
        return (0, errors_1.handleError)(error);
    }
};
exports.handler = handler;
//# sourceMappingURL=index.js.map