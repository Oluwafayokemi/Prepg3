// lambda/transactions/list-transactions/index.ts
import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { docClient } from '@shared/db/client';
import { Logger } from '@shared/utils/logger';
import { handleError, UnauthorizedError } from '@shared/utils/errors';
import type { AppSyncEvent } from '@shared/types';

const logger = new Logger('ListTransactions');

interface ListTransactionsInput {
  investorId?: string;
  type?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  nextToken?: string;
}

export const handler = async (event: AppSyncEvent) => {
  logger.info('Listing transactions', { event });

  try {
    const input: ListTransactionsInput = event.arguments;

    // Authorization check
    const groups = event.identity.claims['cognito:groups'] || [];
    const isAdmin = groups.includes('Admin');
    const currentInvestorId = event.identity.claims['custom:investorId'];

    if (!isAdmin && input.investorId && currentInvestorId !== input.investorId) {
      throw new UnauthorizedError('You can only view your own transactions');
    }

    let result;

    if (input.investorId) {
      // Query by investor
      result = await docClient.send(new QueryCommand({
        TableName: process.env.TRANSACTIONS_TABLE!,
        IndexName: 'byInvestor',
        KeyConditionExpression: 'investorId = :investorId',
        ExpressionAttributeValues: {
          ':investorId': input.investorId,
        },
        ScanIndexForward: false,
        Limit: input.limit || 50,
        ExclusiveStartKey: input.nextToken ? JSON.parse(input.nextToken) : undefined,
      }));
    } else if (input.type) {
      // Query by type (admin only)
      if (!isAdmin) {
        throw new UnauthorizedError('Only administrators can filter by transaction type');
      }

      result = await docClient.send(new QueryCommand({
        TableName: process.env.TRANSACTIONS_TABLE!,
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
    } else {
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

  } catch (error) {
    logger.error('Error listing transactions', error);
    return handleError(error);
  }
};
