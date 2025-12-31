// infrastructure/lib/config/environments.ts
export interface EnvironmentConfig {
  environment: string;
  region: string;
  domainName?: string;
  cognito: {
    mfaEnabled: boolean;
    passwordPolicy: {
      minLength: number;
      requireLowercase: boolean;
      requireUppercase: boolean;
      requireDigits: boolean;
      requireSymbols: boolean;
    };
  };
  database: {
    pointInTimeRecovery: boolean;
    billingMode: 'PROVISIONED' | 'PAY_PER_REQUEST';
  };
  lambda: {
    memorySize: number;
    timeout: number;
    logRetentionDays: number;
  };
  monitoring: {
    enableDetailedMetrics: boolean;
    enableAlarms: boolean;
    alarmEmail?: string;
  };
}

const developmentConfig: EnvironmentConfig = {
  environment: 'dev',
  region: 'eu-north-1',
  cognito: {
    mfaEnabled: false,
    passwordPolicy: {
      minLength: 8,
      requireLowercase: true,
      requireUppercase: true,
      requireDigits: true,
      requireSymbols: false,
    },
  },
  database: {
    pointInTimeRecovery: false,
    billingMode: 'PAY_PER_REQUEST',
  },
  lambda: {
    memorySize: 256,
    timeout: 30,
    logRetentionDays: 7,
  },
  monitoring: {
    enableDetailedMetrics: false,
    enableAlarms: false,
  },
};

const productionConfig: EnvironmentConfig = {
  environment: 'live',
  region: 'eu-north-1',
  domainName: 'prepg3.co.uk',
  cognito: {
    mfaEnabled: true,
    passwordPolicy: {
      minLength: 12,
      requireLowercase: true,
      requireUppercase: true,
      requireDigits: true,
      requireSymbols: true,
    },
  },
  database: {
    pointInTimeRecovery: true,
    billingMode: 'PAY_PER_REQUEST',
  },
  lambda: {
    memorySize: 512,
    timeout: 60,
    logRetentionDays: 30,
  },
  monitoring: {
    enableDetailedMetrics: true,
    enableAlarms: true,
    alarmEmail: 'alerts@prepg3.co.uk',
  },
};

export function getEnvironmentConfig(env: string): EnvironmentConfig {
  switch (env) {
    case 'live':
    case 'production':
      return productionConfig;
    case 'test':
    case 'development':
    default:
      return developmentConfig;
  }
}