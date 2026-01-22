// lambda/scheduled/collect-kyc-metrics/index.ts

import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "@shared/db/client";
import { Logger } from "@shared/utils/logger";
import { MetricsService } from "@shared/utils/metrics";

const logger = new Logger("CollectKYCMetrics");

/**
 * Scheduled Lambda that runs every 15 minutes
 * Counts pending KYC reviews and logs to CloudWatch
 * 
 * Purpose: Keep metrics up-to-date even when admins aren't active
 */
export const handler = async () => {
  logger.info("Collecting KYC metrics");

  try {
    // Scan for investors needing KYC review
    const result = await docClient.send(
      new ScanCommand({
        TableName: process.env.INVESTORS_TABLE!,
        FilterExpression: "kycStatus IN (:pending, :inProgress, :moreInfo) AND isCurrent = :current",
        ExpressionAttributeValues: {
          ":pending": "PENDING",
          ":inProgress": "IN_PROGRESS",
          ":moreInfo": "MORE_INFO_REQUIRED",
          ":current": "CURRENT",
        },
        ProjectionExpression: "id, kycStatus", // Only fetch needed fields
      })
    );

    const allItems = result.Items || [];

    // Count by status
    const pending = allItems.filter(i => i.kycStatus === 'PENDING').length;
    const inProgress = allItems.filter(i => i.kycStatus === 'IN_PROGRESS').length;
    const moreInfo = allItems.filter(i => i.kycStatus === 'MORE_INFO_REQUIRED').length;

    logger.info("KYC queue counts", { pending, inProgress, moreInfo });

    // Log metrics to CloudWatch
    await MetricsService.logKYCQueueSize(pending, inProgress, moreInfo);

    logger.info("KYC metrics collected successfully");

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        metrics: {
          pending,
          inProgress,
          moreInfo,
          total: pending + inProgress + moreInfo,
        },
        timestamp: new Date().toISOString(),
      }),
    };

  } catch (error) {
    logger.error("Error collecting KYC metrics", error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};