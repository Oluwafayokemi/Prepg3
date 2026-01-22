// lambda/shared/utils/permissions.ts

import { UnauthorizedError } from "./errors";

export class PermissionChecker {
  
  /**
   * Get user groups from Cognito claims
   */
  static getUserGroups(event: any): string[] {
    return event.identity?.claims?.['cognito:groups'] || [];
  }

  /**
   * Get user ID
   */
  static getUserId(event: any): string | null {
    return event.identity?.claims?.sub || event.identity?.username || null;
  }

  /**
   * Get user email
   */
  static getUserEmail(event: any): string | null {
    return event.identity?.claims?.email || null;
  }

  /**
   * Check if user has ANY of the required roles
   */
  static hasAnyRole(event: any, roles: string[]): boolean {
    const userGroups = this.getUserGroups(event);
    return roles.some(role => userGroups.includes(role));
  }

  /**
   * Check if user has ALL required roles
   */
  static hasAllRoles(event: any, roles: string[]): boolean {
    const userGroups = this.getUserGroups(event);
    return roles.every(role => userGroups.includes(role));
  }

  // ===========================================
  // ROLE CHECKS
  // ===========================================

  /**
   * Check if user is SuperAdmin (highest privilege)
   */
  static isSuperAdmin(event: any): boolean {
    return this.getUserGroups(event).includes('SuperAdmin');
  }

  /**
   * Check if user is Admin or SuperAdmin
   */
  static isAdmin(event: any): boolean {
    return this.hasAnyRole(event, ['SuperAdmin', 'Admin']);
  }

  /**
   * Check if user is Compliance officer (or higher)
   */
  static isCompliance(event: any): boolean {
    return this.hasAnyRole(event, ['SuperAdmin', 'Admin', 'Compliance']);
  }

  /**
   * Check if user is Property Manager (or higher)
   */
  static isPropertyManager(event: any): boolean {
    return this.hasAnyRole(event, ['SuperAdmin', 'Admin', 'PropertyManager']);
  }

  /**
   * Check if user is Support (or higher)
   */
  static isSupport(event: any): boolean {
    return this.hasAnyRole(event, ['SuperAdmin', 'Admin', 'Support']);
  }

  /**
   * Check if user is a verified investor
   */
  static isVerifiedInvestor(event: any): boolean {
    return this.getUserGroups(event).includes('VerifiedInvestors');
  }

  // ===========================================
  // REQUIRE FUNCTIONS (throw if not authorized)
  // ===========================================

  /**
   * Require SuperAdmin or throw error
   */
  static requireSuperAdmin(event: any): void {
    if (!this.isSuperAdmin(event)) {
      throw new UnauthorizedError('Super Admin access required');
    }
  }

  /**
   * Require Admin or SuperAdmin or throw error
   */
  static requireAdmin(event: any): void {
    if (!this.isAdmin(event)) {
      throw new UnauthorizedError('Admin access required');
    }
  }

  /**
   * Require Compliance officer or throw error
   */
  static requireCompliance(event: any): void {
    if (!this.isCompliance(event)) {
      throw new UnauthorizedError('Compliance officer access required');
    }
  }

  /**
   * Require Property Manager or throw error
   */
  static requirePropertyManager(event: any): void {
    if (!this.isPropertyManager(event)) {
      throw new UnauthorizedError('Property manager access required');
    }
  }

  /**
   * Require verified investor or throw error
   */
  static requireVerifiedInvestor(event: any): void {
    if (!this.isVerifiedInvestor(event)) {
      throw new UnauthorizedError('Verified investor access required');
    }
  }

  /**
   * Require user to be the owner of a resource or admin
   */
  static requireOwnerOrAdmin(event: any, resourceOwnerId: string): void {
    const userId = this.getUserId(event);
    const isAdmin = this.isAdmin(event);

    if (userId !== resourceOwnerId && !isAdmin) {
      throw new UnauthorizedError('You can only access your own resources');
    }
  }

  // ===========================================
  // PERMISSION SETS
  // ===========================================

  /**
   * Get highest role (for display purposes)
   */
  static getHighestRole(event: any): string {
    const groups = this.getUserGroups(event);
    
    if (groups.includes('SuperAdmin')) return 'SuperAdmin';
    if (groups.includes('Admin')) return 'Admin';
    if (groups.includes('Compliance')) return 'Compliance';
    if (groups.includes('PropertyManager')) return 'PropertyManager';
    if (groups.includes('Support')) return 'Support';
    if (groups.includes('VerifiedInvestors')) return 'VerifiedInvestor';
    if (groups.includes('Investors')) return 'Investor';
    
    return 'Unknown';
  }

  /**
   * Get all permissions for a user
   */
  static getPermissions(event: any): {
    role: string;
    canApproveKYC: boolean;
    canRejectKYC: boolean;
    canManageUsers: boolean;
    canDeleteData: boolean;
    canUpdateProperties: boolean;
    canViewAllInvestors: boolean;
    canManageRoles: boolean;
    canAccessAuditLogs: boolean;
    canCreateProperties: boolean;
    canInvest: boolean;
  } {
    const isSuperAdmin = this.isSuperAdmin(event);
    const isAdmin = this.isAdmin(event);
    const isCompliance = this.isCompliance(event);
    const isPropertyManager = this.isPropertyManager(event);
    const isVerified = this.isVerifiedInvestor(event);

    return {
      role: this.getHighestRole(event),
      
      // KYC operations
      canApproveKYC: isCompliance,
      canRejectKYC: isCompliance,
      
      // User management
      canManageUsers: isAdmin,
      canManageRoles: isSuperAdmin, // Only super admin!
      
      // Data operations
      canDeleteData: isSuperAdmin, // Only super admin can delete!
      canViewAllInvestors: isAdmin || isCompliance,
      canAccessAuditLogs: isAdmin,
      
      // Property operations
      canCreateProperties: isAdmin,
      canUpdateProperties: isPropertyManager,
      
      // Investment operations
      canInvest: isVerified,
    };
  }

  /**
   * Get permission summary for frontend
   */
  static getPermissionSummary(event: any): {
    userId: string;
    email: string;
    role: string;
    groups: string[];
    permissions: ReturnType<typeof PermissionChecker.getPermissions>;
  } {
    return {
      userId: this.getUserId(event) || '',
      email: this.getUserEmail(event) || '',
      role: this.getHighestRole(event),
      groups: this.getUserGroups(event),
      permissions: this.getPermissions(event),
    };
  }
}