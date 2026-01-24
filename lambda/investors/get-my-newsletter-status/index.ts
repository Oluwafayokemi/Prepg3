// lambda/investors/get-my-newsletter-status/index.ts
// Get current user's newsletter subscription status

import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "@shared/db/client";
import { Logger } from "@shared/utils/logger";
import { UnauthorizedError } from "@shared/utils/errors";
import type { AppSyncEvent } from "../../shared/types";
import { PermissionChecker } from "@shared/utils/permissions";

const logger = new Logger("GetMyNewsletterStatus");

export const handler = async (event: AppSyncEvent) => {
  logger.info("Getting newsletter status", { event });

  try {
    const userId = PermissionChecker.getUserId(event);

    if (!userId) {
      throw new UnauthorizedError("Not authenticated");
    }

    // Get current investor version
    const result = await docClient.send(
      new QueryCommand({
        TableName: process.env.INVESTORS_TABLE!,
        IndexName: "currentVersions",
        KeyConditionExpression: "id = :id AND isCurrent = :current",
        ExpressionAttributeValues: {
          ":id": userId,
          ":current": "CURRENT",
        },
        Limit: 1,
      })
    );

    if (!result.Items || result.Items.length === 0) {
      throw new Error("Investor not found");
    }

    const investor = result.Items[0];

    // Build response
    const status = {
      subscribed: investor.newsletterSubscribed || false,
      subscribedAt: investor.newsletterSubscribedAt || null,
      preferences: investor.newsletterPreferences || {
        propertyUpdates: false,
        investmentTips: false,
        monthlyNewsletter: false,
        marketInsights: false,
      },
      email: investor.email,
    };

    logger.info("Newsletter status retrieved", {
      investorId: userId,
      subscribed: status.subscribed,
    });

    return status;

  } catch (error) {
    logger.error("Error getting newsletter status", error);
    throw error;
  }
};
