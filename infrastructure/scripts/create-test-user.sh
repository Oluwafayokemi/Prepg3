#!/bin/bash
# scripts/create-test-user.sh

set -e

USER_POOL_ID="eu-north-1_T4gMUV4KC"
REGION="eu-north-1"

echo "🔧 Creating test users in Cognito..."
echo "Region: $REGION"
echo "User Pool: $USER_POOL_ID"
echo ""

# Function to create user
create_user() {
  local EMAIL=$1
  local PASSWORD=$2
  local GROUP=$3
  local GIVEN_NAME=$4  # ✅ Added parameter
  local FAMILY_NAME=$5  # ✅ Added parameter

  echo "Creating user: $EMAIL"

  # Create user
  aws cognito-idp admin-create-user \
    --user-pool-id $USER_POOL_ID \
    --username $EMAIL \
    --user-attributes \
      Name=email,Value=$EMAIL \
      Name=email_verified,Value=true \
      Name=given_name,Value="$GIVEN_NAME" \
      Name=family_name,Value="$FAMILY_NAME" \
    --message-action SUPPRESS \
    --region $REGION 2>/dev/null || echo "  ℹ️  User may already exist"

  # Set password
  aws cognito-idp admin-set-user-password \
    --user-pool-id $USER_POOL_ID \
    --username $EMAIL \
    --password "$PASSWORD" \
    --permanent \
    --region $REGION

  # Add to group
  aws cognito-idp admin-add-user-to-group \
    --user-pool-id $USER_POOL_ID \
    --username $EMAIL \
    --group-name $GROUP \
    --region $REGION 2>/dev/null || echo "  ℹ️  User may already be in group"

  echo "  ✅ User ready: $EMAIL"
  echo ""
}

# Check if groups exist
echo "Checking groups..."
GROUPS=$(aws cognito-idp list-groups \
  --user-pool-id "$USER_POOL_ID" \
  --region "$REGION" \
  --query 'Groups[*].GroupName' \
  --output text)

if [ -z "$GROUPS" ]; then
  echo "❌ No groups found! Creating groups..."
  
  aws cognito-idp create-group \
    --group-name Investor \
    --user-pool-id $USER_POOL_ID \
    --description "Investor users" \
    --region $REGION
  
  aws cognito-idp create-group \
    --group-name Admin \
    --user-pool-id $USER_POOL_ID \
    --description "Admin users" \
    --region $REGION
  
  echo "✅ Groups created: Investor, Admin"
else
  echo "✅ Groups found: $GROUPS"
fi

echo ""

# Create investor users
create_user "investor@prepg3.co.uk" "InvestorPass123!" "Investor" "Test" "Investor"
create_user "john.smith@prepg3.co.uk" "Investor123!" "Investor" "John" "Smith"
create_user "sarah.jones@prepg3.co.uk" "Investor123!" "Investor" "Sarah" "Jones"
create_user "michael.brown@prepg3.co.uk" "Investor123!" "Investor" "Michael" "Brown"

# Create admin user
create_user "admin@prepg3.co.uk" "AdminPass123!" "Admin" "Admin" "User"

echo ""
echo "✅ All test users created!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 LOGIN CREDENTIALS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🔹 Investor Portal (http://localhost:3001/login)"
echo "   investor@prepg3.co.uk / InvestorPass123!"
echo "   john.smith@prepg3.co.uk / Investor123!"
echo "   sarah.jones@prepg3.co.uk / Investor123!"
echo "   michael.brown@prepg3.co.uk / Investor123!"
echo ""
echo "🔹 Admin Panel (http://localhost:3002/login)"
echo "   admin@prepg3.co.uk / AdminPass123!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"