
import { ScanCommand as SC } from "@aws-sdk/lib-dynamodb";
import { docClient as db } from "@shared/db/client";
import { PermissionChecker as PC } from "@shared/utils/permissions";
import { Logger as Log } from "@shared/utils/logger";
import type { AppSyncEvent as Event } from "../../shared/types";

const log = new Log("GetPropertyStats");

export const propertyStatsHandler = async (event: Event) => {
  log.info("Getting property stats", { event });

  try {
    // Authorization: PropertyManager can view this
    if (!PC.isPropertyManager(event)) {
      throw new Error("Property manager access required");
    }

    // Get all current properties
    const result = await db.send(
      new SC({
        TableName: process.env.PROPERTIES_TABLE!,
        FilterExpression: "isCurrent = :current",
        ExpressionAttributeValues: {
          ":current": "CURRENT",
        },
      })
    );

    const properties = result.Items || [];

    const total = properties.length;

    // By status
    const statusCounts = new Map<string, number>();
    for (const property of properties) {
      const status = property.status || "UNKNOWN";
      statusCounts.set(status, (statusCounts.get(status) || 0) + 1);
    }

    const byStatus = Array.from(statusCounts.entries()).map(([status, count]) => ({
      status,
      count,
    }));

    // By type
    const typeCounts = new Map<string, number>();
    for (const property of properties) {
      const type = property.propertyType || "UNKNOWN";
      typeCounts.set(type, (typeCounts.get(type) || 0) + 1);
    }

    const byType = Array.from(typeCounts.entries()).map(([type, count]) => ({
      type,
      count,
    }));

    // Financial metrics
    const totalValue = properties.reduce((sum, p) => sum + (p.currentValue || 0), 0);
    const averageROI = properties.length > 0
      ? properties.reduce((sum, p) => sum + (p.roi || 0), 0) / properties.length
      : 0;

    return {
      total,
      byStatus,
      byType,
      totalValue,
      averageROI,
    };

  } catch (error) {
    log.error("Error getting property stats", error);
    throw error;
  }
};