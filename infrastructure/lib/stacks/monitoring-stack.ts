import * as cdk from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cloudwatch_actions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as sns_subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as appsync from 'aws-cdk-lib/aws-appsync';
import { Construct } from 'constructs';

interface MonitoringStackProps extends cdk.StackProps {
  api: appsync.GraphqlApi;
  tables: dynamodb.Table[];
  lambdaFunctions: { [key: string]: lambda.Function };
  environmentName: string;
}

export class MonitoringStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: MonitoringStackProps) {
    super(scope, id, props);

    // SNS Topic for alarms
    const alarmTopic = new sns.Topic(this, 'AlarmTopic', {
      displayName: `PREPG3 ${props.environmentName} Alarms`,
      topicName: `prepg3-alarms-${props.environmentName}`,
    });

    // Subscribe email to alarms (only in production)
    if (props.environmentName === 'live') {
      alarmTopic.addSubscription(
        new sns_subscriptions.EmailSubscription('alerts@prepg3.co.uk')
      );
    }

    // Dashboard
    const dashboard = new cloudwatch.Dashboard(this, 'Dashboard', {
      dashboardName: `PREPG3-${props.environmentName}`,
    });

    // ===========================================
    // API METRICS
    // ===========================================

    const apiRequestsMetric = new cloudwatch.Metric({
      namespace: 'AWS/AppSync',
      metricName: '4XXError',
      dimensionsMap: {
        GraphQLAPIId: props.api.apiId,
      },
      statistic: 'Sum',
      period: cdk.Duration.minutes(5),
    });

    const api5xxMetric = new cloudwatch.Metric({
      namespace: 'AWS/AppSync',
      metricName: '5XXError',
      dimensionsMap: {
        GraphQLAPIId: props.api.apiId,
      },
      statistic: 'Sum',
      period: cdk.Duration.minutes(5),
    });

    const apiLatencyMetric = new cloudwatch.Metric({
      namespace: 'AWS/AppSync',
      metricName: 'Latency',
      dimensionsMap: {
        GraphQLAPIId: props.api.apiId,
      },
      statistic: 'Average',
      period: cdk.Duration.minutes(5),
    });

    // API Alarms
    const api5xxAlarm = new cloudwatch.Alarm(this, 'Api5xxAlarm', {
      metric: api5xxMetric,
      threshold: 10,
      evaluationPeriods: 2,
      alarmDescription: 'Alert when API has too many 5xx errors',
      alarmName: `PREPG3-${props.environmentName}-API-5xx`,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    api5xxAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(alarmTopic));

    // Add API metrics to dashboard
    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'API Requests',
        left: [apiRequestsMetric],
        width: 12,
      }),
      new cloudwatch.GraphWidget({
        title: 'API Latency',
        left: [apiLatencyMetric],
        width: 12,
      })
    );

    // ===========================================
    // LAMBDA METRICS
    // ===========================================

    const lambdaWidgets: cloudwatch.IWidget[] = [];

    Object.entries(props.lambdaFunctions).forEach(([name, func]) => {
      const errorMetric = func.metricErrors({
        period: cdk.Duration.minutes(5),
      });

      const durationMetric = func.metricDuration({
        period: cdk.Duration.minutes(5),
      });

      const invocationMetric = func.metricInvocations({
        period: cdk.Duration.minutes(5),
      });

      // Alarm for Lambda errors
      const errorAlarm = new cloudwatch.Alarm(this, `${name}ErrorAlarm`, {
        metric: errorMetric,
        threshold: 5,
        evaluationPeriods: 2,
        alarmDescription: `Alert when ${name} has too many errors`,
        alarmName: `PREPG3-${props.environmentName}-${name}-Errors`,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      });

      errorAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(alarmTopic));

      // Add to dashboard
      lambdaWidgets.push(
        new cloudwatch.GraphWidget({
          title: `${name} - Invocations & Errors`,
          left: [invocationMetric],
          right: [errorMetric],
          width: 8,
        })
      );
    });

    // Add Lambda widgets in rows of 3
    for (let i = 0; i < lambdaWidgets.length; i += 3) {
      dashboard.addWidgets(...lambdaWidgets.slice(i, i + 3));
    }

    // ===========================================
    // DYNAMODB METRICS
    // ===========================================

    const tableWidgets: cloudwatch.IWidget[] = [];

    props.tables.forEach((table) => {
      const readCapacityMetric = table.metricConsumedReadCapacityUnits({
        period: cdk.Duration.minutes(5),
      });

      const writeCapacityMetric = table.metricConsumedWriteCapacityUnits({
        period: cdk.Duration.minutes(5),
      });

      tableWidgets.push(
        new cloudwatch.GraphWidget({
          title: `${table.tableName} - Capacity`,
          left: [readCapacityMetric],
          right: [writeCapacityMetric],
          width: 12,
        })
      );
    });

    // Add table widgets
    for (let i = 0; i < tableWidgets.length; i += 2) {
      dashboard.addWidgets(...tableWidgets.slice(i, i + 2));
    }

    // ===========================================
    // CUSTOM BUSINESS METRICS
    // ===========================================

    // You can add custom metrics later for business KPIs
    // e.g., Daily investments, Total portfolio value, etc.

    // Outputs
    new cdk.CfnOutput(this, 'DashboardUrl', {
      value: `https://console.aws.amazon.com/cloudwatch/home?region=${this.region}#dashboards:name=${dashboard.dashboardName}`,
      description: 'CloudWatch Dashboard URL',
    });

    new cdk.CfnOutput(this, 'AlarmTopicArn', {
      value: alarmTopic.topicArn,
      exportName: `PREPG3-${props.environmentName}-AlarmTopicArn`,
      description: 'SNS Topic for Alarms',
    });
  }
}