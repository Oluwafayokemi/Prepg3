// lambda/transactions/create-transaction/index.ts
import { PutCommand, UpdateCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { docClient } from '../../shared/db/client';
import { Logger } from '../../shared/utils/logger';
import { validateRequired, validatePositiveNumber } from '../../shared/utils/validators';
import { handleError, NotFoundError } from '../../shared/utils/errors';
import { v4 as uuidv4 } from 'uuid';
import type { AppSyncEvent } from '../../shared/types';

const logger = new Logger('CreateTransaction');

interface CreateTransactionInput {
  investorId: string;
  propertyId?: string;
  type: 'INVESTMENT' | 'DIVIDEND' | 'PROFIT_SHARE' | 'WITHDRAWAL' | 'FEE';
  amount: number;
  description: string;
  date?: string;
  reference?: string;
}

export const handler = async (event: AppSyncEvent) => {
  logger.info('Creating transaction', { event });

  try {
    const input: CreateTransactionInput = event.arguments.input;

    // Validate inputs
    validateRequired(input.investorId, 'investorId');
    validateRequired(input.type, 'type');
    validatePositiveNumber(input.amount, 'amount');
    validateRequired(input.description, 'description');

    // Authorization check
    const groups = event.identity.claims['cognito:groups'] || [];
    const isAdmin = groups.includes('Admin');
    const currentInvestorId = event.identity.claims['custom:investorId'];

    if (!isAdmin && currentInvestorId !== input.investorId) {
      throw new Error('You can only view your own transactions');
    }

    // Verify investor exists
    const investorResult = await docClient.send(new GetCommand({
      TableName: process.env.INVESTORS_TABLE!,
      Key: { id: input.investorId },
    }));

    if (!investorResult.Item) {
      throw new NotFoundError('Investor');
    }

    const transactionId = uuidv4();
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

    await docClient.send(new PutCommand({
      TableName: process.env.TRANSACTIONS_TABLE!,
      Item: transaction,
    }));

    logger.info('Transaction created successfully', { transactionId });

    // Update investor balance based on transaction type
    if (input.type === 'DIVIDEND' || input.type === 'PROFIT_SHARE') {
      // Positive transactions - don't update totalInvested
      logger.info('Positive transaction, no investor update needed');
    } else if (input.type === 'WITHDRAWAL' || input.type === 'FEE') {
      // Negative transactions
      await docClient.send(new UpdateCommand({
        TableName: process.env.INVESTORS_TABLE!,
        Key: { id: input.investorId },
        UpdateExpression: 'SET totalInvested = totalInvested - :amount, updatedAt = :now',
        ExpressionAttributeValues: {
          ':amount': input.amount,
          ':now': now,
        },
      }));
    }

    return transaction;

  } catch (error) {
    logger.error('Error creating transaction', error);
    return handleError(error);
  }
};