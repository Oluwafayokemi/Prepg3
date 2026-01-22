// lambda/investors/get-investor-version/index.ts
// (singular "version" not "versions")

import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "@shared/db/client";
import { Logger } from "@shared/utils/logger";
import { validateRequired } from "@shared/utils/validators";
import type { AppSyncEvent } from "../../shared/types";
import { PermissionChecker } from "@shared/utils/permissions";

const logger = new Logger("GetInvestorVersion");

export const handler = async (event: AppSyncEvent) => {
  logger.info("Getting specific investor version", { event });

  try {
    const investorId: string = event.arguments.id;
    const version: number = event.arguments.version;

    validateRequired(investorId, "id");
    validateRequired(version, "version");

    PermissionChecker.requireOwnerOrAdmin(event, investorId, "dashboard");

    logger.info("Authorization passed");
    // Get the specific version
    const result = await docClient.send(
      new GetCommand({
        TableName: process.env.INVESTORS_TABLE!,
        Key: {
          id: investorId,
          version: version,
        },
      }),
    );

    if (!result.Item) {
      throw new Error(
        `Version ${version} not found for investor ${investorId}`,
      );
    }

    const investorVersion = result.Item;

    // Check authorization
    const investorUserId = investorVersion.userId || investorVersion.id;
    PermissionChecker.requireOwnerOrAdmin(event, investorUserId, "history");

    logger.info("Version retrieved", {
      investorId,
      version,
      timestamp: investorVersion.updatedAt,
    });

    return investorVersion;
  } catch (error) {
    logger.error("Error getting investor version", error);
    throw error;
  }
};
