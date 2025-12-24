"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
// lambda/notifications/send-email/index.ts
const client_ses_1 = require("@aws-sdk/client-ses");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const client_1 = require("../../../shared/db/client");
const logger_1 = require("../../../shared/utils/logger");
const validators_1 = require("../../../shared/utils/validators");
const errors_1 = require("../../../shared/utils/errors");
const uuid_1 = require("uuid");
const logger = new logger_1.Logger("SendNotification");
const sesClient = new client_ses_1.SESClient({ region: process.env.REGION });
const handler = async (event) => {
    logger.info("Sending notification", { event });
    try {
        const input = event.arguments.input;
        // Validate inputs
        (0, validators_1.validateRequired)(input.title, "title");
        (0, validators_1.validateRequired)(input.message, "message");
        (0, validators_1.validateRequired)(input.type, "type");
        if (!input.investorId &&
            (!input.investorIds || input.investorIds.length === 0)) {
            throw new Error("Either investorId or investorIds must be provided");
        }
        // Authorization check (only admins can send notifications)
        const groups = event.identity.claims["cognito:groups"] || [];
        if (!groups.includes("Admin")) {
            throw new Error("Only administrators can send notifications");
        }
        const now = new Date().toISOString();
        const recipientIds = input.investorIds || [input.investorId];
        const notifications = [];
        for (const investorId of recipientIds) {
            // Get investor details
            const investorResult = await client_1.docClient.send(new lib_dynamodb_1.GetCommand({
                TableName: process.env.INVESTORS_TABLE,
                Key: { id: investorId },
            }));
            if (!investorResult.Item) {
                logger.error(`Investor ${investorId} not found, skipping`);
                continue;
            }
            const investor = investorResult.Item;
            // Create notification record
            const notificationId = (0, uuid_1.v4)();
            const notification = {
                id: notificationId,
                investorId,
                title: input.title,
                message: input.message,
                type: input.type,
                isRead: false,
                createdAt: now,
                link: input.link || null,
                ttl: Math.floor(Date.now() / 1000) + 90 * 24 * 60 * 60, // 90 days
            };
            await client_1.docClient.send(new lib_dynamodb_1.PutCommand({
                TableName: process.env.NOTIFICATIONS_TABLE,
                Item: notification,
            }));
            notifications.push(notification);
            // Send email
            try {
                const emailParams = {
                    Source: process.env.SOURCE_EMAIL,
                    Destination: {
                        ToAddresses: [investor.email],
                    },
                    Message: {
                        Subject: {
                            Data: input.title,
                        },
                        Body: {
                            Html: {
                                Data: `
                  <!DOCTYPE html>
                  <html>
                    <head>
                      <style>
                        body {
                          font-family: Arial, sans-serif;
                          line-height: 1.6;
                          color: #333;
                        }
                        .container {
                          max-width: 600px;
                          margin: 0 auto;
                          padding: 20px;
                        }
                        .header {
                          background-color: #1a1a1a;
                          color: white;
                          padding: 20px;
                          text-align: center;
                        }
                        .content {
                          padding: 20px;
                          background-color: #f9f9f9;
                        }
                        .button {
                          display: inline-block;
                          padding: 12px 24px;
                          background-color: #4CAF50;
                          color: white;
                          text-decoration: none;
                          border-radius: 4px;
                          margin-top: 20px;
                        }
                        .footer {
                          padding: 20px;
                          text-align: center;
                          font-size: 12px;
                          color: #666;
                        }
                      </style>
                    </head>
                    <body>
                      <div class="container">
                        <div class="header">
                          <h1>PREPG3</h1>
                        </div>
                        <div class="content">
                          <h2>${input.title}</h2>
                          <p>Hello ${investor.firstName},</p>
                          <p>${input.message}</p>
                          ${input.link
                                    ? `
                            <a href="https://investor.prepg3.co.uk${input.link}" class="button">
                              View Details
                            </a>
                          `
                                    : ""}
                        </div>
                        <div class="footer">
                          <p>This is an automated message from PREPG3 Investor Portal</p>
                          <p>
                            <a href="https://investor.prepg3.co.uk">Visit Dashboard</a> |
                            <a href="mailto:support@prepg3.co.uk">Contact Support</a>
                          </p>
                        </div>
                      </div>
                    </body>
                  </html>
                `,
                            },
                            Text: {
                                Data: `
${input.title}

Hello ${investor.firstName},

${input.message}

${input.link ? `View details: https://investor.prepg3.co.uk${input.link}` : ""}

---
This is an automated message from PREPG3 Investor Portal
Visit your dashboard: https://investor.prepg3.co.uk
                `,
                            },
                        },
                    },
                };
                await sesClient.send(new client_ses_1.SendEmailCommand(emailParams));
                logger.info(`Email sent to ${investor.email}`, { investorId });
            }
            catch (emailError) {
                logger.error(`Failed to send email to ${investor.email}`, emailError);
                // Continue with other notifications even if email fails
            }
        }
        logger.info(`Sent ${notifications.length} notifications`);
        return notifications[0] || null; // Return first notification for GraphQL response
    }
    catch (error) {
        logger.error("Error sending notification", error);
        return (0, errors_1.handleError)(error);
    }
};
exports.handler = handler;
//# sourceMappingURL=index.js.map