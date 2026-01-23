import { PutCommand, BatchWriteCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "@shared/db/client";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { PermissionChecker } from "@shared/utils/permissions";
import { Logger } from "@shared/utils/logger";
import type { AppSyncEvent } from "../../shared/types";
import { v4 as uuidv4 } from "uuid";

const ses = new SESClient({});
const logger = new Logger("BulkSendNotification");

interface SendNotificationInput {
  title: string;
  message: string;
  type: string;
  priority: string;
  link?: string;
}

interface BulkOperationResult {
  totalProcessed: number;
  successCount: number;
  failureCount: number;
  errors: Array<{ investorId: string; error: string }>;
}

export const handler = async (event: AppSyncEvent): Promise<BulkOperationResult> => {
  logger.info("Bulk sending notifications", { event });

  try {
    const investorIds: string[] = event.arguments.investorIds || [];
    const notification: SendNotificationInput = event.arguments.notification;

    // Authorization
    PermissionChecker.requireAdmin(event);

    const result: BulkOperationResult = {
      totalProcessed: investorIds.length,
      successCount: 0,
      failureCount: 0,
      errors: [],
    };

    const now = new Date().toISOString();

    // Send notifications in batches
    for (const investorId of investorIds) {
      try {
        // Create in-app notification
        await docClient.send(
          new PutCommand({
            TableName: process.env.NOTIFICATIONS_TABLE!,
            Item: {
              id: uuidv4(),
              investorId,
              title: notification.title,
              message: notification.message,
              type: notification.type,
              priority: notification.priority,
              link: notification.link,
              read: false,
              createdAt: now,
            },
          })
        );

        result.successCount++;
      } catch (error) {
        result.failureCount++;
        result.errors.push({
          investorId,
          error: error instanceof Error ? error.message : "Unknown error",
        });
        logger.error("Failed to send notification", { investorId, error });
      }
    }

    logger.info("Bulk notification completed", {
      total: result.totalProcessed,
      success: result.successCount,
      failed: result.failureCount,
    });

    return result;

  } catch (error) {
    logger.error("Error in bulk send notification", error);
    throw error;
  }
};
