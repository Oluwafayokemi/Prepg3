"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
// lambda/properties/create-property/index.ts
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const client_1 = require("../../shared/db/client");
const logger_1 = require("../../shared/utils/logger");
const validators_1 = require("../../shared/utils/validators");
const errors_1 = require("../../shared/utils/errors");
const uuid_1 = require("uuid");
const logger = new logger_1.Logger('CreateProperty');
const handler = async (event) => {
    logger.info('Creating property', { event });
    try {
        const input = event.arguments.input;
        // Validate inputs
        (0, validators_1.validateRequired)(input.address, 'address');
        (0, validators_1.validateRequired)(input.postcode, 'postcode');
        (0, validators_1.validateRequired)(input.propertyType, 'propertyType');
        (0, validators_1.validatePositiveNumber)(input.purchasePrice, 'purchasePrice');
        (0, validators_1.validatePositiveNumber)(input.currentValuation, 'currentValuation');
        (0, validators_1.validateRequired)(input.status, 'status');
        (0, validators_1.validateRequired)(input.acquisitionDate, 'acquisitionDate');
        // Authorization check (only admins can create properties)
        const groups = event.identity.claims['cognito:groups'] || [];
        if (!groups.includes('Admin')) {
            throw new Error('Only administrators can create properties');
        }
        const propertyId = (0, uuid_1.v4)();
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
        await client_1.docClient.send(new lib_dynamodb_1.PutCommand({
            TableName: process.env.PROPERTIES_TABLE,
            Item: property,
        }));
        logger.info('Property created successfully', { propertyId });
        return property;
    }
    catch (error) {
        logger.error('Error creating property', error);
        return (0, errors_1.handleError)(error);
    }
};
exports.handler = handler;
//# sourceMappingURL=index.js.map