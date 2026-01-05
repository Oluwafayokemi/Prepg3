#!/bin/bash
# scripts/seed-investors-live.sh

set -e

REGION="eu-north-1"
TABLE_NAME="prepg3-investors-live"

echo "🌱 Seeding investors to $TABLE_NAME..."

# John Smith
aws dynamodb put-item \
  --table-name $TABLE_NAME \
  --item '{
    "id": {"S": "john.smith@prepg3.co.uk"},
    "email": {"S": "john.smith@prepg3.co.uk"},
    "firstName": {"S": "John"},
    "lastName": {"S": "Smith"},
    "phone": {"S": "+44 20 7946 0958"},
    "totalInvested": {"N": "250000"},
    "portfolioValue": {"N": "275000"},
    "totalROI": {"N": "10.5"},
    "status": {"S": "ACTIVE"},
    "investorType": {"S": "INDIVIDUAL"},
    "riskProfile": {"S": "MODERATE"},
    "createdAt": {"S": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'"},
    "updatedAt": {"S": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'"}
  }' \
  --region $REGION

echo "✅ Created: john.smith@prepg3.co.uk"

# Sarah Jones
aws dynamodb put-item \
  --table-name $TABLE_NAME \
  --item '{
    "id": {"S": "sarah.jones@prepg3.co.uk"},
    "email": {"S": "sarah.jones@prepg3.co.uk"},
    "firstName": {"S": "Sarah"},
    "lastName": {"S": "Jones"},
    "phone": {"S": "+44 20 7946 0959"},
    "totalInvested": {"N": "150000"},
    "portfolioValue": {"N": "165000"},
    "totalROI": {"N": "10.0"},
    "status": {"S": "ACTIVE"},
    "investorType": {"S": "INDIVIDUAL"},
    "riskProfile": {"S": "CONSERVATIVE"},
    "createdAt": {"S": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'"},
    "updatedAt": {"S": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'"}
  }' \
  --region $REGION

echo "✅ Created: sarah.jones@prepg3.co.uk"

# Michael Brown
aws dynamodb put-item \
  --table-name $TABLE_NAME \
  --item '{
    "id": {"S": "michael.brown@prepg3.co.uk"},
    "email": {"S": "michael.brown@prepg3.co.uk"},
    "firstName": {"S": "Michael"},
    "lastName": {"S": "Brown"},
    "phone": {"S": "+44 20 7946 0960"},
    "totalInvested": {"N": "500000"},
    "portfolioValue": {"N": "550000"},
    "totalROI": {"N": "10.0"},
    "status": {"S": "ACTIVE"},
    "investorType": {"S": "CORPORATE"},
    "riskProfile": {"S": "AGGRESSIVE"},
    "createdAt": {"S": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'"},
    "updatedAt": {"S": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'"}
  }' \
  --region $REGION

echo "✅ Created: michael.brown@prepg3.co.uk"

echo ""
echo "✅ All investors seeded successfully!"