// lambda/investments/calculate-roi/index.ts
import { QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "../../shared/db/client";
import { Logger } from "../../shared/utils/logger";
import { handleError } from "../../shared/utils/errors";

const logger = new Logger("CalculateROI");

interface CalculateROIInput {
  propertyId?: string; // If provided, calculate for specific property only
}

export const handler = async (event: CalculateROIInput | any) => {
  logger.info("Calculating ROI", { event });

  try {
    const propertyId = event.propertyId || event.arguments?.propertyId;

    let propertiesToProcess: string[] = [];

    if (propertyId) {
      // Calculate for specific property
      propertiesToProcess = [propertyId];
    } else {
      // Calculate for all properties (scheduled job)
      logger.info("Fetching all properties for ROI calculation");

      const propertiesResult = await docClient.send(
        new QueryCommand({
          TableName: process.env.PROPERTIES_TABLE!,
          ProjectionExpression: "id",
        })
      );

      propertiesToProcess = (propertiesResult.Items || []).map(
        (item) => item.id
      );
    }

    logger.info(`Processing ${propertiesToProcess.length} properties`);

    const results = [];

    for (const propId of propertiesToProcess) {
      try {
        // 1. Get property current valuation
        const propertyResult = await docClient.send(
          new QueryCommand({
            TableName: process.env.PROPERTIES_TABLE!,
            KeyConditionExpression: "id = :id",
            ExpressionAttributeValues: {
              ":id": propId,
            },
          })
        );

        const property = propertyResult.Items?.[0];
        if (!property) {
          logger.info(`Property ${propId} not found, skipping`);
          continue;
        }

        const currentValuation = property.currentValuation || 0;

        // 2. Get all investments for this property
        const investmentsResult = await docClient.send(
          new QueryCommand({
            TableName: process.env.INVESTMENTS_TABLE!,
            IndexName: "byProperty",
            KeyConditionExpression: "propertyId = :propertyId",
            ExpressionAttributeValues: {
              ":propertyId": propId,
            },
          })
        );
        const investments = investmentsResult.Items || [];
        logger.info(
          `Found ${investments.length} investments for property ${propId}`
        );

        // 3. Calculate and update ROI for each investment
        for (const investment of investments) {
          const investedAmount = investment.investmentAmount;
          const equityPercentage = investment.equityPercentage;

          // Current value = (property valuation * equity percentage) / 100
          const currentValue = (currentValuation * equityPercentage) / 100;

          // ROI = ((current value - invested amount) / invested amount) * 100
          const roi =
            investedAmount > 0
              ? ((currentValue - investedAmount) / investedAmount) * 100
              : 0;

          // Update investment record
          await docClient.send(
            new UpdateCommand({
              TableName: process.env.INVESTMENTS_TABLE!,
              Key: {
                id: investment.id,
                investorId: investment.investorId,
              },
              UpdateExpression:
                "SET currentValue = :currentValue, roi = :roi, updatedAt = :now",
              ExpressionAttributeValues: {
                ":currentValue": currentValue,
                ":roi": roi,
                ":now": new Date().toISOString(),
              },
            })
          );

          results.push({
            investmentId: investment.id,
            propertyId: propId,
            investorId: investment.investorId,
            investedAmount,
            currentValue,
            roi: roi.toFixed(2),
          });
        }

        // 4. Update investor's portfolio value and total ROI
        const investorIds = [...new Set(investments.map((i) => i.investorId))];

        for (const investorId of investorIds) {
          // Get all investments for this investor
          const allInvestorInvestments = await docClient.send(
            new QueryCommand({
              TableName: process.env.INVESTMENTS_TABLE!,
              IndexName: "byInvestor",
              KeyConditionExpression: "investorId = :investorId",
              ExpressionAttributeValues: {
                ":investorId": investorId,
              },
            })
          );

          const investorInvestments = allInvestorInvestments.Items || [];

          const portfolioValue = investorInvestments.reduce(
            (sum, inv) => sum + (inv.currentValue || 0),
            0
          );
          const totalInvested = investorInvestments.reduce(
            (sum, inv) => sum + (inv.investmentAmount || 0),
            0
          );
          const totalROI =
            totalInvested > 0
              ? ((portfolioValue - totalInvested) / totalInvested) * 100
              : 0;

          await docClient.send(
            new UpdateCommand({
              TableName: process.env.INVESTORS_TABLE!,
              Key: { id: investorId },
              UpdateExpression:
                "SET portfolioValue = :portfolioValue, totalROI = :totalROI, updatedAt = :now",
              ExpressionAttributeValues: {
                ":portfolioValue": portfolioValue,
                ":totalROI": totalROI,
                ":now": new Date().toISOString(),
              },
            })
          );
        }
      } catch (error) {
        logger.error(`Error processing property ${propId}`, error);
        // Continue with next property
      }
    }

    logger.info(`ROI calculation completed for ${results.length} investments`);

    return {
      statusCode: 200,
      body: {
        message: "ROI calculation completed",
        processedInvestments: results.length,
        results,
      },
    };
  } catch (error) {
    logger.error("Error calculating ROI", error);
    return handleError(error);
  }
};
