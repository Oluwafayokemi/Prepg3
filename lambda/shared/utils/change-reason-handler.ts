export class ChangeReasonHandler {
  // Critical fields that REQUIRE a user-provided reason
  private static INVESTOR_CRITICAL_FIELDS = [
    "kycStatus",
    "email",
    "accountStatus",
    "amlCheckStatus",
    "isPEP",
    "bankAccounts",
    "investorCategory",
  ];

  // Critical property fields that REQUIRE a user-provided reason
  private static PROPERTY_CRITICAL_FIELDS = [
    "status", // DRAFT → ACTIVE → FUNDED → CLOSED
    "listingStatus", // UNLISTED → LISTED → SOLD
    "currentValue", // Valuation changes
    "pricePerShare", // Price changes
    "totalShares", // Share allocation changes
    "purchasePrice", // Acquisition price
    "targetFundingAmount", // Funding goal changes
  ];

  // Critical investment fields
  private static INVESTMENT_CRITICAL_FIELDS = [
    "status", // Investment status changes
    "shares", // Share quantity changes
    "amountInvested", // Investment amount
    "currentValue", // Valuation
  ];

  // Critical transaction fields
  private static TRANSACTION_CRITICAL_FIELDS = [
    "status", // PENDING → COMPLETED → FAILED
    "amount", // Transaction amount
    "type", // Transaction type
  ];

  /**
   * Get change reason for an update
   * Validates that critical fields have reasons
   */
  static getChangeReason(
    changedFields: string[],
    providedReason: string | undefined,
    context: { userId?: string; entityType?: string } = {}
  ): string {
    const entityType = context.entityType || "INVESTOR";

    // Determine which critical fields apply
    let criticalFields: string[];
    switch (entityType) {
      case "PROPERTY":
        criticalFields = this.PROPERTY_CRITICAL_FIELDS;
        break;
      case "INVESTMENT":
        criticalFields = this.INVESTMENT_CRITICAL_FIELDS;
        break;
      case "TRANSACTION":
        criticalFields = this.TRANSACTION_CRITICAL_FIELDS;
        break;
      default:
        criticalFields = this.INVESTOR_CRITICAL_FIELDS;
    }

    // Check if any critical fields are being changed
    const criticalFieldsChanged = changedFields.filter((field) =>
      criticalFields.includes(field)
    );

    // If critical fields changed, reason is REQUIRED
    if (criticalFieldsChanged.length > 0) {
      if (!providedReason || providedReason.trim().length < 10) {
        throw new Error(
          `Change reason required for critical fields: ${criticalFieldsChanged.join(
            ", "
          )}. ` + `Minimum 10 characters.`
        );
      }

      // Validate reason length
      if (providedReason.trim().length > 500) {
        throw new Error("Change reason cannot exceed 500 characters");
      }

      return providedReason.trim();
    }

    // Non-critical fields - use provided reason or auto-generate
    if (providedReason && providedReason.trim()) {
      return providedReason.trim();
    }

    // Auto-generate reason for non-critical changes
    return this.generateAutoReason(changedFields, context);
  }

  /**
   * Auto-generate reason for non-critical changes
   */
  private static generateAutoReason(
    changedFields: string[],
    context: { userId?: string; entityType?: string }
  ): string {
    const entityType = context.entityType || "INVESTOR";
    const userId = context.userId || "system";

    // Generate based on changed fields
    if (changedFields.length === 1) {
      const field = changedFields[0];

      // Property-specific auto-reasons
      if (entityType === "PROPERTY") {
        if (field === "description") return "Property description updated";
        if (field === "images") return "Property images updated";
        if (field === "features") return "Property features updated";
        if (field === "amenities") return "Property amenities updated";
        if (field === "documents") return "Property documents updated";
        if (field === "estimatedRentalIncome")
          return "Rental income estimate updated";
        if (field === "annualAppreciation")
          return "Appreciation estimate updated";
        if (field === "riskLevel") return "Risk assessment updated";
        if (field === "riskFactors") return "Risk factors updated";
        if (field === "notes") return `Admin notes updated by ${userId}`;
      }

      // Investor-specific auto-reasons
      if (entityType === "INVESTOR") {
        if (field === "phone") return "Contact information updated";
        if (field === "address") return "Address updated";
        if (field === "communicationPreferences")
          return "Communication preferences updated";
        if (field === "notes") return `Admin notes updated by ${userId}`;
      }

      // Investment-specific auto-reasons
      if (entityType === "INVESTMENT") {
        if (field === "notes") return `Investment notes updated by ${userId}`;
        if (field === "distributionPreference")
          return "Distribution preference updated";
      }
    }

    // Multiple fields changed
    if (changedFields.length > 1) {
      if (entityType === "PROPERTY") {
        return `Property information updated: ${changedFields
          .slice(0, 3)
          .join(", ")}`;
      }
      return `${entityType.toLowerCase()} information updated by ${userId}`;
    }

    // Default
    return `${entityType} updated by ${userId}`;
  }

  /**
   * Get example reasons for UI prompts
   */
  static getExampleReasons(
    field: string,
    entityType: string = "INVESTOR"
  ): string[] {
    const examples: Record<string, string[]> = {
      // Property examples
      status: [
        "Property construction completed - ready to list",
        "Funding target reached - closing to new investors",
        "Property sold - distributing proceeds to investors",
      ],
      currentValue: [
        "Professional valuation completed on [date]",
        "Market conditions improved - comparable sales increased",
        "Renovation completed - value increased by £X",
      ],
      pricePerShare: [
        "Market correction - adjusting to fair market value",
        "Early bird discount expired",
        "Funding target revised based on costs",
      ],
      totalShares: [
        "Investment structure revised per legal advice",
        "Additional capital required for renovations",
        "Shares consolidated for simplicity",
      ],

      // Investor examples
      kycStatus: [
        "All documents verified. Passport valid until 2030.",
        "AML checks completed - no concerns identified",
        "Enhanced due diligence completed for high-value investor",
      ],
      accountStatus: [
        "Investor requested account closure",
        "Compliance issue - account suspended pending review",
        "Inactive for 12 months - marked dormant",
      ],

      // Investment examples
      shares: [
        "Investor increased stake - additional funding received",
        "Partial exit approved - shares sold to secondary market",
      ],
      amountInvested: [
        "Additional top-up investment received",
        "Partial withdrawal processed",
      ],
    };

    return (
      examples[field] || [
        "Record updated per standard procedure",
        "Change requested by authorized user",
      ]
    );
  }
}
