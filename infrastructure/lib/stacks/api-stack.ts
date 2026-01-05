import * as cdk from "aws-cdk-lib";
import * as appsync from "aws-cdk-lib/aws-appsync";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as logs from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";
import * as path from "path";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as nodejs from "aws-cdk-lib/aws-lambda-nodejs";

interface ApiStackProps extends cdk.StackProps {
  userPool: cognito.UserPool;
  tables: {
    investors: dynamodb.Table;
    properties: dynamodb.Table;
    investments: dynamodb.Table;
    transactions: dynamodb.Table;
    documents: dynamodb.Table;
    notifications: dynamodb.Table;
    developments: dynamodb.Table;
  };
  environmentName: string;
}

export class ApiStack extends cdk.Stack {
  public readonly api: appsync.GraphqlApi;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    // GraphQL API
    this.api = new appsync.GraphqlApi(this, "API", {
      name: `prepg3-api-${props.environmentName}`,
      schema: appsync.SchemaFile.fromAsset(
        path.join(__dirname, "../../graphql/schema.graphql")
      ),
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: appsync.AuthorizationType.USER_POOL,
          userPoolConfig: {
            userPool: props.userPool,
            defaultAction: appsync.UserPoolDefaultAction.ALLOW,
          },
        },
        additionalAuthorizationModes: [
          {
            authorizationType: appsync.AuthorizationType.IAM,
          },
        ],
      },
      xrayEnabled: true,
      logConfig: {
        fieldLogLevel: appsync.FieldLogLevel.ALL,
        excludeVerboseContent: false,
        retention:
          props.environmentName === "live"
            ? logs.RetentionDays.ONE_MONTH
            : logs.RetentionDays.ONE_WEEK,
      },
    });

    // Create data sources for each table
    const investorsDataSource = this.api.addDynamoDbDataSource(
      "InvestorsDataSource",
      props.tables.investors
    );

    const propertiesDataSource = this.api.addDynamoDbDataSource(
      "PropertiesDataSource",
      props.tables.properties
    );

    const investmentsDataSource = this.api.addDynamoDbDataSource(
      "InvestmentsDataSource",
      props.tables.investments
    );

    const transactionsDataSource = this.api.addDynamoDbDataSource(
      "TransactionsDataSource",
      props.tables.transactions
    );

    const documentsDataSource = this.api.addDynamoDbDataSource(
      "DocumentsDataSource",
      props.tables.documents
    );

    const notificationsDataSource = this.api.addDynamoDbDataSource(
      "NotificationsDataSource",
      props.tables.notifications
    );

    const developmentsDataSource = this.api.addDynamoDbDataSource(
      "DevelopmentsDataSource",
      props.tables.developments
    );

    // Basic CRUD resolvers for Investors
    investorsDataSource.createResolver("GetInvestorResolver", {
      typeName: "Query",
      fieldName: "getInvestor",
      requestMappingTemplate: appsync.MappingTemplate.dynamoDbGetItem(
        "id",
        "id"
      ),
      responseMappingTemplate: appsync.MappingTemplate.dynamoDbResultItem(),
    });

    investorsDataSource.createResolver("ListInvestorsResolver", {
      typeName: "Query",
      fieldName: "listInvestors",
      requestMappingTemplate: appsync.MappingTemplate.dynamoDbScanTable(),
      responseMappingTemplate: appsync.MappingTemplate.dynamoDbResultList(),
    });

    // Basic CRUD resolvers for Properties
    propertiesDataSource.createResolver("GetPropertyResolver", {
      typeName: "Query",
      fieldName: "getProperty",
      requestMappingTemplate: appsync.MappingTemplate.dynamoDbGetItem(
        "id",
        "id"
      ),
      responseMappingTemplate: appsync.MappingTemplate.dynamoDbResultItem(),
    });

    propertiesDataSource.createResolver("ListPropertiesResolver", {
      typeName: "Query",
      fieldName: "listProperties",
      requestMappingTemplate: appsync.MappingTemplate.dynamoDbScanTable(),
      responseMappingTemplate: appsync.MappingTemplate.dynamoDbResultList(),
    });

    // Investments resolvers (these will be enhanced by Lambda)
    investmentsDataSource.createResolver("GetInvestmentResolver", {
      typeName: "Query",
      fieldName: "getInvestment",
      requestMappingTemplate: appsync.MappingTemplate.dynamoDbGetItem(
        "id",
        "id"
      ),
      responseMappingTemplate: appsync.MappingTemplate.dynamoDbResultItem(),
    });

    investmentsDataSource.createResolver("ListInvestmentsByInvestorResolver", {
      typeName: "Query",
      fieldName: "listInvestmentsByInvestor",
      requestMappingTemplate: appsync.MappingTemplate.fromString(`
        {
          "version": "2017-02-28",
          "operation": "Query",
          "index": "byInvestor",
          "query": {
            "expression": "investorId = :investorId",
            "expressionValues": {
              ":investorId": $util.dynamodb.toDynamoDBJson($ctx.args.investorId)
            }
          },
          "limit": $util.defaultIfNull($ctx.args.limit, 20),
          "nextToken": $util.toJson($util.defaultIfNullOrBlank($ctx.args.nextToken, null))
        }
      `),
      responseMappingTemplate: appsync.MappingTemplate.dynamoDbResultList(),
    });

    investmentsDataSource.createResolver("ListInvestmentsByPropertyResolver", {
      typeName: "Query",
      fieldName: "listInvestmentsByProperty",
      requestMappingTemplate: appsync.MappingTemplate.fromString(`
        {
          "version": "2017-02-28",
          "operation": "Query",
          "index": "byProperty",
          "query": {
            "expression": "propertyId = :propertyId",
            "expressionValues": {
              ":propertyId": $util.dynamodb.toDynamoDBJson($ctx.args.propertyId)
            }
          },
          "limit": $util.defaultIfNull($ctx.args.limit, 20),
          "nextToken": $util.toJson($util.defaultIfNullOrBlank($ctx.args.nextToken, null))
        }
      `),
      responseMappingTemplate: appsync.MappingTemplate.dynamoDbResultList(),
    });

    // Transactions resolvers
    transactionsDataSource.createResolver(
      "ListTransactionsByInvestorResolver",
      {
        typeName: "Query",
        fieldName: "listTransactionsByInvestor",
        requestMappingTemplate: appsync.MappingTemplate.fromString(`
        {
          "version": "2017-02-28",
          "operation": "Query",
          "index": "byInvestor",
          "query": {
            "expression": "investorId = :investorId",
            "expressionValues": {
              ":investorId": $util.dynamodb.toDynamoDBJson($ctx.args.investorId)
            }
          },
          "scanIndexForward": false,
          "limit": $util.defaultIfNull($ctx.args.limit, 50),
          "nextToken": $util.toJson($util.defaultIfNullOrBlank($ctx.args.nextToken, null))
        }
      `),
        responseMappingTemplate: appsync.MappingTemplate.dynamoDbResultList(),
      }
    );

    // Documents resolvers
    documentsDataSource.createResolver("ListDocumentsByInvestorResolver", {
      typeName: "Query",
      fieldName: "listDocumentsByInvestor",
      requestMappingTemplate: appsync.MappingTemplate.fromString(`
        {
          "version": "2017-02-28",
          "operation": "Query",
          "index": "byInvestor",
          "query": {
            "expression": "investorId = :investorId",
            "expressionValues": {
              ":investorId": $util.dynamodb.toDynamoDBJson($ctx.args.investorId)
            }
          },
          "scanIndexForward": false,
          "limit": $util.defaultIfNull($ctx.args.limit, 50),
          "nextToken": $util.toJson($util.defaultIfNullOrBlank($ctx.args.nextToken, null))
        }
      `),
      responseMappingTemplate: appsync.MappingTemplate.dynamoDbResultList(),
    });

    documentsDataSource.createResolver("ListDocumentsByPropertyResolver", {
      typeName: "Query",
      fieldName: "listDocumentsByProperty",
      requestMappingTemplate: appsync.MappingTemplate.fromString(`
        {
          "version": "2017-02-28",
          "operation": "Query",
          "index": "byProperty",
          "query": {
            "expression": "propertyId = :propertyId",
            "expressionValues": {
              ":propertyId": $util.dynamodb.toDynamoDBJson($ctx.args.propertyId)
            }
          },
          "scanIndexForward": false,
          "limit": $util.defaultIfNull($ctx.args.limit, 50),
          "nextToken": $util.toJson($util.defaultIfNullOrBlank($ctx.args.nextToken, null))
        }
      `),
      responseMappingTemplate: appsync.MappingTemplate.dynamoDbResultList(),
    });

    // Notifications resolvers
    notificationsDataSource.createResolver(
      "ListNotificationsByInvestorResolver",
      {
        typeName: "Query",
        fieldName: "listNotificationsByInvestor",
        requestMappingTemplate: appsync.MappingTemplate.fromString(`
        {
          "version": "2017-02-28",
          "operation": "Query",
          "index": "byInvestor",
          "query": {
            "expression": "investorId = :investorId",
            "expressionValues": {
              ":investorId": $util.dynamodb.toDynamoDBJson($ctx.args.investorId)
            }
          },
          "scanIndexForward": false,
          "limit": $util.defaultIfNull($ctx.args.limit, 20),
          "nextToken": $util.toJson($util.defaultIfNullOrBlank($ctx.args.nextToken, null))
        }
      `),
        responseMappingTemplate: appsync.MappingTemplate.dynamoDbResultList(),
      }
    );

    notificationsDataSource.createResolver("MarkNotificationReadResolver", {
      typeName: "Mutation",
      fieldName: "markNotificationRead",
      requestMappingTemplate: appsync.MappingTemplate.fromString(`
        {
          "version": "2017-02-28",
          "operation": "UpdateItem",
          "key": {
            "id": $util.dynamodb.toDynamoDBJson($ctx.args.id)
          },
          "update": {
            "expression": "SET isRead = :isRead, updatedAt = :updatedAt",
            "expressionValues": {
              ":isRead": $util.dynamodb.toDynamoDBJson(true),
              ":updatedAt": $util.dynamodb.toDynamoDBJson($util.time.nowISO8601())
            }
          }
        }
      `),
      responseMappingTemplate: appsync.MappingTemplate.dynamoDbResultItem(),
    });

    // Outputs
    new cdk.CfnOutput(this, "GraphQLApiUrl", {
      value: this.api.graphqlUrl,
      exportName: `PREPG3-${props.environmentName}-GraphQLApiUrl`,
      description: "GraphQL API URL",
    });

    new cdk.CfnOutput(this, "GraphQLApiId", {
      value: this.api.apiId,
      exportName: `PREPG3-${props.environmentName}-GraphQLApiId`,
      description: "GraphQL API ID",
    });

    new cdk.CfnOutput(this, "GraphQLApiArn", {
      value: this.api.arn,
      exportName: `PREPG3-${props.environmentName}-GraphQLApiArn`,
      description: "GraphQL API ARN",
    });
  }
}
