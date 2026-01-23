
import { PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "@shared/db/client";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { PermissionChecker } from "@shared/utils/permissions";
import { Logger } from "@shared/utils/logger";
import { ValidationError } from "@shared/utils/errors";
import type { AppSyncEvent } from "../../shared/types";
import { v4 as uuidv4 } from "uuid";

const ses = new SESClient({});
const sns = new SNSClient({});
const logger = new Logger("SendNotification");

interface SendNotificationInput {
  investorId: string;
  type: string;
  title: string;
  message: string;
  priority: string;
  link?: string;
  actionLabel?: string;
  actionUrl?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  sendViaEmail?: boolean;
  sendViaPush?: boolean;
  metadata?: any;
}

export const handler = async (event: AppSyncEvent) => {
  logger.info("Sending notification", { event });

  try {
    const input: SendNotificationInput = event.arguments.input;

    // Authorization: Admin only (or system)
    const isSystem = PermissionChecker.getUserId(event) === "SYSTEM";
    if (!isSystem) {
      PermissionChecker.requireAdmin(event);
    }

    // Validate input
    if (!input.title || input.title.trim().length === 0) {
      throw new ValidationError("Title is required");
    }

    if (!input.message || input.message.trim().length === 0) {
      throw new ValidationError("Message is required");
    }

    // Get investor to check preferences
    const investorResult = await docClient.send(
      new QueryCommand({
        TableName: process.env.INVESTORS_TABLE!,
        IndexName: "currentVersions",
        KeyConditionExpression: "id = :id AND isCurrent = :current",
        ExpressionAttributeValues: {
          ":id": input.investorId,
          ":current": "CURRENT",
        },
        Limit: 1,
      }),
    );

    if (!investorResult.Items || investorResult.Items.length === 0) {
      throw new Error("Investor not found");
    }

    const investor = investorResult.Items[0];

    // Get notification preferences
    const preferencesResult = await docClient.send(
      new QueryCommand({
        TableName: process.env.NOTIFICATION_PREFERENCES_TABLE!,
        KeyConditionExpression: "investorId = :investorId",
        ExpressionAttributeValues: {
          ":investorId": input.investorId,
        },
        Limit: 1,
      }),
    );

    const preferences = preferencesResult.Items?.[0] || {
      emailEnabled: true,
      pushEnabled: true,
      inAppEnabled: true,
    };

    const now = new Date().toISOString();
    const notificationId = uuidv4();

    // Calculate expiry (30 days from now for most notifications)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Create in-app notification
    const notification = {
      id: notificationId,
      investorId: input.investorId,
      type: input.type,
      title: input.title,
      message: input.message,
      priority: input.priority,
      link: input.link,
      actionLabel: input.actionLabel,
      actionUrl: input.actionUrl,
      relatedEntityType: input.relatedEntityType,
      relatedEntityId: input.relatedEntityId,
      metadata: input.metadata,
      read: false,
      sentViaEmail: false,
      sentViaPush: false,
      createdAt: now,
      expiresAt: expiresAt.toISOString(),
      emailSentAt: now,
      pushSentAt: now,
    };

    // Save to DynamoDB (in-app notification)
    if (preferences.inAppEnabled !== false) {
      await docClient.send(
        new PutCommand({
          TableName: process.env.NOTIFICATIONS_TABLE!,
          Item: notification,
        }),
      );
    }

    // Send email if enabled
    if (input.sendViaEmail !== false && preferences.emailEnabled) {
      try {
        const emailHtml = buildEmailHtml(input);

        await ses.send(
          new SendEmailCommand({
            Source: process.env.FROM_EMAIL!,
            Destination: {
              ToAddresses: [investor.email],
            },
            Message: {
              Subject: {
                Data: input.title,
              },
              Body: {
                Html: {
                  Data: emailHtml,
                },
              },
            },
          }),
        );

        notification.sentViaEmail = true;
        notification.emailSentAt = now;

        logger.info("Email sent", {
          notificationId,
          email: investor.email,
        });
      } catch (error) {
        logger.error("Failed to send email", {
          notificationId,
          error,
        });
      }
    }

    // Send push notification if enabled
    if (
      input.sendViaPush !== false &&
      preferences.pushEnabled &&
      investor.pushToken
    ) {
      try {
        await sns.send(
          new PublishCommand({
            TargetArn: investor.pushToken,
            Message: JSON.stringify({
              title: input.title,
              body: input.message,
              data: {
                notificationId,
                type: input.type,
                link: input.link,
              },
            }),
          }),
        );

        notification.sentViaPush = true;
        notification.pushSentAt = now;

        logger.info("Push notification sent", {
          notificationId,
        });
      } catch (error) {
        logger.error("Failed to send push notification", {
          notificationId,
          error,
        });
      }
    }

    logger.info("Notification sent", {
      notificationId,
      investorId: input.investorId,
      type: input.type,
      channels: {
        inApp: preferences.inAppEnabled !== false,
        email: notification.sentViaEmail,
        push: notification.sentViaPush,
      },
    });

    return notification;
  } catch (error) {
    logger.error("Error sending notification", error);
    throw error;
  }
};

/**
 * Build email HTML from notification input
 */
function buildEmailHtml(input: SendNotificationInput): string {
  const actionButton =
    input.actionUrl && input.actionLabel
      ? `
      <div style="margin: 30px 0; text-align: center;">
        <a href="${input.actionUrl}" 
           style="background-color: #0066cc; color: white; padding: 12px 30px; 
                  text-decoration: none; border-radius: 5px; display: inline-block;">
          ${input.actionLabel}
        </a>
      </div>
    `
      : "";

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 10px;">
        <h2 style="color: #0066cc; margin-top: 0;">${input.title}</h2>
        <p style="font-size: 16px; margin: 20px 0;">${input.message}</p>
        ${actionButton}
        ${input.link ? `<p style="font-size: 14px; color: #666;"><a href="${input.link}" style="color: #0066cc;">View Details</a></p>` : ""}
      </div>
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; text-align: center;">
        <p>PREPG3 Property Investment Platform</p>
        <p><a href="${process.env.APP_URL}/settings/notifications" style="color: #0066cc;">Manage notification preferences</a></p>
      </div>
    </body>
    </html>
  `;
}