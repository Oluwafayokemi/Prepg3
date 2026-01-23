import { QueryCommand as QC, UpdateCommand as UC } from "@aws-sdk/lib-dynamodb";
import { docClient as dbc } from "@shared/db/client";
import { Logger as Lgr } from "@shared/utils/logger";
import { UnauthorizedError as UA } from "@shared/utils/errors";
import type { AppSyncEvent as E } from "../../shared/types";
import { PermissionChecker } from "@shared/utils/permissions";

const lgr = new Lgr("MarkAllNotificationsAsRead");

export const markAllAsReadHandler = async (event: E) => {
  lgr.info("Marking all notifications as read", { event });

  try {
    const userId = PermissionChecker.getUserId(event);

    if (!userId) {
      throw new UA("Not authenticated");
    }

    // Get all unread notifications
    const result = await dbc.send(
      new QC({
        TableName: process.env.NOTIFICATIONS_TABLE!,
        IndexName: "byInvestor",
        KeyConditionExpression: "investorId = :investorId",
        FilterExpression: "#read = :false",
        ExpressionAttributeNames: {
          "#read": "read",
        },
        ExpressionAttributeValues: {
          ":investorId": userId,
          ":false": false,
        },
      })
    );

    const unreadNotifications = result.Items || [];
    const now = new Date().toISOString();

    // Mark each as read
    for (const notification of unreadNotifications) {
      await dbc.send(
        new UC({
          TableName: process.env.NOTIFICATIONS_TABLE!,
          Key: { id: notification.id },
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
    }

    lgr.info("All notifications marked as read", {
      investorId: userId,
      count: unreadNotifications.length,
    });

    return true;

  } catch (error) {
    lgr.error("Error marking all notifications as read", error);
    throw error;
  }
};