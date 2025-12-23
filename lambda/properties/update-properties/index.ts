// lambda/properties/update-property/index.ts
import { UpdateCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { docClient } from '../../shared/db/client';
import { Logger } from '../../shared/utils/logger';
import { validateRequired } from '../../shared/utils/validators';
import { handleError, NotFoundError } from '../../shared/utils/errors';
import type { AppSyncEvent } from '../../shared/types';

const logger = new Logger('UpdateProperty');

interface UpdatePropertyInput {
  id: string;
  currentValuation?: number;
  status?: 'ACQUISITION' | 'DEVELOPMENT' | 'COMPLETED' | 'SOLD';
  images?: string[];
}

export const handler = async (event: AppSyncEvent) => {
  logger.info('Updating property', { event });

  try {
    const input: UpdatePropertyInput = event.arguments.input;

    // Validate inputs
    validateRequired(input.id, 'id');

    // Authorization check (only admins)
    const groups = event.identity.claims['cognito:groups'] || [];
    if (!groups.includes('Admin')) {
      throw new Error('Only administrators can update properties');
    }

    // Verify property exists
    const existingProperty = await docClient.send(new GetCommand({
      TableName: process.env.PROPERTIES_TABLE!,
      Key: { id: input.id },
    }));

    if (!existingProperty.Item) {
      throw new NotFoundError('Property');
    }

    const now = new Date().toISOString();

    // Build update expression dynamically
    const updateExpressions: string[] = ['updatedAt = :now'];
    const expressionAttributeValues: any = { ':now': now };
    const expressionAttributeNames: any = {};

    if (input.currentValuation !== undefined) {
      updateExpressions.push('currentValuation = :currentValuation');
      expressionAttributeValues[':currentValuation'] = input.currentValuation;
    }

    if (input.status !== undefined) {
      updateExpressions.push('#status = :status');
      expressionAttributeValues[':status'] = input.status;
      expressionAttributeNames['#status'] = 'status';
    }

    if (input.images !== undefined) {
      updateExpressions.push('images = :images');
      expressionAttributeValues[':images'] = input.images;
    }

    // Update property
    const result = await docClient.send(new UpdateCommand({
      TableName: process.env.PROPERTIES_TABLE!,
      Key: { id: input.id },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeValues: expressionAttributeValues,
      ...(Object.keys(expressionAttributeNames).length > 0 && {
        ExpressionAttributeNames: expressionAttributeNames,
      }),
      ReturnValues: 'ALL_NEW',
    }));

    logger.info('Property updated successfully', { propertyId: input.id });

    return result.Attributes;

  } catch (error) {
    logger.error('Error updating property', error);
    return handleError(error);
  }
};