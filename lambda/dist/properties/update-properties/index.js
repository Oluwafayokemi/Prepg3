"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
// lambda/properties/update-property/index.ts
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const client_1 = require("../../shared/db/client");
const logger_1 = require("../../shared/utils/logger");
const validators_1 = require("../../shared/utils/validators");
const errors_1 = require("../../shared/utils/errors");
const logger = new logger_1.Logger('UpdateProperty');
const handler = async (event) => {
    logger.info('Updating property', { event });
    try {
        const input = event.arguments.input;
        // Validate inputs
        (0, validators_1.validateRequired)(input.id, 'id');
        // Authorization check (only admins)
        const groups = event.identity.claims['cognito:groups'] || [];
        if (!groups.includes('Admin')) {
            throw new Error('Only administrators can update properties');
        }
        // Verify property exists
        const existingProperty = await client_1.docClient.send(new lib_dynamodb_1.GetCommand({
            TableName: process.env.PROPERTIES_TABLE,
            Key: { id: input.id },
        }));
        if (!existingProperty.Item) {
            throw new errors_1.NotFoundError('Property');
        }
        const now = new Date().toISOString();
        // Build update expression dynamically
        const updateExpressions = ['updatedAt = :now'];
        const expressionAttributeValues = { ':now': now };
        const expressionAttributeNames = {};
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
        const result = await client_1.docClient.send(new lib_dynamodb_1.UpdateCommand({
            TableName: process.env.PROPERTIES_TABLE,
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
    }
    catch (error) {
        logger.error('Error updating property', error);
        return (0, errors_1.handleError)(error);
    }
};
exports.handler = handler;
//# sourceMappingURL=index.js.map