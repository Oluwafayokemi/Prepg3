import { PermissionChecker } from "@shared/utils/permissions";
import { Logger } from "@shared/utils/logger";
import type { AppSyncEvent } from "../../shared/types";

const logger = new Logger("GetMyPermissions");

export const handler = async (event: AppSyncEvent) => {
  logger.info("Getting user permissions", { event });

  try {
    const permissionSummary = PermissionChecker.getPermissionSummary(event);

    logger.info("Permissions retrieved", {
      userId: permissionSummary.userId,
      role: permissionSummary.role,
    });

    return permissionSummary.permissions;

  } catch (error) {
    logger.error("Error getting permissions", error);
    throw error;
  }
};
