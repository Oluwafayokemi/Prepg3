# CHANGE REASON SYSTEM - COMPLETE GUIDE

## 📋 Overview

Every update creates a new version with a `changeReason` that explains WHY.

**Hybrid Approach:**
- ✅ **Critical changes** - User MUST provide reason
- ✅ **Minor changes** - Auto-generated if not provided
- ✅ **System changes** - Auto-generated with context

## 🔐 Critical Fields (Reason REQUIRED)

These fields require a user-provided reason:

```typescript
CRITICAL_FIELDS = [
  "kycStatus",           // KYC approval/rejection
  "amlCheckStatus",      // AML check results
  "sanctionsCheckStatus", // Sanctions screening
  "accountStatus",       // Account suspension/closure
  "email",               // Email changes (security)
  "bankAccounts",        // Payment details
  "isPEP",              // PEP status (compliance)
]
```

### Example: KYC Approval

```graphql
mutation ApproveKYC {
  updateInvestor(input: {
    id: "investor-123"
    kycStatus: APPROVED
    changeReason: "All KYC documents verified. Passport checked and valid until 2030. Address proof accepted."
  })
}
```

**Without reason:**
```
❌ Error: "A reason is required when updating: kycStatus"
```

---

## ⚙️ Non-Critical Fields (Auto-Generated)

These fields get auto-generated reasons if not provided:

### Phone/Address Updates
```graphql
mutation UpdatePhone {
  updateInvestor(input: {
    id: "investor-123"
    phone: "07700123456"
    # No changeReason needed
  })
}

# Auto-generates: "Profile information updated by investor"
```

### Investment Updates (System)
```typescript
// Lambda automatically adds context
{
  totalInvested: 50000,
  portfolioValue: 50000,
  changeReason: "Investment inv-789 recorded - portfolio updated"
}
```

### ROI Recalculation (System)
```typescript
{
  totalROI: 12.5,
  changeReason: "Portfolio ROI recalculated"
}
```

---

## 🎨 UI Implementation

### Admin Form (Critical - Reason Required)

```jsx
const KYCApprovalForm = ({ investorId, onApprove }) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate minimum length
    if (reason.length < 10) {
      setError('Reason must be at least 10 characters');
      return;
    }
    
    try {
      await approveKYC({
        variables: {
          input: {
            id: investorId,
            kycStatus: 'APPROVED',
            changeReason: reason
          }
        }
      });
      
      onApprove();
    } catch (err) {
      setError(err.message);
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <h3>Approve KYC</h3>
      
      <div className="form-group">
        <label>Approval Reason *</label>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="Explain why you're approving this KYC..."
          minLength={10}
          maxLength={500}
          rows={4}
          required
        />
        <small>
          Required - minimum 10 characters. 
          Include: documents verified, expiry dates, any notes.
        </small>
        {error && <span className="error">{error}</span>}
      </div>
      
      <button type="submit" disabled={reason.length < 10}>
        Approve KYC
      </button>
    </form>
  );
};
```

### User Form (Non-Critical - Reason Optional)

```jsx
const UpdatePhoneForm = ({ investorId, currentPhone }) => {
  const [phone, setPhone] = useState(currentPhone);
  const [reason, setReason] = useState('');
  
  return (
    <form onSubmit={handleSubmit}>
      <h3>Update Phone Number</h3>
      
      <div className="form-group">
        <label>New Phone Number *</label>
        <input
          type="tel"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          required
        />
      </div>
      
      <div className="form-group">
        <label>
          Reason for Change 
          <span className="optional">(optional)</span>
        </label>
        <input
          type="text"
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="Optional - leave blank for automatic reason"
        />
        <small>
          If blank: "Profile information updated by investor"
        </small>
      </div>
      
      <button type="submit">Update Phone</button>
    </form>
  );
};
```

---

## 📊 History Display

### Admin View - Shows All Reasons

```jsx
const ChangeHistory = ({ investorId }) => {
  const { data } = useQuery(GET_INVESTOR_VERSIONS, {
    variables: { investorId }
  });
  
  return (
    <div className="history-timeline">
      <h2>Change History</h2>
      
      {data?.timeline.map(entry => (
        <div key={entry.version} className="timeline-entry">
          <div className="entry-header">
            <strong>Version {entry.version}</strong>
            {entry.isCurrent && <span className="badge">Current</span>}
            <time>{formatDate(entry.timestamp)}</time>
          </div>
          
          <div className="entry-meta">
            <span className="user">
              <UserIcon /> {entry.user}
            </span>
          </div>
          
          {/* SHOW THE REASON HERE */}
          <div className="entry-reason">
            <QuoteIcon />
            <em>{entry.reason}</em>
          </div>
          
          <div className="entry-changes">
            <strong>Changes:</strong>
            <ul>
              {entry.changes.map(change => (
                <li key={change.field}>
                  <code>{change.field}</code>: 
                  <span className="old-value">{change.oldValue}</span>
                  <span className="arrow">→</span>
                  <span className="new-value">{change.newValue}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * DISPLAYS:
 * 
 * Version 3 (Current)
 * Jan 20, 2025 14:30
 * by compliance@prepg3.com
 * 
 * "KYC Status Change: All KYC documents verified. 
 *  Passport checked and valid until 2030. 
 *  Address proof accepted."
 * 
 * Changes:
 * • kycStatus: PENDING → APPROVED
 * 
 * ─────────────────────────────────
 * 
 * Version 2
 * Jan 15, 2025 11:00
 * by investor-123
 * 
 * "Profile information updated by investor"
 * 
 * Changes:
 * • phone: 07700123456 → 07700654321
 */
```

---

## 🔍 Search & Filter by Reason

### Admin: Find All KYC Approvals This Month

```graphql
query FindKYCApprovals {
  getChangesByType(
    changeType: UPDATE
    entityType: "INVESTOR"
    startDate: "2025-01-01T00:00:00Z"
    endDate: "2025-01-31T23:59:59Z"
  ) {
    version
    timestamp
    user
    changeReason  # Filter where contains "KYC"
    changedFields
  }
}
```

---

## 📝 Best Practices

### For Admins/Compliance

```
✅ GOOD:
"All KYC documents verified. Passport valid until 2030. Utility bill from Dec 2024 accepted."

❌ BAD:
"approved" (too short, no context)
```

### For System Updates

```
✅ GOOD:
"Investment inv-789 recorded - portfolio updated"

✅ GOOD:
"Property prop-456 valuation increased from £500k to £550k"

❌ BAD:
"Updated" (not helpful)
```

### For Support Team

```
✅ GOOD:
"Email change requested by user via support ticket #4567. Verified via SMS code to ***456."

❌ BAD:
"User requested" (missing ticket reference)
```

---

## 💡 Validation Rules

```typescript
// Minimum length for user-provided reasons
MIN_REASON_LENGTH = 10

// Maximum length
MAX_REASON_LENGTH = 500

// Pattern for critical changes
CRITICAL_REASON_PATTERN = /^.{10,500}$/

// Should include ticket numbers for support actions
SUPPORT_PATTERN = /#\d{4,}/
```

---

## 🎯 Summary

**changeReason Field:**
- ✅ **Required** for critical compliance fields
- ✅ **Optional** for user profile fields (auto-generated)
- ✅ **Auto-generated** for system updates
- ✅ **Validated** (10-500 chars when provided)
- ✅ **Displayed** in admin history view
- ✅ **Searchable** for compliance audits

This gives you:
- Full audit trail with context
- Compliance-ready documentation
- Easy troubleshooting ("Why did this change?")
- User accountability
- Support ticket tracking

Perfect for FCA regulations! 🎉