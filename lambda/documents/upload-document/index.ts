import { PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { docClient } from "@shared/db/client";
import { Logger } from "@shared/utils/logger";
import { ValidationError, UnauthorizedError } from "@shared/utils/errors";
import type { AppSyncEvent } from "../../shared/types";
import { v4 as uuidv4 } from "uuid";
import { PermissionChecker } from "@shared/utils/permissions";

const s3 = new S3Client({});
const logger = new Logger("UploadDocument");

interface UploadDocumentInput {
  documentType: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  description?: string;
}

interface UploadDocumentResponse {
  documentId: string;
  uploadUrl: string;
  expiresAt: string;
  document: any;
}

// Valid document types
const VALID_DOCUMENT_TYPES = [
  // KYC Documents
  "IDENTITY_DOCUMENT",
  "PROOF_OF_ADDRESS",
  "BANK_STATEMENT",
  
  // Investment Documents
  "INVESTMENT_AGREEMENT",
  "SIGNED_CONTRACT",
  
  // Property Documents
  "PROPERTY_DEED",
  "SURVEY_REPORT",
  "INSPECTION_REPORT",
  "RENTAL_AGREEMENT",
  
  // Tax Documents
  "TAX_CERTIFICATE",
  "W9_FORM",
  
  // Other
  "OTHER",
];

// Valid MIME types (security)
const VALID_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/heic",
  "image/heif",
];

// Max file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export const handler = async (event: AppSyncEvent): Promise<UploadDocumentResponse> => {
  logger.info("Uploading document", { event });

  try {
    const input: UploadDocumentInput = event.arguments.input;
    const userId = PermissionChecker.getUserId(event);
    const userEmail = event.identity?.claims?.email;

    if (!userId) {
      throw new UnauthorizedError("Not authenticated");
    }

    // Validate document type
    if (!VALID_DOCUMENT_TYPES.includes(input.documentType)) {
      throw new ValidationError(
        `Invalid document type. Must be one of: ${VALID_DOCUMENT_TYPES.join(", ")}`
      );
    }

    // Validate MIME type (security!)
    if (!VALID_MIME_TYPES.includes(input.mimeType)) {
      throw new ValidationError(
        `Invalid file type. Supported types: PDF, JPG, PNG, HEIC`
      );
    }

    // Validate file size
    if (input.fileSize > MAX_FILE_SIZE) {
      throw new ValidationError(
        `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`
      );
    }

    // Validate file name (security - no path traversal)
    if (input.fileName.includes("..") || input.fileName.includes("/")) {
      throw new ValidationError("Invalid file name");
    }

    // Get investor to verify they exist
    const investorResult = await docClient.send(
      new QueryCommand({
        TableName: process.env.INVESTORS_TABLE!,
        IndexName: "currentVersions",
        KeyConditionExpression: "id = :id AND isCurrent = :current",
        ExpressionAttributeValues: {
          ":id": userId,
          ":current": "CURRENT",
        },
        Limit: 1,
      })
    );

    if (!investorResult.Items || investorResult.Items.length === 0) {
      throw new Error("Investor profile not found");
    }

    const now = new Date().toISOString();
    const documentId = uuidv4();

    // Generate S3 key with structure: investors/{userId}/documents/{documentId}/{fileName}
    const s3Key = `investors/${userId}/documents/${documentId}/${input.fileName}`;

    // Create presigned URL for upload (valid for 15 minutes)
    const command = new PutObjectCommand({
      Bucket: process.env.DOCUMENTS_BUCKET!,
      Key: s3Key,
      ContentType: input.mimeType,
      Metadata: {
        investorId: userId,
        documentId,
        documentType: input.documentType,
        uploadedBy: userEmail || userId,
      },
    });

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 900 }); // 15 minutes

    // Create document record
    const document = {
      id: documentId,
      investorId: userId,
      documentType: input.documentType,
      fileName: input.fileName,
      fileSize: input.fileSize,
      mimeType: input.mimeType,
      s3Key,
      s3Bucket: process.env.DOCUMENTS_BUCKET!,
      status: "PENDING_UPLOAD", // PENDING_UPLOAD → UPLOADED → VERIFIED/REJECTED
      relatedEntityType: input.relatedEntityType,
      relatedEntityId: input.relatedEntityId,
      description: input.description,
      uploadedBy: userEmail || userId,
      createdAt: now,
      updatedAt: now,
    };

    // Save document metadata
    await docClient.send(
      new PutCommand({
        TableName: process.env.DOCUMENTS_TABLE!,
        Item: document,
      })
    );

    const expiresAt = new Date(Date.now() + 900 * 1000).toISOString();

    logger.info("Document upload URL generated", {
      documentId,
      investorId: userId,
      documentType: input.documentType,
      fileName: input.fileName,
    });

    return {
      documentId,
      uploadUrl,
      expiresAt,
      document,
    };

  } catch (error) {
    logger.error("Error uploading document", error);
    throw error;
  }
};

/*
HOW IT WORKS:

1. Frontend calls uploadDocument mutation
2. Lambda generates presigned S3 URL
3. Frontend uploads file directly to S3 using presigned URL
4. S3 triggers Lambda on upload (optional - for virus scanning)
5. Document status changes: PENDING_UPLOAD → UPLOADED

EXAMPLE MUTATION:

mutation UploadDocument {
  uploadDocument(input: {
    documentType: "IDENTITY_DOCUMENT"
    fileName: "passport.pdf"
    fileSize: 2048576
    mimeType: "application/pdf"
    description: "UK Passport"
  }) {
    documentId
    uploadUrl
    expiresAt
    document {
      id
      documentType
      fileName
      status
    }
  }
}

EXAMPLE RESPONSE:

{
  "documentId": "doc-123",
  "uploadUrl": "https://s3.amazonaws.com/...[presigned URL]...",
  "expiresAt": "2025-01-23T12:15:00Z",
  "document": {
    "id": "doc-123",
    "documentType": "IDENTITY_DOCUMENT",
    "fileName": "passport.pdf",
    "status": "PENDING_UPLOAD"
  }
}

FRONTEND USAGE:

const [uploadDocument] = useMutation(UPLOAD_DOCUMENT);

async function handleFileUpload(file: File) {
  // Step 1: Get presigned URL
  const result = await uploadDocument({
    variables: {
      input: {
        documentType: "IDENTITY_DOCUMENT",
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
      }
    }
  });

  const { uploadUrl, documentId } = result.data.uploadDocument;

  // Step 2: Upload file directly to S3
  await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': file.type,
    }
  });

  // Step 3: Confirm upload (optional)
  await confirmDocumentUpload({ documentId });
  
  toast.success("Document uploaded successfully!");
}

SECURITY FEATURES:
✅ Validates file types (only PDF, images)
✅ Validates file size (max 10MB)
✅ Prevents path traversal attacks
✅ User can only upload to their own folder
✅ Presigned URL expires in 15 minutes
✅ Files stored in user-specific S3 path
*/