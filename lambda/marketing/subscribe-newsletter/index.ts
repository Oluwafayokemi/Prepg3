// UPDATED: Handles both visitors AND investors with proper conversion tracking

import { PutCommand, UpdateCommand, GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "@shared/db/client";
import { MailchimpService } from "@shared/services/mailchimp";
import { Logger } from "@shared/utils/logger";
import { ValidationError } from "@shared/utils/errors";
import type { AppSyncEvent } from "../../shared/types";
import { PermissionChecker } from "@shared/utils/permissions";

const logger = new Logger("SubscribeNewsletter");

interface SubscribeNewsletterInput {
  email: string;
  firstName?: string;
  lastName?: string;
  preferences?: {
    propertyUpdates?: boolean;
    investmentTips?: boolean;
    monthlyNewsletter?: boolean;
    marketInsights?: boolean;
  };
  source?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

export const handler = async (event: AppSyncEvent) => {
  logger.info("Subscribing to newsletter", { event });

  try {
    const input: SubscribeNewsletterInput = event.arguments.input;
    const userId = PermissionChecker.getUserId(event); // Optional - can be anonymous

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(input.email)) {
      throw new ValidationError("Invalid email address");
    }

    const now = new Date().toISOString();

    // Default preferences
    const preferences = {
      propertyUpdates: input.preferences?.propertyUpdates ?? true,
      investmentTips: input.preferences?.investmentTips ?? true,
      monthlyNewsletter: input.preferences?.monthlyNewsletter ?? true,
      marketInsights: input.preferences?.marketInsights ?? false,
    };

    // Build Mailchimp tags based on preferences
    const tags: string[] = [];
    if (preferences.propertyUpdates) tags.push("property-updates");
    if (preferences.investmentTips) tags.push("investment-tips");
    if (preferences.monthlyNewsletter) tags.push("monthly-newsletter");
    if (preferences.marketInsights) tags.push("market-insights");

    // Determine if visitor or investor
    const isInvestor = !!userId;
    const source = input.source || (isInvestor ? "platform" : "website");

    // Add user type tag
    if (isInvestor) {
      tags.push("registered", "investor");
    } else {
      tags.push("visitor", "prospect");
    }

    // Get subscriber hash (MD5 of lowercase email)
    const crypto = require("crypto");
    const subscriberHash = crypto
      .createHash("md5")
      .update(input.email.toLowerCase())
      .digest("hex");

    // Subscribe to Mailchimp
    await MailchimpService.subscribe({
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      listId: process.env.MAILCHIMP_NEWSLETTER_LIST_ID!,
      tags,
      mergeFields: {
        SIGNUPDATE: now.split("T")[0], // YYYY-MM-DD
        SOURCE: source,
        IS_INVESTOR: isInvestor ? "true" : "false",
        INVESTOR_ID: userId || "",
        UTM_SOURCE: input.utmSource || "",
        UTM_MEDIUM: input.utmMedium || "",
        UTM_CAMPAIGN: input.utmCampaign || "",
      },
    });

    // === HANDLE REGISTERED INVESTOR ===
    if (isInvestor) {
      logger.info("Subscribing registered investor", { userId, email: input.email });

      // Get current investor version
      const investorResult = await docClient.send(
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

      if (!investorResult.Items || investorResult.Items.length === 0) {
        throw new Error("Investor not found");
      }

      const investor = investorResult.Items[0];
      const newVersion = (investor.version || 0) + 1;

      // Mark old version as HISTORICAL
      await docClient.send(
        new UpdateCommand({
          TableName: process.env.INVESTORS_TABLE!,
          Key: {
            id: userId,
            version: investor.version,
          },
          UpdateExpression: "SET isCurrent = :historical",
          ExpressionAttributeValues: {
            ":historical": "HISTORICAL",
          },
        })
      );

      // Create new version with newsletter subscription
      await docClient.send(
        new PutCommand({
          TableName: process.env.INVESTORS_TABLE!,
          Item: {
            ...investor,
            version: newVersion,
            newsletterSubscribed: true,
            newsletterSubscribedAt: now,
            newsletterPreferences: preferences,
            mailchimpSubscriberId: subscriberHash,
            updatedAt: now,
            isCurrent: "CURRENT",
            changedFields: ["newsletterSubscribed", "newsletterPreferences"],
            changeReason: "User subscribed to newsletter",
          },
        })
      );

      // Check if they were previously a visitor subscription
      const visitorSubscription = await docClient.send(
        new GetCommand({
          TableName: process.env.EMAIL_SUBSCRIPTIONS_TABLE!,
          Key: { email: input.email },
        })
      );

      // If they were a visitor, mark as converted
      if (visitorSubscription.Item && !visitorSubscription.Item.convertedToInvestor) {
        await docClient.send(
          new UpdateCommand({
            TableName: process.env.EMAIL_SUBSCRIPTIONS_TABLE!,
            Key: { email: input.email },
            UpdateExpression:
              "SET convertedToInvestor = :true, " +
              "convertedInvestorId = :investorId, " +
              "convertedAt = :now, " +
              "updatedAt = :now",
            ExpressionAttributeValues: {
              ":true": true,
              ":investorId": userId,
              ":now": now,
            },
          })
        );

        logger.info("Visitor subscription marked as converted", {
          email: input.email,
          investorId: userId,
        });
      }

      return {
        success: true,
        email: input.email,
        message: "Successfully subscribed to newsletter!",
        isInvestor: true,
      };
    }

    // === HANDLE VISITOR (ANONYMOUS) ===
    logger.info("Subscribing visitor", { email: input.email });

    // Check if this email is already registered as an investor
    const existingInvestorResult = await docClient.send(
      new QueryCommand({
        TableName: process.env.INVESTORS_TABLE!,
        IndexName: "byEmail", // You'll need to add this GSI
        KeyConditionExpression: "email = :email",
        ExpressionAttributeValues: {
          ":email": input.email,
        },
        Limit: 1,
      })
    );

    // If they're already an investor, tell them to log in
    if (existingInvestorResult.Items && existingInvestorResult.Items.length > 0) {
      return {
        success: false,
        email: input.email,
        message: "This email is already registered. Please log in to manage your newsletter preferences.",
        isInvestor: true,
      };
    }

    // Save to EmailSubscriptions table (visitor)
    await docClient.send(
      new PutCommand({
        TableName: process.env.EMAIL_SUBSCRIPTIONS_TABLE!,
        Item: {
          email: input.email,
          firstName: input.firstName,
          lastName: input.lastName,
          subscribed: true,
          subscribedAt: now,
          unsubscribedAt: null,
          preferences,
          source,
          mailchimpListId: process.env.MAILCHIMP_NEWSLETTER_LIST_ID,
          mailchimpSubscriberId: subscriberHash,

          // Lead tracking
          convertedToInvestor: false,
          convertedInvestorId: null,
          convertedAt: null,

          // UTM tracking (marketing analytics)
          utmSource: input.utmSource,
          utmMedium: input.utmMedium,
          utmCampaign: input.utmCampaign,

          createdAt: now,
          updatedAt: now,
        },
      })
    );

    logger.info("Newsletter subscription successful (visitor)", {
      email: input.email,
      source,
      utmCampaign: input.utmCampaign,
    });

    return {
      success: true,
      email: input.email,
      message: "Successfully subscribed to newsletter! Check your email for confirmation.",
      isInvestor: false,
    };

  } catch (error) {
    logger.error("Error subscribing to newsletter", error);
    throw error;
  }
};