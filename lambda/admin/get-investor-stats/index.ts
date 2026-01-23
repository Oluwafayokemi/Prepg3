// lambda/admin/get-investor-stats/index.ts

import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "@shared/db/client";
import { PermissionChecker } from "@shared/utils/permissions";
import { Logger } from "@shared/utils/logger";
import type { AppSyncEvent } from "../../shared/types";

const logger = new Logger("GetInvestorStats");

export const handler = async (event: AppSyncEvent) => {
  logger.info("Getting investor stats", { event });

  try {
    // Authorization: Compliance can view this
    if (!PermissionChecker.isCompliance(event)) {
      throw new Error("Compliance officer access required");
    }

    // Get all current investors
    const result = await docClient.send(
      new ScanCommand({
        TableName: process.env.INVESTORS_TABLE!,
        FilterExpression: "isCurrent = :current",
        ExpressionAttributeValues: {
          ":current": "CURRENT",
        },
      })
    );

    const investors = result.Items || [];

    // Calculate stats
    const total = investors.length;
    const active = investors.filter(i => i.accountStatus === "ACTIVE").length;
    const pendingVerification = investors.filter(i => i.kycStatus === "PENDING").length;
    const suspended = investors.filter(i => i.accountStatus === "SUSPENDED").length;
    const closed = investors.filter(i => i.accountStatus === "CLOSED").length;

    // Time-based stats
    const now = new Date();
    const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const newThisMonth = investors.filter(i => 
      new Date(i.createdAt) >= oneMonthAgo
    ).length;

    const newThisWeek = investors.filter(i => 
      new Date(i.createdAt) >= oneWeekAgo
    ).length;

    // By tier
    const tierCounts = new Map<string, number>();
    for (const investor of investors) {
      const tier = investor.accountTier || "STANDARD";
      tierCounts.set(tier, (tierCounts.get(tier) || 0) + 1);
    }

    const byTier = Array.from(tierCounts.entries()).map(([tier, count]) => ({
      tier,
      count,
    }));

    // By category
    const categoryCounts = new Map<string, number>();
    for (const investor of investors) {
      const category = investor.investorCategory || "RETAIL";
      categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
    }

    const byCategory = Array.from(categoryCounts.entries()).map(([category, count]) => ({
      category,
      count,
    }));

    return {
      total,
      active,
      pendingVerification,
      suspended,
      closed,
      newThisMonth,
      newThisWeek,
      byTier,
      byCategory,
    };

  } catch (error) {
    logger.error("Error getting investor stats", error);
    throw error;
  }
};