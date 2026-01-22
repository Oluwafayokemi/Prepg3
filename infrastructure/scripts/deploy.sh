#!/bin/bash

set -e

echo "🚀 PREPG3 Platform Deployment"
echo "=============================="

ENVIRONMENT=${1:-dev}
STACK=${2:-all}

echo "Environment: $ENVIRONMENT"
echo "Stack: $STACK"
echo ""

# Set AWS environment variables
echo "📡 Configuring AWS environment..."
export CDK_DEFAULT_ACCOUNT=$(aws sts get-caller-identity --query Account --output text 2>/dev/null)
export CDK_DEFAULT_REGION=${AWS_REGION:-eu-west-2}

if [ -z "$CDK_DEFAULT_ACCOUNT" ]; then
  echo "❌ Unable to get AWS account. Is AWS CLI configured?"
  exit 1
fi

echo "   Account: $CDK_DEFAULT_ACCOUNT"
echo "   Region: $CDK_DEFAULT_REGION"
echo ""

# Install dependencies
echo "📦 Installing infrastructure dependencies..."
cd infrastructure
npm install
cd ..

# Build Lambda functions
echo "🔨 Building Lambda functions..."
if [ -d "lambda" ]; then
  cd lambda
  npm install
  npm run build
  cd ..
fi

# Deploy infrastructure
echo "☁️  Deploying infrastructure with CDK..."
cd infrastructure

# Build TypeScript
npm run build

# Bootstrap if needed
echo "🎯 Checking CDK bootstrap..."
if ! aws cloudformation describe-stacks --stack-name CDKToolkit --region $CDK_DEFAULT_REGION &> /dev/null; then
  echo "   Bootstrapping CDK..."
  npx cdk bootstrap aws://$CDK_DEFAULT_ACCOUNT/$CDK_DEFAULT_REGION
fi

# Deploy based on stack argument
if [ "$STACK" = "all" ]; then
  npx cdk deploy --all \
    --context environment=$ENVIRONMENT \
    --require-approval never \
    --progress events
else
  npx cdk deploy PREPG3-$ENVIRONMENT-$STACK \
    --context environment=$ENVIRONMENT \
    --require-approval never \
    --progress events
fi

cd ..

echo ""
echo "✅ Deployment complete!"