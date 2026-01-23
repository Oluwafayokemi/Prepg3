import { ScanCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "@shared/db/client";
import { Logger } from "@shared/utils/logger";

const logger = new Logger("CalculateROI");

/**
 * Calculate ROI for all properties
 * 
 * Triggered by:
 * 1. EventBridge schedule (daily at 2am)
 * 2. Manual admin trigger via GraphQL mutation
 * 
 * Calculates:
 * - Current property value vs purchase price
 * - Rental income generated
 * - Total return on investment
 */
export const handler = async (event: any) => {
  logger.info("Starting ROI calculation", { event });

  try {
    let totalPropertiesProcessed = 0;
    let totalPropertiesUpdated = 0;
    const errors: string[] = [];

    // Get all current properties
    const propertiesResult = await docClient.send(
      new ScanCommand({
        TableName: process.env.PROPERTIES_TABLE!,
        FilterExpression: "isCurrent = :current",
        ExpressionAttributeValues: {
          ":current": "CURRENT",
        },
      })
    );

    const properties = propertiesResult.Items || [];
    logger.info(`Found ${properties.length} properties to process`);

    for (const property of properties) {
      totalPropertiesProcessed++;

      try {
        // Calculate ROI
        const roi = await calculatePropertyROI(property);

        // Only update if ROI changed significantly (>0.1%)
        const currentROI = property.roi || 0;
        if (Math.abs(roi - currentROI) > 0.1) {
          await updatePropertyROI(property, roi);
          totalPropertiesUpdated++;
        }

      } catch (error) {
        const errorMsg = `Failed to calculate ROI for property ${property.id}: ${error}`;
        logger.error(errorMsg, { propertyId: property.id, error });
        errors.push(errorMsg);
      }
    }

    const result = {
      success: true,
      totalPropertiesProcessed,
      totalPropertiesUpdated,
      totalErrors: errors.length,
      errors: errors.slice(0, 10), // Return first 10 errors
      timestamp: new Date().toISOString(),
    };

    logger.info("ROI calculation completed", result);

    return result;

  } catch (error) {
    logger.error("Error in ROI calculation", error);
    throw error;
  }
};

/**
 * Calculate ROI for a single property
 */
async function calculatePropertyROI(property: any): Promise<number> {
  const purchasePrice = property.purchasePrice || 0;
  const currentValue = property.currentValue || purchasePrice;

  if (purchasePrice === 0) {
    return 0;
  }

  // Get all rental income for this property
  const transactionsResult = await docClient.send(
    new ScanCommand({
      TableName: process.env.TRANSACTIONS_TABLE!,
      FilterExpression: "propertyId = :propertyId AND #type = :type AND #status = :status",
      ExpressionAttributeNames: {
        "#type": "type",
        "#status": "status",
      },
      ExpressionAttributeValues: {
        ":propertyId": property.id,
        ":type": "RENTAL_INCOME",
        ":status": "COMPLETED",
      },
    })
  );

  const totalRentalIncome = (transactionsResult.Items || []).reduce(
    (sum, t) => sum + (t.amount || 0),
    0
  );

  // Calculate capital appreciation
  const capitalGain = currentValue - purchasePrice;

  // Calculate total return
  const totalReturn = capitalGain + totalRentalIncome;

  // Calculate ROI percentage
  const roi = (totalReturn / purchasePrice) * 100;

  return Math.round(roi * 100) / 100; // Round to 2 decimal places
}

/**
 * Update property with new ROI
 */
async function updatePropertyROI(property: any, newROI: number): Promise<void> {
  const now = new Date().toISOString();
  const newVersion = (property.version || 0) + 1;

  // Mark old version as HISTORICAL
  await docClient.send(
    new UpdateCommand({
      TableName: process.env.PROPERTIES_TABLE!,
      Key: {
        id: property.id,
        version: property.version,
      },
      UpdateExpression: "SET isCurrent = :historical",
      ExpressionAttributeValues: {
        ":historical": "HISTORICAL",
      },
    })
  );

  // Create new version with updated ROI
  await docClient.send(
    new UpdateCommand({
      TableName: process.env.PROPERTIES_TABLE!,
      Key: {
        id: property.id,
        version: newVersion,
      },
      UpdateExpression:
        "SET roi = :roi, " +
        "updatedAt = :now, " +
        "updatedBy = :by, " +
        "isCurrent = :current, " +
        "#version = :version, " +
        "changedFields = :fields, " +
        "changeReason = :reason",
      ExpressionAttributeNames: {
        "#version": "version",
      },
      ExpressionAttributeValues: {
        ":roi": newROI,
        ":now": now,
        ":by": "SYSTEM",
        ":current": "CURRENT",
        ":version": newVersion,
        ":fields": ["roi"],
        ":reason": `Automated ROI calculation: ${property.roi?.toFixed(2) || 0}% → ${newROI.toFixed(2)}%`,
      },
    })
  );

  logger.info("Property ROI updated", {
    propertyId: property.id,
    oldROI: property.roi,
    newROI,
  });
}

/*
SCHEDULED EXECUTION:

EventBridge Rule:
- Schedule: cron(0 2 * * ? *)  // Daily at 2am UTC
- Target: calculate-roi Lambda

MANUAL TRIGGER (Admin):

mutation CalculateROI {
  calculateROI {
    success
    totalPropertiesProcessed
    totalPropertiesUpdated
    totalErrors
    errors
    timestamp
  }
}

EXAMPLE RESPONSE:

{
  "success": true,
  "totalPropertiesProcessed": 42,
  "totalPropertiesUpdated": 15,
  "totalErrors": 0,
  "errors": [],
  "timestamp": "2025-01-23T02:00:00Z"
}

CALCULATION LOGIC:

1. Capital Appreciation = Current Value - Purchase Price
2. Rental Income = Sum of all RENTAL_INCOME transactions
3. Total Return = Capital Appreciation + Rental Income
4. ROI = (Total Return / Purchase Price) × 100

Example:
- Purchase Price: £250,000
- Current Value: £275,000
- Rental Income: £12,000
- Capital Gain: £25,000
- Total Return: £37,000
- ROI: (37,000 / 250,000) × 100 = 14.8%
*/