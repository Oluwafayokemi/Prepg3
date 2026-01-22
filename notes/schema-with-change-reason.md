# Update your GraphQL schema (investor.graphql)

# ==========================================
# UPDATE INPUT WITH CHANGE REASON
# ==========================================

input UpdateInvestorInput {
  id: ID!
  
  # Basic fields
  firstName: String
  lastName: String
  middleName: String
  phone: String
  mobilePhone: String
  email: String
  
  # Address
  address: AddressInput
  
  # Employment
  employmentStatus: EmploymentStatus
  occupation: String
  employer: String
  
  # Status fields (CRITICAL - require reason)
  kycStatus: KYCStatus
  accountStatus: AccountStatus
  amlCheckStatus: AMLStatus
  
  # CHANGE REASON
  # - REQUIRED when updating critical fields (kycStatus, email, accountStatus, etc.)
  # - OPTIONAL for non-critical fields (auto-generated if not provided)
  # - Must be 10-500 characters when provided
  changeReason: String
}

# Example usage in mutation
type Mutation {
  updateInvestor(input: UpdateInvestorInput!): Investor!
}

# ==========================================
# CHANGE REASON VALIDATION RULES
# ==========================================

# REQUIRED for these fields:
# - kycStatus
# - amlCheckStatus  
# - sanctionsCheckStatus
# - accountStatus
# - email
# - bankAccounts
# - isPEP

# OPTIONAL (auto-generated) for:
# - phone, mobilePhone
# - address
# - firstName, lastName
# - communicationPreferences
# - totalInvested, portfolioValue (system updates)

# ==========================================
# EXAMPLES
# ==========================================

# ✅ GOOD: Critical change with reason
mutation ApproveKYC {
  updateInvestor(input: {
    id: "investor-123"
    kycStatus: APPROVED
    changeReason: "All KYC documents verified. Passport valid until 2030. Proof of address accepted."
  }) {
    id
    version
    kycStatus
    changeReason
    updatedBy
    updatedAt
  }
}

# ❌ BAD: Critical change without reason
mutation ApproveKYCBad {
  updateInvestor(input: {
    id: "investor-123"
    kycStatus: APPROVED
    # Missing changeReason!
  })
}
# Error: "A reason is required when updating: kycStatus"

# ✅ GOOD: Non-critical change, reason optional
mutation UpdatePhone {
  updateInvestor(input: {
    id: "investor-123"
    phone: "07700123456"
    # No changeReason - will auto-generate: "Profile information updated by investor"
  }) {
    id
    phone
    changeReason
  }
}

# ✅ GOOD: Non-critical with custom reason
mutation UpdatePhoneWithReason {
  updateInvestor(input: {
    id: "investor-123"
    phone: "07700123456"
    changeReason: "User requested phone change via support ticket #4567"
  }) {
    id
    phone
    changeReason  # "User requested phone change via support ticket #4567"
  }
}

# ✅ GOOD: Suspend account with full audit trail
mutation SuspendAccount {
  updateInvestor(input: {
    id: "investor-123"
    accountStatus: SUSPENDED
    changeReason: "Failed AML check. Multiple high-risk transactions. Compliance review required. Case #AML-2025-0042"
  }) {
    id
    accountStatus
    changeReason
    version
  }
}

# ✅ GOOD: Email change with verification details
mutation ChangeEmail {
  updateInvestor(input: {
    id: "investor-123"
    email: "newemail@example.com"
    changeReason: "User verified new email via SMS code sent to ***456. Support ticket #4567"
  }) {
    id
    email
    changeReason
  }
}

# ==========================================
# UI FORM EXAMPLES
# ==========================================

/**
 * React Form - KYC Approval (Admin)
 */
/*
const KYCApprovalForm = ({ investorId }) => {
  const [reason, setReason] = useState('');
  
  return (
    <form onSubmit={handleApprove}>
      <h3>Approve KYC</h3>
      
      <div>
        <label>Approval Reason *</label>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="E.g., All documents verified. Passport valid until 2030."
          minLength={10}
          maxLength={500}
          required
        />
        <small>Required - minimum 10 characters</small>
      </div>
      
      <button type="submit">Approve KYC</button>
    </form>
  );
};
*/

/**
 * React Form - Phone Update (User Self-Service)
 */
/*
const UpdatePhoneForm = ({ investorId }) => {
  const [phone, setPhone] = useState('');
  const [reason, setReason] = useState(''); // Optional
  
  return (
    <form onSubmit={handleUpdate}>
      <h3>Update Phone Number</h3>
      
      <div>
        <label>New Phone *</label>
        <input
          type="tel"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          required
        />
      </div>
      
      <div>
        <label>Reason (optional)</label>
        <input
          type="text"
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="Optional - will auto-generate if blank"
        />
        <small>If not provided: "Profile information updated by investor"</small>
      </div>
      
      <button type="submit">Update Phone</button>
    </form>
  );
};
*/

# ==========================================
# ADMIN HISTORY VIEW
# ==========================================

query ViewChangeHistory {
  getInvestorVersions(investorId: "investor-123") {
    timeline {
      version
      timestamp
      user
      reason          # ← Shows changeReason here
      changes {
        field
        oldValue
        newValue
      }
    }
  }
}

# Response shows:
/*
{
  "timeline": [
    {
      "version": 3,
      "timestamp": "2025-01-20T14:30:00Z",
      "user": "compliance@prepg3.com",
      "reason": "KYC Status Change: All documents verified. Passport valid until 2030.",
      "changes": [
        {
          "field": "kycStatus",
          "oldValue": "PENDING",
          "newValue": "APPROVED"
        }
      ]
    },
    {
      "version": 2,
      "timestamp": "2025-01-15T11:00:00Z",
      "user": "investor-123",
      "reason": "Profile information updated by investor",
      "changes": [
        {
          "field": "phone",
          "oldValue": "07700123456",
          "newValue": "07700654321"
        }
      ]
    }
  ]
}
*/