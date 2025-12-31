#!/bin/bash
# scripts/create-test-user.sh

set -e

USER_POOL_ID="eu-north-1_SXM79SBSG"
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

  echo "Creating user: $EMAIL"

  # Create user
  aws cognito-idp admin-create-user \
    --user-pool-id "$USER_POOL_ID" \
    --username "$EMAIL" \
    --user-attributes \
      Name=email,Value="$EMAIL" \
      Name=email_verified,Value=true \
    --temporary-password "TempPass123!" \
    --message-action SUPPRESS \
    --region "$REGION" 2>/dev/null || echo "User might already exist"

  # Set permanent password
  aws cognito-idp admin-set-user-password \
    --user-pool-id "$USER_POOL_ID" \
    --username "$EMAIL" \
    --password "$PASSWORD" \
    --permanent \
    --region "$REGION"

  # Add to group
  aws cognito-idp admin-add-user-to-group \
    --user-pool-id "$USER_POOL_ID" \
    --username "$EMAIL" \
    --group-name "$GROUP" \
    --region "$REGION" 2>/dev/null || echo "User might already be in group"

  echo "✅ User ready: $EMAIL"
  echo ""
}

# Check if groups exist
echo "Checking groups..."
aws cognito-idp list-groups \
  --user-pool-id "$USER_POOL_ID" \
  --region "$REGION" \
  --query 'Groups[*].GroupName' \
  --output text

echo ""

# Create investor user
create_user "investor@prepg3.co.uk" "InvestorPass123!" "Investor"

# Create admin user
create_user "admin@prepg3.co.uk" "AdminPass123!" "Admin"

echo ""
echo "✅ All test users created!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 LOGIN CREDENTIALS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🔹 Investor Portal (http://localhost:3001/login)"
echo "   Email: investor@prepg3.co.uk"
echo "   Password: InvestorPass123!"
echo ""
echo "🔹 Admin Panel (http://localhost:3002/login)"
echo "   Email: admin@prepg3.co.uk"
echo "   Password: AdminPass123!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"