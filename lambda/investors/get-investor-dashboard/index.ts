// lambda/investors/get-investor-dashboard/index.ts
import { GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { docClient } from '@shared/db/client';
import { Logger } from '@shared/utils/logger';
import { validateRequired } from '@shared/utils/validators';
import { handleError, NotFoundError, UnauthorizedError } from '@shared/utils/errors';
import type { AppSyncEvent } from '@shared/types';

const logger = new Logger('GetInvestorDashboard');

export const handler = async (event: AppSyncEvent) => {
  logger.info('Getting investor dashboard', { event });

  try {
    const investorId = event.arguments.investorId;
    validateRequired(investorId, 'investorId');

    // Authorization check
    const groups = event.identity.claims['cognito:groups'] || [];
    const isAdmin = groups.includes('Admin');
    const currentInvestorId = event.identity.claims['custom:investorId'];

    if (!isAdmin && currentInvestorId !== investorId) {
      throw new UnauthorizedError('You can only view your own dashboard');
    }

    // Get investor
    const investorResult = await docClient.send(new GetCommand({
      TableName: process.env.INVESTORS_TABLE!,
      Key: { id: investorId },
    }));

    if (!investorResult.Item) {
      throw new NotFoundError('Investor');
    }

    const investor = investorResult.Item;

    // Get investments
    const investmentsResult = await docClient.send(new QueryCommand({
      TableName: process.env.INVESTMENTS_TABLE!,
      IndexName: 'byInvestor',
      KeyConditionExpression: 'investorId = :investorId',
      ExpressionAttributeValues: {
        ':investorId': investorId,
      },
    }));

    const investments = investmentsResult.Items || [];
    const activeInvestments = investments.filter(inv => inv.status === 'ACTIVE').length;

    // Get recent transactions (last 10)
    const transactionsResult = await docClient.send(new QueryCommand({
      TableName: process.env.TRANSACTIONS_TABLE!,
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
    const notificationsResult = await docClient.send(new QueryCommand({
      TableName: process.env.NOTIFICATIONS_TABLE!,
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
      const propertyResult = await docClient.send(new GetCommand({
        TableName: process.env.PROPERTIES_TABLE!,
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

  } catch (error) {
    logger.error('Error getting investor dashboard', error);
    return handleError(error);
  }
};