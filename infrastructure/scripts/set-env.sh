#!/bin/bash

# Get AWS account and region
export CDK_DEFAULT_ACCOUNT=$(aws sts get-caller-identity --query Account --output text 2>/dev/null)
export CDK_DEFAULT_REGION=eu-north-1
export AWS_REGION=eu-north-1
export AWS_SDK_LOAD_CONFIG=1

if [ -z "$CDK_DEFAULT_ACCOUNT" ]; then
  echo "❌ Unable to get AWS account. Is AWS CLI configured?"
  echo "Run: aws configure"
  exit 1
fi

echo "✅ Environment configured:"
echo "   Account: $CDK_DEFAULT_ACCOUNT"
echo "   Region: $CDK_DEFAULT_REGION"

# Execute the command passed as arguments
exec "$@"