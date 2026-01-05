#!/bin/bash

set -e

echo "🚀 PREPG3 Platform Deployment"
echo "=============================="

ENVIRONMENT=${1:-dev}
echo "Environment: $ENVIRONMENT"

# Install dependencies
echo "📦 Installing dependencies..."
npm install
cd ..

# Build Lambda functions (single directory)
echo "🔨 Building Lambda functions..."
cd lambda
npm install
npm run build
cd ..

# Deploy infrastructure
echo "☁️  Deploying infrastructure..."
cd infrastructure
cdk deploy --all \
  --context environment=$ENVIRONMENT \
  --require-approval never \
  --progress events
cd ..

echo "✅ Deployment complete!"