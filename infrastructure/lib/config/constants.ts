// infrastructure/lib/config/constants.ts

/**
 * Application-wide constants for PREPG3 platform
 */

// Stack naming
export const APP_NAME = 'PREPG3';
export const APP_PREFIX = 'prepg3';

// AWS Regions
export const REGIONS = {
  PRIMARY: 'eu-west-2', // London
  BACKUP: 'eu-west-1',  // Ireland
} as const;

// Domain configuration
export const DOMAINS = {
  PRODUCTION: {
    ROOT: 'prepg3.co.uk',
    LANDING: 'prepg3.co.uk',
    INVESTOR: 'investor.prepg3.co.uk',
    ADMIN: 'admin.prepg3.co.uk',
    API: 'api.prepg3.co.uk',
  },
  DEVELOPMENT: {
    LANDING: 'http://localhost:3000',
    INVESTOR: 'http://localhost:3001',
    ADMIN: 'http://localhost:3002',
  },
} as const;

// Email configuration
export const EMAILS = {
  NO_REPLY: 'no-reply@prepg3.co.uk',
  NOTIFICATIONS: 'notifications@prepg3.co.uk',
  SUPPORT: 'support@prepg3.co.uk',
  ALERTS: 'alerts@prepg3.co.uk',
} as const;

// Lambda configuration
export const LAMBDA_DEFAULTS = {
  RUNTIME: 'nodejs18.x',
  TIMEOUT_SECONDS: {
    SHORT: 10,
    MEDIUM: 30,
    LONG: 60,
    VERY_LONG: 300,
  },
  MEMORY_MB: {
    SMALL: 128,
    MEDIUM: 256,
    LARGE: 512,
    XLARGE: 1024,
  },
} as const;

// DynamoDB configuration
export const DYNAMODB = {
  BILLING_MODE: {
    ON_DEMAND: 'PAY_PER_REQUEST',
    PROVISIONED: 'PROVISIONED',
  },
  READ_CAPACITY: {
    MINIMUM: 5,
    DEFAULT: 10,
    HIGH: 50,
  },
  WRITE_CAPACITY: {
    MINIMUM: 5,
    DEFAULT: 10,
    HIGH: 50,
  },
} as const;

// S3 configuration
export const S3 = {
  LIFECYCLE_RULES: {
    DELETE_OLD_VERSIONS_DAYS: 90,
    TRANSITION_TO_GLACIER_DAYS: 30,
    DELETE_INCOMPLETE_UPLOADS_DAYS: 7,
  },
  MAX_FILE_SIZE_MB: {
    DOCUMENT: 50,
    IMAGE: 10,
  },
} as const;

// CloudWatch Logs retention
export const LOG_RETENTION_DAYS = {
  DEVELOPMENT: 7,
  STAGING: 14,
  PRODUCTION: 30,
} as const;

// Cognito configuration
export const COGNITO = {
  PASSWORD_MIN_LENGTH: {
    DEVELOPMENT: 8,
    PRODUCTION: 12,
  },
  TOKEN_VALIDITY: {
    ACCESS_TOKEN_HOURS: 1,
    ID_TOKEN_HOURS: 1,
    REFRESH_TOKEN_DAYS: 30,
  },
  MFA: {
    ENABLED_ENVIRONMENTS: ['prod', 'production'],
  },
} as const;

// API configuration
export const API = {
  GRAPHQL: {
    MAX_QUERY_DEPTH: 5,
    MAX_COMPLEXITY: 1000,
  },
  RATE_LIMITS: {
    REQUESTS_PER_MINUTE: 100,
    BURST: 200,
  },
} as const;

// CloudFront configuration
export const CLOUDFRONT = {
  PRICE_CLASS: {
    ALL: 'PriceClass_All',
    US_EUROPE: 'PriceClass_100',
    US_EUROPE_ASIA: 'PriceClass_200',
  },
  CACHE_TTL_SECONDS: {
    STATIC: 31536000, // 1 year
    DYNAMIC: 0,
    DEFAULT: 86400, // 1 day
  },
} as const;

// Application business rules
export const BUSINESS_RULES = {
  INVESTMENT: {
    MINIMUM_AMOUNT: 1000,
    MAXIMUM_EQUITY_PERCENTAGE: 100,
  },
  PROPERTY: {
    STATUSES: ['ACQUISITION', 'DEVELOPMENT', 'COMPLETED', 'SOLD'],
    TYPES: ['RESIDENTIAL', 'COMMERCIAL', 'MIXED_USE', 'LAND'],
  },
  TRANSACTION: {
    TYPES: ['INVESTMENT', 'DIVIDEND', 'PROFIT_SHARE', 'WITHDRAWAL', 'FEE'],
  },
  DOCUMENT: {
    CATEGORIES: ['CONTRACT', 'REPORT', 'CERTIFICATE', 'INVOICE', 'VALUATION', 'OTHER'],
    ALLOWED_TYPES: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.jpg', '.jpeg', '.png'],
  },
  NOTIFICATION: {
    TTL_DAYS: 90,
    TYPES: ['INVESTMENT_UPDATE', 'DOCUMENT_UPLOADED', 'PAYMENT_RECEIVED', 'PROPERTY_UPDATE', 'SYSTEM'],
  },
} as const;

// Monitoring and alarms
export const MONITORING = {
  ALARM_THRESHOLDS: {
    API_5XX_ERRORS: 10,
    LAMBDA_ERRORS: 5,
    LAMBDA_THROTTLES: 10,
    API_LATENCY_MS: 1000,
  },
  METRIC_PERIODS_MINUTES: {
    SHORT: 1,
    MEDIUM: 5,
    LONG: 15,
  },
} as const;

// Tags for all resources
export const RESOURCE_TAGS = {
  PROJECT: 'PREPG3',
  MANAGED_BY: 'CDK',
  COST_CENTER: 'Platform',
} as const;

// Export helper functions
export function getStackName(environment: string, stackType: string): string {
  return `${APP_NAME}-${environment}-${stackType}`;
}

export function getResourceName(environment: string, resourceType: string, name: string): string {
  return `${APP_PREFIX}-${resourceType}-${name}-${environment}`;
}

export function isProduction(environment: string): boolean {
  return environment === 'prod' || environment === 'production';
}

export function isDevelopment(environment: string): boolean {
  return environment === 'dev' || environment === 'development';
}