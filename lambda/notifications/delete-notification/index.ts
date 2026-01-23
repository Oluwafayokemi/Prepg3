import { DeleteCommand, GetCommand as Get } from "@aws-sdk/lib-dynamodb";
import { docClient as dc } from "@shared/db/client";
import { Logger as L } from "@shared/utils/logger";
import { UnauthorizedError as U, NotFoundError as NF } from "@shared/utils/errors";
import type { AppSyncEvent as Ev } from "../../shared/types";
import { PermissionChecker } from "@shared/utils/permissions";

const l = new L("DeleteNotification");

export const deleteNotificationHandler = async (event: Ev) => {
  l.info("Deleting notification", { event });

  try {
    const notificationId = event.arguments.notificationId;
    const userId = PermissionChecker.getUserId(event);

    if (!userId) {
      throw new U("Not authenticated");
    }

    // Get notification
    const result = await dc.send(
      new Get({
        TableName: process.env.NOTIFICATIONS_TABLE!,
        Key: { id: notificationId },
      })
    );

    if (!result.Item) {
      throw new NF("Notification not found");
    }

    // Check ownership
    if (result.Item.investorId !== userId) {
      throw new U("You can only delete your own notifications");
    }

    // Delete
    await dc.send(
      new DeleteCommand({
        TableName: process.env.NOTIFICATIONS_TABLE!,
        Key: { id: notificationId },
      })
    );

    l.info("Notification deleted", {
      notificationId,
      investorId: userId,
    });

    return true;

  } catch (error) {
    l.error("Error deleting notification", error);
    throw error;
  }
};