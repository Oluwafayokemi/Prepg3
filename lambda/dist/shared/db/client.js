"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.docClient = void 0;
// lambda/shared/db/client.ts
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const client = new client_dynamodb_1.DynamoDBClient({
    region: process.env.REGION,
});
exports.docClient = lib_dynamodb_1.DynamoDBDocumentClient.from(client, {
    marshallOptions: {
        removeUndefinedValues: true,
        convertEmptyValues: false,
    },
    unmarshallOptions: {
        wrapNumbers: false,
    },
});
//# sourceMappingURL=client.js.map