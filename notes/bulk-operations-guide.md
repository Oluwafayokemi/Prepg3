# Adding Bulk Operation Lambdas

## 📦 You Need These 4 Lambdas:

1. `bulk-approve-kyc` - Approve multiple investors at once
2. `bulk-reject-kyc` - Reject multiple investors at once  
3. `bulk-send-notification` - Send notification to multiple investors
4. `bulk-suspend-accounts` - Suspend multiple accounts at once

---

## 🔧 Add to lambdas-stack.ts

### 1. Update exports interface:

```typescript
public readonly functions: {
  // ... existing functions
  bulkApproveKYC: cdk.aws_lambda.Function;
  bulkRejectKYC: cdk.aws_lambda.Function;
  bulkSendNotification: cdk.aws_lambda.Function;
  bulkSuspendAccounts: cdk.aws_lambda.Function;
};
```

### 2. Create Lambdas:

```typescript
// ===========================================
// BULK OPERATION LAMBDAS
// ===========================================

// Bulk Approve KYC
const bulkApproveKYCLambda = new ApiLambda(this, 'BulkApproveKYC', {
  functionName: 'bulk-approve-kyc',
  handler: 'admin/bulk-approve-kyc/index.handler',
  environmentName: props.environmentName,
  api: props.api,
  typeName: 'Mutation',
  fieldName: 'bulkApproveKYC',
  environment: adminEnv,
  timeout: LAMBDA_DEFAULTS.TIMEOUT_SECONDS.LONG, // Can take time for many investors
  memorySize: LAMBDA_DEFAULTS.MEMORY_MB.LARGE,
});

bulkApproveKYCLambda.grantTableAccess(props.tables.investors, 'readwrite');
bulkApproveKYCLambda.grantTableAccess(props.tables.notifications, 'write');
if (props.tables.audit) {
  bulkApproveKYCLambda.grantTableAccess(props.tables.audit, 'write');
}

bulkApproveKYCLambda.function.addToRolePolicy(
  new iam.PolicyStatement({
    actions: ['ses:SendEmail', 'ses:SendRawEmail'],
    resources: ['*'],
  })
);

bulkApproveKYCLambda.function.addToRolePolicy(
  new iam.PolicyStatement({
    actions: ['cognito-idp:AdminAddUserToGroup'],
    resources: [props.userPool.userPoolArn],
  })
);

// Bulk Reject KYC
const bulkRejectKYCLambda = new ApiLambda(this, 'BulkRejectKYC', {
  functionName: 'bulk-reject-kyc',
  handler: 'admin/bulk-reject-kyc/index.handler',
  environmentName: props.environmentName,
  api: props.api,
  typeName: 'Mutation',
  fieldName: 'bulkRejectKYC',
  environment: adminEnv,
  timeout: LAMBDA_DEFAULTS.TIMEOUT_SECONDS.LONG,
  memorySize: LAMBDA_DEFAULTS.MEMORY_MB.LARGE,
});

bulkRejectKYCLambda.grantTableAccess(props.tables.investors, 'readwrite');
bulkRejectKYCLambda.grantTableAccess(props.tables.notifications, 'write');
if (props.tables.audit) {
  bulkRejectKYCLambda.grantTableAccess(props.tables.audit, 'write');
}

bulkRejectKYCLambda.function.addToRolePolicy(
  new iam.PolicyStatement({
    actions: ['ses:SendEmail', 'ses:SendRawEmail'],
    resources: ['*'],
  })
);

// Bulk Send Notification
const bulkSendNotificationLambda = new ApiLambda(this, 'BulkSendNotification', {
  functionName: 'bulk-send-notification',
  handler: 'admin/bulk-send-notification/index.handler',
  environmentName: props.environmentName,
  api: props.api,
  typeName: 'Mutation',
  fieldName: 'bulkSendNotification',
  environment: adminEnv,
  timeout: LAMBDA_DEFAULTS.TIMEOUT_SECONDS.LONG,
  memorySize: LAMBDA_DEFAULTS.MEMORY_MB.MEDIUM,
});

bulkSendNotificationLambda.grantTableAccess(props.tables.notifications, 'write');

// Bulk Suspend Accounts
const bulkSuspendAccountsLambda = new ApiLambda(this, 'BulkSuspendAccounts', {
  functionName: 'bulk-suspend-accounts',
  handler: 'admin/bulk-suspend-accounts/index.handler',
  environmentName: props.environmentName,
  api: props.api,
  typeName: 'Mutation',
  fieldName: 'bulkSuspendAccounts',
  environment: adminEnv,
  timeout: LAMBDA_DEFAULTS.TIMEOUT_SECONDS.LONG,
  memorySize: LAMBDA_DEFAULTS.MEMORY_MB.LARGE,
});

bulkSuspendAccountsLambda.grantTableAccess(props.tables.investors, 'readwrite');
if (props.tables.audit) {
  bulkSuspendAccountsLambda.grantTableAccess(props.tables.audit, 'write');
}

bulkSuspendAccountsLambda.function.addToRolePolicy(
  new iam.PolicyStatement({
    actions: ['cognito-idp:AdminDisableUser'],
    resources: [props.userPool.userPoolArn],
  })
);
```

### 3. Add to exports:

```typescript
this.functions = {
  // ... existing
  bulkApproveKYC: bulkApproveKYCLambda.function,
  bulkRejectKYC: bulkRejectKYCLambda.function,
  bulkSendNotification: bulkSendNotificationLambda.function,
  bulkSuspendAccounts: bulkSuspendAccountsLambda.function,
};
```

### 4. Update summary:

```typescript
new cdk.CfnOutput(this, 'LambdaSummary', {
  value: JSON.stringify({
    investors: 5,
    investments: 2,
    properties: 2,
    transactions: 2,
    documents: 2,
    notifications: 1,
    developments: 1,
    admin: 10, // ← Update to include bulk operations
    scheduled: 2,
  }),
  description: 'Lambda functions by category',
});
```

---

## 📁 File Structure:

```
lambda/admin/
├── approve-kyc/index.ts
├── reject-kyc/index.ts
├── request-more-info/index.ts
├── list-pending-kyc/index.ts
├── get-kyc-review-queue/index.ts
├── manage-user-roles/index.ts
├── get-my-permissions/index.ts
├── list-users/index.ts
├── bulk-approve-kyc/index.ts          ← NEW
├── bulk-reject-kyc/index.ts           ← NEW
├── bulk-send-notification/index.ts    ← NEW
└── bulk-suspend-accounts/index.ts     ← NEW
```

---

## 🎯 Usage Examples:

### Frontend - Bulk Approve KYC:

```typescript
const BULK_APPROVE_KYC = gql`
  mutation BulkApproveKYC($investorIds: [ID!]!) {
    bulkApproveKYC(investorIds: $investorIds) {
      totalProcessed
      successCount
      failureCount
      errors {
        investorId
        error
      }
    }
  }
`;

function KYCReviewPanel() {
  const [selectedInvestors, setSelectedInvestors] = useState<string[]>([]);
  const [bulkApprove] = useMutation(BULK_APPROVE_KYC);

  const handleBulkApprove = async () => {
    const result = await bulkApprove({
      variables: { investorIds: selectedInvestors }
    });

    const { totalProcessed, successCount, failureCount } = result.data.bulkApproveKYC;
    
    toast.success(`Approved ${successCount}/${totalProcessed} investors`);
    
    if (failureCount > 0) {
      toast.error(`Failed: ${failureCount}`);
    }
  };

  return (
    <div>
      <InvestorList onSelect={setSelectedInvestors} />
      <Button onClick={handleBulkApprove} disabled={selectedInvestors.length === 0}>
        Approve Selected ({selectedInvestors.length})
      </Button>
    </div>
  );
}
```

### Bulk Reject:

```typescript
const BULK_REJECT_KYC = gql`
  mutation BulkRejectKYC($investorIds: [ID!]!, $reason: String!) {
    bulkRejectKYC(investorIds: $investorIds, reason: $reason) {
      totalProcessed
      successCount
      failureCount
      errors {
        investorId
        error
      }
    }
  }
`;

const handleBulkReject = async () => {
  await bulkReject({
    variables: {
      investorIds: selectedInvestors,
      reason: "Documents unclear - please resubmit with better quality images"
    }
  });
};
```

---

## ⚠️ Important Notes:

### Performance:
- Each bulk operation processes investors **sequentially** (one at a time)
- For 100 investors, might take 2-3 minutes
- Frontend should show progress indicator
- Lambda timeout set to 5 minutes (LONG)

### Error Handling:
- If one investor fails, others continue
- Returns summary: `{ successCount: 95, failureCount: 5 }`
- Errors array shows which ones failed and why

### Permissions:
- `bulkApproveKYC` / `bulkRejectKYC`: Admin, SuperAdmin, Compliance
- `bulkSendNotification`: Admin, SuperAdmin
- `bulkSuspendAccounts`: Admin, SuperAdmin

---

## ✅ Benefits:

Instead of:
```typescript
// ❌ Approve 50 investors one by one
for (let i = 0; i < 50; i++) {
  await approveKYC(investorIds[i]); // 50 separate GraphQL calls
}
```

You can:
```typescript
// ✅ Approve 50 investors in one call
await bulkApproveKYC(investorIds); // 1 GraphQL call
```

**Saves:**
- 49 network round-trips
- User time (no waiting for each approval)
- Cleaner audit trail

---

## 🚀 Deploy:

```bash
cd infrastructure
npx cdk deploy PREPG3-live-Lambdas --context environment=live
```

Done! You can now bulk approve/reject/suspend investors! 🎉