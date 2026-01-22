// infrastructure/lib/stacks/auth-stack.ts
import * as cdk from "aws-cdk-lib";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as iam from "aws-cdk-lib/aws-iam";
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
      generateSecret: false,
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
        callbackUrls:
          props.environmentName === "live"
            ? [
                `https://investor.${config.domainName}`,
                `https://admin.${config.domainName}`,
              ]
            : ["http://localhost:3000", "http://localhost:3001", "http://localhost:3002"],
        logoutUrls:
          props.environmentName === "live"
            ? [`https://${config.domainName}`]
            : ["http://localhost:3000"],
      },
    });

    // ===========================================
    // USER GROUPS (ROLE HIERARCHY)
    // ===========================================

    // 🔴 SUPER ADMIN - Highest privilege (precedence 0)
    // Full system access, can manage roles, delete data
    new cognito.CfnUserPoolGroup(this, "SuperAdminGroup", {
      userPoolId: this.userPool.userPoolId,
      groupName: "SuperAdmin",
      description: "Super administrators with full system access including role management",
      precedence: 0, // Highest priority
    });

    // 🟠 ADMIN - High privilege (precedence 1)
    // Can manage most operations but cannot delete data or manage roles
    new cognito.CfnUserPoolGroup(this, "AdminGroup", {
      userPoolId: this.userPool.userPoolId,
      groupName: "Admin",
      description: "Administrators with elevated privileges",
      precedence: 1,
    });

    // 🟡 COMPLIANCE - KYC/AML focused (precedence 2)
    // Can approve/reject KYC, view investor details
    new cognito.CfnUserPoolGroup(this, "ComplianceGroup", {
      userPoolId: this.userPool.userPoolId,
      groupName: "Compliance",
      description: "Compliance officers for KYC/AML verification",
      precedence: 2,
    });

    // 🟢 PROPERTY MANAGER - Property operations (precedence 3)
    // Can update properties, view investments
    new cognito.CfnUserPoolGroup(this, "PropertyManagerGroup", {
      userPoolId: this.userPool.userPoolId,
      groupName: "PropertyManager",
      description: "Property managers - can update properties and view investments",
      precedence: 3,
    });

    // 🔵 SUPPORT - Read-only access (precedence 4)
    // Customer support, read-only access to investor data
    new cognito.CfnUserPoolGroup(this, "SupportGroup", {
      userPoolId: this.userPool.userPoolId,
      groupName: "Support",
      description: "Customer support - read-only access",
      precedence: 4,
    });

    // ⚪ VERIFIED INVESTORS - KYC approved (precedence 10)
    // Can make investments
    new cognito.CfnUserPoolGroup(this, "VerifiedInvestorsGroup", {
      userPoolId: this.userPool.userPoolId,
      groupName: "VerifiedInvestors",
      description: "KYC-verified investors who can make investments",
      precedence: 10,
    });

    // ⚫ INVESTORS - Default user group (precedence 20)
    // Standard investors, pending KYC verification
    new cognito.CfnUserPoolGroup(this, "InvestorsGroup", {
      userPoolId: this.userPool.userPoolId,
      groupName: "Investors",
      description: "Standard investors - own profile access only",
      precedence: 20,
    });

    // Identity Pool for AWS SDK access
    this.identityPool = new cognito.CfnIdentityPool(this, "IdentityPool", {
      identityPoolName: `prepg3_identity_pool_${props.environmentName}`,
      allowUnauthenticatedIdentities: false,
      cognitoIdentityProviders: [
        {
          clientId: this.userPoolClient.userPoolClientId,
          providerName: this.userPool.userPoolProviderName,
          serverSideTokenCheck: false,
        },
      ],
    });

    // IAM role for authenticated users
    const authenticatedRole = new iam.Role(this, "CognitoAuthenticatedRole", {
      assumedBy: new iam.FederatedPrincipal(
        "cognito-identity.amazonaws.com",
        {
          StringEquals: {
            "cognito-identity.amazonaws.com:aud": this.identityPool.ref,
          },
          "ForAnyValue:StringLike": {
            "cognito-identity.amazonaws.com:amr": "authenticated",
          },
        },
        "sts:AssumeRoleWithWebIdentity"
      ),
      description: "Role for authenticated Cognito users",
    });

    // Grant permissions to call AppSync
    authenticatedRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["appsync:GraphQL"],
        resources: ["*"], // Will be restricted by AppSync authorization
      })
    );

    // Attach role to Identity Pool
    new cognito.CfnIdentityPoolRoleAttachment(
      this,
      "IdentityPoolRoleAttachment",
      {
        identityPoolId: this.identityPool.ref,
        roles: {
          authenticated: authenticatedRole.roleArn,
        },
      }
    );

    // ===========================================
    // OUTPUTS
    // ===========================================

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

    new cdk.CfnOutput(this, "AuthenticatedRoleArn", {
      value: authenticatedRole.roleArn,
      exportName: `PREPG3-${props.environmentName}-AuthenticatedRoleArn`,
      description: "IAM Role ARN for authenticated users",
    });

    // Output user groups for reference
    new cdk.CfnOutput(this, "UserGroups", {
      value: JSON.stringify({
        superAdmin: "SuperAdmin",
        admin: "Admin",
        compliance: "Compliance",
        propertyManager: "PropertyManager",
        support: "Support",
        verifiedInvestors: "VerifiedInvestors",
        investors: "Investors",
      }),
      description: "Available user groups (roles)",
    });
  }
}