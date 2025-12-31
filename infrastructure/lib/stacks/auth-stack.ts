// infrastructure/lib/stacks/auth-stack.ts
import * as cdk from "aws-cdk-lib";
import * as cognito from "aws-cdk-lib/aws-cognito";
import { Construct } from "constructs";
import { getEnvironmentConfig } from "../config/environments";

interface AuthStackProps extends cdk.StackProps {
  environmentName: string;
}

export class AuthStack extends cdk.Stack {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;
  public readonly identityPool: cognito.CfnIdentityPool;

  constructor(scope: Construct, id: string, props: AuthStackProps) {
    super(scope, id, props);

    // GET ENVIRONMENT CONFIG
    const config = getEnvironmentConfig(props.environmentName);

    // User Pool
    this.userPool = new cognito.UserPool(this, "UserPool", {
      userPoolName: `prepg3-users-${props.environmentName}`,
      selfSignUpEnabled: false,
      signInAliases: {
        email: true,
        username: false,
      },
      autoVerify: {
        email: true,
      },
      standardAttributes: {
        email: {
          required: true,
          mutable: true,
        },
        givenName: {
          required: true,
          mutable: true,
        },
        familyName: {
          required: true,
          mutable: true,
        },
        phoneNumber: {
          required: false,
          mutable: true,
        },
      },
      customAttributes: {
        investorId: new cognito.StringAttribute({ mutable: true }),
        role: new cognito.StringAttribute({ mutable: true }),
      },
      // USE CONFIG HERE ✅
      passwordPolicy: {
        minLength: config.cognito.passwordPolicy.minLength,
        requireLowercase: config.cognito.passwordPolicy.requireLowercase,
        requireUppercase: config.cognito.passwordPolicy.requireUppercase,
        requireDigits: config.cognito.passwordPolicy.requireDigits,
        requireSymbols: config.cognito.passwordPolicy.requireSymbols,
        tempPasswordValidity: cdk.Duration.days(7),
      },
      mfa: config.cognito.mfaEnabled ? cognito.Mfa.OPTIONAL : cognito.Mfa.OFF,
      mfaSecondFactor: config.cognito.mfaEnabled
        ? {
            sms: true,
            otp: true,
          }
        : undefined,
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      deletionProtection: props.environmentName === "live",
      email: cognito.UserPoolEmail.withCognito("no-reply@prepg3.co.uk"),
    });

    // User Pool Client
    this.userPoolClient = this.userPool.addClient("WebClient", {
      userPoolClientName: `prepg3-web-client-${props.environmentName}`,
      generateSecret: false, // ✅ Must be false for web apps
      authFlows: {
        userPassword: true,
        userSrp: true,
        custom: false,
      },
      preventUserExistenceErrors: true,
      refreshTokenValidity: cdk.Duration.days(30),
      accessTokenValidity: cdk.Duration.hours(1),
      idTokenValidity: cdk.Duration.hours(1),
      enableTokenRevocation: true,
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
        },
        scopes: [
          cognito.OAuthScope.EMAIL,
          cognito.OAuthScope.OPENID,
          cognito.OAuthScope.PROFILE,
        ],
        // USE CONFIG FOR CALLBACK URLS ✅
        callbackUrls:
          props.environmentName === "live"
            ? [
                `https://investor.${config.domainName}`,
                `https://admin.${config.domainName}`,
              ]
            : ["http://localhost:3000", "http://localhost:3001"],
        logoutUrls:
          props.environmentName === "live"
            ? [`https://${config.domainName}`]
            : ["http://localhost:3000"],
      },
    });

    // User Groups
    new cognito.CfnUserPoolGroup(this, "AdminGroup", {
      userPoolId: this.userPool.userPoolId,
      groupName: "Admin",
      description: "Administrators with full platform access",
      precedence: 1,
    });

    new cognito.CfnUserPoolGroup(this, "InvestorGroup", {
      userPoolId: this.userPool.userPoolId,
      groupName: "Investor",
      description: "Investors with limited access to their own data",
      precedence: 10,
    });

    // Identity Pool for AWS SDK access
    this.identityPool = new cognito.CfnIdentityPool(this, "IdentityPool", {
      identityPoolName: `prepg3_identity_pool_${props.environmentName}`,
      allowUnauthenticatedIdentities: false,
      cognitoIdentityProviders: [
        {
          clientId: this.userPoolClient.userPoolClientId,
          providerName: this.userPool.userPoolProviderName,
        },
      ],
    });

    // Outputs
    new cdk.CfnOutput(this, "UserPoolId", {
      value: this.userPool.userPoolId,
      exportName: `PREPG3-${props.environmentName}-UserPoolId`,
      description: "Cognito User Pool ID",
    });

    new cdk.CfnOutput(this, "UserPoolClientId", {
      value: this.userPoolClient.userPoolClientId,
      exportName: `PREPG3-${props.environmentName}-UserPoolClientId`,
      description: "Cognito User Pool Client ID",
    });

    new cdk.CfnOutput(this, "IdentityPoolId", {
      value: this.identityPool.ref,
      exportName: `PREPG3-${props.environmentName}-IdentityPoolId`,
      description: "Cognito Identity Pool ID",
    });

    new cdk.CfnOutput(this, "UserPoolDomain", {
      value: `https://${this.userPool.userPoolId}.auth.${this.region}.amazoncognito.com`,
      description: "Cognito Hosted UI URL",
    });
  }
}
