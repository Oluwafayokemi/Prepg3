// infrastructure/lib/stacks/lambdas-stack.ts
import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as appsync from 'aws-cdk-lib/aws-appsync';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import { Construct } from 'constructs';
import { ApiLambda } from '../constructs/api-lambda';
import { LAMBDA_DEFAULTS } from '../config/constants';

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

    // ===========================================
    // INVESTOR LAMBDAS
    // ===========================================

    // Create Investor
    const createInvestorLambda = new ApiLambda(this, 'CreateInvestor', {
      functionName: 'create-investor',
      handler: 'investors/create-investor/index.handler',
      environmentName: props.environmentName,
      api: props.api,
      typeName: 'Mutation',
      fieldName: 'createInvestor',
      environment: commonEnv,
      timeout: LAMBDA_DEFAULTS.TIMEOUT_SECONDS.MEDIUM,
      memorySize: LAMBDA_DEFAULTS.MEMORY_MB.MEDIUM,
    });

    // Grant permissions
    createInvestorLambda.grantTableAccess(props.tables.investors, 'write');
    createInvestorLambda.function.addToRolePolicy(new iam.PolicyStatement({
      actions: [
        'cognito-idp:AdminCreateUser',
        'cognito-idp:AdminSetUserPassword',
        'cognito-idp:AdminAddUserToGroup',
      ],
      resources: [props.userPool.userPoolArn],
    }));

    // Update Investor
    const updateInvestorLambda = new ApiLambda(this, 'UpdateInvestor', {
      functionName: 'update-investor',
      handler: 'investors/update-investor/index.handler',
      environmentName: props.environmentName,
      api: props.api,
      typeName: 'Mutation',
      fieldName: 'updateInvestor',
      environment: commonEnv,
      timeout: LAMBDA_DEFAULTS.TIMEOUT_SECONDS.MEDIUM,
      memorySize: LAMBDA_DEFAULTS.MEMORY_MB.MEDIUM,
    });

    updateInvestorLambda.grantTableAccess(props.tables.investors, 'readwrite');

    // Get Investor Dashboard
    const getInvestorDashboardLambda = new ApiLambda(this, 'GetInvestorDashboard', {
      functionName: 'get-investor-dashboard',
      handler: 'investors/get-investor-dashboard/index.handler',
      environmentName: props.environmentName,
      api: props.api,
      typeName: 'Query',
      fieldName: 'getInvestorDashboard',
      environment: commonEnv,
      timeout: LAMBDA_DEFAULTS.TIMEOUT_SECONDS.LONG,
      memorySize: LAMBDA_DEFAULTS.MEMORY_MB.LARGE,
    });

    getInvestorDashboardLambda.grantTableAccess(props.tables.investors, 'read');
    getInvestorDashboardLambda.grantTableAccess(props.tables.investments, 'read');
    getInvestorDashboardLambda.grantTableAccess(props.tables.transactions, 'read');
    getInvestorDashboardLambda.grantTableAccess(props.tables.notifications, 'read');
    getInvestorDashboardLambda.grantTableAccess(props.tables.properties, 'read');

    // ===========================================
    // INVESTMENT LAMBDAS
    // ===========================================

    // Create Investment
    const createInvestmentLambda = new ApiLambda(this, 'CreateInvestment', {
      functionName: 'create-investment',
      handler: 'investments/create-investment/index.handler',
      environmentName: props.environmentName,
      api: props.api,
      typeName: 'Mutation',
      fieldName: 'createInvestment',
      environment: commonEnv,
      timeout: LAMBDA_DEFAULTS.TIMEOUT_SECONDS.MEDIUM,
      memorySize: LAMBDA_DEFAULTS.MEMORY_MB.MEDIUM,
    });

    createInvestmentLambda.grantTableAccess(props.tables.investments, 'write');
    createInvestmentLambda.grantTableAccess(props.tables.properties, 'readwrite');
    createInvestmentLambda.grantTableAccess(props.tables.investors, 'readwrite');
    createInvestmentLambda.grantTableAccess(props.tables.transactions, 'write');
    createInvestmentLambda.grantTableAccess(props.tables.notifications, 'write');

    // Calculate ROI
    const calculateROILambda = new ApiLambda(this, 'CalculateROI', {
      functionName: 'calculate-roi',
      handler: 'investments/calculate-roi/index.handler',
      environmentName: props.environmentName,
      environment: commonEnv,
      timeout: LAMBDA_DEFAULTS.TIMEOUT_SECONDS.LONG,
      memorySize: LAMBDA_DEFAULTS.MEMORY_MB.LARGE,
      // No AppSync connection - this is for scheduled/manual execution
    });

    calculateROILambda.grantTableAccess(props.tables.investments, 'readwrite');
    calculateROILambda.grantTableAccess(props.tables.properties, 'read');
    calculateROILambda.grantTableAccess(props.tables.investors, 'readwrite');

    // Schedule daily ROI calculation at 1 AM
    const dailyROIRule = new events.Rule(this, 'DailyROICalculation', {
      schedule: events.Schedule.cron({
        minute: '0',
        hour: '1',
      }),
      description: 'Calculate ROI for all investments daily at 1 AM',
      enabled: true,
    });

    dailyROIRule.addTarget(new targets.LambdaFunction(calculateROILambda.function));

    // ===========================================
    // PROPERTY LAMBDAS
    // ===========================================

    // Create Property
    const createPropertyLambda = new ApiLambda(this, 'CreateProperty', {
      functionName: 'create-property',
      handler: 'properties/create-property/index.handler',
      environmentName: props.environmentName,
      api: props.api,
      typeName: 'Mutation',
      fieldName: 'createProperty',
      environment: commonEnv,
      timeout: LAMBDA_DEFAULTS.TIMEOUT_SECONDS.MEDIUM,
      memorySize: LAMBDA_DEFAULTS.MEMORY_MB.MEDIUM,
    });

    createPropertyLambda.grantTableAccess(props.tables.properties, 'write');
    createPropertyLambda.grantBucketAccess(props.buckets.images, 'readwrite');

    // Update Property
    const updatePropertyLambda = new ApiLambda(this, 'UpdateProperty', {
      functionName: 'update-property',
      handler: 'properties/update-property/index.handler',
      environmentName: props.environmentName,
      api: props.api,
      typeName: 'Mutation',
      fieldName: 'updateProperty',
      environment: commonEnv,
      timeout: LAMBDA_DEFAULTS.TIMEOUT_SECONDS.MEDIUM,
      memorySize: LAMBDA_DEFAULTS.MEMORY_MB.MEDIUM,
    });

    updatePropertyLambda.grantTableAccess(props.tables.properties, 'readwrite');
    updatePropertyLambda.grantBucketAccess(props.buckets.images, 'readwrite');

    // ===========================================
    // TRANSACTION LAMBDAS
    // ===========================================

    // Create Transaction
    const createTransactionLambda = new ApiLambda(this, 'CreateTransaction', {
      functionName: 'create-transaction',
      handler: 'transactions/create-transaction/index.handler',
      environmentName: props.environmentName,
      api: props.api,
      typeName: 'Mutation',
      fieldName: 'createTransaction',
      environment: commonEnv,
      timeout: LAMBDA_DEFAULTS.TIMEOUT_SECONDS.MEDIUM,
      memorySize: LAMBDA_DEFAULTS.MEMORY_MB.MEDIUM,
    });

    createTransactionLambda.grantTableAccess(props.tables.transactions, 'write');
    createTransactionLambda.grantTableAccess(props.tables.investors, 'readwrite');

    // List Transactions
    const listTransactionsLambda = new ApiLambda(this, 'ListTransactions', {
      functionName: 'list-transactions',
      handler: 'transactions/list-transactions/index.handler',
      environmentName: props.environmentName,
      environment: commonEnv,
      timeout: LAMBDA_DEFAULTS.TIMEOUT_SECONDS.MEDIUM,
      memorySize: LAMBDA_DEFAULTS.MEMORY_MB.MEDIUM,
      // Optional: Connect to AppSync if you want Lambda-based listing
      // Otherwise, keep the DynamoDB direct resolver
    });

    listTransactionsLambda.grantTableAccess(props.tables.transactions, 'read');

    // ===========================================
    // DOCUMENT LAMBDAS
    // ===========================================

    // Upload Document
    const uploadDocumentLambda = new ApiLambda(this, 'UploadDocument', {
      functionName: 'upload-document',
      handler: 'documents/upload-document/index.handler',
      environmentName: props.environmentName,
      api: props.api,
      typeName: 'Mutation',
      fieldName: 'uploadDocument',
      environment: commonEnv,
      timeout: LAMBDA_DEFAULTS.TIMEOUT_SECONDS.LONG,
      memorySize: LAMBDA_DEFAULTS.MEMORY_MB.LARGE,
    });

    uploadDocumentLambda.grantTableAccess(props.tables.documents, 'write');
    uploadDocumentLambda.grantBucketAccess(props.buckets.documents, 'readwrite');
    uploadDocumentLambda.grantTableAccess(props.tables.notifications, 'write');

    // Generate Presigned URL
    const generatePresignedUrlLambda = new ApiLambda(this, 'GeneratePresignedUrl', {
      functionName: 'generate-presigned-url',
      handler: 'documents/generate-presigned-url/index.handler',
      environmentName: props.environmentName,
      api: props.api,
      typeName: 'Query',
      fieldName: 'generateDocumentUrl',
      environment: commonEnv,
      timeout: LAMBDA_DEFAULTS.TIMEOUT_SECONDS.SHORT,
      memorySize: LAMBDA_DEFAULTS.MEMORY_MB.SMALL,
    });

    generatePresignedUrlLambda.grantBucketAccess(props.buckets.documents, 'read');
    generatePresignedUrlLambda.grantTableAccess(props.tables.documents, 'read');

    // ===========================================
    // NOTIFICATION LAMBDAS
    // ===========================================

    // Send Notification
    const sendNotificationLambda = new ApiLambda(this, 'SendNotification', {
      functionName: 'send-notification',
      handler: 'notifications/send-email/index.handler',
      environmentName: props.environmentName,
      api: props.api,
      typeName: 'Mutation',
      fieldName: 'sendNotification',
      environment: {
        ...commonEnv,
        SOURCE_EMAIL: 'notifications@prepg3.co.uk',
      },
      timeout: LAMBDA_DEFAULTS.TIMEOUT_SECONDS.MEDIUM,
      memorySize: LAMBDA_DEFAULTS.MEMORY_MB.MEDIUM,
    });

    sendNotificationLambda.function.addToRolePolicy(new iam.PolicyStatement({
      actions: ['ses:SendEmail', 'ses:SendRawEmail'],
      resources: ['*'],
    }));

    sendNotificationLambda.grantTableAccess(props.tables.investors, 'read');
    sendNotificationLambda.grantTableAccess(props.tables.notifications, 'write');

    // ===========================================
    // DEVELOPMENT UPDATE LAMBDAS
    // ===========================================

    // Create Development
    const createDevelopmentLambda = new ApiLambda(this, 'CreateDevelopment', {
      functionName: 'create-development',
      handler: 'developments/create-development/index.handler',
      environmentName: props.environmentName,
      api: props.api,
      typeName: 'Mutation',
      fieldName: 'createDevelopment',
      environment: commonEnv,
      timeout: LAMBDA_DEFAULTS.TIMEOUT_SECONDS.MEDIUM,
      memorySize: LAMBDA_DEFAULTS.MEMORY_MB.MEDIUM,
    });

    createDevelopmentLambda.grantTableAccess(props.tables.developments, 'write');
    createDevelopmentLambda.grantTableAccess(props.tables.investments, 'read');
    createDevelopmentLambda.grantTableAccess(props.tables.notifications, 'write');
    createDevelopmentLambda.grantBucketAccess(props.buckets.images, 'readwrite');

    // ===========================================
    // ADMIN LAMBDAS
    // ===========================================

    // Get Admin Dashboard
    const getAdminDashboardLambda = new ApiLambda(this, 'GetAdminDashboard', {
      functionName: 'get-admin-dashboard',
      handler: 'admin/get-admin-dashboard/index.handler',
      environmentName: props.environmentName,
      api: props.api,
      typeName: 'Query',
      fieldName: 'getAdminDashboard',
      environment: commonEnv,
      timeout: LAMBDA_DEFAULTS.TIMEOUT_SECONDS.LONG,
      memorySize: LAMBDA_DEFAULTS.MEMORY_MB.LARGE,
    });

    getAdminDashboardLambda.grantTableAccess(props.tables.investors, 'read');
    getAdminDashboardLambda.grantTableAccess(props.tables.investments, 'read');
    getAdminDashboardLambda.grantTableAccess(props.tables.properties, 'read');

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
    };

    // ===========================================
    // STACK OUTPUTS
    // ===========================================

    new cdk.CfnOutput(this, 'TotalLambdaFunctions', {
      value: Object.keys(this.functions).length.toString(),
      description: 'Total number of Lambda functions deployed',
    });

    // Summary output
    new cdk.CfnOutput(this, 'LambdaSummary', {
      value: JSON.stringify({
        investors: 3,
        investments: 2,
        properties: 2,
        transactions: 2,
        documents: 2,
        notifications: 1,
        developments: 1,
        admin: 1,
      }),
      description: 'Lambda functions by category',
    });
  }
}