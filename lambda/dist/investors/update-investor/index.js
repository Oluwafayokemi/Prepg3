"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
// lambda/investors/update-investor/index.ts
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const client_1 = require("@shared/db/client");
const logger_1 = require("@shared/utils/logger");
const validators_1 = require("@shared/utils/validators");
const errors_1 = require("@shared/utils/errors");
const logger = new logger_1.Logger('UpdateInvestor');
const handler = async (event) => {
    logger.info('Updating investor', { event });
    try {
        const input = event.arguments.input;
        // Validate inputs
        (0, validators_1.validateRequired)(input.id, 'id');
        // Authorization check
        const groups = event.identity.claims['cognito:groups'] || [];
        const isAdmin = groups.includes('Admin');
        const currentInvestorId = event.identity.claims['custom:investorId'];
        if (!isAdmin && currentInvestorId !== input.id) {
            throw new errors_1.UnauthorizedError('You can only update your own profile');
        }
        // Verify investor exists
        const existingInvestor = await client_1.docClient.send(new lib_dynamodb_1.GetCommand({
            TableName: process.env.INVESTORS_TABLE,
            Key: { id: input.id },
        }));
        if (!existingInvestor.Item) {
            throw new errors_1.NotFoundError('Investor');
        }
        const now = new Date().toISOString();
        // Build update expression dynamically
        const updateExpressions = ['updatedAt = :now'];
        const expressionAttributeValues = { ':now': now };
        if (input.firstName !== undefined) {
            updateExpressions.push('firstName = :firstName');
            expressionAttributeValues[':firstName'] = input.firstName;
        }
        if (input.lastName !== undefined) {
            updateExpressions.push('lastName = :lastName');
            expressionAttributeValues[':lastName'] = input.lastName;
        }
        if (input.phone !== undefined) {
            updateExpressions.push('phone = :phone');
            expressionAttributeValues[':phone'] = input.phone;
        }
        // Update investor
        const result = await client_1.docClient.send(new lib_dynamodb_1.UpdateCommand({
            TableName: process.env.INVESTORS_TABLE,
            Key: { id: input.id },
            UpdateExpression: `SET ${updateExpressions.join(', ')}`,
            ExpressionAttributeValues: expressionAttributeValues,
            ReturnValues: 'ALL_NEW',
        }));
        logger.info('Investor updated successfully', { investorId: input.id });
        return result.Attributes;
    }
    catch (error) {
        logger.error('Error updating investor', error);
        return (0, errors_1.handleError)(error);
    }
};
exports.handler = handler;
//# sourceMappingURL=index.js.map