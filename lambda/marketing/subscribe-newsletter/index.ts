// lambda/marketing/subscribe-newsletter/index.ts

import { PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
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
  };
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

    // Determine tags based on preferences
    const tags: string[] = [];
    if (input.preferences?.propertyUpdates) tags.push("property-updates");
    if (input.preferences?.investmentTips) tags.push("investment-tips");
    if (input.preferences?.monthlyNewsletter) tags.push("monthly-newsletter");

    // Subscribe to Mailchimp
    await MailchimpService.subscribe({
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      listId: process.env.MAILCHIMP_NEWSLETTER_LIST_ID!,
      tags,
      mergeFields: {
        SIGNUPDATE: new Date().toISOString().split("T")[0], // YYYY-MM-DD
        SOURCE: "platform",
      },
    });

    // Save subscription to DynamoDB (for our records)
    await docClient.send(
      new PutCommand({
        TableName: process.env.EMAIL_SUBSCRIPTIONS_TABLE!,
        Item: {
          email: input.email,
          investorId: userId,
          firstName: input.firstName,
          lastName: input.lastName,
          subscribed: true,
          preferences: input.preferences || {},
          subscribedAt: now,
          source: "platform",
          mailchimpListId: process.env.MAILCHIMP_NEWSLETTER_LIST_ID,
        },
      })
    );

    // If user is logged in, update investor record
    if (userId) {
      await docClient.send(
        new UpdateCommand({
          TableName: process.env.INVESTORS_TABLE!,
          Key: { id: userId, version: 1 }, // Get current version properly
          UpdateExpression: "SET newsletterSubscribed = :true",
          ExpressionAttributeValues: {
            ":true": true,
          },
        })
      );
    }

    logger.info("Newsletter subscription successful", {
      email: input.email,
      tags,
    });

    return {
      success: true,
      email: input.email,
      message: "Successfully subscribed to newsletter!",
    };

  } catch (error) {
    logger.error("Error subscribing to newsletter", error);
    throw error;
  }
};

/*
EXAMPLE MUTATION:

mutation SubscribeNewsletter {
  subscribeNewsletter(input: {
    email: "investor@example.com"
    firstName: "John"
    lastName: "Smith"
    preferences: {
      propertyUpdates: true
      investmentTips: true
      monthlyNewsletter: true
    }
  }) {
    success
    email
    message
  }
}

FRONTEND USAGE:

function NewsletterSignup() {
  const [subscribe] = useMutation(SUBSCRIBE_NEWSLETTER);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    await subscribe({
      variables: {
        input: {
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName,
          preferences: {
            propertyUpdates: formData.propertyUpdates,
            monthlyNewsletter: formData.monthlyNewsletter,
          }
        }
      }
    });

    toast.success("Thanks for subscribing!");
  };

  return (
    <form onSubmit={handleSubmit}>
      <input type="email" required />
      <Checkbox label="Property Updates" />
      <Checkbox label="Monthly Newsletter" />
      <button>Subscribe</button>
    </form>
  );
}
*/