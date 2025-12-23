// lambda/documents/generate-presigned-url/index.ts
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { docClient } from '../../shared/db/client';
import { Logger } from '../../shared/utils/logger';
import { validateRequired } from '../../shared/utils/validators';
import { handleError, NotFoundError, UnauthorizedError } from '../../shared/utils/errors';
import type { AppSyncEvent } from '../../shared/types';

const logger = new Logger('GeneratePresignedUrl');
const s3Client = new S3Client({ region: process.env.REGION });

export const handler = async (event: AppSyncEvent) => {
  logger.info('Generating presigned URL', { event });

  try {
    const documentId = event.arguments.id;
    validateRequired(documentId, 'id');

    // Get document record
    const result = await docClient.send(new GetCommand({
      TableName: process.env.DOCUMENTS_TABLE!,
      Key: { id: documentId },
    }));

    if (!result.Item) {
      throw new NotFoundError('Document');
    }

    const document = result.Item;

    // Authorization check
    const groups = event.identity.claims['cognito:groups'] || [];
    const isAdmin = groups.includes('Admin');
    const currentInvestorId = event.identity.claims['custom:investorId'];

    if (!isAdmin && document.investorId !== currentInvestorId) {
      throw new UnauthorizedError('You do not have permission to access this document');
    }

    // Generate presigned URL (valid for 15 minutes)
    const command = new GetObjectCommand({
      Bucket: process.env.DOCUMENTS_BUCKET!,
      Key: document.fileKey,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn: 900 }); // 15 minutes

    logger.info('Presigned URL generated successfully', { documentId });

    return url;

  } catch (error) {
    logger.error('Error generating presigned URL', error);
    return handleError(error);
  }
};