// infrastructure/lib/stacks/lambdas-stack.ts
import * as cdk from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as appsync from "aws-cdk-lib/aws-appsync";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as iam from "aws-cdk-lib/aws-iam";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import { Construct } from "constructs";
import { ApiLambda } from "../constructs/api-lambda";
import { LAMBDA_DEFAULTS } from "../config/constants";

interface LambdasStackProps extends cdk.StackProps {
  api: appsync.GraphqlApi;
  tables: {
    investors: dynamodb.Table;
    properties: dynamodb.Table;
    investments: dynamodb.Table;
    transactions: dynamodb.Table;
    documents: dynamodb.Table;
    notifications: dynamodb.Table;
    developments: dynamodb.Table;
    audit?: dynamodb.Table;
  };
  buckets: {
    documents: s3.Bucket;
    images: s3.Bucket;
    backups: s3.Bucket;
  };
  userPool: cognito.UserPool;
  environmentName: string;
}

export class LambdasStack extends cdk.Stack {
  public readonly functions: {
    createInvestor: cdk.aws_lambda.Function;
    updateInvestor: cdk.aws_lambda.Function;
    getInvestorDashboard: cdk.aws_lambda.Function;
    createInvestment: cdk.aws_lambda.Function;
    calculateROI: cdk.aws_lambda.Function;
    createProperty: cdk.aws_lambda.Function;
    updateProperty: cdk.aws_lambda.Function;
    createTransaction: cdk.aws_lambda.Function;
    listTransactions: cdk.aws_lambda.Function;
    uploadDocument: cdk.aws_lambda.Function;
    generatePresignedUrl: cdk.aws_lambda.Function;
    sendNotification: cdk.aws_lambda.Function;
    createDevelopment: cdk.aws_lambda.Function;
    getAdminDashboard: cdk.aws_lambda.Function;
    approveKYC: cdk.aws_lambda.Function;
    rejectKYC: cdk.aws_lambda.Function;
    requestMoreInfo: cdk.aws_lambda.Function;
    listPendingKYC: cdk.aws_lambda.Function;
    getKYCReviewQueue: cdk.aws_lambda.Function;
    collectKYCMetrics: cdk.aws_lambda.Function;
    submitIdentityDocument: cdk.aws_lambda.Function;
    submitProofOfAddress: cdk.aws_lambda.Function;
  };

  constructor(scope: Construct, id: string, props: LambdasStackProps) {
    super(scope, id, props);

    // Common environment variables for all Lambdas
    const commonEnv = {
      INVESTORS_TABLE: props.tables.investors.tableName,
      PROPERTIES_TABLE: props.tables.properties.tableName,
      INVESTMENTS_TABLE: props.tables.investments.tableName,
      TRANSACTIONS_TABLE: props.tables.transactions.tableName,
      DOCUMENTS_TABLE: props.tables.documents.tableName,
      NOTIFICATIONS_TABLE: props.tables.notifications.tableName,
      DEVELOPMENTS_TABLE: props.tables.developments.tableName,
      DOCUMENTS_BUCKET: props.buckets.documents.bucketName,
      IMAGES_BUCKET: props.buckets.images.bucketName,
      USER_POOL_ID: props.userPool.userPoolId,
      REGION: this.region,
    };

    const adminEnv = {
      ...commonEnv,
      AUDIT_TABLE: props.tables.audit?.tableName || "",
      FROM_EMAIL: "noreply@prepg3.com",
      APP_URL:
        props.environmentName === "live"
          ? "https://app.prepg3.com"
          : "https://dev.prepg3.com",
    };

    const kycEnv = {
      ...commonEnv,

      // KYC MODE: MANUAL | AUTOMATED | HYBRID
      KYC_MODE: props.environmentName === "live" ? "Manual" : "MANUAL",

      // Onfido credentials (only needed for AUTOMATED/HYBRID)
      ONFIDO_API_TOKEN: process.env.ONFIDO_API_TOKEN || "",
      ONFIDO_WEBHOOK_SECRET: process.env.ONFIDO_WEBHOOK_SECRET || "",
    };

    const adminKYCEnv = {
      ...commonEnv,

      // KYC verification
      KYC_MODE: props.environmentName === "live" ? "HYBRID" : "MANUAL",
      ONFIDO_API_TOKEN: process.env.ONFIDO_API_TOKEN || "",
      ONFIDO_WEBHOOK_SECRET: process.env.ONFIDO_WEBHOOK_SECRET || "",

      // Admin email
      FROM_EMAIL: "noreply@prepg3.com",
      APP_URL:
        props.environmentName === "live"
          ? "https://app.prepg3.com"
          : "https://dev.prepg3.com",

      // Audit
      AUDIT_TABLE: props.tables.audit?.tableName || "",
    };

    // ===========================================
    // INVESTOR LAMBDAS
    // ===========================================

    // Create Investor
    const createInvestorLambda = new ApiLambda(this, "CreateInvestor", {
      functionName: "create-investor",
      handler: "investors/create-investor/index.handler",
      environmentName: props.environmentName,
      api: props.api,
      typeName: "Mutation",
      fieldName: "createInvestor",
      environment: commonEnv,
      timeout: LAMBDA_DEFAULTS.TIMEOUT_SECONDS.MEDIUM,
      memorySize: LAMBDA_DEFAULTS.MEMORY_MB.MEDIUM,
    });

    // Grant permissions
    createInvestorLambda.grantTableAccess(props.tables.investors, "write");
    createInvestorLambda.function.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          "cognito-idp:AdminCreateUser",
          "cognito-idp:AdminSetUserPassword",
          "cognito-idp:AdminAddUserToGroup",
        ],
        resources: [props.userPool.userPoolArn],
      })
    );

    // Update Investor
    const updateInvestorLambda = new ApiLambda(this, "UpdateInvestor", {
      functionName: "update-investor",
      handler: "investors/update-investor/index.handler",
      environmentName: props.environmentName,
      api: props.api,
      typeName: "Mutation",
      fieldName: "updateInvestor",
      environment: commonEnv,
      timeout: LAMBDA_DEFAULTS.TIMEOUT_SECONDS.MEDIUM,
      memorySize: LAMBDA_DEFAULTS.MEMORY_MB.MEDIUM,
    });

    // Submit Identity Document - USES KYC VERIFICATION
    const submitIdentityDocumentLambda = new ApiLambda(
      this,
      "SubmitIdentityDocument",
      {
        functionName: "submit-identity-document",
        handler: "investors/submit-identity-document/index.handler",
        environmentName: props.environmentName,
        api: props.api,
        typeName: "Mutation",
        fieldName: "submitIdentityDocument",
        environment: kycEnv,
        timeout: LAMBDA_DEFAULTS.TIMEOUT_SECONDS.LONG,
        memorySize: LAMBDA_DEFAULTS.MEMORY_MB.MEDIUM,
      }
    );

    // Submit Proof of Address - USES KYC VERIFICATION
    const submitProofOfAddressLambda = new ApiLambda(
      this,
      "SubmitProofOfAddress",
      {
        functionName: "submit-proof-of-address",
        handler: "investors/submit-proof-of-address/index.handler",
        environmentName: props.environmentName,
        api: props.api,
        typeName: "Mutation",
        fieldName: "submitProofOfAddress",
        environment: kycEnv,
        timeout: LAMBDA_DEFAULTS.TIMEOUT_SECONDS.LONG,
        memorySize: LAMBDA_DEFAULTS.MEMORY_MB.MEDIUM,
      }
    );

    submitIdentityDocumentLambda.grantTableAccess(
      props.tables.investors,
      "readwrite"
    );
    submitProofOfAddressLambda.grantTableAccess(
      props.tables.investors,
      "readwrite"
    );
    updateInvestorLambda.grantTableAccess(props.tables.investors, "readwrite");

    // Get Investor Dashboard
    const getInvestorDashboardLambda = new ApiLambda(
      this,
      "GetInvestorDashboard",
      {
        functionName: "get-investor-dashboard",
        handler: "investors/get-investor-dashboard/index.handler",
        environmentName: props.environmentName,
        api: props.api,
        typeName: "Query",
        fieldName: "getInvestorDashboard",
        environment: commonEnv,
        timeout: LAMBDA_DEFAULTS.TIMEOUT_SECONDS.LONG,
        memorySize: LAMBDA_DEFAULTS.MEMORY_MB.LARGE,
      }
    );

    getInvestorDashboardLambda.grantTableAccess(props.tables.investors, "read");
    getInvestorDashboardLambda.grantTableAccess(
      props.tables.investments,
      "read"
    );
    getInvestorDashboardLambda.grantTableAccess(
      props.tables.transactions,
      "read"
    );
    getInvestorDashboardLambda.grantTableAccess(
      props.tables.notifications,
      "read"
    );
    getInvestorDashboardLambda.grantTableAccess(
      props.tables.properties,
      "read"
    );

    // ===========================================
    // INVESTMENT LAMBDAS
    // ===========================================

    // Create Investment
    const createInvestmentLambda = new ApiLambda(this, "CreateInvestment", {
      functionName: "create-investment",
      handler: "investments/create-investment/index.handler",
      environmentName: props.environmentName,
      api: props.api,
      typeName: "Mutation",
      fieldName: "createInvestment",
      environment: commonEnv,
      timeout: LAMBDA_DEFAULTS.TIMEOUT_SECONDS.MEDIUM,
      memorySize: LAMBDA_DEFAULTS.MEMORY_MB.MEDIUM,
    });

    createInvestmentLambda.grantTableAccess(props.tables.investments, "write");
    createInvestmentLambda.grantTableAccess(
      props.tables.properties,
      "readwrite"
    );
    createInvestmentLambda.grantTableAccess(
      props.tables.investors,
      "readwrite"
    );
    createInvestmentLambda.grantTableAccess(props.tables.transactions, "write");
    createInvestmentLambda.grantTableAccess(
      props.tables.notifications,
      "write"
    );

    // Calculate ROI
    const calculateROILambda = new ApiLambda(this, "CalculateROI", {
      functionName: "calculate-roi",
      handler: "investments/calculate-roi/index.handler",
      environmentName: props.environmentName,
      environment: commonEnv,
      timeout: LAMBDA_DEFAULTS.TIMEOUT_SECONDS.LONG,
      memorySize: LAMBDA_DEFAULTS.MEMORY_MB.LARGE,
      // No AppSync connection - this is for scheduled/manual execution
    });

    calculateROILambda.grantTableAccess(props.tables.investments, "readwrite");
    calculateROILambda.grantTableAccess(props.tables.properties, "read");
    calculateROILambda.grantTableAccess(props.tables.investors, "readwrite");

    // Schedule daily ROI calculation at 1 AM
    const dailyROIRule = new events.Rule(this, "DailyROICalculation", {
      schedule: events.Schedule.cron({
        minute: "0",
        hour: "1",
      }),
      description: "Calculate ROI for all investments daily at 1 AM",
      enabled: true,
    });

    dailyROIRule.addTarget(
      new targets.LambdaFunction(calculateROILambda.function)
    );

    // ===========================================
    // PROPERTY LAMBDAS
    // ===========================================

    // Create Property
    const createPropertyLambda = new ApiLambda(this, "CreateProperty", {
      functionName: "create-property",
      handler: "properties/create-property/index.handler",
      environmentName: props.environmentName,
      api: props.api,
      typeName: "Mutation",
      fieldName: "createProperty",
      environment: commonEnv,
      timeout: LAMBDA_DEFAULTS.TIMEOUT_SECONDS.MEDIUM,
      memorySize: LAMBDA_DEFAULTS.MEMORY_MB.MEDIUM,
    });

    createPropertyLambda.grantTableAccess(props.tables.properties, "write");
    createPropertyLambda.grantBucketAccess(props.buckets.images, "readwrite");

    // Update Property
    const updatePropertyLambda = new ApiLambda(this, "UpdateProperty", {
      functionName: "update-property",
      handler: "properties/update-property/index.handler",
      environmentName: props.environmentName,
      api: props.api,
      typeName: "Mutation",
      fieldName: "updateProperty",
      environment: commonEnv,
      timeout: LAMBDA_DEFAULTS.TIMEOUT_SECONDS.MEDIUM,
      memorySize: LAMBDA_DEFAULTS.MEMORY_MB.MEDIUM,
    });

    updatePropertyLambda.grantTableAccess(props.tables.properties, "readwrite");
    updatePropertyLambda.grantBucketAccess(props.buckets.images, "readwrite");

    // ===========================================
    // TRANSACTION LAMBDAS
    // ===========================================

    // Create Transaction
    const createTransactionLambda = new ApiLambda(this, "CreateTransaction", {
      functionName: "create-transaction",
      handler: "transactions/create-transaction/index.handler",
      environmentName: props.environmentName,
      api: props.api,
      typeName: "Mutation",
      fieldName: "createTransaction",
      environment: commonEnv,
      timeout: LAMBDA_DEFAULTS.TIMEOUT_SECONDS.MEDIUM,
      memorySize: LAMBDA_DEFAULTS.MEMORY_MB.MEDIUM,
    });

    createTransactionLambda.grantTableAccess(
      props.tables.transactions,
      "write"
    );
    createTransactionLambda.grantTableAccess(
      props.tables.investors,
      "readwrite"
    );

    // List Transactions
    const listTransactionsLambda = new ApiLambda(this, "ListTransactions", {
      functionName: "list-transactions",
      handler: "transactions/list-transactions/index.handler",
      environmentName: props.environmentName,
      environment: commonEnv,
      timeout: LAMBDA_DEFAULTS.TIMEOUT_SECONDS.MEDIUM,
      memorySize: LAMBDA_DEFAULTS.MEMORY_MB.MEDIUM,
      // Optional: Connect to AppSync if you want Lambda-based listing
      // Otherwise, keep the DynamoDB direct resolver
    });

    listTransactionsLambda.grantTableAccess(props.tables.transactions, "read");

    // ===========================================
    // DOCUMENT LAMBDAS
    // ===========================================

    // Upload Document
    const uploadDocumentLambda = new ApiLambda(this, "UploadDocument", {
      functionName: "upload-document",
      handler: "documents/upload-document/index.handler",
      environmentName: props.environmentName,
      api: props.api,
      typeName: "Mutation",
      fieldName: "uploadDocument",
      environment: commonEnv,
      timeout: LAMBDA_DEFAULTS.TIMEOUT_SECONDS.LONG,
      memorySize: LAMBDA_DEFAULTS.MEMORY_MB.LARGE,
    });

    uploadDocumentLambda.grantTableAccess(props.tables.documents, "write");
    uploadDocumentLambda.grantBucketAccess(
      props.buckets.documents,
      "readwrite"
    );
    uploadDocumentLambda.grantTableAccess(props.tables.notifications, "write");

    // Generate Presigned URL
    const generatePresignedUrlLambda = new ApiLambda(
      this,
      "GeneratePresignedUrl",
      {
        functionName: "generate-presigned-url",
        handler: "documents/generate-presigned-url/index.handler",
        environmentName: props.environmentName,
        api: props.api,
        typeName: "Query",
        fieldName: "generateDocumentUrl",
        environment: commonEnv,
        timeout: LAMBDA_DEFAULTS.TIMEOUT_SECONDS.SHORT,
        memorySize: LAMBDA_DEFAULTS.MEMORY_MB.SMALL,
      }
    );

    generatePresignedUrlLambda.grantBucketAccess(
      props.buckets.documents,
      "read"
    );
    generatePresignedUrlLambda.grantTableAccess(props.tables.documents, "read");

    // ===========================================
    // NOTIFICATION LAMBDAS
    // ===========================================

    // Send Notification
    const sendNotificationLambda = new ApiLambda(this, "SendNotification", {
      functionName: "send-notification",
      handler: "notifications/send-email/index.handler",
      environmentName: props.environmentName,
      api: props.api,
      typeName: "Mutation",
      fieldName: "sendNotification",
      environment: {
        ...commonEnv,
        SOURCE_EMAIL: "notifications@prepg3.co.uk",
      },
      timeout: LAMBDA_DEFAULTS.TIMEOUT_SECONDS.MEDIUM,
      memorySize: LAMBDA_DEFAULTS.MEMORY_MB.MEDIUM,
    });

    sendNotificationLambda.function.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["ses:SendEmail", "ses:SendRawEmail"],
        resources: ["*"],
      })
    );

    sendNotificationLambda.grantTableAccess(props.tables.investors, "read");
    sendNotificationLambda.grantTableAccess(
      props.tables.notifications,
      "write"
    );

    // ===========================================
    // DEVELOPMENT UPDATE LAMBDAS
    // ===========================================

    // Create Development
    const createDevelopmentLambda = new ApiLambda(this, "CreateDevelopment", {
      functionName: "create-development",
      handler: "developments/create-development/index.handler",
      environmentName: props.environmentName,
      api: props.api,
      typeName: "Mutation",
      fieldName: "createDevelopment",
      environment: commonEnv,
      timeout: LAMBDA_DEFAULTS.TIMEOUT_SECONDS.MEDIUM,
      memorySize: LAMBDA_DEFAULTS.MEMORY_MB.MEDIUM,
    });

    createDevelopmentLambda.grantTableAccess(
      props.tables.developments,
      "write"
    );
    createDevelopmentLambda.grantTableAccess(props.tables.investments, "read");
    createDevelopmentLambda.grantTableAccess(
      props.tables.notifications,
      "write"
    );
    createDevelopmentLambda.grantBucketAccess(
      props.buckets.images,
      "readwrite"
    );

    // ===========================================
    // ADMIN LAMBDAS
    // ===========================================

    // Get Admin Dashboard
    const getAdminDashboardLambda = new ApiLambda(this, "GetAdminDashboard", {
      functionName: "get-admin-dashboard",
      handler: "admin/get-admin-dashboard/index.handler",
      environmentName: props.environmentName,
      api: props.api,
      typeName: "Query",
      fieldName: "getAdminDashboard",
      environment: commonEnv,
      timeout: LAMBDA_DEFAULTS.TIMEOUT_SECONDS.LONG,
      memorySize: LAMBDA_DEFAULTS.MEMORY_MB.LARGE,
    });

    getAdminDashboardLambda.grantTableAccess(props.tables.investors, "read");
    getAdminDashboardLambda.grantTableAccess(props.tables.investments, "read");
    getAdminDashboardLambda.grantTableAccess(props.tables.properties, "read");

    // Approve KYC
    const approveKYCLambda = new ApiLambda(this, "ApproveKYC", {
      functionName: "approve-kyc",
      handler: "admin/approve-kyc/index.handler",
      environmentName: props.environmentName,
      api: props.api,
      typeName: "Mutation",
      fieldName: "approveKYC",
      environment: adminKYCEnv,
      timeout: LAMBDA_DEFAULTS.TIMEOUT_SECONDS.LONG,
      memorySize: LAMBDA_DEFAULTS.MEMORY_MB.MEDIUM,
    });

    approveKYCLambda.grantTableAccess(props.tables.investors, "readwrite");
    approveKYCLambda.grantTableAccess(props.tables.notifications, "write");
    if (props.tables.audit) {
      approveKYCLambda.grantTableAccess(props.tables.audit, "write");
    }

    // Grant SES and Cognito permissions
    approveKYCLambda.function.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["ses:SendEmail", "ses:SendRawEmail"],
        resources: ["*"],
      })
    );

    approveKYCLambda.function.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["cognito-idp:AdminAddUserToGroup"],
        resources: [props.userPool.userPoolArn],
      })
    );

    // Reject KYC
    const rejectKYCLambda = new ApiLambda(this, "RejectKYC", {
      functionName: "reject-kyc",
      handler: "admin/reject-kyc/index.handler",
      environmentName: props.environmentName,
      api: props.api,
      typeName: "Mutation",
      fieldName: "rejectKYC",
      environment: adminEnv,
      timeout: LAMBDA_DEFAULTS.TIMEOUT_SECONDS.MEDIUM,
      memorySize: LAMBDA_DEFAULTS.MEMORY_MB.MEDIUM,
    });

    rejectKYCLambda.grantTableAccess(props.tables.investors, "readwrite");
    rejectKYCLambda.grantTableAccess(props.tables.notifications, "write");
    if (props.tables.audit) {
      rejectKYCLambda.grantTableAccess(props.tables.audit, "write");
    }

    rejectKYCLambda.function.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["ses:SendEmail", "ses:SendRawEmail"],
        resources: ["*"],
      })
    );

    // Request More Info
    const requestMoreInfoLambda = new ApiLambda(this, "RequestMoreInfo", {
      functionName: "request-more-info",
      handler: "admin/request-more-info/index.handler",
      environmentName: props.environmentName,
      api: props.api,
      typeName: "Mutation",
      fieldName: "requestMoreInfo",
      environment: adminEnv,
      timeout: LAMBDA_DEFAULTS.TIMEOUT_SECONDS.MEDIUM,
      memorySize: LAMBDA_DEFAULTS.MEMORY_MB.MEDIUM,
    });

    requestMoreInfoLambda.grantTableAccess(props.tables.investors, "readwrite");
    requestMoreInfoLambda.grantTableAccess(props.tables.notifications, "write");

    requestMoreInfoLambda.function.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["ses:SendEmail", "ses:SendRawEmail"],
        resources: ["*"],
      })
    );

    // List Pending KYC
    const listPendingKYCLambda = new ApiLambda(this, "ListPendingKYC", {
      functionName: "list-pending-kyc",
      handler: "admin/list-pending-kyc/index.handler",
      environmentName: props.environmentName,
      api: props.api,
      typeName: "Query",
      fieldName: "listPendingKYC",
      environment: commonEnv,
      timeout: LAMBDA_DEFAULTS.TIMEOUT_SECONDS.MEDIUM,
      memorySize: LAMBDA_DEFAULTS.MEMORY_MB.MEDIUM,
    });

    listPendingKYCLambda.grantTableAccess(props.tables.investors, "read");

    // Get KYC Review Queue
    const getKYCReviewQueueLambda = new ApiLambda(this, "GetKYCReviewQueue", {
      functionName: "get-kyc-review-queue",
      handler: "admin/get-kyc-review-queue/index.handler",
      environmentName: props.environmentName,
      api: props.api,
      typeName: "Query",
      fieldName: "getKYCReviewQueue",
      environment: commonEnv,
      timeout: LAMBDA_DEFAULTS.TIMEOUT_SECONDS.MEDIUM,
      memorySize: LAMBDA_DEFAULTS.MEMORY_MB.MEDIUM,
    });

    getKYCReviewQueueLambda.grantTableAccess(props.tables.investors, "read");

    // ===========================================
    // SCHEDULED LAMBDAS
    // ===========================================

    // Collect KYC Metrics (runs every 15 minutes)
    const collectKYCMetricsLambda = new ApiLambda(this, "CollectKYCMetrics", {
      functionName: "collect-kyc-metrics",
      handler: "scheduled/collect-kyc-metrics/index.handler",
      environmentName: props.environmentName,
      environment: commonEnv,
      timeout: LAMBDA_DEFAULTS.TIMEOUT_SECONDS.MEDIUM,
      memorySize: LAMBDA_DEFAULTS.MEMORY_MB.SMALL,
      // No AppSync connection - this is scheduled
    });

    collectKYCMetricsLambda.grantTableAccess(props.tables.investors, "read");

    // Schedule to run every 15 minutes
    const collectMetricsRule = new events.Rule(this, "CollectKYCMetricsRule", {
      schedule: events.Schedule.rate(cdk.Duration.minutes(15)),
      description: "Collect KYC queue metrics every 15 minutes",
      enabled: true,
    });

    collectMetricsRule.addTarget(
      new targets.LambdaFunction(collectKYCMetricsLambda.function)
    );

    // Grant CloudWatch permissions
    collectKYCMetricsLambda.function.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["cloudwatch:PutMetricData"],
        resources: ["*"],
      })
    );

    // ===========================================
    // EXPORT FUNCTIONS
    // ===========================================

    this.functions = {
      createInvestor: createInvestorLambda.function,
      updateInvestor: updateInvestorLambda.function,
      getInvestorDashboard: getInvestorDashboardLambda.function,
      createInvestment: createInvestmentLambda.function,
      calculateROI: calculateROILambda.function,
      createProperty: createPropertyLambda.function,
      updateProperty: updatePropertyLambda.function,
      createTransaction: createTransactionLambda.function,
      listTransactions: listTransactionsLambda.function,
      uploadDocument: uploadDocumentLambda.function,
      generatePresignedUrl: generatePresignedUrlLambda.function,
      sendNotification: sendNotificationLambda.function,
      createDevelopment: createDevelopmentLambda.function,
      getAdminDashboard: getAdminDashboardLambda.function,
      approveKYC: approveKYCLambda.function,
      rejectKYC: rejectKYCLambda.function,
      requestMoreInfo: requestMoreInfoLambda.function,
      listPendingKYC: listPendingKYCLambda.function,
      getKYCReviewQueue: getKYCReviewQueueLambda.function,
      collectKYCMetrics: collectKYCMetricsLambda.function,
      submitIdentityDocument: submitIdentityDocumentLambda.function,
      submitProofOfAddress: submitProofOfAddressLambda.function,
    };

    // ===========================================
    // STACK OUTPUTS
    // ===========================================

    new cdk.CfnOutput(this, "TotalLambdaFunctions", {
      value: Object.keys(this.functions).length.toString(),
      description: "Total number of Lambda functions deployed",
    });

    // Summary output
    new cdk.CfnOutput(this, "LambdaSummary", {
      value: JSON.stringify({
        investors: 5,
        investments: 2,
        properties: 2,
        transactions: 2,
        documents: 2,
        notifications: 1,
        developments: 1,
        admin: 6,
        scheduled: 2,
      }),
      description: "Lambda functions by category",
    });
  }
}
