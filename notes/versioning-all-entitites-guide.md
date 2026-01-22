# Versioning for All Critical Entities

## 🎯 Which Entities Need Versioning?

### ✅ MUST Have Versioning (Regulatory/Audit):
1. **Investors** - KYC, AML compliance, financial records
2. **Properties** - Valuations, status changes, funding
3. **Investments** - Share ownership, amounts, status
4. **Transactions** - Financial records, payment status

### ⚠️ SHOULD Have Versioning (Business Critical):
5. **Documents** - Compliance documents, contracts
6. **Developments** - Construction milestones, updates

### ❌ DON'T Need Versioning (Ephemeral):
7. **Notifications** - One-time messages
8. **Sessions** - Temporary data

---

## 📊 Database Schema Pattern

All versioned tables need:

```typescript
// Primary Key Structure
PK: id            (e.g., "property-123")
SK: version       (e.g., 1, 2, 3...)

// Required Fields
isCurrent: "CURRENT" | "HISTORICAL"
version: number
updatedAt: string (ISO timestamp)
updatedBy: string (user email/ID)
changeReason: string
changedFields: string[]
previousVersion: number | null
entityType: string

// GSI for fast current-only queries
GSI: currentVersions
  PK: id
  SK: isCurrent
```

---

## 🔧 Implementation Checklist

For EACH entity that needs versioning:

### 1. Update DynamoDB Table

```typescript
// infrastructure/lib/stacks/database-stack.ts

const propertiesTable = new dynamodb.Table(this, 'PropertiesTable', {
  tableName: `prepg3-properties-${environmentName}`,
  partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
  sortKey: { name: 'version', type: dynamodb.AttributeType.NUMBER }, // ← ADD THIS
  billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
  pointInTimeRecovery: true,
  removalPolicy: cdk.RemovalPolicy.RETAIN,
});

// Add GSI for current version queries
propertiesTable.addGlobalSecondaryIndex({
  indexName: 'currentVersions',
  partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
  sortKey: { name: 'isCurrent', type: dynamodb.AttributeType.STRING },
  projectionType: dynamodb.ProjectionType.ALL,
});
```

### 2. Update Create Lambda

```typescript
// lambda/properties/create-property/index.ts

const property = {
  id: propertyId,
  version: 1, // ← ADD: Start at version 1
  isCurrent: "CURRENT", // ← ADD
  // ... other fields
  createdAt: now,
  updatedAt: now,
  updatedBy: userEmail,
  changeReason: "Initial creation",
  changedFields: [],
  previousVersion: null,
  entityType: "PROPERTY", // ← ADD
};
```

### 3. Create Update Lambda (Versioned)

Use the pattern from `update-property-versioned.ts`:
- Query current version via GSI
- Calculate changed fields
- Validate change reason for critical fields
- Mark old version as HISTORICAL
- Insert new version as CURRENT

### 4. Create Get Versions Lambda

Use the pattern from `get-property-versions.ts`:
- Query all versions for ID
- Build timeline with changes
- Return formatted history

### 5. Update GraphQL Schema

```graphql
type Property {
  id: ID!
  version: Int!          # ← ADD
  isCurrent: String!     # ← ADD
  updatedBy: String!     # ← ADD
  changeReason: String   # ← ADD
  changedFields: [String!] # ← ADD
  previousVersion: Int   # ← ADD
  
  # ... existing fields
}

type PropertyVersionHistory {
  propertyId: ID!
  currentVersion: Int!
  totalVersions: Int!
  timeline: [VersionTimeline!]!
}

type VersionTimeline {
  version: Int!
  timestamp: AWSDateTime!
  user: String!
  reason: String
  isCurrent: Boolean!
  changes: [ChangeDetail!]!
  fullData: AWSJSON
}

type ChangeDetail {
  field: String!
  oldValue: String
  newValue: String
}

extend type Query {
  getProperty(id: ID!): Property           # Returns current version only
  getPropertyVersions(propertyId: ID!): PropertyVersionHistory!
  getPropertyVersion(id: ID!, version: Int!): Property
}

input UpdatePropertyInput {
  id: ID!
  propertyName: String
  currentValue: Float
  status: PropertyStatus
  # ... other fields
  changeReason: String  # ← ADD: Required for critical fields
}
```

---

## 🎨 Critical Fields by Entity

### Investors
```typescript
CRITICAL_FIELDS = [
  'kycStatus',
  'email',
  'accountStatus',
  'amlCheckStatus',
  'isPEP',
  'bankAccounts',
  'investorCategory',
]
```

### Properties
```typescript
CRITICAL_FIELDS = [
  'status',              // DRAFT → ACTIVE → FUNDED → CLOSED
  'listingStatus',       // UNLISTED → LISTED → SOLD
  'currentValue',        // Valuation changes
  'pricePerShare',       // Price changes
  'totalShares',         // Share allocation
  'purchasePrice',       // Acquisition price
  'targetFundingAmount', // Funding goal
]
```

### Investments
```typescript
CRITICAL_FIELDS = [
  'status',              // Investment status
  'shares',              // Share quantity
  'amountInvested',      // Investment amount
  'currentValue',        // Valuation
  'pricePerShare',       // Purchase price
]
```

### Transactions
```typescript
CRITICAL_FIELDS = [
  'status',              // PENDING → COMPLETED → FAILED
  'amount',              // Transaction amount
  'type',                // Transaction type
  'paymentMethod',       // How paid
]
```

---

## 📝 Change Reason Examples

### Property Valuations
```
"Professional valuation completed by Smith & Co on 15/01/2025"
"Comparable sales increased - market correction"
"Renovation completed - value increased by £50,000"
```

### Property Status
```
"Construction completed - ready to list"
"Funding target reached - closing to new investors"
"Property sold - proceeds to be distributed"
```

### Investment Changes
```
"Investor increased stake - additional £10k received"
"Partial exit approved - sold 50 shares"
"Stop-loss triggered - position closed"
```

### Transaction Updates
```
"Payment received via bank transfer - ref: TX123456"
"Payment failed - insufficient funds"
"Payment reversed - investor request"
```

---

## 🔒 Data Migration Strategy

### Option 1: Add Versioning to New Records Only
```typescript
// During transition period
if (existingRecord.version === undefined) {
  // Old record - use UpdateCommand (legacy mode)
  await docClient.send(new UpdateCommand({ ... }));
} else {
  // New record - use versioning
  await createNewVersion({ ... });
}
```

### Option 2: Migrate All Existing Records
```typescript
// One-time migration script
const allRecords = await scanAllProperties();

for (const record of allRecords) {
  await docClient.send(new PutCommand({
    TableName: PROPERTIES_TABLE,
    Item: {
      ...record,
      version: 1,
      isCurrent: "CURRENT",
      changeReason: "Migrated to versioned schema",
      changedFields: [],
      previousVersion: null,
      entityType: "PROPERTY",
    },
  }));
}
```

---

## 📊 Query Patterns

### Get Current Version (Fast)
```typescript
// Uses GSI
const result = await docClient.send(
  new QueryCommand({
    TableName: PROPERTIES_TABLE,
    IndexName: "currentVersions",
    KeyConditionExpression: "id = :id AND isCurrent = :current",
    ExpressionAttributeValues: {
      ":id": propertyId,
      ":current": "CURRENT",
    },
  })
);
```

### Get All Versions
```typescript
const result = await docClient.send(
  new QueryCommand({
    TableName: PROPERTIES_TABLE,
    KeyConditionExpression: "id = :id",
    ExpressionAttributeValues: {
      ":id": propertyId,
    },
    ScanIndexForward: false, // Newest first
  })
);
```

### Get Specific Version
```typescript
const result = await docClient.send(
  new GetCommand({
    TableName: PROPERTIES_TABLE,
    Key: {
      id: propertyId,
      version: 3,
    },
  })
);
```

---

## ✅ Implementation Priority

### Phase 1: Critical Entities (NOW)
1. ✅ Investors - Already done
2. 🔄 Properties - Use `update-property-versioned.ts`
3. 🔄 Investments
4. 🔄 Transactions

### Phase 2: Supporting Entities (Later)
5. Documents
6. Developments

### Phase 3: Enhancement (Future)
- Version comparison UI
- Rollback functionality
- Automated archival to S3

---

## 💾 Storage Cost Impact

```
Without Versioning:
10,000 properties × 10KB = 100MB = £0.025/month

With Versioning (avg 5 versions):
10,000 properties × 5 versions × 10KB = 500MB = £0.125/month

Extra cost: £0.10/month (negligible!)
```

**Benefit:** Full audit trail, compliance, debugging, rollback

---

## 🎯 Summary

**For each critical entity:**
1. ✅ Add version + isCurrent to schema
2. ✅ Add currentVersions GSI
3. ✅ Update create to version 1
4. ✅ Replace update with versioned update
5. ✅ Add get-versions query
6. ✅ Define critical fields
7. ✅ Require change reasons for critical fields

This gives you **complete audit trail** for regulatory compliance! 🎉