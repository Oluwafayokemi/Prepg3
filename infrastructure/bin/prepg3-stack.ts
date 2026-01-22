#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { AuthStack } from "../lib/stacks/auth-stack";
import { DatabaseStack } from "../lib/stacks/database-stack";
import { ApiStack } from "../lib/stacks/api-stack";
import { StorageStack } from "../lib/stacks/storage-stack";
import { LambdasStack } from "../lib/stacks/lambdas-stack";
import { DnsStack } from "../lib/stacks/dns-stack";
import { MonitoringStack } from "../lib/stacks/monitoring-stack";
import { getEnvironmentConfig } from "../lib/config/environments";
import { IConstruct } from "constructs";

const app = new cdk.App();

// Get environment from context (default: live)
const environmentName = app.node.tryGetContext("environment") || "live";
const config = getEnvironmentConfig(environmentName);

// Try multiple sources for account and region
const account = 
  process.env.CDK_DEFAULT_ACCOUNT || 
  process.env.AWS_ACCOUNT_ID || 
  process.env.AWS_ACCOUNT ||
  '442809139673'; // Your account as fallback

const region = 
  process.env.CDK_DEFAULT_REGION || 
  process.env.AWS_REGION || 
  process.env.AWS_DEFAULT_REGION ||
  config.region ||
  'eu-north-1';

console.log('CDK Configuration:');
console.log('  Environment:', environmentName);
console.log('  Account:', account);
console.log('  Region:', region);

if (!account) {
  console.error('Error: Unable to determine AWS account!');
  console.error('Please set CDK_DEFAULT_ACCOUNT environment variable');
  console.error('Run: export CDK_DEFAULT_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)');
  process.exit(1);
}

const env = { account, region };

// Stack naming
const prefix = `PREPG3-${config.environment}`;

// Tags for all resources
const tags = {
  Project: "PREPG3",
  Environment: config.environment,
  ManagedBy: "CDK",
};

// 1. Authentication Stack
const authStack = new AuthStack(app, `${prefix}-Auth`, {
  env,
  environmentName: config.environment,
});
Object.entries(tags).forEach(([key, value]) => {
  cdk.Tags.of(authStack).add(key, value);
});

// 2. Database Stack
const databaseStack = new DatabaseStack(app, `${prefix}-Database`, {
  env,
  environmentName: config.environment,
});
Object.entries(tags).forEach(([key, value]) => {
  cdk.Tags.of(databaseStack).add(key, value);
});

// 3. Storage Stack
const storageStack = new StorageStack(app, `${prefix}-Storage`, {
  env,
  environmentName: config.environment,
});
Object.entries(tags).forEach(([key, value]) => {
  cdk.Tags.of(storageStack).add(key, value);
});

// 4. API Stack
const apiStack = new ApiStack(app, `${prefix}-API`, {
  env,
  userPool: authStack.userPool,
  tables: databaseStack.tables,
  environmentName: config.environment,
});
Object.entries(tags).forEach(([key, value]) => {
  cdk.Tags.of(apiStack).add(key, value);
});

// 5. Lambdas Stack
const lambdasStack = new LambdasStack(app, `${prefix}-Lambdas`, {
  env,
  api: apiStack.api,
  tables: databaseStack.tables,
  buckets: storageStack.buckets,
  userPool: authStack.userPool,
  environmentName: config.environment,
});
Object.entries(tags).forEach(([key, value]) => {
  cdk.Tags.of(lambdasStack).add(key, value);
});

// 6. Monitoring Stack
const monitoringStack = new MonitoringStack(app, `${prefix}-Monitoring`, {
  env,
  api: apiStack.api,
  tables: Object.values(databaseStack.tables),
  lambdaFunctions: lambdasStack.functions,
  environmentName: config.environment,
});
Object.entries(tags).forEach(([key, value]) => {
  cdk.Tags.of(monitoringStack).add(key, value);
});

app.synth();