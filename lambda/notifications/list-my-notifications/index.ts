import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "@shared/db/client";
import { Logger } from "@shared/utils/logger";
import { UnauthorizedError } from "@shared/utils/errors";
import type { AppSyncEvent } from "../../shared/types";
import { PermissionChecker } from "@shared/utils/permissions";

const logger = new Logger("ListMyNotifications");

export const handler = async (event: AppSyncEvent) => {
  logger.info("Listing user notifications", { event });

  try {
    const userId = PermissionChecker.getUserId(event);
    const args = event.arguments || {};

    if (!userId) {
      throw new UnauthorizedError("Not authenticated");
    }

    const limit = args.limit || 50;

    // Build filter expression
    let filterExpression = "";
    const expressionValues: any = {};

    if (args.filter?.read !== undefined) {
      filterExpression = "#read = :read";
      expressionValues[":read"] = args.filter.read;
    }

    if (args.filter?.type) {
      filterExpression += filterExpression ? " AND " : "";
      filterExpression += "#type = :type";
      expressionValues[":type"] = args.filter.type;
    }

    // Query by investorId (GSI)
    const result = await docClient.send(
      new QueryCommand({
        TableName: process.env.NOTIFICATIONS_TABLE!,
        IndexName: "byInvestor",
        KeyConditionExpression: "investorId = :investorId",
        FilterExpression: filterExpression || undefined,
        ExpressionAttributeNames: filterExpression ? {
          "#read": "read",
          "#type": "type",
        } : undefined,
        ExpressionAttributeValues: {
          ":investorId": userId,
          ...expressionValues,
        },
        Limit: limit,
        ScanIndexForward: false, // Newest first
      })
    );

    const notifications = result.Items || [];

    // Calculate unread count
    const unreadCount = notifications.filter(n => !n.read).length;

    logger.info("Notifications listed", {
      investorId: userId,
      count: notifications.length,
      unreadCount,
    });

    return {
      notifications,
      totalCount: notifications.length,
      unreadCount,
    };

  } catch (error) {
    logger.error("Error listing notifications", error);
    throw error;
  }
};
