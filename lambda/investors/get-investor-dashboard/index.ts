// lambda/investors/get-investor-dashboard/index.ts

import { GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "@shared/db/client";
import { Logger } from "@shared/utils/logger";
import { validateRequired } from "@shared/utils/validators";
import { formatAWSDate } from "@shared/utils/date-formatter";
import { PermissionChecker } from "@shared/utils/permissions";
import { NotFoundError } from "@shared/utils/errors";
import type { AppSyncEvent } from "../../shared/types";

const logger = new Logger("GetInvestorDashboard");

interface InvestorDashboard {
  totalInvested: number;
  portfolioValue: number;
  totalROI: number;
  activeInvestments: number;
  recentTransactions: any[];
  unreadNotifications: number;
  properties: any[];
  kycStatus: string;
  verificationLevel: string;
  accountStatus: string;
}

export const handler = async (
  event: AppSyncEvent,
): Promise<InvestorDashboard> => {
  logger.info("Getting investor dashboard", { event });

  try {
    const investorId = event.arguments.investorId;
    validateRequired(investorId, "investorId");

    // Authorization check
    PermissionChecker.requireOwnerOrAdmin(event, investorId, 'dashboard');

    logger.info("Authorization passed");

    // Get investor
    const investorResult = await docClient.send(
      new GetCommand({
        TableName: process.env.INVESTORS_TABLE!,
        Key: { id: investorId, isCurrent: "CURRENT" },
      }),
    );

    if (!investorResult.Item) {
      logger.info("Investor item not found", { investorId });
      throw new NotFoundError("Investor");
    }

    const investor = investorResult.Item;

    // Get investments
    const investmentsResult = await docClient.send(
      new QueryCommand({
        TableName: process.env.INVESTMENTS_TABLE!,
        IndexName: "byInvestor",
        KeyConditionExpression: "investorId = :investorId",
        ExpressionAttributeValues: {
          ":investorId": investorId,
        },
      }),
    );

    const investments = investmentsResult.Items || [];
    const activeInvestments = investments.filter(
      (inv) => inv.status === "ACTIVE",
    ).length;

    // Get recent transactions
    const transactionsResult = await docClient.send(
      new QueryCommand({
        TableName: process.env.TRANSACTIONS_TABLE!,
        IndexName: "byInvestor",
        KeyConditionExpression: "investorId = :investorId",
        ExpressionAttributeValues: {
          ":investorId": investorId,
        },
        ScanIndexForward: false,
        Limit: 10,
      }),
    );

    const recentTransactions = (transactionsResult.Items || []).map((txn) => ({
      id: txn.id,
      investorId: txn.investorId,
      propertyId: txn.propertyId || null,
      type: txn.type || "INVESTMENT",
      amount: txn.amount || 0,
      description: txn.description || "",
      date: formatAWSDate(txn.date), //
      reference: txn.reference || null,
      createdAt: new Date(txn.createdAt || Date.now()).toISOString(), 
    }));

    // Get unread notifications count
    const notificationsResult = await docClient.send(
      new QueryCommand({
        TableName: process.env.NOTIFICATIONS_TABLE!,
        IndexName: "byInvestor",
        KeyConditionExpression: "investorId = :investorId",
        FilterExpression: "isRead = :isRead",
        ExpressionAttributeValues: {
          ":investorId": investorId,
          ":isRead": false,
        },
      }),
    );

    const unreadNotifications = notificationsResult.Count || 0;

    // Get properties from investments
    const propertyIds = [
      ...new Set(investments.map((inv) => inv.propertyId).filter(Boolean)),
    ];
    const properties = [];

    for (const propertyId of propertyIds) {
      const propertyResult = await docClient.send(
        new GetCommand({
          TableName: process.env.PROPERTIES_TABLE!,
          Key: { id: propertyId },
        }),
      );

      if (propertyResult.Item) {
        const property = propertyResult.Item;
        const investment = investments.find(
          (inv) => inv.propertyId === propertyId,
        );

        let status = property.status?.toUpperCase() || "COMPLETED";
        const validStatuses = [
          "ACQUISITION",
          "DEVELOPMENT",
          "COMPLETED",
          "SOLD",
        ];
        if (!validStatuses.includes(status)) {
          if (status === "ACTIVE") status = "COMPLETED";
          else status = "COMPLETED";
        }

        let propertyType =
          property.propertyType?.toUpperCase() || "RESIDENTIAL";
        const validTypes = ["RESIDENTIAL", "COMMERCIAL", "MIXED_USE", "LAND"];
        if (!validTypes.includes(propertyType)) {
          if (propertyType === "APARTMENT") propertyType = "RESIDENTIAL";
          else if (propertyType === "HOUSE") propertyType = "RESIDENTIAL";
          else propertyType = "RESIDENTIAL";
        }

        properties.push({
          id: property.id,
          address: property.address || "",
          postcode: property.postcode || "",
          propertyType: propertyType,
          currentValuation: property.currentValuation || 0,
          status: status,
          equityPercentage: investment?.equityPercentage || 0,
          investmentValue:
            investment?.currentValue ||
            (property.currentValuation * (investment?.equityPercentage || 0)) /
              100,
          investmentAmount: investment?.investmentAmount || 0,
        });
      }
    }

    // Build dashboard with defaults
    const dashboard = {
      totalInvested: investor.totalInvested || 0,
      portfolioValue: investor.portfolioValue || 0,
      totalROI: investor.totalROI || 0,
      activeInvestments: activeInvestments,
      unreadNotifications: unreadNotifications,
      recentTransactions: recentTransactions,
      properties: properties,
      kycStatus: investor.kycStatus,
      verificationLevel: investor.verificationLevel,
      accountStatus: investor.accountStatus,
    };

    logger.info("Dashboard retrieved successfully", {
      investorId,
      propertiesCount: properties.length,
      investmentsCount: investments.length,
      transactionsCount: recentTransactions.length,
    });

    return dashboard;
  } catch (error) {
    logger.error("Error getting investor dashboard", error);
    throw error;
  }
};
