#!/bin/bash
# scripts/seed-all-data-live.sh

set -e

REGION="eu-north-1"
UUID="30dc097c-6081-7055-2259-dbc2e3300986"
EMAIL="john.smith@prepg3.co.uk"
NOW=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
TODAY=$(date -u +"%Y-%m-%d")

echo "🌱 Complete Data Seeding for PREPG3"
echo "===================================="
echo "Investor: $EMAIL"
echo "UUID: $UUID"
echo "===================================="

# ============================================
# 1. PROPERTIES (5 properties with varied data)
# ============================================
echo ""
echo "1️⃣ Creating 5 properties..."

PROPERTY_1="prop-001-$(uuidgen | tr '[:upper:]' '[:lower:]')"
PROPERTY_2="prop-002-$(uuidgen | tr '[:upper:]' '[:lower:]')"
PROPERTY_3="prop-003-$(uuidgen | tr '[:upper:]' '[:lower:]')"
PROPERTY_4="prop-004-$(uuidgen | tr '[:upper:]' '[:lower:]')"
PROPERTY_5="prop-005-$(uuidgen | tr '[:upper:]' '[:lower:]')"

# Property 1 - Completed Residential
aws dynamodb put-item \
  --table-name prepg3-properties-live \
  --item '{
    "id": {"S": "'$PROPERTY_1'"},
    "address": {"S": "123 Kings Road, Chelsea"},
    "postcode": {"S": "SW3 4TY"},
    "city": {"S": "London"},
    "propertyType": {"S": "RESIDENTIAL"},
    "status": {"S": "COMPLETED"},
    "purchasePrice": {"N": "500000"},
    "currentValuation": {"N": "550000"},
    "bedrooms": {"N": "2"},
    "bathrooms": {"N": "2"},
    "squareFeet": {"N": "1200"},
    "acquisitionDate": {"S": "2024-01-15"},
    "totalInvested": {"N": "500000"},
    "images": {"L": [
      {"S": "https://via.placeholder.com/800x600/3b82f6/ffffff?text=Kings+Road+Exterior"},
      {"S": "https://via.placeholder.com/800x600/10b981/ffffff?text=Living+Room"}
    ]},
    "createdAt": {"S": "'$NOW'"},
    "updatedAt": {"S": "'$NOW'"}
  }' \
  --region $REGION

# Property 2 - Development Residential
aws dynamodb put-item \
  --table-name prepg3-properties-live \
  --item '{
    "id": {"S": "'$PROPERTY_2'"},
    "address": {"S": "45 Baker Street, Marylebone"},
    "postcode": {"S": "W1U 7DN"},
    "city": {"S": "London"},
    "propertyType": {"S": "RESIDENTIAL"},
    "status": {"S": "DEVELOPMENT"},
    "purchasePrice": {"N": "750000"},
    "currentValuation": {"N": "800000"},
    "bedrooms": {"N": "3"},
    "bathrooms": {"N": "2"},
    "squareFeet": {"N": "1800"},
    "acquisitionDate": {"S": "2024-03-20"},
    "totalInvested": {"N": "600000"},
    "images": {"L": [
      {"S": "https://via.placeholder.com/800x600/8b5cf6/ffffff?text=Baker+Street+Construction"}
    ]},
    "createdAt": {"S": "'$NOW'"},
    "updatedAt": {"S": "'$NOW'"}
  }' \
  --region $REGION

# Property 3 - Completed Commercial
aws dynamodb put-item \
  --table-name prepg3-properties-live \
  --item '{
    "id": {"S": "'$PROPERTY_3'"},
    "address": {"S": "78 Oxford Street, West End"},
    "postcode": {"S": "W1D 1BS"},
    "city": {"S": "London"},
    "propertyType": {"S": "COMMERCIAL"},
    "status": {"S": "COMPLETED"},
    "purchasePrice": {"N": "1000000"},
    "currentValuation": {"N": "1150000"},
    "squareFeet": {"N": "2500"},
    "acquisitionDate": {"S": "2023-11-10"},
    "totalInvested": {"N": "1000000"},
    "images": {"L": [
      {"S": "https://via.placeholder.com/800x600/f59e0b/ffffff?text=Oxford+Street+Shopfront"}
    ]},
    "createdAt": {"S": "'$NOW'"},
    "updatedAt": {"S": "'$NOW'"}
  }' \
  --region $REGION

# Property 4 - Acquisition Mixed Use
aws dynamodb put-item \
  --table-name prepg3-properties-live \
  --item '{
    "id": {"S": "'$PROPERTY_4'"},
    "address": {"S": "12 Canary Wharf, Docklands"},
    "postcode": {"S": "E14 5AB"},
    "city": {"S": "London"},
    "propertyType": {"S": "MIXED_USE"},
    "status": {"S": "ACQUISITION"},
    "purchasePrice": {"N": "1200000"},
    "currentValuation": {"N": "1200000"},
    "squareFeet": {"N": "3000"},
    "acquisitionDate": {"S": "2025-01-02"},
    "totalInvested": {"N": "300000"},
    "images": {"L": [
      {"S": "https://via.placeholder.com/800x600/06b6d4/ffffff?text=Canary+Wharf"}
    ]},
    "createdAt": {"S": "'$NOW'"},
    "updatedAt": {"S": "'$NOW'"}
  }' \
  --region $REGION

# Property 5 - Sold Residential
aws dynamodb put-item \
  --table-name prepg3-properties-live \
  --item '{
    "id": {"S": "'$PROPERTY_5'"},
    "address": {"S": "89 Notting Hill Gate, Notting Hill"},
    "postcode": {"S": "W11 3JW"},
    "city": {"S": "London"},
    "propertyType": {"S": "RESIDENTIAL"},
    "status": {"S": "SOLD"},
    "purchasePrice": {"N": "600000"},
    "currentValuation": {"N": "700000"},
    "bedrooms": {"N": "2"},
    "bathrooms": {"N": "1"},
    "squareFeet": {"N": "1000"},
    "acquisitionDate": {"S": "2023-06-01"},
    "totalInvested": {"N": "600000"},
    "images": {"L": [
      {"S": "https://via.placeholder.com/800x600/ef4444/ffffff?text=Notting+Hill+SOLD"}
    ]},
    "createdAt": {"S": "'$NOW'"},
    "updatedAt": {"S": "'$NOW'"}
  }' \
  --region $REGION

echo "✅ Created 5 properties"

# ============================================
# 2. INVESTOR
# ============================================
echo ""
echo "2️⃣ Creating investor profile..."

aws dynamodb put-item \
  --table-name prepg3-investors-live \
  --item '{
    "id": {"S": "'$UUID'"},
    "email": {"S": "'$EMAIL'"},
    "firstName": {"S": "John"},
    "lastName": {"S": "Smith"},
    "phone": {"S": "+44 20 7946 0958"},
    "totalInvested": {"N": "250000"},
    "portfolioValue": {"N": "285000"},
    "totalROI": {"N": "14"},
    "status": {"S": "ACTIVE"},
    "investorType": {"S": "INDIVIDUAL"},
    "riskProfile": {"S": "MODERATE"},
    "address": {"S": "56 Richmond Avenue, Islington, London N1 2LH"},
    "dateOfBirth": {"S": "1985-03-15"},
    "nationality": {"S": "British"},
    "taxResidence": {"S": "United Kingdom"},
    "createdAt": {"S": "'$NOW'"},
    "updatedAt": {"S": "'$NOW'"}
  }' \
  --region $REGION

echo "✅ Created investor"

# ============================================
# 3. INVESTMENTS (4 investments)
# ============================================
echo ""
echo "3️⃣ Creating investments..."

INV_1="inv-001-$(uuidgen | tr '[:upper:]' '[:lower:]')"
INV_2="inv-002-$(uuidgen | tr '[:upper:]' '[:lower:]')"
INV_3="inv-003-$(uuidgen | tr '[:upper:]' '[:lower:]')"
INV_4="inv-004-$(uuidgen | tr '[:upper:]' '[:lower:]')"

# Investment 1 - Kings Road (Active)
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
    "roi": {"N": "10"},
    "investmentDate": {"S": "2024-01-15"},
    "createdAt": {"S": "'$NOW'"},
    "updatedAt": {"S": "'$NOW'"}
  }' \
  --region $REGION

# Investment 2 - Baker Street (Active)
aws dynamodb put-item \
  --table-name prepg3-investments-live \
  --item '{
    "id": {"S": "'$INV_2'"},
    "investorId": {"S": "'$UUID'"},
    "propertyId": {"S": "'$PROPERTY_2'"},
    "investmentAmount": {"N": "150000"},
    "currentValue": {"N": "175000"},
    "equityPercentage": {"N": "25"},
    "status": {"S": "ACTIVE"},
    "roi": {"N": "16.67"},
    "investmentDate": {"S": "2024-03-20"},
    "createdAt": {"S": "'$NOW'"},
    "updatedAt": {"S": "'$NOW'"}
  }' \
  --region $REGION

# Investment 3 - Notting Hill (Completed/Sold)
aws dynamodb put-item \
  --table-name prepg3-investments-live \
  --item '{
    "id": {"S": "'$INV_3'"},
    "investorId": {"S": "'$UUID'"},
    "propertyId": {"S": "'$PROPERTY_5'"},
    "investmentAmount": {"N": "50000"},
    "currentValue": {"N": "58000"},
    "equityPercentage": {"N": "10"},
    "status": {"S": "COMPLETED"},
    "roi": {"N": "16"},
    "investmentDate": {"S": "2023-06-01"},
    "createdAt": {"S": "'$NOW'"},
    "updatedAt": {"S": "'$NOW'"}
  }' \
  --region $REGION

# Investment 4 - Canary Wharf (Pending)
aws dynamodb put-item \
  --table-name prepg3-investments-live \
  --item '{
    "id": {"S": "'$INV_4'"},
    "investorId": {"S": "'$UUID'"},
    "propertyId": {"S": "'$PROPERTY_4'"},
    "investmentAmount": {"N": "50000"},
    "currentValue": {"N": "50000"},
    "equityPercentage": {"N": "15"},
    "status": {"S": "PENDING"},
    "roi": {"N": "0"},
    "investmentDate": {"S": "2025-01-02"},
    "createdAt": {"S": "'$NOW'"},
    "updatedAt": {"S": "'$NOW'"}
  }' \
  --region $REGION

echo "✅ Created 4 investments"

# ============================================
# 4. TRANSACTIONS (10 transactions)
# ============================================
echo ""
echo "4️⃣ Creating transactions..."

TXN_1="txn-001-$(uuidgen | tr '[:upper:]' '[:lower:]')"
TXN_2="txn-002-$(uuidgen | tr '[:upper:]' '[:lower:]')"
TXN_3="txn-003-$(uuidgen | tr '[:upper:]' '[:lower:]')"
TXN_4="txn-004-$(uuidgen | tr '[:upper:]' '[:lower:]')"
TXN_5="txn-005-$(uuidgen | tr '[:upper:]' '[:lower:]')"
TXN_6="txn-006-$(uuidgen | tr '[:upper:]' '[:lower:]')"
TXN_7="txn-007-$(uuidgen | tr '[:upper:]' '[:lower:]')"
TXN_8="txn-008-$(uuidgen | tr '[:upper:]' '[:lower:]')"
TXN_9="txn-009-$(uuidgen | tr '[:upper:]' '[:lower:]')"
TXN_10="txn-010-$(uuidgen | tr '[:upper:]' '[:lower:]')"

# Initial investments
aws dynamodb put-item --table-name prepg3-transactions-live --item '{"id":{"S":"'$TXN_1'"},"investorId":{"S":"'$UUID'"},"investmentId":{"S":"'$INV_1'"},"propertyId":{"S":"'$PROPERTY_1'"},"type":{"S":"INVESTMENT"},"amount":{"N":"100000"},"description":{"S":"Initial investment in Kings Road property"},"date":{"S":"2024-01-15"},"reference":{"S":"INV-2024-001"},"createdAt":{"S":"'$NOW'"}}' --region $REGION

aws dynamodb put-item --table-name prepg3-transactions-live --item '{"id":{"S":"'$TXN_2'"},"investorId":{"S":"'$UUID'"},"investmentId":{"S":"'$INV_2'"},"propertyId":{"S":"'$PROPERTY_2'"},"type":{"S":"INVESTMENT"},"amount":{"N":"150000"},"description":{"S":"Initial investment in Baker Street property"},"date":{"S":"2024-03-20"},"reference":{"S":"INV-2024-002"},"createdAt":{"S":"'$NOW'"}}' --region $REGION

aws dynamodb put-item --table-name prepg3-transactions-live --item '{"id":{"S":"'$TXN_3'"},"investorId":{"S":"'$UUID'"},"investmentId":{"S":"'$INV_3'"},"propertyId":{"S":"'$PROPERTY_5'"},"type":{"S":"INVESTMENT"},"amount":{"N":"50000"},"description":{"S":"Initial investment in Notting Hill property"},"date":{"S":"2023-06-01"},"reference":{"S":"INV-2023-015"},"createdAt":{"S":"'$NOW'"}}' --region $REGION

# Dividend payments
aws dynamodb put-item --table-name prepg3-transactions-live --item '{"id":{"S":"'$TXN_4'"},"investorId":{"S":"'$UUID'"},"investmentId":{"S":"'$INV_1'"},"propertyId":{"S":"'$PROPERTY_1'"},"type":{"S":"DIVIDEND"},"amount":{"N":"2500"},"description":{"S":"Q2 2024 dividend payment"},"date":{"S":"2024-06-30"},"reference":{"S":"DIV-2024-Q2-001"},"createdAt":{"S":"'$NOW'"}}' --region $REGION

aws dynamodb put-item --table-name prepg3-transactions-live --item '{"id":{"S":"'$TXN_5'"},"investorId":{"S":"'$UUID'"},"investmentId":{"S":"'$INV_1'"},"propertyId":{"S":"'$PROPERTY_1'"},"type":{"S":"DIVIDEND"},"amount":{"N":"2500"},"description":{"S":"Q3 2024 dividend payment"},"date":{"S":"2024-09-30"},"reference":{"S":"DIV-2024-Q3-001"},"createdAt":{"S":"'$NOW'"}}' --region $REGION

aws dynamodb put-item --table-name prepg3-transactions-live --item '{"id":{"S":"'$TXN_6'"},"investorId":{"S":"'$UUID'"},"investmentId":{"S":"'$INV_2'"},"propertyId":{"S":"'$PROPERTY_2'"},"type":{"S":"DIVIDEND"},"amount":{"N":"3500"},"description":{"S":"Q3 2024 dividend payment"},"date":{"S":"2024-09-30"},"reference":{"S":"DIV-2024-Q3-002"},"createdAt":{"S":"'$NOW'"}}' --region $REGION

aws dynamodb put-item --table-name prepg3-transactions-live --item '{"id":{"S":"'$TXN_7'"},"investorId":{"S":"'$UUID'"},"investmentId":{"S":"'$INV_1'"},"propertyId":{"S":"'$PROPERTY_1'"},"type":{"S":"DIVIDEND"},"amount":{"N":"2500"},"description":{"S":"Q4 2024 dividend payment"},"date":{"S":"2024-12-31"},"reference":{"S":"DIV-2024-Q4-001"},"createdAt":{"S":"'$NOW'"}}' --region $REGION

aws dynamodb put-item --table-name prepg3-transactions-live --item '{"id":{"S":"'$TXN_8'"},"investorId":{"S":"'$UUID'"},"investmentId":{"S":"'$INV_2'"},"propertyId":{"S":"'$PROPERTY_2'"},"type":{"S":"DIVIDEND"},"amount":{"N":"3500"},"description":{"S":"Q4 2024 dividend payment"},"date":{"S":"2024-12-31"},"reference":{"S":"DIV-2024-Q4-002"},"createdAt":{"S":"'$NOW'"}}' --region $REGION

# Profit share from sold property
aws dynamodb put-item --table-name prepg3-transactions-live --item '{"id":{"S":"'$TXN_9'"},"investorId":{"S":"'$UUID'"},"investmentId":{"S":"'$INV_3'"},"propertyId":{"S":"'$PROPERTY_5'"},"type":{"S":"PROFIT_SHARE"},"amount":{"N":"8000"},"description":{"S":"Profit share from Notting Hill property sale"},"date":{"S":"2024-11-15"},"reference":{"S":"PROFIT-2024-001"},"createdAt":{"S":"'$NOW'"}}' --region $REGION

# Fee
aws dynamodb put-item --table-name prepg3-transactions-live --item '{"id":{"S":"'$TXN_10'"},"investorId":{"S":"'$UUID'"},"type":{"S":"FEE"},"amount":{"N":"500"},"description":{"S":"Annual management fee"},"date":{"S":"2024-12-01"},"reference":{"S":"FEE-2024-ANNUAL"},"createdAt":{"S":"'$NOW'"}}' --region $REGION

echo "✅ Created 10 transactions"

# ============================================
# 5. NOTIFICATIONS (8 notifications)
# ============================================
echo ""
echo "5️⃣ Creating notifications..."

NOTIF_1="notif-001-$(uuidgen | tr '[:upper:]' '[:lower:]')"
NOTIF_2="notif-002-$(uuidgen | tr '[:upper:]' '[:lower:]')"
NOTIF_3="notif-003-$(uuidgen | tr '[:upper:]' '[:lower:]')"
NOTIF_4="notif-004-$(uuidgen | tr '[:upper:]' '[:lower:]')"
NOTIF_5="notif-005-$(uuidgen | tr '[:upper:]' '[:lower:]')"
NOTIF_6="notif-006-$(uuidgen | tr '[:upper:]' '[:lower:]')"
NOTIF_7="notif-007-$(uuidgen | tr '[:upper:]' '[:lower:]')"
NOTIF_8="notif-008-$(uuidgen | tr '[:upper:]' '[:lower:]')"

aws dynamodb put-item --table-name prepg3-notifications-live --item '{"id":{"S":"'$NOTIF_1'"},"investorId":{"S":"'$UUID'"},"title":{"S":"New Property Available"},"message":{"S":"A new investment opportunity is now available in Canary Wharf. Review details and invest today."},"type":{"S":"INVESTMENT_UPDATE"},"isRead":{"BOOL":false},"link":{"S":"/properties/'$PROPERTY_4'"},"createdAt":{"S":"2025-01-02T10:00:00Z"}}' --region $REGION

aws dynamodb put-item --table-name prepg3-notifications-live --item '{"id":{"S":"'$NOTIF_2'"},"investorId":{"S":"'$UUID'"},"title":{"S":"Dividend Payment Processed"},"message":{"S":"Your Q4 2024 dividend of £6,000 has been processed and will arrive in 3-5 business days."},"type":{"S":"PAYMENT_RECEIVED"},"isRead":{"BOOL":false},"createdAt":{"S":"2025-01-01T09:00:00Z"}}' --region $REGION

aws dynamodb put-item --table-name prepg3-notifications-live --item '{"id":{"S":"'$NOTIF_3'"},"investorId":{"S":"'$UUID'"},"title":{"S":"Property Development Update"},"message":{"S":"Baker Street renovation is 60% complete. Expected completion: March 2025."},"type":{"S":"PROPERTY_UPDATE"},"isRead":{"BOOL":false},"link":{"S":"/properties/'$PROPERTY_2'"},"createdAt":{"S":"2024-12-20T14:00:00Z"}}' --region $REGION

aws dynamodb put-item --table-name prepg3-notifications-live --item '{"id":{"S":"'$NOTIF_4'"},"investorId":{"S":"'$UUID'"},"title":{"S":"Document Uploaded"},"message":{"S":"Q4 2024 Financial Report is now available for download."},"type":{"S":"DOCUMENT_UPLOADED"},"isRead":{"BOOL":true},"link":{"S":"/documents"},"createdAt":{"S":"2024-12-15T11:00:00Z"}}' --region $REGION

aws dynamodb put-item --table-name prepg3-notifications-live --item '{"id":{"S":"'$NOTIF_5'"},"investorId":{"S":"'$UUID'"},"title":{"S":"Property Valuation Update"},"message":{"S":"Kings Road property valuation increased to £550,000 (+10% since acquisition)."},"type":{"S":"PROPERTY_UPDATE"},"isRead":{"BOOL":true},"link":{"S":"/properties/'$PROPERTY_1'"},"createdAt":{"S":"2024-12-01T10:00:00Z"}}' --region $REGION

aws dynamodb put-item --table-name prepg3-notifications-live --item '{"id":{"S":"'$NOTIF_6'"},"investorId":{"S":"'$UUID'"},"title":{"S":"Property Sale Completed"},"message":{"S":"Notting Hill property has been sold. Your profit share of £8,000 has been transferred."},"type":{"S":"INVESTMENT_UPDATE"},"isRead":{"BOOL":true},"createdAt":{"S":"2024-11-16T15:00:00Z"}}' --region $REGION

aws dynamodb put-item --table-name prepg3-notifications-live --item '{"id":{"S":"'$NOTIF_7'"},"investorId":{"S":"'$UUID'"},"title":{"S":"Investment Milestone Reached"},"message":{"S":"Congratulations! Your portfolio has surpassed £275,000 in value."},"type":{"S":"INVESTMENT_UPDATE"},"isRead":{"BOOL":true},"createdAt":{"S":"2024-11-01T12:00:00Z"}}' --region $REGION

aws dynamodb put-item --table-name prepg3-notifications-live --item '{"id":{"S":"'$NOTIF_8'"},"investorId":{"S":"'$UUID'"},"title":{"S":"Platform Maintenance"},"message":{"S":"Scheduled maintenance on January 10th, 2025 from 2-4 AM GMT. Platform will be unavailable."},"type":{"S":"SYSTEM"},"isRead":{"BOOL":true},"createdAt":{"S":"2024-12-28T10:00:00Z"}}' --region $REGION

echo "✅ Created 8 notifications (3 unread)"

# ============================================
# 6. DOCUMENTS (6 documents)
# ============================================
echo ""
echo "6️⃣ Creating documents..."

DOC_1="doc-001-$(uuidgen | tr '[:upper:]' '[:lower:]')"
DOC_2="doc-002-$(uuidgen | tr '[:upper:]' '[:lower:]')"
DOC_3="doc-003-$(uuidgen | tr '[:upper:]' '[:lower:]')"
DOC_4="doc-004-$(uuidgen | tr '[:upper:]' '[:lower:]')"
DOC_5="doc-005-$(uuidgen | tr '[:upper:]' '[:lower:]')"
DOC_6="doc-006-$(uuidgen | tr '[:upper:]' '[:lower:]')"

aws dynamodb put-item --table-name prepg3-documents-live --item '{"id":{"S":"'$DOC_1'"},"investorId":{"S":"'$UUID'"},"propertyId":{"S":"'$PROPERTY_1'"},"title":{"S":"Investment Agreement - Kings Road"},"description":{"S":"Signed investment agreement for Kings Road property"},"fileKey":{"S":"documents/'$UUID'/inv-agreement-kings-road.pdf"},"fileType":{"S":"application/pdf"},"fileSize":{"N":"245678"},"category":{"S":"CONTRACT"},"uploadDate":{"S":"2024-01-15T12:00:00Z"},"createdAt":{"S":"'$NOW'"}}' --region $REGION

aws dynamodb put-item --table-name prepg3-documents-live --item '{"id":{"S":"'$DOC_2'"},"investorId":{"S":"'$UUID'"},"propertyId":{"S":"'$PROPERTY_1'"},"title":{"S":"Property Valuation Report"},"description":{"S":"Independent valuation report for Kings Road"},"fileKey":{"S":"documents/'$UUID'/valuation-kings-road-2024.pdf"},"fileType":{"S":"application/pdf"},"fileSize":{"N":"1234567"},"category":{"S":"VALUATION"},"uploadDate":{"S":"2024-12-01T09:00:00Z"},"createdAt":{"S":"'$NOW'"}}' --region $REGION

aws dynamodb put-item --table-name prepg3-documents-live --item '{"id":{"S":"'$DOC_3'"},"investorId":{"S":"'$UUID'"},"title":{"S":"Q4 2024 Portfolio Statement"},"description":{"S":"Quarterly portfolio performance summary"},"fileKey":{"S":"documents/'$UUID'/q4-2024-statement.pdf"},"fileType":{"S":"application/pdf"},"fileSize":{"N":"567890"},"category":{"S":"REPORT"},"uploadDate":{"S":"2024-12-31T17:00:00Z"},"createdAt":{"S":"'$NOW'"}}' --region $REGION

aws dynamodb put-item --table-name prepg3-documents-live --item '{"id":{"S":"'$DOC_4'"},"investorId":{"S":"'$UUID'"},"title":{"S":"Tax Certificate 2024"},"description":{"S":"Annual tax certificate for investment income"},"fileKey":{"S":"documents/'$UUID'/tax-cert-2024.pdf"},"fileType":{"S":"application/pdf"},"fileSize":{"N":"123456"},"category":{"S":"CERTIFICATE"},"uploadDate":{"S":"2024-12-20T10:00:00Z"},"createdAt":{"S":"'$NOW'"}}' --region $REGION

aws dynamodb put-item --table-name prepg3-documents-live --item '{"id":{"S":"'$DOC_5'"},"investorId":{"S":"'$UUID'"},"propertyId":{"S":"'$PROPERTY_2'"},"title":{"S":"Development Progress Report"},"description":{"S":"Baker Street renovation progress - December 2024"},"fileKey":{"S":"documents/'$UUID'/baker-street-progress-dec24.pdf"},"fileType":{"S":"application/pdf"},"fileSize":{"N":"2345678"},"category":{"S":"REPORT"},"uploadDate":{"S":"2024-12-15T14:00:00Z"},"createdAt":{"S":"'$NOW'"}}' --region $REGION

aws dynamodb put-item --table-name prepg3-documents-live --item '{"id":{"S":"'$DOC_6'"},"investorId":{"S":"'$UUID'"},"propertyId":{"S":"'$PROPERTY_5'"},"title":{"S":"Property Sale Invoice"},"description":{"S":"Final sale documentation for Notting Hill property"},"fileKey":{"S":"documents/'$UUID'/notting-hill-sale-invoice.pdf"},"fileType":{"S":"application/pdf"},"fileSize":{"N":"345678"},"category":{"S":"INVOICE"},"uploadDate":{"S":"2024-11-16T16:00:00Z"},"createdAt":{"S":"'$NOW'"}}' --region $REGION

echo "✅ Created 6 documents"

# ============================================
# 7. DEVELOPMENTS (5 development updates)
# ============================================
echo ""
echo "7️⃣ Creating development updates..."

DEV_1="dev-001-$(uuidgen | tr '[:upper:]' '[:lower:]')"
DEV_2="dev-002-$(uuidgen | tr '[:upper:]' '[:lower:]')"
DEV_3="dev-003-$(uuidgen | tr '[:upper:]' '[:lower:]')"
DEV_4="dev-004-$(uuidgen | tr '[:upper:]' '[:lower:]')"
DEV_5="dev-005-$(uuidgen | tr '[:upper:]' '[:lower:]')"

aws dynamodb put-item --table-name prepg3-developments-live --item '{"id":{"S":"'$DEV_1'"},"propertyId":{"S":"'$PROPERTY_2'"},"title":{"S":"Kitchen Renovation Complete"},"description":{"S":"Modern kitchen with high-end appliances installed. All plumbing and electrical work finished."},"status":{"S":"COMPLETED"},"updateDate":{"S":"2024-12-20T10:00:00Z"},"images":{"L":[{"S":"https://via.placeholder.com/800x600/10b981/ffffff?text=New+Kitchen"}]},"createdAt":{"S":"'$NOW'"}}' --region $REGION

aws dynamodb put-item --table-name prepg3-developments-live --item '{"id":{"S":"'$DEV_2'"},"propertyId":{"S":"'$PROPERTY_2'"},"title":{"S":"Bathroom Upgrades In Progress"},"description":{"S":"Master bathroom renovation 75% complete. Luxury fixtures being installed this week."},"status":{"S":"IN_PROGRESS"},"updateDate":{"S":"2024-12-28T14:00:00Z"},"images":{"L":[{"S":"https://via.placeholder.com/800x600/f59e0b/ffffff?text=Bathroom+Progress"}]},"createdAt":{"S":"'$NOW'"}}' --region $REGION

aws dynamodb put-item --table-name prepg3-developments-live --item '{"id":{"S":"'$DEV_3'"},"propertyId":{"S":"'$PROPERTY_2'"},"title":{"S":"Flooring Installation Scheduled"},"description":{"S":"Hardwood flooring installation planned for January 15-20, 2025."},"status":{"S":"SCHEDULED"},"updateDate":{"S":"2025-01-02T09:00:00Z"},"createdAt":{"S":"'$NOW'"}}' --region $REGION

aws dynamodb put-item --table-name prepg3-developments-live --item '{"id":{"S":"'$DEV_4'"},"propertyId":{"S":"'$PROPERTY_4'"},"title":{"S":"Acquisition Paperwork Processing"},"description":{"S":"Legal documentation for Canary Wharf property being finalized. Expected completion mid-January."},"status":{"S":"IN_PROGRESS"},"updateDate":{"S":"2025-01-03T11:00:00Z"},"createdAt":{"S":"'$NOW'"}}' --region $REGION

aws dynamodb put-item --table-name prepg3-developments-live --item '{"id":{"S":"'$DEV_5'"},"propertyId":{"S":"'$PROPERTY_1'"},"title":{"S":"Annual Property Inspection"},"description":{"S":"Routine annual inspection completed. Property in excellent condition with no repairs needed."},"status":{"S":"COMPLETED"},"updateDate":{"S":"2024-11-30T15:00:00Z"},"createdAt":{"S":"'$NOW'"}}' --region $REGION
echo "✅ Created 5 development updates"
