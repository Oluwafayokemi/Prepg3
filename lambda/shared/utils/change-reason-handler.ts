// lambda/shared/utils/change-reason-handler.ts

export class ChangeReasonHandler {
  
    // Fields that REQUIRE a user-provided reason
    private static CRITICAL_FIELDS = [
      "kycStatus",
      "amlCheckStatus",
      "sanctionsCheckStatus",
      "accountStatus",
      "email",
      "bankAccounts",
      "isPEP",
    ];
  
    /**
     * Get change reason - requires user input for critical changes
     */
    static getChangeReason(
      changedFields: string[],
      userProvidedReason?: string,
      context?: any
    ): string {
      
      // Check if any critical field was changed
      const criticalFieldsChanged = changedFields.some(field =>
        this.CRITICAL_FIELDS.includes(field)
      );
  
      // CRITICAL: Must have user-provided reason
      if (criticalFieldsChanged && !userProvidedReason) {
        throw new Error(
          `A reason is required when updating: ${changedFields.join(", ")}`
        );
      }
  
      // If user provided reason, use it (with auto-prefix if helpful)
      if (userProvidedReason) {
        return this.formatUserReason(changedFields, userProvidedReason);
      }
  
      // Auto-generate for non-critical changes
      return this.autoGenerateReason(changedFields, context);
    }
  
    /**
     * Auto-generate reason for system/minor changes
     */
    private static autoGenerateReason(
      changedFields: string[],
      context?: any
    ): string {
      
      // Investment updates (triggered by system)
      if (changedFields.includes("totalInvested") && context?.investmentId) {
        return `Investment ${context.investmentId} recorded - portfolio updated`;
      }
  
      // ROI calculation (system)
      if (changedFields.includes("totalROI")) {
        return "Portfolio ROI recalculated";
      }
  
      // Profile updates (user self-service)
      if (changedFields.some(f => ["phone", "mobilePhone", "address"].includes(f))) {
        return "Profile information updated by investor";
      }
  
      // Communication preferences
      if (changedFields.includes("communicationPreferences")) {
        return "Communication preferences updated";
      }
  
      // Default
      return `Updated: ${changedFields.join(", ")}`;
    }
  
    /**
     * Format user-provided reason with helpful prefix
     */
    private static formatUserReason(
      changedFields: string[],
      userReason: string
    ): string {
      
      // Add field context to make logs clearer
      if (changedFields.includes("kycStatus")) {
        return `KYC Status Change: ${userReason}`;
      }
      
      if (changedFields.includes("accountStatus")) {
        return `Account Status Change: ${userReason}`;
      }
      
      if (changedFields.includes("email")) {
        return `Email Change: ${userReason}`;
      }
  
      // For multiple fields, just use the reason as-is
      return userReason;
    }
  
    /**
     * Validate reason meets minimum requirements
     */
    static validateReason(reason: string): void {
      if (!reason || reason.trim().length < 10) {
        throw new Error("Change reason must be at least 10 characters");
      }
  
      if (reason.length > 500) {
        throw new Error("Change reason must be less than 500 characters");
      }
    }
  }
  
  