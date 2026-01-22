// lambda/admin/manage-user-roles/index.ts

import {
  CognitoIdentityProviderClient,
  AdminAddUserToGroupCommand,
  AdminRemoveUserFromGroupCommand,
  AdminListGroupsForUserCommand,
  ListUsersInGroupCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "@shared/db/client";
import { PermissionChecker } from "@shared/utils/permissions";
import { Logger } from "@shared/utils/logger";
import { ValidationError } from "@shared/utils/errors";
import type { AppSyncEvent } from "../../shared/types";
import { v4 as uuidv4 } from "uuid";

const cognito = new CognitoIdentityProviderClient({});
const logger = new Logger("ManageUserRoles");

interface ManageRoleInput {
  userEmail: string;
  action: "ADD" | "REMOVE";
  role: string;
  confirmDangerous?: boolean;
}

export const handler = async (event: AppSyncEvent) => {
  logger.info("Managing user role", { event });

  try {
    const input: ManageRoleInput = event.arguments.input;

    // 🔐 CRITICAL: Only SuperAdmin can manage roles
    PermissionChecker.requireSuperAdmin(event);

    const performedBy = event.identity?.claims?.email;

    // Validate role
    const validRoles = [
      "SuperAdmin",
      "Admin",
      "Compliance",
      "PropertyManager",
      "Support",
      "VerifiedInvestors",
      "Investors",
    ];

    if (!validRoles.includes(input.role)) {
      throw new ValidationError(`Invalid role: ${input.role}. Valid roles: ${validRoles.join(", ")}`);
    }

    // 🚨 PROTECTION 1: Prevent removing last SuperAdmin
    if (input.role === "SuperAdmin" && input.action === "REMOVE") {
      const superAdminsResult = await cognito.send(
        new ListUsersInGroupCommand({
          UserPoolId: process.env.USER_POOL_ID!,
          GroupName: "SuperAdmin",
        })
      );

      const superAdminCount = superAdminsResult.Users?.length || 0;

      if (superAdminCount <= 1) {
        throw new Error(
          "Cannot remove the last SuperAdmin. Add another SuperAdmin first to ensure system access."
        );
      }

      // Require explicit confirmation
      if (!input.confirmDangerous) {
        throw new Error(
          "Removing SuperAdmin requires confirmDangerous: true. This is a critical operation."
        );
      }
    }

    // 🚨 PROTECTION 2: Prevent SuperAdmin from removing their own SuperAdmin role
    if (
      input.role === "SuperAdmin" &&
      input.action === "REMOVE" &&
      input.userEmail === performedBy
    ) {
      throw new Error("You cannot remove your own SuperAdmin role. Have another SuperAdmin do it.");
    }

    // Execute role change
    if (input.action === "ADD") {
      await cognito.send(
        new AdminAddUserToGroupCommand({
          UserPoolId: process.env.USER_POOL_ID!,
          Username: input.userEmail,
          GroupName: input.role,
        })
      );

      logger.info("Role added", {
        user: input.userEmail,
        role: input.role,
        by: performedBy,
      });
    } else {
      await cognito.send(
        new AdminRemoveUserFromGroupCommand({
          UserPoolId: process.env.USER_POOL_ID!,
          Username: input.userEmail,
          GroupName: input.role,
        })
      );

      logger.info("Role removed", {
        user: input.userEmail,
        role: input.role,
        by: performedBy,
      });
    }

    // Get updated user groups
    const groupsResult = await cognito.send(
      new AdminListGroupsForUserCommand({
        UserPoolId: process.env.USER_POOL_ID!,
        Username: input.userEmail,
      })
    );

    const currentRoles = groupsResult.Groups?.map((g) => g.GroupName as string) || [];

    // Create audit log
    await createAuditLog({
      action: `ROLE_${input.action}`,
      performedBy: performedBy || "unknown",
      targetUser: input.userEmail,
      role: input.role,
      details: `${performedBy} ${input.action === "ADD" ? "added" : "removed"} ${input.role} ${input.action === "ADD" ? "to" : "from"} ${input.userEmail}`,
      resultingRoles: currentRoles,
    });

    logger.info("Role management completed", {
      user: input.userEmail,
      action: input.action,
      role: input.role,
      currentRoles,
    });

    return {
      success: true,
      userEmail: input.userEmail,
      action: input.action,
      role: input.role,
      currentRoles,
      message: `Successfully ${input.action === "ADD" ? "added" : "removed"} ${input.role} ${input.action === "ADD" ? "to" : "from"} ${input.userEmail}`,
    };
  } catch (error) {
    logger.error("Error managing user role", error);
    throw error;
  }
};

/**
 * Create audit log for role changes
 */
async function createAuditLog(params: {
  action: string;
  performedBy: string;
  targetUser: string;
  role: string;
  details: string;
  resultingRoles: string[];
}): Promise<void> {
  const now = new Date().toISOString();

  await docClient.send(
    new PutCommand({
      TableName: process.env.AUDIT_TABLE!,
      Item: {
        id: uuidv4(),
        timestamp: now,
        action: params.action,
        performedBy: params.performedBy,
        targetUser: params.targetUser,
        role: params.role,
        details: params.details,
        resultingRoles: params.resultingRoles,
        entityType: "USER_ROLE",
        severity: params.role === "SuperAdmin" ? "CRITICAL" : "HIGH",
      },
    })
  );
}