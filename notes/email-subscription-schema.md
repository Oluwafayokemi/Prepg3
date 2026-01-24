interface EmailSubscription {
  // Primary Key
  email: string;                      // PK
  
  // Subscriber info
  firstName?: string;
  lastName?: string;
  subscribed: boolean;
  subscribedAt: string;               // ISO datetime
  unsubscribedAt?: string;
  
  // Preferences
  preferences: {
    propertyUpdates: boolean;
    investmentTips: boolean;
    monthlyNewsletter: boolean;
    marketInsights: boolean;
  };
  
  // Source tracking
  source: string;                     // "landing_page", "blog", "footer", etc.
  
  // Mailchimp integration
  mailchimpListId: string;
  mailchimpSubscriberId: string;      // MD5 hash of email
  
  // Conversion tracking
  convertedToInvestor: boolean;       // For GSI
  convertedInvestorId?: string;       // Link to Investor.id
  convertedAt?: string;
  
  // Marketing analytics (UTM params)
  utmSource?: string;                 // "google", "facebook", etc.
  utmMedium?: string;                 // "cpc", "email", "social"
  utmCampaign?: string;               // "property-launch-2025"
  utmTerm?: string;
  utmContent?: string;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
}