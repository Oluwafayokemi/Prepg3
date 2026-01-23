// lambda/marketing/sync-investor-to-mailchimp/index.ts
// DynamoDB Stream trigger - Auto-tag investors in Mailchimp based on activity

import { unmarshall } from "@aws-sdk/util-dynamodb";
import { MailchimpService } from "@shared/services/mailchimp";
import { Logger } from "@shared/utils/logger";
import type { DynamoDBStreamEvent, DynamoDBRecord } from "aws-lambda";

const logger = new Logger("SyncInvestorToMailchimp");

export const handler = async (event: DynamoDBStreamEvent) => {
  logger.info("Syncing investors to Mailchimp", {
    recordCount: event.Records.length,
  });

  for (const record of event.Records) {
    try {
      await processRecord(record);
    } catch (error) {
      logger.warn("Error processing record", {
        error,
        eventID: record.eventID,
      });
      // Don't throw - continue processing other records
    }
  }
};

async function processRecord(record: DynamoDBRecord): Promise<void> {
  // Only process INSERT and MODIFY events
  if (record.eventName !== "INSERT" && record.eventName !== "MODIFY") {
    return;
  }

  // Get new image
  const newImage = record.dynamodb?.NewImage;
  if (!newImage) {
    logger.warn("No new image in record", { eventID: record.eventID });
    return;
  }

  // Unmarshall DynamoDB record to JavaScript object
  const investor = unmarshall(newImage as Record<string, any>) as any;

  // Skip if not subscribed to newsletter
  if (!investor.newsletterSubscribed) {
    logger.debug("Investor not subscribed to newsletter", {
      investorId: investor.id,
    });
    return;
  }

  // Skip if no email
  if (!investor.email) {
    logger.error("Investor has no email", { investorId: investor.id });
    return;
  }

  logger.info("Processing investor for Mailchimp sync", {
    investorId: investor.id,
    email: investor.email,
  });

  // Determine tags to add
  const tags = buildTagsForInvestor(investor);

  // Sync to Mailchimp
  try {
    // Add tags to Mailchimp
    if (tags.length > 0) {
      await MailchimpService.addTags(
        investor.email,
        process.env.MAILCHIMP_NEWSLETTER_LIST_ID!,
        tags
      );

      logger.info("Investor synced to Mailchimp", {
        investorId: investor.id,
        email: investor.email,
        tags,
      });
    }

    // Update merge fields with latest data
    await MailchimpService.updateSubscriber({
      email: investor.email,
      firstName: investor.firstName,
      lastName: investor.lastName,
      listId: process.env.MAILCHIMP_NEWSLETTER_LIST_ID!,
      mergeFields: {
        INVESTOR_ID: investor.id,
        KYC_STATUS: investor.kycStatus || "PENDING",
        TOTAL_INVESTED: investor.totalInvested || 0,
        ACCOUNT_TIER: investor.accountTier || "STANDARD",
        INVESTOR_CAT: investor.investorCategory || "RETAIL",
        VERIFIED_DATE: investor.kycApprovedAt || "",
      },
    });

  } catch (error: any) {
    // If subscriber doesn't exist in Mailchimp, subscribe them
    if (error.status === 404) {
      logger.info("Subscriber not in Mailchimp, subscribing", {
        email: investor.email,
      });

      await MailchimpService.subscribe({
        email: investor.email,
        firstName: investor.firstName,
        lastName: investor.lastName,
        listId: process.env.MAILCHIMP_NEWSLETTER_LIST_ID!,
        tags,
        mergeFields: {
          INVESTOR_ID: investor.id,
          KYC_STATUS: investor.kycStatus || "PENDING",
          TOTAL_INVESTED: investor.totalInvested || 0,
          ACCOUNT_TIER: investor.accountTier || "STANDARD",
          INVESTOR_CAT: investor.investorCategory || "RETAIL",
          VERIFIED_DATE: investor.kycApprovedAt || "",
        },
      });
    } else {
      throw error;
    }
  }
}

/**
 * Build Mailchimp tags based on investor data
 */
function buildTagsForInvestor(investor: any): string[] {
  const tags: string[] = [];

  // KYC Status
  if (investor.kycStatus === "APPROVED") {
    tags.push("verified");
  } else if (investor.kycStatus === "PENDING") {
    tags.push("kyc-pending");
  }

  // Investment Level
  const totalInvested = investor.totalInvested || 0;

  if (totalInvested >= 100000) {
    tags.push("high-net-worth");
    tags.push("vip");
  } else if (totalInvested >= 50000) {
    tags.push("medium-investor");
  } else if (totalInvested > 0) {
    tags.push("active-investor");
  } else {
    tags.push("prospect");
  }

  // Investor Category
  if (investor.investorCategory === "PROFESSIONAL") {
    tags.push("professional-investor");
  } else if (investor.investorCategory === "HIGH_NET_WORTH") {
    tags.push("hnw-investor");
  } else if (investor.investorCategory === "SOPHISTICATED") {
    tags.push("sophisticated-investor");
  } else {
    tags.push("retail-investor");
  }

  // Account Tier
  if (investor.accountTier === "VIP") {
    tags.push("vip-tier");
  } else if (investor.accountTier === "PREMIUM") {
    tags.push("premium-tier");
  }

  // PEP Status
  if (investor.isPEP) {
    tags.push("pep");
  }

  // Account Status
  if (investor.accountStatus === "ACTIVE") {
    tags.push("active-account");
  } else if (investor.accountStatus === "SUSPENDED") {
    tags.push("suspended-account");
  }

  // Property Preferences (if available)
  if (investor.preferences?.interestedPropertyTypes) {
    const interests = investor.preferences.interestedPropertyTypes;
    
    if (interests.includes("RESIDENTIAL")) {
      tags.push("interested-in-residential");
    }
    if (interests.includes("COMMERCIAL")) {
      tags.push("interested-in-commercial");
    }
    if (interests.includes("MIXED_USE")) {
      tags.push("interested-in-mixed-use");
    }
  }

  return tags;
}

/*
DEPLOYMENT:

1. Add DynamoDB Stream to Investors table:

// infrastructure/lib/stacks/database-stack.ts

investorsTable.addStream({
  streamViewType: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
});

2. Create Lambda with stream trigger:

// infrastructure/lib/stacks/lambdas-stack.ts

const syncInvestorToMailchimpLambda = new lambda.Function(
  this,
  'SyncInvestorToMailchimp',
  {
    functionName: 'sync-investor-to-mailchimp',
    handler: 'marketing/sync-investor-to-mailchimp/index.handler',
    runtime: lambda.Runtime.NODEJS_20_X,
    code: lambda.Code.fromAsset('lambda'),
    environment: {
      MAILCHIMP_API_KEY: process.env.MAILCHIMP_API_KEY!,
      MAILCHIMP_SERVER_PREFIX: process.env.MAILCHIMP_SERVER_PREFIX!,
      MAILCHIMP_NEWSLETTER_LIST_ID: process.env.MAILCHIMP_NEWSLETTER_LIST_ID!,
    },
    timeout: cdk.Duration.seconds(60),
  }
);

// Add DynamoDB stream trigger
syncInvestorToMailchimpLambda.addEventSource(
  new lambdaEventSources.DynamoEventSource(investorsTable, {
    startingPosition: lambda.StartingPosition.LATEST,
    batchSize: 10,
    retryAttempts: 3,
  })
);

3. Grant permissions (done automatically by addEventSource)

HOW IT WORKS:

1. Investor gets KYC approved
   → DynamoDB record updated (kycStatus: APPROVED)
   → Stream triggers Lambda
   → Lambda adds "verified" tag in Mailchimp

2. Investor makes investment
   → DynamoDB record updated (totalInvested: 50000)
   → Stream triggers Lambda
   → Lambda adds "active-investor" tag in Mailchimp

3. Investor invests £100k+
   → DynamoDB record updated (totalInvested: 150000)
   → Stream triggers Lambda
   → Lambda adds "high-net-worth" and "vip" tags

BENEFITS:
✅ Automatic syncing (no manual work)
✅ Real-time updates
✅ Accurate segmentation
✅ Better targeting for campaigns

MAILCHIMP MERGE FIELDS:
INVESTOR_ID     → investor.id
KYC_STATUS      → APPROVED, PENDING, REJECTED
TOTAL_INVESTED  → 50000
ACCOUNT_TIER    → VIP, PREMIUM, STANDARD
INVESTOR_CAT    → PROFESSIONAL, RETAIL, HNW
VERIFIED_DATE   → 2025-01-23T10:00:00Z

EXAMPLE TAGS ADDED:
- verified
- active-investor
- high-net-worth
- professional-investor
- interested-in-commercial
- vip
*/