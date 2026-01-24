// infrastructure/lib/stacks/database-stack.ts
import * as cdk from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import { Construct } from "constructs";
import { getEnvironmentConfig } from "../config/environments";

interface DatabaseStackProps extends cdk.StackProps {
  environmentName: string;
}

export class DatabaseStack extends cdk.Stack {
  public readonly tables: {
    investors: dynamodb.Table;
    properties: dynamodb.Table;
    investments: dynamodb.Table;
    transactions: dynamodb.Table;
    documents: dynamodb.Table;
    notifications: dynamodb.Table;
    developments: dynamodb.Table;
    emailSubscriptions: dynamodb.Table;
  };

  constructor(scope: Construct, id: string, props: DatabaseStackProps) {
    super(scope, id, props);

    const config = getEnvironmentConfig(props.environmentName);

    const removalPolicy =
      props.environmentName === "live"
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY;

    const commonTableProps = {
      billingMode:
        config.database.billingMode === "PAY_PER_REQUEST"
          ? dynamodb.BillingMode.PAY_PER_REQUEST
          : dynamodb.BillingMode.PROVISIONED,
      pointInTimeRecovery: config.database.pointInTimeRecovery,
      removalPolicy,
    };

    // Investors Table
    const investorsTable = new dynamodb.Table(this, "InvestorsTable", {
      tableName: `prepg3-investors-${props.environmentName}`,
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "version", type: dynamodb.AttributeType.NUMBER },
      ...commonTableProps,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
    });

    // GSI for current versions only
    investorsTable.addGlobalSecondaryIndex({
      indexName: "currentVersions",
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "isCurrent", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // GSI for email lookup
    investorsTable.addGlobalSecondaryIndex({
      indexName: "byEmail",
      partitionKey: { name: "email", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "version", type: dynamodb.AttributeType.NUMBER },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Properties Table
    const propertiesTable = new dynamodb.Table(this, "PropertiesTable", {
      tableName: `prepg3-properties-${props.environmentName}`,
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
      ...commonTableProps,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
    });

    // GSI for status queries
    propertiesTable.addGlobalSecondaryIndex({
      indexName: "byStatus",
      partitionKey: { name: "status", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "acquisitionDate", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Investments Table
    const investmentsTable = new dynamodb.Table(this, "InvestmentsTable", {
      tableName: `prepg3-investments-${props.environmentName}`,
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "investorId", type: dynamodb.AttributeType.STRING },
      ...commonTableProps,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
    });

    // GSI for investor's investments
    investmentsTable.addGlobalSecondaryIndex({
      indexName: "byInvestor",
      partitionKey: { name: "investorId", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "investmentDate", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // GSI for property's investments
    investmentsTable.addGlobalSecondaryIndex({
      indexName: "byProperty",
      partitionKey: { name: "propertyId", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "investmentDate", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Transactions Table
    const transactionsTable = new dynamodb.Table(this, "TransactionsTable", {
      tableName: `prepg3-transactions-${props.environmentName}`,
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
      ...commonTableProps,
      sortKey: { name: "date", type: dynamodb.AttributeType.STRING },
    });

    // GSI for investor's transactions
    transactionsTable.addGlobalSecondaryIndex({
      indexName: "byInvestor",
      partitionKey: { name: "investorId", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "date", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // GSI for transaction type
    transactionsTable.addGlobalSecondaryIndex({
      indexName: "byType",
      partitionKey: { name: "type", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "date", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Documents Table
    const documentsTable = new dynamodb.Table(this, "DocumentsTable", {
      tableName: `prepg3-documents-${props.environmentName}`,
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: props.environmentName === "live",
      removalPolicy,
    });

    // GSI for investor's documents
    documentsTable.addGlobalSecondaryIndex({
      indexName: "byInvestor",
      partitionKey: { name: "investorId", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "uploadDate", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // GSI for property's documents
    documentsTable.addGlobalSecondaryIndex({
      indexName: "byProperty",
      partitionKey: { name: "propertyId", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "uploadDate", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Notifications Table
    const notificationsTable = new dynamodb.Table(this, "NotificationsTable", {
      tableName: `prepg3-notifications-${props.environmentName}`,
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: false,
      removalPolicy,
      timeToLiveAttribute: "ttl", // Auto-delete old notifications
    });

    // GSI for investor's notifications
    notificationsTable.addGlobalSecondaryIndex({
      indexName: "byInvestor",
      partitionKey: { name: "investorId", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "createdAt", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Developments Table (property updates)
    const developmentsTable = new dynamodb.Table(this, "DevelopmentsTable", {
      tableName: `prepg3-developments-${props.environmentName}`,
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
      ...commonTableProps,
    });

    // GSI for property's developments
    developmentsTable.addGlobalSecondaryIndex({
      indexName: "byProperty",
      partitionKey: { name: "propertyId", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "updateDate", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // infrastructure/lib/stacks/database-stack.ts

    // Table 1: Email Subscriptions (Visitors)
    const emailSubscriptionsTable = new dynamodb.Table(
      this,
      "EmailSubscriptionsTable",
      {
        tableName: `prepg3-email-subscriptions-${props.environmentName}`,
        partitionKey: { name: "email", type: dynamodb.AttributeType.STRING },
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
        pointInTimeRecovery: true,
        removalPolicy,
        encryption: dynamodb.TableEncryption.AWS_MANAGED,
      },
    );

    // GSI: Query by conversion status
    emailSubscriptionsTable.addGlobalSecondaryIndex({
      indexName: "byConversionStatus",
      partitionKey: {
        name: "convertedToInvestor",
        type: dynamodb.AttributeType.STRING, // "true" or "false"
      },
      sortKey: {
        name: "subscribedAt",
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // GSI: Query by source
    emailSubscriptionsTable.addGlobalSecondaryIndex({
      indexName: "bySource",
      partitionKey: {
        name: "source",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: "subscribedAt",
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // GSI: Query by UTM campaign (marketing analytics)
    emailSubscriptionsTable.addGlobalSecondaryIndex({
      indexName: "byUTMCampaign",
      partitionKey: {
        name: "utmCampaign",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: "subscribedAt",
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    this.tables = {
      investors: investorsTable,
      properties: propertiesTable,
      investments: investmentsTable,
      transactions: transactionsTable,
      documents: documentsTable,
      notifications: notificationsTable,
      developments: developmentsTable,
      emailSubscriptions: emailSubscriptionsTable,
    };

    // Outputs
    Object.entries(this.tables).forEach(([name, table]) => {
      new cdk.CfnOutput(this, `${name}TableName`, {
        value: table.tableName,
        exportName: `PREPG3-${props.environmentName}-${name}Table`,
      });

      new cdk.CfnOutput(this, `${name}TableArn`, {
        value: table.tableArn,
        exportName: `PREPG3-${props.environmentName}-${name}TableArn`,
      });
    });
  }
}
