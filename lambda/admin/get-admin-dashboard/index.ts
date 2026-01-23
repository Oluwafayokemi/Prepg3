// lambda/admin/get-admin-dashboard/index.ts

import { ScanCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "@shared/db/client";
import { PermissionChecker } from "@shared/utils/permissions";
import { Logger } from "@shared/utils/logger";
import type { AppSyncEvent } from "../../shared/types";

const logger = new Logger("GetAdminDashboard");

interface AdminDashboard {
  // Overview metrics
  totalInvestors: number;
  totalProperties: number;
  totalCapitalRaised: number;
  totalPortfolioValue: number;
  averageROI: number;

  // Recent activity
  recentInvestments: any[];
  recentTransactions: any[];

  // Property breakdown
  propertiesByStatus: Array<{ status: string; count: number }>;

  // Compliance alerts
  pendingKYCReviews: number;
  pendingAMLAlerts: number;
  activePEPInvestors: number;
  suspendedAccounts: number;

  // Financial overview
  monthlyRevenue: number;
  totalFees: number;
  outstandingPayments: number;
}

export const handler = async (event: AppSyncEvent): Promise<AdminDashboard> => {
  logger.info("Getting admin dashboard", { event });

  try {
    // Authorization
    PermissionChecker.requireAdmin(event);

    // Fetch all data in parallel for performance
    const [
      investors,
      properties,
      investments,
      transactions,
    ] = await Promise.all([
      getInvestors(),
      getProperties(),
      getInvestments(),
      getTransactions(),
    ]);

    // Calculate metrics
    const totalInvestors = investors.length;
    const activeInvestors = investors.filter(i => i.accountStatus === "ACTIVE").length;
    const pendingKYCReviews = investors.filter(i => i.kycStatus === "PENDING").length;
    const activePEPInvestors = investors.filter(i => i.isPEP === true).length;
    const suspendedAccounts = investors.filter(i => i.accountStatus === "SUSPENDED").length;

    const totalProperties = properties.length;
    const propertiesByStatus = calculatePropertiesByStatus(properties);

    const totalCapitalRaised = investments.reduce((sum, inv) => sum + (inv.amountInvested || 0), 0);
    const totalPortfolioValue = properties.reduce((sum, prop) => sum + (prop.currentValue || 0), 0);
    
    const averageROI = properties.length > 0
      ? properties.reduce((sum, prop) => sum + (prop.roi || 0), 0) / properties.length
      : 0;

    // Get recent activity (last 10)
    const recentInvestments = investments
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);

    const recentTransactions = transactions
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);

    // Calculate financial metrics
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const monthlyRevenue = transactions
      .filter(t => 
        t.type === "FEE" && 
        new Date(t.createdAt) >= firstDayOfMonth &&
        t.status === "COMPLETED"
      )
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const totalFees = transactions
      .filter(t => t.type === "FEE" && t.status === "COMPLETED")
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const outstandingPayments = transactions
      .filter(t => t.status === "PENDING")
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const dashboard: AdminDashboard = {
      totalInvestors,
      totalProperties,
      totalCapitalRaised,
      totalPortfolioValue,
      averageROI,
      recentInvestments,
      recentTransactions,
      propertiesByStatus,
      pendingKYCReviews,
      pendingAMLAlerts: 0, // TODO: Implement AML alerts
      activePEPInvestors,
      suspendedAccounts,
      monthlyRevenue,
      totalFees,
      outstandingPayments,
    };

    logger.info("Dashboard generated", {
      totalInvestors,
      totalProperties,
      pendingKYCReviews,
    });

    return dashboard;

  } catch (error) {
    logger.error("Error getting admin dashboard", error);
    throw error;
  }
};

/**
 * Get all current investors
 */
async function getInvestors(): Promise<any[]> {
  const result = await docClient.send(
    new ScanCommand({
      TableName: process.env.INVESTORS_TABLE!,
      FilterExpression: "isCurrent = :current",
      ExpressionAttributeValues: {
        ":current": "CURRENT",
      },
    })
  );

  return result.Items || [];
}

/**
 * Get all current properties
 */
async function getProperties(): Promise<any[]> {
  const result = await docClient.send(
    new ScanCommand({
      TableName: process.env.PROPERTIES_TABLE!,
      FilterExpression: "isCurrent = :current",
      ExpressionAttributeValues: {
        ":current": "CURRENT",
      },
    })
  );

  return result.Items || [];
}

/**
 * Get all investments
 */
async function getInvestments(): Promise<any[]> {
  const result = await docClient.send(
    new ScanCommand({
      TableName: process.env.INVESTMENTS_TABLE!,
    })
  );

  return result.Items || [];
}

/**
 * Get all transactions
 */
async function getTransactions(): Promise<any[]> {
  const result = await docClient.send(
    new ScanCommand({
      TableName: process.env.TRANSACTIONS_TABLE!,
    })
  );

  return result.Items || [];
}

/**
 * Calculate properties by status
 */
function calculatePropertiesByStatus(properties: any[]): Array<{ status: string; count: number }> {
  const statusCounts = new Map<string, number>();

  for (const property of properties) {
    const status = property.status || "UNKNOWN";
    statusCounts.set(status, (statusCounts.get(status) || 0) + 1);
  }

  return Array.from(statusCounts.entries()).map(([status, count]) => ({
    status,
    count,
  }));
}