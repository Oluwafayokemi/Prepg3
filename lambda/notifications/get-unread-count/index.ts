import { QueryCommand as Query } from "@aws-sdk/lib-dynamodb";
import { docClient as client } from "@shared/db/client";
import { Logger as Logger2 } from "@shared/utils/logger";
import { UnauthorizedError as Unauth } from "@shared/utils/errors";
import type { AppSyncEvent as Event2 } from "../../shared/types";
import { PermissionChecker } from "@shared/utils/permissions";

const logger2 = new Logger2("GetUnreadNotificationCount");

export const getUnreadCountHandler = async (event: Event2) => {
  logger2.info("Getting unread notification count", { event });

  try {
    const userId = PermissionChecker.getUserId(event);

    if (!userId) {
      throw new Unauth("Not authenticated");
    }

    // Count unread notifications
    const result = await client.send(
      new Query({
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
        Select: "COUNT",
      })
    );

    const count = result.Count || 0;

    logger2.info("Unread count retrieved", {
      investorId: userId,
      count,
    });

    return count;

  } catch (error) {
    logger2.error("Error getting unread count", error);
    throw error;
  }
};