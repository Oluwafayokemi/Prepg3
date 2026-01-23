import { ScanCommand as SCmd } from "@aws-sdk/lib-dynamodb";
import { docClient as dbc } from "@shared/db/client";
import { PermissionChecker as PCheck } from "@shared/utils/permissions";
import { Logger as Lgr } from "@shared/utils/logger";
import type { AppSyncEvent as Evt } from "../../shared/types";

const lgr = new Lgr("GetFinancialStats");

export const financialStatsHandler = async (event: Evt) => {
  lgr.info("Getting financial stats", { event });

  try {
    // Authorization: Admin only
    PCheck.requireAdmin(event);

    // Get all data in parallel
    const [investmentsResult, transactionsResult, propertiesResult] = await Promise.all([
      dbc.send(new SCmd({ TableName: process.env.INVESTMENTS_TABLE! })),
      dbc.send(new SCmd({ TableName: process.env.TRANSACTIONS_TABLE! })),
      dbc.send(new SCmd({
        TableName: process.env.PROPERTIES_TABLE!,
        FilterExpression: "isCurrent = :current",
        ExpressionAttributeValues: { ":current": "CURRENT" },
      })),
    ]);

    const investments = investmentsResult.Items || [];
    const transactions = transactionsResult.Items || [];
    const properties = propertiesResult.Items || [];

    // Calculate metrics
    const totalCapitalRaised = investments.reduce((sum, inv) => 
      sum + (inv.amountInvested || 0), 0
    );

    const totalPortfolioValue = properties.reduce((sum, prop) => 
      sum + (prop.currentValue || 0), 0
    );

    const totalFees = transactions
      .filter(t => t.type === "FEE" && t.status === "COMPLETED")
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    // Monthly revenue
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const monthlyRevenue = transactions
      .filter(t => 
        t.type === "FEE" && 
        new Date(t.createdAt) >= firstDayOfMonth &&
        t.status === "COMPLETED"
      )
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    // Yearly revenue
    const firstDayOfYear = new Date(now.getFullYear(), 0, 1);
    
    const revenueThisYear = transactions
      .filter(t => 
        t.type === "FEE" && 
        new Date(t.createdAt) >= firstDayOfYear &&
        t.status === "COMPLETED"
      )
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    // Last 30 days transaction volume
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const transactionVolumeLast30Days = transactions
      .filter(t => 
        new Date(t.createdAt) >= thirtyDaysAgo &&
        t.status === "COMPLETED"
      )
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    // Average investment size
    const averageInvestmentSize = investments.length > 0
      ? totalCapitalRaised / investments.length
      : 0;

    return {
      totalCapitalRaised,
      totalPortfolioValue,
      totalFees,
      monthlyRevenue,
      revenueThisYear,
      transactionVolumeLast30Days,
      averageInvestmentSize,
    };

  } catch (error) {
    lgr.error("Error getting financial stats", error);
    throw error;
  }
};

// ============================================
// lambda/admin/get-compliance-stats/index.ts
// ============================================

import { ScanCommand as ScanCmd } from "@aws-sdk/lib-dynamodb";
import { docClient as dbClient } from "@shared/db/client";
import { PermissionChecker as PermCheck } from "@shared/utils/permissions";
import { Logger as LogMgr } from "@shared/utils/logger";
import type { AppSyncEvent as EvtType } from "../../shared/types";

const logMgr = new LogMgr("GetComplianceStats");

export const complianceStatsHandler = async (event: EvtType) => {
  logMgr.info("Getting compliance stats", { event });

  try {
    // Authorization: Compliance can view
    if (!PermCheck.isCompliance(event)) {
      throw new Error("Compliance officer access required");
    }

    // Get all current investors
    const result = await dbClient.send(
      new ScanCmd({
        TableName: process.env.INVESTORS_TABLE!,
        FilterExpression: "isCurrent = :current",
        ExpressionAttributeValues: {
          ":current": "CURRENT",
        },
      })
    );

    const investors = result.Items || [];

    const totalInvestors = investors.length;
    const verifiedInvestors = investors.filter(i => i.kycStatus === "APPROVED").length;
    const pendingKYCCount = investors.filter(i => i.kycStatus === "PENDING").length;
    const rejectedKYCCount = investors.filter(i => i.kycStatus === "REJECTED").length;
    const pepCount = investors.filter(i => i.isPEP === true).length;
    const highRiskCount = investors.filter(i => i.riskLevel === "HIGH").length;

    // AML stats (placeholder - implement when you have AML alerts table)
    const amlAlertsLast30Days = 0; // TODO: Query AML alerts table
    const sanctionMatchesLast30Days = 0; // TODO: Query sanctions table

    return {
      totalInvestors,
      verifiedInvestors,
      pendingKYCCount,
      rejectedKYCCount,
      pepCount,
      highRiskCount,
      amlAlertsLast30Days,
      sanctionMatchesLast30Days,
    };

  } catch (error) {
    logMgr.error("Error getting compliance stats", error);
    throw error;
  }
};