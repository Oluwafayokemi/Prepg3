"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
// lambda/documents/upload-document/index.ts
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const client_1 = require("../../shared/db/client");
const logger_1 = require("../../shared/utils/logger");
const validators_1 = require("../../shared/utils/validators");
const errors_1 = require("../../shared/utils/errors");
const uuid_1 = require("uuid");
const logger = new logger_1.Logger('UploadDocument');
const handler = async (event) => {
    logger.info('Uploading document', { event });
    try {
        const input = event.arguments.input;
        // Validate inputs
        (0, validators_1.validateRequired)(input.title, 'title');
        (0, validators_1.validateRequired)(input.fileKey, 'fileKey');
        (0, validators_1.validateRequired)(input.fileType, 'fileType');
        (0, validators_1.validateRequired)(input.fileSize, 'fileSize');
        (0, validators_1.validateRequired)(input.category, 'category');
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
        const documentId = (0, uuid_1.v4)();
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
        await client_1.docClient.send(new lib_dynamodb_1.PutCommand({
            TableName: process.env.DOCUMENTS_TABLE,
            Item: document,
        }));
        logger.info('Document uploaded successfully', { documentId });
        // Create notification if document is for an investor
        if (input.investorId) {
            const notification = {
                id: (0, uuid_1.v4)(),
                investorId: input.investorId,
                title: 'New Document Available',
                message: `A new document "${input.title}" has been uploaded to your account.`,
                type: 'DOCUMENT_UPLOADED',
                isRead: false,
                createdAt: now,
                link: `/documents/${documentId}`,
                ttl: Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60), // 90 days
            };
            await client_1.docClient.send(new lib_dynamodb_1.PutCommand({
                TableName: process.env.NOTIFICATIONS_TABLE,
                Item: notification,
            }));
            logger.info('Notification created for document upload');
        }
        return document;
    }
    catch (error) {
        logger.error('Error uploading document', error);
        return (0, errors_1.handleError)(error);
    }
};
exports.handler = handler;
//# sourceMappingURL=index.js.map