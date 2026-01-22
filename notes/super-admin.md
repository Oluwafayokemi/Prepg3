
# ===========================================
# MUTATIONS
# ===========================================

extend type Mutation {
  # ==========================================
  # USER MANAGEMENT (Admin can do)
  # ==========================================
  
  # Suspend user account
  suspendUser(userId: ID!, reason: String!): UserInfo!
    @aws_auth(cognito_groups: ["SuperAdmin", "Admin"])
  
  # Reactivate suspended user
  reactivateUser(userId: ID!): UserInfo!
    @aws_auth(cognito_groups: ["SuperAdmin", "Admin"])
  
  # Force user to reset password on next login
  forcePasswordReset(userId: ID!): Boolean!
    @aws_auth(cognito_groups: ["SuperAdmin", "Admin"])
  
  # Enable/disable MFA for a user
  toggleUserMFA(userId: ID!, enabled: Boolean!): UserInfo!
    @aws_auth(cognito_groups: ["SuperAdmin", "Admin"])
  
  # ==========================================
  # ROLE MANAGEMENT (SuperAdmin ONLY)
  # ==========================================
  
  # Add or remove user roles
  manageUserRole(input: ManageRoleInput!): ManageRoleResponse!
    @aws_auth(cognito_groups: ["SuperAdmin"])
  
  # ==========================================
  # USER DELETION (SuperAdmin ONLY)
  # ==========================================
  
  # Delete user account (DANGEROUS!)
  deleteUser(input: DeleteUserInput!): UserDeletionResult!
    @aws_auth(cognito_groups: ["SuperAdmin"])
  
  # ==========================================
  # DATA DELETION (SuperAdmin ONLY)
  # ==========================================
  
  # Delete property (DANGEROUS!)
  deleteProperty(input: DeletePropertyInput!): DataDeletionResult!
    @aws_auth(cognito_groups: ["SuperAdmin"])
  
  # Delete investment (DANGEROUS!)
  deleteInvestment(input: DeleteInvestmentInput!): DataDeletionResult!
    @aws_auth(cognito_groups: ["SuperAdmin"])
  
  # Bulk delete records (VERY DANGEROUS!)
  bulkDeleteRecords(input: BulkDeleteInput!): DataDeletionResult!
    @aws_auth(cognito_groups: ["SuperAdmin"])
  
  # Delete old notifications
  bulkDeleteNotifications(
    olderThan: AWSDateTime!
    confirmDangerous: Boolean!
  ): DataDeletionResult!
    @aws_auth(cognito_groups: ["SuperAdmin"])
  
  # Purge old audit logs (BE VERY CAREFUL!)
  purgeAuditLogs(input: PurgeAuditLogsInput!): DataDeletionResult!
    @aws_auth(cognito_groups: ["SuperAdmin"])
  
  # ==========================================
  # SYSTEM OPERATIONS (SuperAdmin ONLY)
  # ==========================================
  
  # Run database maintenance
  runDatabaseMaintenance(input: DatabaseMaintenanceInput!): SystemOperation!
    @aws_auth(cognito_groups: ["SuperAdmin"])
  
  # Force system backup
  forceSystemBackup(reason: String!): SystemOperation!
    @aws_auth(cognito_groups: ["SuperAdmin"])
  
  # Clear all caches (CAREFUL!)
  clearAllCaches(confirmDangerous: Boolean!): Boolean!
    @aws_auth(cognito_groups: ["SuperAdmin"])
  
  # Resync data between systems
  resyncSystemData(
    source: String!
    target: String!
    confirmDangerous: Boolean!
  ): SystemOperation!
    @aws_auth(cognito_groups: ["SuperAdmin"])
}

# ===========================================
# OPERATION SUMMARY
# ===========================================

"""
QUERIES:
- getMyPermissions              → Everyone (see own permissions)
- listUsers                     → Admin, SuperAdmin
- getUserInfo                   → Admin, SuperAdmin
- listRoles                     → Admin, SuperAdmin
- listUsersInRole               → Admin, SuperAdmin
- listRoleChanges               → Admin, SuperAdmin
- listDangerousOperations       → SuperAdmin ONLY
- previewDeletion               → SuperAdmin ONLY
- listSystemOperations          → SuperAdmin ONLY

MUTATIONS (Admin can do):
- suspendUser                   → Admin, SuperAdmin
- reactivateUser                → Admin, SuperAdmin
- forcePasswordReset            → Admin, SuperAdmin
- toggleUserMFA                 → Admin, SuperAdmin

MUTATIONS (SuperAdmin ONLY):
- manageUserRole                → SuperAdmin ONLY ⚠️
- deleteUser                    → SuperAdmin ONLY ⚠️
- deleteProperty                → SuperAdmin ONLY ⚠️
- deleteInvestment              → SuperAdmin ONLY ⚠️
- bulkDeleteRecords             → SuperAdmin ONLY ⚠️
- bulkDeleteNotifications       → SuperAdmin ONLY ⚠️
- purgeAuditLogs                → SuperAdmin ONLY ⚠️
- runDatabaseMaintenance        → SuperAdmin ONLY ⚠️
- forceSystemBackup             → SuperAdmin ONLY ⚠️
- clearAllCaches                → SuperAdmin ONLY ⚠️
- resyncSystemData              → SuperAdmin ONLY ⚠️
"""