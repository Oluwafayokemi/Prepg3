"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
// lambda/transactions/list-transactions/index.ts
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const client_1 = require("@shared/db/client");
const logger_1 = require("@shared/utils/logger");
const errors_1 = require("@shared/utils/errors");
const logger = new logger_1.Logger('ListTransactions');
const handler = async (event) => {
    logger.info('Listing transactions', { event });
    try {
        const input = event.arguments;
        // Authorization check
        const groups = event.identity.claims['cognito:groups'] || [];
        const isAdmin = groups.includes('Admin');
        const currentInvestorId = event.identity.claims['custom:investorId'];
        if (!isAdmin && input.investorId && currentInvestorId !== input.investorId) {
            throw new errors_1.UnauthorizedError('You can only view your own transactions');
        }
        let result;
        if (input.investorId) {
            // Query by investor
            result = await client_1.docClient.send(new lib_dynamodb_1.QueryCommand({
                TableName: process.env.TRANSACTIONS_TABLE,
                IndexName: 'byInvestor',
                KeyConditionExpression: 'investorId = :investorId',
                ExpressionAttributeValues: {
                    ':investorId': input.investorId,
                },
                ScanIndexForward: false,
                Limit: input.limit || 50,
                ExclusiveStartKey: input.nextToken ? JSON.parse(input.nextToken) : undefined,
            }));
        }
        else if (input.type) {
            // Query by type (admin only)
            if (!isAdmin) {
                throw new errors_1.UnauthorizedError('Only administrators can filter by transaction type');
            }
            result = await client_1.docClient.send(new lib_dynamodb_1.QueryCommand({
                TableName: process.env.TRANSACTIONS_TABLE,
                IndexName: 'byType',
                KeyConditionExpression: '#type = :type',
                ExpressionAttributeNames: {
                    '#type': 'type',
                },
                ExpressionAttributeValues: {
                    ':type': input.type,
                },
                ScanIndexForward: false,
                Limit: input.limit || 50,
                ExclusiveStartKey: input.nextToken ? JSON.parse(input.nextToken) : undefined,
            }));
        }
        else {
            throw new Error('Either investorId or type must be provided');
        }
        const transactions = result.Items || [];
        const nextToken = result.LastEvaluatedKey
            ? JSON.stringify(result.LastEvaluatedKey)
            : null;
        logger.info(`Retrieved ${transactions.length} transactions`);
        return {
            items: transactions,
            nextToken,
        };
    }
    catch (error) {
        logger.error('Error listing transactions', error);
        return (0, errors_1.handleError)(error);
    }
};
exports.handler = handler;
//# sourceMappingURL=index.js.map