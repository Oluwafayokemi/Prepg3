#!/bin/bash
# scripts/create-super-admin.sh
# Creates the initial SuperAdmin user

set -e

echo "🔐 PREPG3 SuperAdmin Setup"
echo "=========================="
echo ""

# Get environment
read -p "Environment (dev/staging/live): " ENV
echo ""

# Get user pool ID
echo "📋 Getting User Pool ID..."
USER_POOL_ID=$(aws cloudformation describe-stacks \
  --stack-name PREPG3-${ENV}-Auth \
  --query "Stacks[0].Outputs[?OutputKey=='UserPoolId'].OutputValue" \
  --output text)

if [ -z "$USER_POOL_ID" ]; then
  echo "❌ Error: Could not find User Pool ID. Is the stack deployed?"
  exit 1
fi

echo "✅ User Pool ID: $USER_POOL_ID"
echo ""

# Get admin email
read -p "Admin Email Address: " ADMIN_EMAIL
echo ""

# Get admin details
read -p "First Name: " FIRST_NAME
read -p "Last Name: " LAST_NAME
echo ""

# Get password
read -s -p "Temporary Password (min 8 chars, must have uppercase, lowercase, number, symbol): " PASSWORD
echo ""
read -s -p "Confirm Password: " PASSWORD_CONFIRM
echo ""

if [ "$PASSWORD" != "$PASSWORD_CONFIRM" ]; then
  echo "❌ Passwords don't match!"
  exit 1
fi

echo ""
echo "📝 Creating SuperAdmin user..."
echo "Email: $ADMIN_EMAIL"
echo "Name: $FIRST_NAME $LAST_NAME"
echo ""

# Create user
aws cognito-idp admin-create-user \
  --user-pool-id "$USER_POOL_ID" \
  --username "$ADMIN_EMAIL" \
  --user-attributes \
    Name=email,Value="$ADMIN_EMAIL" \
    Name=email_verified,Value=true \
    Name=given_name,Value="$FIRST_NAME" \
    Name=family_name,Value="$LAST_NAME" \
  --message-action SUPPRESS

echo "✅ User created"

# Set permanent password
aws cognito-idp admin-set-user-password \
  --user-pool-id "$USER_POOL_ID" \
  --username "$ADMIN_EMAIL" \
  --password "$PASSWORD" \
  --permanent

echo "✅ Password set"

# Add to SuperAdmin group
aws cognito-idp admin-add-user-to-group \
  --user-pool-id "$USER_POOL_ID" \
  --username "$ADMIN_EMAIL" \
  --group-name SuperAdmin

echo "✅ Added to SuperAdmin group"
echo ""
echo "🎉 SuperAdmin created successfully!"
echo ""
echo "You can now login with:"
echo "  Email: $ADMIN_EMAIL"
echo "  Password: [the password you set]"
echo ""
echo "⚠️  IMPORTANT: Change your password on first login!"
echo ""