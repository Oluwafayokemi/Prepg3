import {
  CognitoIdentityProviderClient,
  ListUsersCommand,
  AdminListGroupsForUserCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { PermissionChecker } from "@shared/utils/permissions";
import { Logger } from "@shared/utils/logger";
import type { AppSyncEvent } from "../../shared/types";

const cognito = new CognitoIdentityProviderClient({});
const logger = new Logger("ListUsers");

interface ListUsersFilter {
  role?: string;
  searchTerm?: string;
  accountStatus?: string;
}

interface ListUsersArgs {
  filter?: ListUsersFilter;
  limit?: number;
  nextToken?: string;
}

export const handler = async (event: AppSyncEvent) => {
  logger.info("Listing users", { event });

  try {
    const args: ListUsersArgs = event.arguments || {};
    const limit = args.limit || 60;

    // Authorization: Admin or SuperAdmin only
    PermissionChecker.requireAdmin(event);

    // List users from Cognito
    const result = await cognito.send(
      new ListUsersCommand({
        UserPoolId: process.env.USER_POOL_ID!,
        Limit: limit,
        PaginationToken: args.nextToken,
        Filter: args.filter?.accountStatus 
          ? `status = "${args.filter.accountStatus}"` 
          : undefined,
      })
    );

    const users = result.Users || [];

    // Get groups for each user
    const userInfoPromises = users.map(async (user) => {
      const username = user.Username!;
      
      // Get user's groups
      const groupsResult = await cognito.send(
        new AdminListGroupsForUserCommand({
          UserPoolId: process.env.USER_POOL_ID!,
          Username: username,
        })
      );

      const roles = groupsResult.Groups?.map(g => g.GroupName as string) || [];
      const highestRole = getHighestRole(roles);

      // Extract user attributes
      const attributes = user.Attributes || [];
      const email = attributes.find(a => a.Name === 'email')?.Value || '';
      const firstName = attributes.find(a => a.Name === 'given_name')?.Value;
      const lastName = attributes.find(a => a.Name === 'family_name')?.Value;
      const emailVerified = attributes.find(a => a.Name === 'email_verified')?.Value === 'true';

      return {
        userId: username,
        email,
        firstName,
        lastName,
        emailVerified,
        accountStatus: user.UserStatus || 'UNKNOWN',
        roles,
        highestRole,
        createdAt: user.UserCreateDate?.toISOString(),
        lastModifiedAt: user.UserLastModifiedDate?.toISOString(),
        mfaEnabled: user.MFAOptions && user.MFAOptions.length > 0,
      };
    });

    let userInfos = await Promise.all(userInfoPromises);

    // Apply filters
    if (args.filter?.role) {
      userInfos = userInfos.filter(u => u.roles.includes(args.filter!.role!));
    }

    if (args.filter?.searchTerm) {
      const search = args.filter.searchTerm.toLowerCase();
      userInfos = userInfos.filter(u =>
        u.email.toLowerCase().includes(search) ||
        u.firstName?.toLowerCase().includes(search) ||
        u.lastName?.toLowerCase().includes(search)
      );
    }

    logger.info("Users listed", {
      count: userInfos.length,
      hasMore: !!result.PaginationToken,
    });

    return {
      items: userInfos,
      nextToken: result.PaginationToken,
      totalCount: userInfos.length,
    };

  } catch (error) {
    logger.error("Error listing users", error);
    throw error;
  }
};

/**
 * Get highest role from list of roles
 */
function getHighestRole(roles: string[]): string {
  const precedence = {
    'SuperAdmin': 0,
    'Admin': 1,
    'Compliance': 2,
    'PropertyManager': 3,
    'Support': 4,
    'VerifiedInvestors': 10,
    'Investors': 20,
  };

  let highest = 'Investors';
  let highestPrecedence = 999;

  for (const role of roles) {
    const p = precedence[role as keyof typeof precedence] ?? 999;
    if (p < highestPrecedence) {
      highestPrecedence = p;
      highest = role;
    }
  }

  return highest;
}
