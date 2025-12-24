"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
// lambda/documents/generate-presigned-url/index.ts
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const client_1 = require("../../shared/db/client");
const logger_1 = require("../../shared/utils/logger");
const validators_1 = require("../../shared/utils/validators");
const errors_1 = require("../../shared/utils/errors");
const logger = new logger_1.Logger('GeneratePresignedUrl');
const s3Client = new client_s3_1.S3Client({ region: process.env.REGION });
const handler = async (event) => {
    logger.info('Generating presigned URL', { event });
    try {
        const documentId = event.arguments.id;
        (0, validators_1.validateRequired)(documentId, 'id');
        // Get document record
        const result = await client_1.docClient.send(new lib_dynamodb_1.GetCommand({
            TableName: process.env.DOCUMENTS_TABLE,
            Key: { id: documentId },
        }));
        if (!result.Item) {
            throw new errors_1.NotFoundError('Document');
        }
        const document = result.Item;
        // Authorization check
        const groups = event.identity.claims['cognito:groups'] || [];
        const isAdmin = groups.includes('Admin');
        const currentInvestorId = event.identity.claims['custom:investorId'];
        if (!isAdmin && document.investorId !== currentInvestorId) {
            throw new errors_1.UnauthorizedError('You do not have permission to access this document');
        }
        // Generate presigned URL (valid for 15 minutes)
        const command = new client_s3_1.GetObjectCommand({
            Bucket: process.env.DOCUMENTS_BUCKET,
            Key: document.fileKey,
        });
        const url = await (0, s3_request_presigner_1.getSignedUrl)(s3Client, command, { expiresIn: 900 }); // 15 minutes
        logger.info('Presigned URL generated successfully', { documentId });
        return url;
    }
    catch (error) {
        logger.error('Error generating presigned URL', error);
        return (0, errors_1.handleError)(error);
    }
};
exports.handler = handler;
//# sourceMappingURL=index.js.map