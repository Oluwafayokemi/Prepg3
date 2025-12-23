// lambda/investors/update-investor/index.ts
import { UpdateCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { docClient } from '@shared/db/client';
import { Logger } from '@shared/utils/logger';
import { validateRequired } from '@shared/utils/validators';
import { handleError, NotFoundError, UnauthorizedError } from '@shared/utils/errors';
import type { AppSyncEvent } from '@shared/types';

const logger = new Logger('UpdateInvestor');

interface UpdateInvestorInput {
  id: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}

export const handler = async (event: AppSyncEvent) => {
  logger.info('Updating investor', { event });

  try {
    const input: UpdateInvestorInput = event.arguments.input;

    // Validate inputs
    validateRequired(input.id, 'id');

    // Authorization check
    const groups = event.identity.claims['cognito:groups'] || [];
    const isAdmin = groups.includes('Admin');
    const currentInvestorId = event.identity.claims['custom:investorId'];

    if (!isAdmin && currentInvestorId !== input.id) {
      throw new UnauthorizedError('You can only update your own profile');
    }

    // Verify investor exists
    const existingInvestor = await docClient.send(new GetCommand({
      TableName: process.env.INVESTORS_TABLE!,
      Key: { id: input.id },
    }));

    if (!existingInvestor.Item) {
      throw new NotFoundError('Investor');
    }

    const now = new Date().toISOString();

    // Build update expression dynamically
    const updateExpressions: string[] = ['updatedAt = :now'];
    const expressionAttributeValues: any = { ':now': now };

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
    const result = await docClient.send(new UpdateCommand({
      TableName: process.env.INVESTORS_TABLE!,
      Key: { id: input.id },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    }));

    logger.info('Investor updated successfully', { investorId: input.id });

    return result.Attributes;

  } catch (error) {
    logger.error('Error updating investor', error);
    return handleError(error);
  }
};