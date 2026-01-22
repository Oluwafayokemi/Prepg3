  
   ### USAGE EXAMPLES: 
   
  
    Example 1: Critical change - REQUIRES reason
    const reason1 = ChangeReasonHandler.getChangeReason(
    ["kycStatus"],
    undefined // No reason provided
    );
 
  ❌ Throws: "A reason is required when updating: kycStatus"
  
    Example 2: Critical change - WITH reason
    const reason2 = ChangeReasonHandler.getChangeReason(
    ["kycStatus"],
    "All documents verified, passport valid until 2030"
    );

  ✅ Returns: "KYC Status Change: All documents verified, passport valid until 2030"
  
    Example 3: Non-critical change - auto-generated
    const reason3 = ChangeReasonHandler.getChangeReason(
    ["phone"],
    undefined
    );
   ✅ Returns: "Profile information updated by investor"
  
    Example 4: System update with context
    const reason4 = ChangeReasonHandler.getChangeReason(
    ["totalInvested", "portfolioValue"],
    undefined,
    { investmentId: "inv-789" }
    );

   ✅ Returns: "Investment inv-789 recorded - portfolio updated"