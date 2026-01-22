# IMMUTABLE RECORDS PATTERN - COMPLETE GUIDE

## 📋 Overview

Instead of UPDATE, we INSERT new versions. Every change creates a new record.
The UI always shows the "CURRENT" version, but all history is preserved.

## 🗄️ Database Structure

```
Table: prepg3-investors-live
PK: id (investor-123)
SK: version (1, 2, 3...)

investor-123 | v1 | isCurrent: HISTORICAL | { data... }
investor-123 | v2 | isCurrent: HISTORICAL | { data... }
investor-123 | v3 | isCurrent: CURRENT    | { data... } ← Latest
```

## 🔄 How It Works

### 1. CREATE (Initial Registration)

```javascript
// Creates version 1
{
  id: "investor-123",
  version: 1,
  isCurrent: "CURRENT",
  firstName: "John",
  kycStatus: "PENDING",
  totalInvested: 0,
  createdAt: "2025-01-15T10:00:00Z",
  updatedAt: "2025-01-15T10:00:00Z",
}
```

### 2. UPDATE (KYC Approved)

```javascript
// Step 1: Mark v1 as HISTORICAL
UPDATE investor-123, version=1
SET isCurrent = "HISTORICAL"

// Step 2: INSERT v2 (not update!)
INSERT {
  id: "investor-123",
  version: 2,                       // Incremented
  isCurrent: "CURRENT",             // Now current
  firstName: "John",                // Copied
  kycStatus: "APPROVED",            // Changed
  totalInvested: 0,                 // Copied
  updatedAt: "2025-01-20T14:30:00Z",
  updatedBy: "compliance@prepg3.com",
  changedFields: ["kycStatus"],
  previousVersion: 1
}
```

### 3. UPDATE (First Investment)

```javascript
// Step 1: Mark v2 as HISTORICAL
UPDATE investor-123, version=2
SET isCurrent = "HISTORICAL"

// Step 2: INSERT v3
INSERT {
  id: "investor-123",
  version: 3,
  isCurrent: "CURRENT",
  firstName: "John",
  kycStatus: "APPROVED",            // Unchanged
  totalInvested: 50000,             // Changed
  portfolioValue: 50000,            // Changed
  updatedAt: "2025-02-01T09:15:00Z",
  updatedBy: "system",
  changedFields: ["totalInvested", "portfolioValue"],
  previousVersion: 2
}
```

## 📊 Query Patterns

### Get Current Investor (Fast - UI Default)

```graphql
query GetCurrent {
  getInvestor(id: "investor-123") {
    # Uses GSI: id = "investor-123" AND isCurrent = "CURRENT"
    # Returns version 3 only
  }
}
```

### Get All History (Admin View)

```graphql
query GetHistory {
  getInvestorVersions(investorId: "investor-123") {
    # Query: PK = "investor-123", sort DESC
    # Returns: [v3, v2, v1]
    timeline {
      version
      timestamp
      user
      changes {
        field
        oldValue
        newValue
      }
    }
  }
}
```

### Get Specific Version

```graphql
query GetOldVersion {
  getInvestorVersion(id: "investor-123", version: 2) {
    # GetItem: PK = "investor-123", SK = 2
    # Returns exactly version 2
  }
}
```

## 🎨 UI Display

### Main Dashboard (Shows Current Only)

```
┌─────────────────────────────────┐
│ Investor: John Doe              │
│ KYC Status: ✓ Approved          │
│ Total Invested: £50,000         │
│ Portfolio Value: £50,000        │
│                                 │
│ [View History]                  │
└─────────────────────────────────┘
```

### History View (Admin)

```
┌──────────────────────────────────────────┐
│ Change History - John Doe                │
│ Current Version: 3 of 3                  │
├──────────────────────────────────────────┤
│                                          │
│ ● Version 3 (Current)                    │
│   Feb 1, 2025 09:15 by system            │
│   Reason: Investment recorded            │
│   • Total Invested: £0 → £50,000         │
│   • Portfolio Value: £0 → £50,000        │
│   [View Details]                         │
│                                          │
│ ○ Version 2                              │
│   Jan 20, 2025 14:30                     │
│   by compliance@prepg3.com               │
│   Reason: KYC approved                   │
│   • KYC Status: PENDING → APPROVED       │
│   [View Details] [Restore]               │
│                                          │
│ ○ Version 1                              │
│   Jan 15, 2025 10:00                     │
│   by john@example.com                    │
│   Reason: Initial registration           │
│   • Account created                      │
│   [View Details]                         │
└──────────────────────────────────────────┘
```

### Version Comparison View

```
┌──────────────────────────────────────────┐
│ Compare Versions: 1 vs 3                 │
├──────────────────────────────────────────┤
│ KYC Status                               │
│   Version 1: PENDING                     │
│   Version 3: APPROVED ✓                  │
│                                          │
│ Total Invested                           │
│   Version 1: £0                          │
│   Version 3: £50,000 ↑                   │
│                                          │
│ Portfolio Value                          │
│   Version 1: £0                          │
│   Version 3: £50,000 ↑                   │
└──────────────────────────────────────────┘
```

## 📈 Benefits

✅ **Never Lose Data** - Every change preserved
✅ **Audit Trail** - Who changed what, when, why
✅ **Rollback** - Can restore to any previous version
✅ **Debugging** - Track down issues
✅ **Compliance** - Full history for regulators
✅ **Analytics** - Trend analysis over time
✅ **No Joins** - All data in one table
✅ **Fast Queries** - GSI for current version

## 🚀 Implementation Steps

1. **Update DynamoDB Table**
   - Add `version` as sort key
   - Add `isCurrent` field
   - Create GSI `currentVersions`

2. **Update Lambda Functions**
   - Replace UPDATE logic with INSERT
   - Mark old version as HISTORICAL
   - Track changed fields

3. **Add GraphQL Queries**
   - `getInvestorVersions` - history
   - `getInvestorVersion` - specific version
   - `compareVersions` - diff view

4. **Build UI Components**
   - History timeline
   - Version comparison
   - Restore functionality

## 💾 Storage Cost

Example: Investor with 10 updates/year
- Version 1: 5KB
- Version 2-10: 5KB each
- Total: 50KB (vs 5KB with regular updates)

Cost increase: ~10x storage, but:
- DynamoDB storage is cheap (~£0.20/GB/month)
- Compliance value >> cost
- Can archive old versions to S3

## 🔐 Security

- Only admins can view history
- Investors can view their own history
- Sensitive data (NINo, etc.) encrypted in all versions
- Audit who viewed what version

## 📝 Best Practices

1. **Always track who & why**
   - `updatedBy`: user email/ID
   - `changeReason`: human-readable explanation

2. **Track what changed**
   - `changedFields`: array of field names
   - Makes UI rendering faster

3. **Version numbers**
   - Sequential integers
   - Never skip numbers
   - Use padding: v0001, v0002

4. **Current pointer**
   - Only ONE version has `isCurrent = "CURRENT"`
   - All others are "HISTORICAL"
   - Atomic update crucial

5. **Soft deletes**
   - Don't delete, mark as deleted
   - Create new version with `isDeleted: true`

This is YOUR pattern - immutable records with version tracking! 🎉