"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
// lambda/investors/get-investor-dashboard/index.ts
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const client_1 = require("@shared/db/client");
const logger_1 = require("@shared/utils/logger");
const validators_1 = require("@shared/utils/validators");
const errors_1 = require("@shared/utils/errors");
const logger = new logger_1.Logger('GetInvestorDashboard');
const handler = async (event) => {
    logger.info('Getting investor dashboard', { event });
    try {
        const investorId = event.arguments.investorId;
        (0, validators_1.validateRequired)(investorId, 'investorId');
        // Authorization check
        const groups = event.identity.claims['cognito:groups'] || [];
        const isAdmin = groups.includes('Admin');
        const currentInvestorId = event.identity.claims['custom:investorId'];
        if (!isAdmin && currentInvestorId !== investorId) {
            throw new errors_1.UnauthorizedError('You can only view your own dashboard');
        }
        // Get investor
        const investorResult = await client_1.docClient.send(new lib_dynamodb_1.GetCommand({
            TableName: process.env.INVESTORS_TABLE,
            Key: { id: investorId },
        }));
        if (!investorResult.Item) {
            throw new errors_1.NotFoundError('Investor');
        }
        const investor = investorResult.Item;
        // Get investments
        const investmentsResult = await client_1.docClient.send(new lib_dynamodb_1.QueryCommand({
            TableName: process.env.INVESTMENTS_TABLE,
            IndexName: 'byInvestor',
            KeyConditionExpression: 'investorId = :investorId',
            ExpressionAttributeValues: {
                ':investorId': investorId,
            },
        }));
        const investments = investmentsResult.Items || [];
        const activeInvestments = investments.filter(inv => inv.status === 'ACTIVE').length;
        // Get recent transactions (last 10)
        const transactionsResult = await client_1.docClient.send(new lib_dynamodb_1.QueryCommand({
            TableName: process.env.TRANSACTIONS_TABLE,
            IndexName: 'byInvestor',
            KeyConditionExpression: 'investorId = :investorId',
            ExpressionAttributeValues: {
                ':investorId': investorId,
            },
            ScanIndexForward: false, // Descending order (newest first)
            Limit: 10,
        }));
        const recentTransactions = transactionsResult.Items || [];
        // Get unread notifications count
        const notificationsResult = await client_1.docClient.send(new lib_dynamodb_1.QueryCommand({
            TableName: process.env.NOTIFICATIONS_TABLE,
            IndexName: 'byInvestor',
            KeyConditionExpression: 'investorId = :investorId',
            FilterExpression: 'isRead = :isRead',
            ExpressionAttributeValues: {
                ':investorId': investorId,
                ':isRead': false,
            },
        }));
        const unreadNotifications = notificationsResult.Count || 0;
        // Get properties (from investments)
        const propertyIds = [...new Set(investments.map(inv => inv.propertyId))];
        const properties = [];
        for (const propertyId of propertyIds) {
            const propertyResult = await client_1.docClient.send(new lib_dynamodb_1.GetCommand({
                TableName: process.env.PROPERTIES_TABLE,
                Key: { id: propertyId },
            }));
            if (propertyResult.Item) {
                properties.push(propertyResult.Item);
            }
        }
        // Build dashboard
        const dashboard = {
            totalInvested: investor.totalInvested || 0,
            portfolioValue: investor.portfolioValue || 0,
            totalROI: investor.totalROI || 0,
            activeInvestments,
            recentTransactions,
            unreadNotifications,
            properties,
        };
        logger.info('Dashboard retrieved successfully', { investorId });
        return dashboard;
    }
    catch (error) {
        logger.error('Error getting investor dashboard', error);
        return (0, errors_1.handleError)(error);
    }
};
exports.handler = handler;
//# sourceMappingURL=index.js.map