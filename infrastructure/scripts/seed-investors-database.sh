#!/bin/bash
# scripts/seed-complete-live.sh

set -e

REGION="eu-north-1"
UUID="30dc097c-6081-7055-2259-dbc2e3300986"
EMAIL="john.smith@prepg3.co.uk"
NOW=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

echo "🌱 Seeding complete data for $EMAIL (UUID: $UUID)"
echo "=================================================="

# ============================================
# 1. PROPERTIES
# ============================================
echo ""
echo "1️⃣ Creating properties..."

PROPERTY_1="prop-001-$(uuidgen | tr '[:upper:]' '[:lower:]')"
PROPERTY_2="prop-002-$(uuidgen | tr '[:upper:]' '[:lower:]')"
PROPERTY_3="prop-003-$(uuidgen | tr '[:upper:]' '[:lower:]')"

aws dynamodb put-item \
  --table-name prepg3-properties-live \
  --item '{
    "id": {"S": "'$PROPERTY_1'"},
    "address": {"S": "123 Kings Road, Chelsea"},
    "postcode": {"S": "SW3 4TY"},
    "city": {"S": "London"},
    "propertyType": {"S": "APARTMENT"},
    "status": {"S": "ACTIVE"},
    "purchasePrice": {"N": "500000"},
    "currentValuation": {"N": "550000"},
    "bedrooms": {"N": "2"},
    "bathrooms": {"N": "2"},
    "squareFeet": {"N": "1200"},
    "createdAt": {"S": "'$NOW'"},
    "updatedAt": {"S": "'$NOW'"}
  }' \
  --region $REGION

aws dynamodb put-item \
  --table-name prepg3-properties-live \
  --item '{
    "id": {"S": "'$PROPERTY_2'"},
    "address": {"S": "45 Baker Street, Marylebone"},
    "postcode": {"S": "W1U 7DN"},
    "city": {"S": "London"},
    "propertyType": {"S": "HOUSE"},
    "status": {"S": "ACTIVE"},
    "purchasePrice": {"N": "750000"},
    "currentValuation": {"N": "800000"},
    "bedrooms": {"N": "3"},
    "bathrooms": {"N": "2"},
    "squareFeet": {"N": "1800"},
    "createdAt": {"S": "'$NOW'"},
    "updatedAt": {"S": "'$NOW'"}
  }' \
  --region $REGION

aws dynamodb put-item \
  --table-name prepg3-properties-live \
  --item '{
    "id": {"S": "'$PROPERTY_3'"},
    "address": {"S": "78 Oxford Street, West End"},
    "postcode": {"S": "W1D 1BS"},
    "city": {"S": "London"},
    "propertyType": {"S": "COMMERCIAL"},
    "status": {"S": "DEVELOPMENT"},
    "purchasePrice": {"N": "1000000"},
    "currentValuation": {"N": "1050000"},
    "squareFeet": {"N": "2500"},
    "createdAt": {"S": "'$NOW'"},
    "updatedAt": {"S": "'$NOW'"}
  }' \
  --region $REGION

echo "✅ Created 3 properties"

# ============================================
# 2. INVESTMENTS
# ============================================
echo ""
echo "2️⃣ Creating investments..."

INV_1="inv-001-$(uuidgen | tr '[:upper:]' '[:lower:]')"
INV_2="inv-002-$(uuidgen | tr '[:upper:]' '[:lower:]')"

aws dynamodb put-item \
  --table-name prepg3-investments-live \
  --item '{
    "id": {"S": "'$INV_1'"},
    "investorId": {"S": "'$UUID'"},
    "propertyId": {"S": "'$PROPERTY_1'"},
    "investmentAmount": {"N": "100000"},
    "currentValue": {"N": "110000"},
    "equityPercentage": {"N": "20"},
    "status": {"S": "ACTIVE"},
    "investmentDate": {"S": "2024-06-15T10:00:00Z"},
    "createdAt": {"S": "'$NOW'"},
    "updatedAt": {"S": "'$NOW'"}
  }' \
  --region $REGION

aws dynamodb put-item \
  --table-name prepg3-investments-live \
  --item '{
    "id": {"S": "'$INV_2'"},
    "investorId": {"S": "'$UUID'"},
    "propertyId": {"S": "'$PROPERTY_2'"},
    "investmentAmount": {"N": "150000"},
    "currentValue": {"N": "165000"},
    "equityPercentage": {"N": "20"},
    "status": {"S": "ACTIVE"},
    "investmentDate": {"S": "2024-08-20T14:30:00Z"},
    "createdAt": {"S": "'$NOW'"},
    "updatedAt": {"S": "'$NOW'"}
  }' \
  --region $REGION

echo "✅ Created 2 investments"

# ============================================
# 3. TRANSACTIONS
# ============================================
echo ""
echo "3️⃣ Creating transactions..."

TXN_1="txn-001-$(uuidgen | tr '[:upper:]' '[:lower:]')"
TXN_2="txn-002-$(uuidgen | tr '[:upper:]' '[:lower:]')"
TXN_3="txn-003-$(uuidgen | tr '[:upper:]' '[:lower:]')"
TXN_4="txn-004-$(uuidgen | tr '[:upper:]' '[:lower:]')"

aws dynamodb put-item \
  --table-name prepg3-transactions-live \
  --item '{
    "id": {"S": "'$TXN_1'"},
    "investorId": {"S": "'$UUID'"},
    "investmentId": {"S": "'$INV_1'"},
    "type": {"S": "INVESTMENT"},
    "amount": {"N": "100000"},
    "description": {"S": "Initial investment in Kings Road property"},
    "date": {"S": "2024-06-15T10:00:00Z"},
    "status": {"S": "COMPLETED"},
    "createdAt": {"S": "'$NOW'"},
    "updatedAt": {"S": "'$NOW'"}
  }' \
  --region $REGION

aws dynamodb put-item \
  --table-name prepg3-transactions-live \
  --item '{
    "id": {"S": "'$TXN_2'"},
    "investorId": {"S": "'$UUID'"},
    "investmentId": {"S": "'$INV_1'"},
    "type": {"S": "DIVIDEND"},
    "amount": {"N": "2500"},
    "description": {"S": "Quarterly dividend payment"},
    "date": {"S": "2024-09-30T09:00:00Z"},
    "status": {"S": "COMPLETED"},
    "createdAt": {"S": "'$NOW'"},
    "updatedAt": {"S": "'$NOW'"}
  }' \
  --region $REGION

aws dynamodb put-item \
  --table-name prepg3-transactions-live \
  --item '{
    "id": {"S": "'$TXN_3'"},
    "investorId": {"S": "'$UUID'"},
    "investmentId": {"S": "'$INV_2'"},
    "type": {"S": "INVESTMENT"},
    "amount": {"N": "150000"},
    "description": {"S": "Initial investment in Baker Street property"},
    "date": {"S": "2024-08-20T14:30:00Z"},
    "status": {"S": "COMPLETED"},
    "createdAt": {"S": "'$NOW'"},
    "updatedAt": {"S": "'$NOW'"}
  }' \
  --region $REGION

aws dynamodb put-item \
  --table-name prepg3-transactions-live \
  --item '{
    "id": {"S": "'$TXN_4'"},
    "investorId": {"S": "'$UUID'"},
    "investmentId": {"S": "'$INV_2'"},
    "type": {"S": "DIVIDEND"},
    "amount": {"N": "3500"},
    "description": {"S": "Quarterly dividend payment"},
    "date": {"S": "2024-12-31T09:00:00Z"},
    "status": {"S": "COMPLETED"},
    "createdAt": {"S": "'$NOW'"},
    "updatedAt": {"S": "'$NOW'"}
  }' \
  --region $REGION

echo "✅ Created 4 transactions"

# ============================================
# 4. NOTIFICATIONS
# ============================================
echo ""
echo "4️⃣ Creating notifications..."

NOTIF_1="notif-001-$(uuidgen | tr '[:upper:]' '[:lower:]')"
NOTIF_2="notif-002-$(uuidgen | tr '[:upper:]' '[:lower:]')"
NOTIF_3="notif-003-$(uuidgen | tr '[:upper:]' '[:lower:]')"

aws dynamodb put-item \
  --table-name prepg3-notifications-live \
  --item '{
    "id": {"S": "'$NOTIF_1'"},
    "investorId": {"S": "'$UUID'"},
    "title": {"S": "Dividend Payment Processed"},
    "message": {"S": "Your quarterly dividend of £2,500 has been processed."},
    "type": {"S": "PAYMENT"},
    "isRead": {"BOOL": false},
    "createdAt": {"S": "2024-09-30T09:05:00Z"},
    "updatedAt": {"S": "2024-09-30T09:05:00Z"}
  }' \
  --region $REGION

aws dynamodb put-item \
  --table-name prepg3-notifications-live \
  --item '{
    "id": {"S": "'$NOTIF_2'"},
    "investorId": {"S": "'$UUID'"},
    "title": {"S": "Property Valuation Update"},
    "message": {"S": "The valuation for Kings Road property has been updated to £550,000."},
    "type": {"S": "UPDATE"},
    "isRead": {"BOOL": false},
    "createdAt": {"S": "2025-01-01T10:00:00Z"},
    "updatedAt": {"S": "2025-01-01T10:00:00Z"}
  }' \
  --region $REGION

aws dynamodb put-item \
  --table-name prepg3-notifications-live \
  --item '{
    "id": {"S": "'$NOTIF_3'"},
    "investorId": {"S": "'$UUID'"},
    "title": {"S": "Investment Milestone"},
    "message": {"S": "Congratulations! Your portfolio has reached £275,000."},
    "type": {"S": "MILESTONE"},
    "isRead": {"BOOL": true},
    "createdAt": {"S": "2024-12-15T12:00:00Z"},
    "updatedAt": {"S": "2024-12-20T09:00:00Z"}
  }' \
  --region $REGION

echo "✅ Created 3 notifications"

# ============================================
# 5. INVESTOR
# ============================================
echo ""
echo "5️⃣ Creating investor..."

aws dynamodb put-item \
  --table-name prepg3-investors-live \
  --item '{
    "id": {"S": "'$UUID'"},
    "email": {"S": "'$EMAIL'"},
    "firstName": {"S": "John"},
    "lastName": {"S": "Smith"},
    "phone": {"S": "+44 20 7946 0958"},
    "totalInvested": {"N": "250000"},
    "portfolioValue": {"N": "275000"},
    "totalROI": {"N": "10"},
    "status": {"S": "ACTIVE"},
    "investorType": {"S": "INDIVIDUAL"},
    "riskProfile": {"S": "MODERATE"},
    "createdAt": {"S": "'$NOW'"},
    "updatedAt": {"S": "'$NOW'"}
  }' \
  --region $REGION

echo "✅ Created investor"

# ============================================
# SUMMARY
# ============================================
echo ""
echo "=================================================="
echo "✅ SEEDING COMPLETE!"
echo "=================================================="
echo ""
echo "Created:"
echo "  - 3 Properties"
echo "  - 2 Investments"
echo "  - 4 Transactions"
echo "  - 3 Notifications (2 unread)"
echo "  - 1 Investor"
echo ""
echo "Investor: $EMAIL"
echo "UUID: $UUID"
echo ""
echo "Portfolio Summary:"
echo "  - Total Invested: £250,000"
echo "  - Portfolio Value: £275,000"
echo "  - Total ROI: 10%"
echo "  - Active Investments: 2"
echo ""
echo "Test your dashboard at: http://localhost:3001"
echo "=================================================="