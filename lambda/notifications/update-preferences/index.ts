import { PutCommand as Put, QueryCommand as Q } from "@aws-sdk/lib-dynamodb";
import { docClient as d } from "@shared/db/client";
import { Logger as Logg } from "@shared/utils/logger";
import { UnauthorizedError as Auth } from "@shared/utils/errors";
import type { AppSyncEvent as Ev2 } from "../../shared/types";
import { PermissionChecker } from "@shared/utils/permissions";

const logg = new Logg("UpdateNotificationPreferences");

export const updatePreferencesHandler = async (event: Ev2) => {
  logg.info("Updating notification preferences", { event });

  try {
    const input = event.arguments.input;
    const userId = PermissionChecker.getUserId(event);

    if (!userId) {
      throw new Auth("Not authenticated");
    }

    // Get existing preferences
    const result = await d.send(
      new Q({
        TableName: process.env.NOTIFICATION_PREFERENCES_TABLE!,
        KeyConditionExpression: "investorId = :investorId",
        ExpressionAttributeValues: {
          ":investorId": userId,
        },
        Limit: 1,
      })
    );

    const existing = result.Items?.[0] || {};

    const now = new Date().toISOString();

    // Update preferences
    const preferences = {
      investorId: userId,
      emailEnabled: input.emailEnabled ?? existing.emailEnabled ?? true,
      emailInvestmentUpdates: input.emailInvestmentUpdates ?? existing.emailInvestmentUpdates ?? true,
      emailPropertyUpdates: input.emailPropertyUpdates ?? existing.emailPropertyUpdates ?? true,
      emailDividendPayments: input.emailDividendPayments ?? existing.emailDividendPayments ?? true,
      emailKYCUpdates: input.emailKYCUpdates ?? existing.emailKYCUpdates ?? true,
      emailMarketingMessages: input.emailMarketingMessages ?? existing.emailMarketingMessages ?? false,
      
      pushEnabled: input.pushEnabled ?? existing.pushEnabled ?? true,
      pushInvestmentUpdates: input.pushInvestmentUpdates ?? existing.pushInvestmentUpdates ?? true,
      pushPropertyUpdates: input.pushPropertyUpdates ?? existing.pushPropertyUpdates ?? true,
      pushDividendPayments: input.pushDividendPayments ?? existing.pushDividendPayments ?? true,
      pushKYCUpdates: input.pushKYCUpdates ?? existing.pushKYCUpdates ?? true,
      
      inAppEnabled: input.inAppEnabled ?? existing.inAppEnabled ?? true,
      digestFrequency: input.digestFrequency ?? existing.digestFrequency ?? "IMMEDIATE",
      
      updatedAt: now,
    };

    await d.send(
      new Put({
        TableName: process.env.NOTIFICATION_PREFERENCES_TABLE!,
        Item: preferences,
      })
    );

    logg.info("Preferences updated", {
      investorId: userId,
    });

    return preferences;

  } catch (error) {
    logg.error("Error updating preferences", error);
    throw error;
  }
};
