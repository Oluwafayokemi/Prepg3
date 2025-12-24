// infrastructure/lib/constructs/api-lambda.ts
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as appsync from 'aws-cdk-lib/aws-appsync';
import { Construct } from 'constructs';
import * as path from 'path';
import { LAMBDA_DEFAULTS, LOG_RETENTION_DAYS, isProduction } from '../config/constants';

export interface ApiLambdaProps {
  functionName: string;
  handler: string;
  environment?: { [key: string]: string };
  api?: appsync.GraphqlApi;
  typeName?: 'Query' | 'Mutation';
  fieldName?: string;
  timeout?: number;
  memorySize?: number;
  environmentName: string;
  initialPolicy?: cdk.aws_iam.PolicyStatement[];
}

export class ApiLambda extends Construct {
  public readonly function: lambda.Function;
  public readonly dataSource?: appsync.LambdaDataSource;
  public readonly logGroup: logs.LogGroup;

  constructor(scope: Construct, id: string, props: ApiLambdaProps) {
    super(scope, id);

    const isProd = isProduction(props.environmentName);

    // Create log group first (fixes deprecation warning)
    this.logGroup = new logs.LogGroup(this, 'LogGroup', {
      logGroupName: `/aws/lambda/prepg3-${props.functionName}-${props.environmentName}`,
      retention: isProd 
        ? logs.RetentionDays.ONE_MONTH 
        : logs.RetentionDays.ONE_WEEK,
      removalPolicy: isProd 
        ? cdk.RemovalPolicy.RETAIN 
        : cdk.RemovalPolicy.DESTROY,
    });

    // Create Lambda function
    this.function = new lambda.Function(this, 'Function', {
      functionName: `prepg3-${props.functionName}-${props.environmentName}`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: props.handler,
      code: lambda.Code.fromAsset(path.join(__dirname, '../../../lambda')),
      timeout: cdk.Duration.seconds(props.timeout || LAMBDA_DEFAULTS.TIMEOUT_SECONDS.MEDIUM),
      memorySize: props.memorySize || LAMBDA_DEFAULTS.MEMORY_MB.MEDIUM,
      environment: {
        NODE_OPTIONS: '--enable-source-maps',
        ENVIRONMENT: props.environmentName,
        ...props.environment,
      },
      logGroup: this.logGroup, // ✅ Use logGroup instead of logRetention
      tracing: lambda.Tracing.ACTIVE,
      description: `${props.functionName} Lambda for PREPG3 ${props.environmentName}`,
      ...(props.initialPolicy && {
        initialPolicy: props.initialPolicy,
      }),
    });

    // Add tags
    cdk.Tags.of(this.function).add('Function', props.functionName);
    cdk.Tags.of(this.function).add('Environment', props.environmentName);

    // Connect to AppSync if provided
    if (props.api && props.typeName && props.fieldName) {
      // ✅ Use unique ID by including fieldName
      const dataSourceId = `${id}DataSource`;
      const resolverId = `${id}${props.typeName}${props.fieldName}Resolver`; // Make it unique!

      this.dataSource = props.api.addLambdaDataSource(
        dataSourceId,
        this.function,
        {
          name: `${props.functionName}DataSource`,
          description: `Data source for ${props.functionName}`,
        }
      );

      this.dataSource.createResolver(resolverId, {
        typeName: props.typeName,
        fieldName: props.fieldName,
        requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(),
        responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
      });
    }

    // Output function ARN
    new cdk.CfnOutput(this, 'FunctionArn', {
      value: this.function.functionArn,
      exportName: `PREPG3-${props.environmentName}-${props.functionName}-Arn`,
      description: `ARN for ${props.functionName} Lambda`,
    });

    // Output function name
    new cdk.CfnOutput(this, 'FunctionName', {
      value: this.function.functionName,
      exportName: `PREPG3-${props.environmentName}-${props.functionName}-Name`,
      description: `Name for ${props.functionName} Lambda`,
    });

    // Output log group name
    new cdk.CfnOutput(this, 'LogGroupName', {
      value: this.logGroup.logGroupName,
      exportName: `PREPG3-${props.environmentName}-${props.functionName}-LogGroup`,
      description: `Log group for ${props.functionName} Lambda`,
    });
  }

  public grantTableAccess(
    table: cdk.aws_dynamodb.Table,
    permissions: 'read' | 'write' | 'readwrite'
  ): void {
    switch (permissions) {
      case 'read':
        table.grantReadData(this.function);
        break;
      case 'write':
        table.grantWriteData(this.function);
        break;
      case 'readwrite':
        table.grantReadWriteData(this.function);
        break;
    }
  }

  public grantBucketAccess(
    bucket: cdk.aws_s3.Bucket,
    permissions: 'read' | 'write' | 'readwrite'
  ): void {
    switch (permissions) {
      case 'read':
        bucket.grantRead(this.function);
        break;
      case 'write':
        bucket.grantWrite(this.function);
        break;
      case 'readwrite':
        bucket.grantReadWrite(this.function);
        break;
    }
  }
}