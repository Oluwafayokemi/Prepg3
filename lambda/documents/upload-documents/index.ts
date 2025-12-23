// lambda/documents/upload-document/index.ts
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { docClient } from '../../shared/db/client';
import { Logger } from '../../shared/utils/logger';
import { validateRequired } from '../../shared/utils/validators';
import { handleError } from '../../shared/utils/errors';
import { v4 as uuidv4 } from 'uuid';
import type { AppSyncEvent } from '../../shared/types';

const logger = new Logger('UploadDocument');

interface UploadDocumentInput {
  investorId?: string;
  propertyId?: string;
  title: string;
  description?: string;
  fileKey: string;
  fileType: string;
  fileSize: number;
  category: 'CONTRACT' | 'REPORT' | 'CERTIFICATE' | 'INVOICE' | 'VALUATION' | 'OTHER';
}

export const handler = async (event: AppSyncEvent) => {
  logger.info('Uploading document', { event });

  try {
    const input: UploadDocumentInput = event.arguments.input;

    // Validate inputs
    validateRequired(input.title, 'title');
    validateRequired(input.fileKey, 'fileKey');
    validateRequired(input.fileType, 'fileType');
    validateRequired(input.fileSize, 'fileSize');
    validateRequired(input.category, 'category');

    if (!input.investorId && !input.propertyId) {
      throw new Error('Either investorId or propertyId must be provided');
    }

    // Authorization check
    const groups = event.identity.claims['cognito:groups'] || [];
    const isAdmin = groups.includes('Admin');
    const currentInvestorId = event.identity.claims['custom:investorId'];

    if (!isAdmin && input.investorId && currentInvestorId !== input.investorId) {
      throw new Error('You can only upload documents for yourself');
    }

    const documentId = uuidv4();
    const now = new Date().toISOString();

    // Create document record
    const document = {
      id: documentId,
      investorId: input.investorId || null,
      propertyId: input.propertyId || null,
      title: input.title,
      description: input.description || null,
      fileKey: input.fileKey,
      fileType: input.fileType,
      fileSize: input.fileSize,
      uploadDate: now,
      category: input.category,
    };

    await docClient.send(new PutCommand({
      TableName: process.env.DOCUMENTS_TABLE!,
      Item: document,
    }));

    logger.info('Document uploaded successfully', { documentId });

    // Create notification if document is for an investor
    if (input.investorId) {
      const notification = {
        id: uuidv4(),
        investorId: input.investorId,
        title: 'New Document Available',
        message: `A new document "${input.title}" has been uploaded to your account.`,
        type: 'DOCUMENT_UPLOADED',
        isRead: false,
        createdAt: now,
        link: `/documents/${documentId}`,
        ttl: Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60), // 90 days
      };

      await docClient.send(new PutCommand({
        TableName: process.env.NOTIFICATIONS_TABLE!,
        Item: notification,
      }));

      logger.info('Notification created for document upload');
    }

    return document;

  } catch (error) {
    logger.error('Error uploading document', error);
    return handleError(error);
  }
};