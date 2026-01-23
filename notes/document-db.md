# ===========================================
# ENUMS
# ===========================================

enum DocumentType {
  # KYC Documents
  IDENTITY_DOCUMENT       # Passport, driving license, national ID
  PROOF_OF_ADDRESS        # Utility bill, bank statement
  BANK_STATEMENT          # Bank account proof
  
  # Investment Documents
  INVESTMENT_AGREEMENT    # Signed investment agreements
  SIGNED_CONTRACT         # Legal contracts
  
  # Property Documents
  PROPERTY_DEED           # Title deeds
  SURVEY_REPORT           # Property surveys
  INSPECTION_REPORT       # Property inspections
  RENTAL_AGREEMENT        # Tenant rental agreements
  VALUATION_REPORT        # Property valuations
  
  # Tax Documents
  TAX_CERTIFICATE         # Tax certificates
  W9_FORM                 # US W9 tax form
  W8_FORM                 # US W8 tax form
  
  # Compliance Documents
  SOURCE_OF_FUNDS         # Source of funds declaration
  SOURCE_OF_WEALTH        # Source of wealth declaration
  
  # Other
  OTHER                   # Other documents
}

enum DocumentStatus {
  PENDING_UPLOAD  # URL generated, file not uploaded yet
  UPLOADED        # File in S3, pending admin review
  VERIFIED        # Admin verified document
  REJECTED        # Admin rejected document
  SUPERSEDED      # Replaced by newer version
  WITHDRAWN       # User withdrew/soft deleted
  EXPIRED         # Upload URL expired without upload
}

# ===========================================
# INPUTS
# ===========================================

input UploadDocumentInput {
  documentType: DocumentType!
  fileName: String!
  fileSize: Int!
  mimeType: String!
  relatedEntityType: String
  relatedEntityId: ID
  description: String
}

input ReplaceDocumentInput {
  documentIdToReplace: ID!
  fileName: String!
  fileSize: Int!
  mimeType: String!
  reason: String! # Why replacing (compliance requirement)
}

input WithdrawDocumentInput {
  documentId: ID!
  reason: String! # Why withdrawing (compliance requirement)
}

input ListDocumentsFilter {
  documentType: DocumentType
  status: DocumentStatus
  investorId: ID # Admin only
}

# ===========================================
# QUERIES
# ===========================================

extend type Query {
  # List user's own documents (excludes WITHDRAWN unless specified)
  listMyDocuments(
    documentType: DocumentType
    includeWithdrawn: Boolean
    limit: Int
    nextToken: String
  ): DocumentConnection!
  
  # Get specific document with download URL
  getDocument(documentId: ID!): Document!
  
  # Get document version history
  getDocumentHistory(documentId: ID!): DocumentHistoryResponse!
  
  # ==========================================
  # ADMIN QUERIES
  # ==========================================
  
  # List all documents (admin/compliance only)
  listAllDocuments(
    filter: ListDocumentsFilter
    limit: Int
    nextToken: String
  ): DocumentConnection!
    @aws_auth(cognito_groups: ["Admin", "SuperAdmin", "Compliance"])
  
  # Get documents pending verification
  getPendingDocuments(
    limit: Int
    nextToken: String
  ): DocumentConnection!
    @aws_auth(cognito_groups: ["Admin", "SuperAdmin", "Compliance"])
}

# ===========================================
# MUTATIONS
# ===========================================

extend type Mutation {
  # ==========================================
  # USER MUTATIONS
  # ==========================================
  
  # Upload new document (initial upload)
  uploadDocument(input: UploadDocumentInput!): UploadDocumentResponse!
  
  # Replace existing document (keeps old version as SUPERSEDED)
  replaceDocument(input: ReplaceDocumentInput!): ReplaceDocumentResponse!
  
  # Withdraw document (soft delete - marks as WITHDRAWN)
  withdrawDocument(input: WithdrawDocumentInput!): WithdrawDocumentResponse!
  
  # Confirm document uploaded to S3 (optional - S3 event handles this)
  confirmDocumentUpload(documentId: ID!): ConfirmUploadResponse!
  
  # ==========================================
  # ADMIN MUTATIONS
  # ==========================================
  
  # Verify document
  verifyDocument(documentId: ID!): Document!
    @aws_auth(cognito_groups: ["Admin", "SuperAdmin", "Compliance"])
  
  # Reject document
  rejectDocument(documentId: ID!, reason: String!): Document!
    @aws_auth(cognito_groups: ["Admin", "SuperAdmin", "Compliance"])
  
  # Request more information about document
  requestMoreInfo(documentId: ID!, message: String!): Document!
    @aws_auth(cognito_groups: ["Admin", "SuperAdmin", "Compliance"])
  
  # ==========================================
  # SUPER ADMIN MUTATIONS (DANGEROUS!)
  # ==========================================
  
  # Permanently delete document (ONLY after 7 year retention period)
  permanentlyDeleteDocument(
    documentId: ID!
    confirmDangerous: Boolean!
  ): DeleteDocumentResponse!
    @aws_auth(cognito_groups: ["SuperAdmin"])
}

# ===========================================
# SUBSCRIPTIONS
# ===========================================

extend type Subscription {
  # Real-time notification when new document uploaded
  onDocumentUploaded(investorId: ID!): Document
    @aws_subscribe(mutations: ["confirmDocumentUpload"])
  
  # Real-time notification when document verified
  onDocumentVerified(investorId: ID!): Document
    @aws_subscribe(mutations: ["verifyDocument"])
}

# ===========================================
# NOTES FOR DEVELOPERS
# ===========================================

"""
DOCUMENT LIFECYCLE:

1. UPLOAD:
   uploadDocument → PENDING_UPLOAD
   User uploads to S3
   confirmDocumentUpload → UPLOADED

2. ADMIN REVIEW:
   verifyDocument → VERIFIED
   OR
   rejectDocument → REJECTED

3. REPLACEMENT (not deletion!):
   replaceDocument → Old: SUPERSEDED, New: PENDING_UPLOAD
   Both versions kept forever

4. WITHDRAWAL (soft delete):
   withdrawDocument → WITHDRAWN
   Document still in S3/DynamoDB but hidden from user

5. PERMANENT DELETION (7+ years later):
   permanentlyDeleteDocument → Actually deleted
   SuperAdmin only, after retention period

COMPLIANCE RULES:
✅ NEVER delete documents less than 7 years old
✅ ALWAYS require reason for replacement/withdrawal
✅ ALWAYS keep audit trail of all document operations
✅ ALWAYS keep all versions of documents
✅ Users cannot delete verified KYC documents
✅ Only SuperAdmin can permanently delete (after 7 years)

SECURITY:
✅ Users can only access their own documents
✅ Admin/Compliance can access all documents
✅ Presigned URLs expire (15 min upload, 5 min download)
✅ File type validation (PDF, JPG, PNG, HEIC only)
✅ File size limit (10MB)
✅ S3 encryption at rest
✅ No public S3 access
"""