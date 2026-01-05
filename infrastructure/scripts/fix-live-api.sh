#!/bin/bash
set -e

echo "🧹 Complete cleanup..."

# Get API ID
API_ID=$(aws appsync list-graphql-apis \
  --region eu-north-1 \
  --query 'graphqlApis[?contains(name, `prepg3-api-live`)].apiId' \
  --output text)

echo "API ID: $API_ID"

# List all resolvers to see what's there
echo "Current resolvers:"
aws appsync list-resolvers \
  --api-id $API_ID \
  --type-name Query \
  --region eu-north-1 \
  --query 'resolvers[*].fieldName'

# Delete the resolver
echo "Deleting resolver..."
aws appsync delete-resolver \
  --api-id $API_ID \
  --type-name Query \
  --field-name getInvestorDashboard \
  --region eu-north-1

echo "✅ Resolver deleted"

# Delete data source
echo "Deleting data source..."
aws appsync delete-data-source \
  --api-id $API_ID \
  --name DashboardDataSource \
  --region eu-north-1 2>/dev/null || echo "Data source doesn't exist"

# Delete Lambda
echo "Deleting Lambda..."
aws lambda delete-function \
  --function-name prepg3-get-dashboard-live \
  --region eu-north-1 2>/dev/null || echo "Lambda doesn't exist"

# Delete log group
echo "Deleting log group..."
aws logs delete-log-group \
  --log-group-name /aws/lambda/prepg3-get-dashboard-live \
  --region eu-north-1 2>/dev/null || echo "Log group doesn't exist"

echo "✅ All resources deleted"
echo ""
echo "Waiting 60 seconds for AWS to propagate..."
sleep 60

echo ""
echo "🚀 Deploying..."
cd /Users/hunjaf01/code/Prepg3/infrastructure
npm run build
cdk deploy PREPG3-live-API --context environment=live --region eu-north-1