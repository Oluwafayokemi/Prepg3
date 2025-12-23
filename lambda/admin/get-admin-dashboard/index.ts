// lambda/admin/get-admin-dashboard/index.ts
import { ScanCommand } from '@aws-sdk/lib-dynamodb';
import { docClient } from '@shared/db/client';
import { Logger } from '@shared/utils/logger';
import { handleError, UnauthorizedError } from '@shared/utils/errors';
import type { AppSyncEvent } from '@shared/types';

const logger = new Logger('GetAdminDashboard');

export const handler = async (event: AppSyncEvent) => {
  logger.info('Getting admin dashboard', { event });

  try {
    // Authorization check (only admins)
    const groups = event.identity.claims['cognito:groups'] || [];
    if (!groups.includes('Admin')) {
      throw new UnauthorizedError('Only administrators can access admin dashboard');
    }

    // Get all investors
    const investorsResult = await docClient.send(new ScanCommand({
      TableName: process.env.INVESTORS_TABLE!,
      ProjectionExpression: 'id, totalInvested, portfolioValue',
    }));

    const investors = investorsResult.Items || [];
    const totalInvestors = investors.length;
    const totalCapitalRaised = investors.reduce((sum, inv) => sum + (inv.totalInvested || 0), 0);
    const totalPortfolioValue = investors.reduce((sum, inv) => sum + (inv.portfolioValue || 0), 0);

    // Get all properties
    const propertiesResult = await docClient.send(new ScanCommand({
      TableName: process.env.PROPERTIES_TABLE!,
      ProjectionExpression: 'id, #status, currentValuation',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
    }));

    const properties = propertiesResult.Items || [];
    const totalProperties = properties.length;

    // Properties by status
    const propertiesByStatus = properties.reduce((acc: any[], prop) => {
      const existing = acc.find(item => item.status === prop.status);
      if (existing) {
        existing.count++;
      } else {
        acc.push({ status: prop.status, count: 1 });
      }
      return acc;
    }, []);

    // Get all investments
    const investmentsResult = await docClient.send(new ScanCommand({
      TableName: process.env.INVESTMENTS_TABLE!,
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

  } catch (error) {
    logger.error('Error getting admin dashboard', error);
    return handleError(error);
  }
};