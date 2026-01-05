// infrastructure/bin/prepg3.ts
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

// Get environment from context (default: dev)
const environmentName = app.node.tryGetContext("environment") || "live";
const config = getEnvironmentConfig(environmentName);

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: config.region,
};

// Stack naming
const prefix = `PREPG3-${config.environment}`;

// Tags for all resources
const tags = {
  Project: "PREPG3",
  Environment: config.environment,
  ManagedBy: "CDK",
};

// 1. DNS Stack (only in production)
// let dnsStack: IConstruct;
// if (config.environment === "live") {
//   dnsStack = new DnsStack(app, `${prefix}-DNS`, {
//     env,
//     domainName: "prepg3.co.uk",
//   });
//   Object.entries(tags).forEach(([key, value]) => {
//     cdk.Tags.of(dnsStack).add(key, value);
//   });
// }

// 2. Authentication Stack
const authStack = new AuthStack(app, `${prefix}-Auth`, {
  env,
  environmentName: config.environment,
});
Object.entries(tags).forEach(([key, value]) => {
  cdk.Tags.of(authStack).add(key, value);
});

// 3. Database Stack
const databaseStack = new DatabaseStack(app, `${prefix}-Database`, {
  env,
  environmentName: config.environment,
});
Object.entries(tags).forEach(([key, value]) => {
  cdk.Tags.of(databaseStack).add(key, value);
});

// 4. Storage Stack
const storageStack = new StorageStack(app, `${prefix}-Storage`, {
  env,
  environmentName: config.environment,
});
Object.entries(tags).forEach(([key, value]) => {
  cdk.Tags.of(storageStack).add(key, value);
});

// 5. API Stack
const apiStack = new ApiStack(app, `${prefix}-API`, {
  env,
  userPool: authStack.userPool,
  tables: databaseStack.tables,
  environmentName: config.environment,
});
Object.entries(tags).forEach(([key, value]) => {
  cdk.Tags.of(apiStack).add(key, value);
});

// 6. Lambdas Stack
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

// 7. Monitoring Stack
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
