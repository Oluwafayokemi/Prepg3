"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
// lambda/admin/get-admin-dashboard/index.ts
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const client_1 = require("@shared/db/client");
const logger_1 = require("@shared/utils/logger");
const errors_1 = require("@shared/utils/errors");
const logger = new logger_1.Logger('GetAdminDashboard');
const handler = async (event) => {
    logger.info('Getting admin dashboard', { event });
    try {
        // Authorization check (only admins)
        const groups = event.identity.claims['cognito:groups'] || [];
        if (!groups.includes('Admin')) {
            throw new errors_1.UnauthorizedError('Only administrators can access admin dashboard');
        }
        // Get all investors
        const investorsResult = await client_1.docClient.send(new lib_dynamodb_1.ScanCommand({
            TableName: process.env.INVESTORS_TABLE,
            ProjectionExpression: 'id, totalInvested, portfolioValue',
        }));
        const investors = investorsResult.Items || [];
        const totalInvestors = investors.length;
        const totalCapitalRaised = investors.reduce((sum, inv) => sum + (inv.totalInvested || 0), 0);
        const totalPortfolioValue = investors.reduce((sum, inv) => sum + (inv.portfolioValue || 0), 0);
        // Get all properties
        const propertiesResult = await client_1.docClient.send(new lib_dynamodb_1.ScanCommand({
            TableName: process.env.PROPERTIES_TABLE,
            ProjectionExpression: 'id, #status, currentValuation',
            ExpressionAttributeNames: {
                '#status': 'status',
            },
        }));
        const properties = propertiesResult.Items || [];
        const totalProperties = properties.length;
        // Properties by status
        const propertiesByStatus = properties.reduce((acc, prop) => {
            const existing = acc.find(item => item.status === prop.status);
            if (existing) {
                existing.count++;
            }
            else {
                acc.push({ status: prop.status, count: 1 });
            }
            return acc;
        }, []);
        // Get all investments
        const investmentsResult = await client_1.docClient.send(new lib_dynamodb_1.ScanCommand({
            TableName: process.env.INVESTMENTS_TABLE,
            ProjectionExpression: 'id, investmentAmount, currentValue, investmentDate',
        }));
        const investments = investmentsResult.Items || [];
        // Calculate average ROI
        const totalInvested = investments.reduce((sum, inv) => sum + (inv.investmentAmount || 0), 0);
        const totalCurrentValue = investments.reduce((sum, inv) => sum + (inv.currentValue || 0), 0);
        const averageROI = totalInvested > 0
            ? ((totalCurrentValue - totalInvested) / totalInvested) * 100
            : 0;
        // Get recent investments (last 10)
        const recentInvestments = investments
            .sort((a, b) => new Date(b.investmentDate).getTime() - new Date(a.investmentDate).getTime())
            .slice(0, 10);
        // Build dashboard
        const dashboard = {
            totalInvestors,
            totalProperties,
            totalCapitalRaised,
            totalPortfolioValue,
            averageROI,
            recentInvestments,
            propertiesByStatus,
        };
        logger.info('Admin dashboard retrieved successfully');
        return dashboard;
    }
    catch (error) {
        logger.error('Error getting admin dashboard', error);
        return (0, errors_1.handleError)(error);
    }
};
exports.handler = handler;
//# sourceMappingURL=index.js.map