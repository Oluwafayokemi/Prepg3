# OPTIONAL: Database Optimization for KYC Queries

## Add GSI to Investors Table for Fast KYC Queries

If you're getting slow performance with `listPendingKYC`, add this GSI:

```typescript
// infrastructure/lib/stacks/database-stack.ts

// In your investors table definition, add:

investorsTable.addGlobalSecondaryIndex({
  indexName: "byKYCStatus",
  partitionKey: { 
    name: "kycStatus", 
    type: dynamodb.AttributeType.STRING 
  },
  sortKey: { 
    name: "updatedAt", 
    type: dynamodb.AttributeType.STRING 
  },
  projectionType: dynamodb.ProjectionType.ALL,
});
```

## Then Update listPendingKYC to Use It

```typescript
// lambda/admin/list-pending-kyc/index.ts

// Replace the Scan with this Query:
const result = await docClient.send(
  new QueryCommand({
    TableName: process.env.INVESTORS_TABLE!,
    IndexName: "byKYCStatus",
    KeyConditionExpression: "kycStatus = :status",
    FilterExpression: "isCurrent = :current", // Filter for current versions
    ExpressionAttributeValues: {
      ":status": "PENDING", // Or "IN_PROGRESS"
      ":current": "CURRENT",
    },
    Limit: limit,
    ScanIndexForward: false, // Most recent first
    ExclusiveStartKey: nextToken 
      ? JSON.parse(Buffer.from(nextToken, 'base64').toString()) 
      : undefined,
  })
);
```

## Performance Comparison

### Without GSI (Current - Scan):
- ❌ Scans entire table
- ❌ Slow with 10,000+ investors
- ❌ High read capacity cost

### With GSI (Query):
- ✅ Queries only KYC status partition
- ✅ Fast even with 1M+ investors
- ✅ Low read capacity cost

## When to Add This

Add the GSI if:
- You have > 1,000 investors
- KYC review page is slow
- You're doing lots of KYC queries

For now with < 100 investors, the Scan is fine! ✅

---

## Alternative: Composite Status Index

If you want to query multiple statuses efficiently:

```typescript
investorsTable.addGlobalSecondaryIndex({
  indexName: "byStatusAndDate",
  partitionKey: { 
    name: "entityType", // Always "INVESTOR"
    type: dynamodb.AttributeType.STRING 
  },
  sortKey: { 
    name: "statusDate", // Format: "PENDING#2025-01-20T10:00:00Z"
    type: dynamodb.AttributeType.STRING 
  },
  projectionType: dynamodb.ProjectionType.ALL,
});
```

Then query like:
```typescript
KeyConditionExpression: "entityType = :type AND begins_with(statusDate, :status)",
ExpressionAttributeValues: {
  ":type": "INVESTOR",
  ":status": "PENDING#",
}
```

This allows querying all pending investors sorted by date in one query!