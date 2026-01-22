// lambda/investors/get-investor-version/index.ts
// (singular "version" not "versions")

import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "@shared/db/client";
import { Logger } from "@shared/utils/logger";
import { validateRequired } from "@shared/utils/validators";
import { UnauthorizedError } from "@shared/utils/errors";
import type { AppSyncEvent } from "../../shared/types";

const logger = new Logger("GetInvestorVersion");

/**
 * Get a specific version of an investor record
 * 
 * Usage:
 * query {
 *   getInvestorVersion(id: "investor-123", version: 2) {
 *     version
 *     email
 *     kycStatus
 *     updatedAt
 *     updatedBy
 *   }
 * }
 */
export const handler = async (event: AppSyncEvent) => {
  logger.info("Getting specific investor version", { event });

  try {
    const investorId: string = event.arguments.id;
    const version: number = event.arguments.version;

    validateRequired(investorId, "id");
    validateRequired(version, "version");

    // Authorization: Only admins or the investor themselves
     const groups = event.identity?.claims?.["cognito:groups"] || [];
     const isAdmin = groups.includes("Admin");
     const userSub = event.identity?.sub || event.identity?.username;
 
     logger.info("Authorization check", {
       userSub,
       investorId,
       isAdmin,
       groups,
     });
 
     if (!isAdmin && userSub !== investorId) {
       logger.error("Authorization failed", { userSub, investorId });
       throw new UnauthorizedError("You can only view your own dashboard");
     }
 
     logger.info("Authorization passed");
    // Get the specific version
    const result = await docClient.send(
      new GetCommand({
        TableName: process.env.INVESTORS_TABLE!,
        Key: {
          id: investorId,
          version: version,
        },
      })
    );

    if (!result.Item) {
      throw new Error(`Version ${version} not found for investor ${investorId}`);
    }

    const investorVersion = result.Item;

    // Check authorization
    const investorUserId = investorVersion.userId || investorVersion.id;
    if (investorUserId !== userId && !isAdmin) {
      throw new Error("You can only view your own history");
    }

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