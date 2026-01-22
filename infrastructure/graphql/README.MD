# GraphQL Schema Organization

## 📁 File Structure

```
infrastructure/graphql/
├── schema.graphql           # Main import file (references others)
├── investor.graphql         # All investor-related (798 lines) 👥
├── property.graphql         # All property-related (396 lines) 🏠
├── admin.graphql            # All admin-related (423 lines) 👨‍💼
└── schema-merged.graphql    # Combined file for deployment (1617 lines) ✅
```

---

## 🎯 Why Separate Admin Schema?

### ✅ Better Organization
- **Investor stuff** → `investor.graphql`
- **Property stuff** → `property.graphql`
- **Admin stuff** → `admin.graphql` ⭐

### ✅ Clear Separation of Concerns
- Admin dashboard doesn't belong with properties
- Audit logs are system-wide, not property-specific
- Bulk operations span multiple domains

### ✅ Role-Based Development
- Investor team → Works on `investor.graphql`
- Property team → Works on `property.graphql`
- **Admin/Ops team** → Works on `admin.graphql`

### ✅ Security & Authorization
- All admin queries/mutations in one place
- Easy to see what requires admin access
- Clear audit trail requirements

---

## 📋 File Contents

### 1. **`investor.graphql`** (798 lines) 👥

**Domain:** Investor management, KYC, AML, compliance

**Types:**
- `Investor` - Main investor type
- `Address`, `BankAccount`, `NextOfKin`, `EmergencyContact`
- `IdentityVerification`, `ProofOfAddress`
- `AMLAlert` - AML monitoring alerts
- `InvestorDashboard` - Investor's personal dashboard
- `KYCReviewQueue` - For compliance officers

**Enums:**
- Contact & Communication
- Employment & Income
- Investment preferences
- KYC/AML status
- Compliance flags

**Mutations:**
- Registration: `registerInvestor`, `verifyEmail`
- KYC: `submitIdentityDocument`, `approveKYC`, `rejectKYC`
- AML: `runAMLCheck`, `resolveAMLAlert`
- Account: `suspendAccount`, `closeAccount`

**Who Uses:**
- Investors (self-service)
- Compliance officers
- Admins

---

### 2. **`property.graphql`** (396 lines) 🏠

**Domain:** Properties, investments, transactions, documents

**Types:**
- `Property`, `DashboardProperty`
- `Investment`, `Transaction`
- `Document`, `Development`
- `Notification`

**Enums:**
- `PropertyType`, `PropertyStatus`
- `InvestmentStatus`, `TransactionType`
- `DocumentCategory`, `NotificationType`

**Mutations:**
- Properties: `createProperty`, `updateProperty`
- Investments: `createInvestment`
- Transactions: `createTransaction`
- Documents: `uploadDocument`
- Developments: `createDevelopment`

**Who Uses:**
- Property managers
- Investors (view only)
- Admins

---

### 3. **`admin.graphql`** (423 lines) 👨‍💼 ⭐ NEW

**Domain:** Admin operations, analytics, system management

**Types:**
- `AdminDashboard` - Main admin dashboard
- `InvestorStats` - Investor analytics
- `PropertyStats` - Property analytics
- `FinancialStats` - Financial metrics
- `ComplianceStats` - Compliance metrics
- `AuditLog` - Full audit trail
- `AdminActivity` - Admin action tracking
- `SystemHealth` - System monitoring
- `BulkOperationResult` - Bulk operation results

**Enums:**
- `AuditAction` - Every trackable action
- `AdminActionType` - Admin-specific actions
- `SystemStatus`, `ServiceStatus` - Health monitoring
- `AdminNotificationType` - Admin alerts
- `ReportFormat` - PDF, CSV, Excel

**Queries:**
```graphql
# Dashboards & Stats
getAdminDashboard
getInvestorStats
getPropertyStats
getFinancialStats
getComplianceStats

# Audit & Activity
listAuditLogs
getAuditLog
listAdminActivity

# System
getSystemHealth

# Reports
generateInvestorReport
generateFinancialReport
generateComplianceReport
```

**Mutations:**
```graphql
# Bulk Operations
bulkApproveKYC
bulkRejectKYC
bulkSendNotification
bulkSuspendAccounts

# System Operations
triggerBackup
clearCache
syncData

# Audit
logAuditEvent
```

**Subscriptions:**
```graphql
# Real-time admin alerts
onAdminNotification
onSystemHealthChanged
```

**Who Uses:**
- Admins only
- Compliance officers (limited)
- Super admins

---

### 4. **`schema-merged.graphql`** (1617 lines)

Combined file ready to deploy:
```bash
cat investor.graphql property.graphql admin.graphql > schema-merged.graphql
```

---

## 🚀 Deployment

### Quick Deploy:

```bash
cd infrastructure/graphql

# Deploy the merged file
aws appsync update-graphql-api \
  --api-id <your-api-id> \
  --schema file://schema-merged.graphql
```

### After Making Changes:

```bash
# Edit investor.graphql, property.graphql, or admin.graphql

# Re-merge
cat investor.graphql property.graphql admin.graphql > schema-merged.graphql

# Deploy
aws appsync update-graphql-api \
  --api-id <your-api-id> \
  --schema file://schema-merged.graphql
```

---

## 📊 What's in Each File

| Domain | File | Types | Enums | Queries | Mutations | Who Uses |
|--------|------|-------|-------|---------|-----------|----------|
| **Investors** | `investor.graphql` | 14 | 20 | 12 | 27 | Investors, Compliance |
| **Properties** | `property.graphql` | 11 | 6 | 14 | 9 | Property team, Investors |
| **Admin** | `admin.graphql` | 11 | 7 | 9 | 8 | Admins only |
| **TOTAL** | `schema-merged.graphql` | 36 | 33 | 35 | 44 | Everyone |

---

## 🔍 Quick Reference

| What You Need | File |
|---------------|------|
| Investor enums | `investor.graphql` |
| KYC types | `investor.graphql` |
| AML types | `investor.graphql` |
| Property enums | `property.graphql` |
| Investment types | `property.graphql` |
| **Admin dashboard** | `admin.graphql` ⭐ |
| **Audit logs** | `admin.graphql` ⭐ |
| **System health** | `admin.graphql` ⭐ |
| **Bulk operations** | `admin.graphql` ⭐ |
| **Deploy to AWS** | `schema-merged.graphql` ✅ |

---

## 🎯 Example Workflows

### Adding Admin Feature:

1. Open `admin.graphql`
2. Add your type:
```graphql
type RevenueReport {
  month: String!
  revenue: Float!
  fees: Float!
  profit: Float!
}
```
3. Add query:
```graphql
type Query {
  getMonthlyRevenue(year: Int!): [RevenueReport!]!
}
```
4. Re-merge:
```bash
cat investor.graphql property.graphql admin.graphql > schema-merged.graphql
```
5. Deploy

### Adding Investor Field:

1. Open `investor.graphql`
2. Find `type Investor`
3. Add field
4. Re-merge and deploy

### Adding Property Type:

1. Open `property.graphql`
2. Add type/enum
3. Re-merge and deploy

---

## ✅ Benefits of Separate Admin Schema

### Before (Admin in Property):
```
property.graphql
├── Property type
├── Investment type
├── AdminDashboard  ❌ Doesn't belong here
└── Audit logs      ❌ Not property-specific
```

### After (Admin Separated):
```
investor.graphql    👥 Investor domain
property.graphql    🏠 Property domain
admin.graphql       👨‍💼 Admin/system domain
```

### Why Better:

1. **Clear Ownership**
   - Property team doesn't touch admin code
   - Admin team doesn't touch property code
   - Fewer merge conflicts

2. **Better Security**
   - All admin operations in one file
   - Easy to audit admin access
   - Clear authorization rules

3. **Easier to Find**
   - Need audit logs? → `admin.graphql`
   - Need dashboard? → `admin.graphql`
   - Need stats? → `admin.graphql`

4. **Scalability**
   - Can add more admin features without bloating property schema
   - Can extract admin to separate service later
   - Can have different deployment cycles

---

## 📊 Schema Statistics

### `investor.graphql`
- **Lines:** 798
- **Types:** 14
- **Enums:** 20
- **Inputs:** 13
- **Queries:** 12
- **Mutations:** 27
- **Subscriptions:** 4
- **Focus:** KYC, AML, compliance, investor management

### `property.graphql`
- **Lines:** 396
- **Types:** 11
- **Enums:** 6
- **Inputs:** 7
- **Queries:** 14
- **Mutations:** 9
- **Subscriptions:** 3
- **Focus:** Properties, investments, transactions

### `admin.graphql` ⭐
- **Lines:** 423
- **Types:** 11
- **Enums:** 7
- **Inputs:** 2
- **Queries:** 9
- **Mutations:** 8
- **Subscriptions:** 2
- **Focus:** Admin operations, analytics, system health

### `schema-merged.graphql`
- **Total Lines:** 1617
- **Total Types:** 36
- **Total Enums:** 33
- **Total Inputs:** 22
- **Total Queries:** 35
- **Total Mutations:** 44
- **Total Subscriptions:** 9

---

## 🔐 Authorization by File

### `investor.graphql`
- **Public:** `registerInvestor`, `verifyEmail`
- **Investor (self):** View/update own profile, submit KYC
- **Compliance:** Approve/reject KYC, review AML
- **Admin:** Everything

### `property.graphql`
- **Investor:** View properties they've invested in
- **Property Manager:** Create/update properties
- **Admin:** Everything

### `admin.graphql`
- **Admin Only:** All operations
- **Compliance:** Limited stats access
- **Finance:** Financial reports only
- **Super Admin:** Bulk operations, system management

---

## 💡 Best Practices

1. **Keep domains separate** - Don't mix investor/property/admin
2. **Always merge after changes** - Update `schema-merged.graphql`
3. **Document authorization** - Clear comments on who can access what
4. **Version control all files** - Commit all three schemas
5. **Test before deploy** - Validate merged schema

---

## 🎉 You're All Set!

Your schema is now organized into **3 logical domains**:

1. 👥 **Investors** → `investor.graphql`
2. 🏠 **Properties** → `property.graphql`
3. 👨‍💼 **Admin** → `admin.graphql`

**Quick Deploy:**
```bash
cd infrastructure/graphql
cat investor.graphql property.graphql admin.graphql > schema-merged.graphql
aws appsync update-graphql-api --api-id <api-id> --schema file://schema-merged.graphql
```

🚀 Deployment Flow

┌──────────────┐
│ Developer    │
│ makes change │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────┐
│ Edit one of:                 │
│ • investor.graphql           │
│ • property.graphql           │
│ • admin.graphql              │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ Run merge command:           │
│ cat investor.graphql \       │
│     property.graphql \       │
│     admin.graphql \          │
│     > schema-merged.graphql  │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ Commit all files:            │
│ • investor.graphql           │
│ • property.graphql           │
│ • admin.graphql              │
│ • schema-merged.graphql      │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ Deploy to AppSync:           │
│ aws appsync update-graphql   │
│   --schema schema-merged     │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ ✅ Live in production!        │
└──────────────────────────────┘