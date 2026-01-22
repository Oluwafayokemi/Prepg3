// lambda/properties/create-property/index.ts
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { docClient } from '../../shared/db/client';
import { Logger } from '../../shared/utils/logger';
import { validateRequired, validatePositiveNumber } from '../../shared/utils/validators';
import { handleError } from '../../shared/utils/errors';
import { v4 as uuidv4 } from 'uuid';
import type { AppSyncEvent } from '../../shared/types';
import { PermissionChecker } from '@shared/utils/permissions';

const logger = new Logger('CreateProperty');

interface CreatePropertyInput {
  address: string;
  postcode: string;
  propertyType: 'RESIDENTIAL' | 'COMMERCIAL' | 'MIXED_USE' | 'LAND';
  purchasePrice: number;
  currentValuation: number;
  status: 'ACQUISITION' | 'DEVELOPMENT' | 'COMPLETED' | 'SOLD';
  images: string[];
  acquisitionDate: string;
}

export const handler = async (event: AppSyncEvent) => {
  logger.info('Creating property', { event });

  try {
    const input: CreatePropertyInput = event.arguments.input;

    // Validate inputs
    validateRequired(input.address, 'address');
    validateRequired(input.postcode, 'postcode');
    validateRequired(input.propertyType, 'propertyType');
    validatePositiveNumber(input.purchasePrice, 'purchasePrice');
    validatePositiveNumber(input.currentValuation, 'currentValuation');
    validateRequired(input.status, 'status');
    validateRequired(input.acquisitionDate, 'acquisitionDate');

    // Authorization check (only admins can create properties)
    const isAdmin = PermissionChecker.isAdmin(event);
    if (!isAdmin) {
      throw new Error('Only administrators can create properties');
    }

    const propertyId = uuidv4();
    const now = new Date().toISOString();

    // Create property record
    const property = {
      id: propertyId,
      address: input.address,
      postcode: input.postcode.toUpperCase(),
      propertyType: input.propertyType,
      purchasePrice: input.purchasePrice,
      currentValuation: input.currentValuation,
      status: input.status,
      images: input.images || [],
      acquisitionDate: input.acquisitionDate,
      totalInvested: 0,
      createdAt: now,
      updatedAt: now,
    };

    await docClient.send(new PutCommand({
      TableName: process.env.PROPERTIES_TABLE!,
      Item: property,
    }));

    logger.info('Property created successfully', { propertyId });

    return property;

  } catch (error) {
    logger.error('Error creating property', error);
    return handleError(error);
  }
};