import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "@shared/db/client";
import { Logger } from "@shared/utils/logger";
import { UnauthorizedError } from "@shared/utils/errors";
import { MetricsService } from "@shared/utils/metrics";
import type { AppSyncEvent } from "../../shared/types";

const logger = new Logger("GetKYCReviewQueue");

interface KYCReviewQueue {
  pending: any[];
  inProgress: any[];
  requiresMoreInfo: any[];
  totalCount: number;
}

export const handler = async (event: AppSyncEvent): Promise<KYCReviewQueue> => {
  logger.info("Getting KYC review queue", { event });

  try {
    // Authorization: Only admins or compliance officers
    const groups = event.identity?.claims?.["cognito:groups"] || [];
    const isAdmin = groups.includes("Admin");
    const isCompliance = groups.includes("Compliance");

    if (!isAdmin && !isCompliance) {
      throw new UnauthorizedError(
        "Only admins or compliance officers can view KYC queue"
      );
    }

    // Get all investors needing KYC review
    const result = await docClient.send(
      new ScanCommand({
        TableName: process.env.INVESTORS_TABLE!,
        FilterExpression:
          "kycStatus IN (:pending, :inProgress, :moreInfo) AND isCurrent = :current",
        ExpressionAttributeValues: {
          ":pending": "PENDING",
          ":inProgress": "IN_PROGRESS",
          ":moreInfo": "MORE_INFO_REQUIRED",
          ":current": "CURRENT",
        },
      })
    );

    const allInvestors = result.Items || [];

    // Organize by status
    const pending = allInvestors.filter((inv) => inv.kycStatus === "PENDING");
    const inProgress = allInvestors.filter(
      (inv) => inv.kycStatus === "IN_PROGRESS"
    );
    const requiresMoreInfo = allInvestors.filter(
      (inv) => inv.kycStatus === "MORE_INFO_REQUIRED"
    );

    // Sort each category by submission date (oldest first for queue processing)
    const sortByDate = (a: any, b: any) => {
      const dateA = new Date(a.updatedAt || a.createdAt).getTime();
      const dateB = new Date(b.updatedAt || b.createdAt).getTime();
      return dateA - dateB; // Oldest first
    };

    pending.sort(sortByDate);
    inProgress.sort(sortByDate);
    requiresMoreInfo.sort(sortByDate);

    const queue: KYCReviewQueue = {
      pending,
      inProgress,
      requiresMoreInfo,
      totalCount: allInvestors.length,
    };

    await MetricsService.logKYCQueueSize(
      pending.length,
      inProgress.length,
      requiresMoreInfo.length
    );

    logger.info("KYC review queue retrieved", {
      pending: pending.length,
      inProgress: inProgress.length,
      requiresMoreInfo: requiresMoreInfo.length,
      total: queue.totalCount,
    });

    return queue;
  } catch (error) {
    logger.error("Error getting KYC review queue", error);
    throw error;
  }
};
