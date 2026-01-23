import { UpdateCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { docClient as db } from "@shared/db/client";
import { Logger as Log } from "@shared/utils/logger";
import { UnauthorizedError as UnAuth, NotFoundError } from "@shared/utils/errors";
import type { AppSyncEvent as Evt } from "../../shared/types";
import { PermissionChecker } from "@shared/utils/permissions";

const log = new Log("MarkNotificationAsRead");

export const markAsReadHandler = async (event: Evt) => {
  log.info("Marking notification as read", { event });

  try {
    const notificationId = event.arguments.notificationId;
    const userId = PermissionChecker.getUserId(event);

    if (!userId) {
      throw new UnAuth("Not authenticated");
    }

    // Get notification to verify ownership
    const result = await db.send(
      new GetCommand({
        TableName: process.env.NOTIFICATIONS_TABLE!,
        Key: { id: notificationId },
      })
    );

    if (!result.Item) {
      throw new NotFoundError("Notification not found");
    }

    const notification = result.Item;

    // Check ownership
    if (notification.investorId !== userId) {
      throw new UnAuth("You can only mark your own notifications as read");
    }

    // Update to read
    const now = new Date().toISOString();

    await db.send(
      new UpdateCommand({
        TableName: process.env.NOTIFICATIONS_TABLE!,
        Key: { id: notificationId },
        UpdateExpression: "SET #read = :true, readAt = :now",
        ExpressionAttributeNames: {
          "#read": "read",
        },
        ExpressionAttributeValues: {
          ":true": true,
          ":now": now,
        },
      })
    );

    log.info("Notification marked as read", {
      notificationId,
      investorId: userId,
    });

    return {
      ...notification,
      read: true,
      readAt: now,
    };

  } catch (error) {
    log.error("Error marking notification as read", error);
    throw error;
  }
};