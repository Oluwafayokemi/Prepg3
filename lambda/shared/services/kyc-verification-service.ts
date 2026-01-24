import { Logger } from "@shared/utils/logger";
import { DefaultApi, Configuration, Region } from "@onfido/api";

const logger = new Logger("KYCVerificationService");

// Configuration
const KYC_MODE = process.env.KYC_MODE || "MANUAL"; // MANUAL | AUTOMATED | HYBRID

interface VerificationRequest {
  investorId: string;
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth: string;
  documents: {
    identityDocument: {
      type: string;
      documentNumber: string;
      expiryDate: string;
    };
    proofOfAddress: {
      type: string;
      documentDate: string;
    };
  };
}

interface VerificationResult {
  status: "PENDING" | "IN_PROGRESS" | "APPROVED" | "REJECTED";
  method: "MANUAL" | "AUTOMATED";
  provider?: "ONFIDO" | null;
  checkId?: string;
  confidence?: number;
  reasons?: string[];
  reviewRequired: boolean;
  applicantId?: string;
  sdkToken?: string;
}

/**
 * KYC Verification Service
 * Abstracts verification logic - easy to switch between manual and automated
 */
export class KYCVerificationService {
  private onfidoClient?: DefaultApi;

  constructor() {
    // Only initialize Onfido if in AUTOMATED or HYBRID mode
    if (KYC_MODE !== "MANUAL" && process.env.ONFIDO_API_TOKEN) {
      this.onfidoClient = new DefaultApi(
        new Configuration({
          apiToken: process.env.ONFIDO_API_TOKEN!,
          region: Region.EU, // UK data residency
        }),
      );
    }
  }

  /**
   * Main verification entry point
   * Routes to manual or automated based on mode
   */
  async verify(request: VerificationRequest): Promise<VerificationResult> {
    logger.info("Starting KYC verification", {
      investorId: request.investorId,
      mode: KYC_MODE,
    });

    switch (KYC_MODE) {
      case "MANUAL":
        return this.manualVerification();

      case "AUTOMATED":
        return this.automatedVerification(request);

      case "HYBRID":
        return this.hybridVerification(request);

      default:
        return this.manualVerification();
    }
  }

  /**
   * PHASE 1: Manual verification
   * Documents submitted, admin reviews in UI
   */
  private async manualVerification(): Promise<VerificationResult> {
    logger.info("Routing to manual verification");

    // Just mark as pending for admin review
    return {
      status: "PENDING",
      method: "MANUAL",
      provider: null,
      reviewRequired: true,
    };
  }

  /**
   * PHASE 3: Automated verification with Onfido
   * Returns SDK token for frontend document upload
   */
  private async automatedVerification(
    request: VerificationRequest,
  ): Promise<VerificationResult> {
    logger.info("Starting automated verification with Onfido");

    if (!this.onfidoClient) {
      throw new Error("Onfido not configured");
    }

    try {
      // 1. Create Onfido applicant
      const applicant = await this.onfidoClient.createApplicant({
        first_name: request.firstName,
        last_name: request.lastName,
        email: request.email,
        dob: request.dateOfBirth,
      });

      logger.info("Onfido applicant created", {
        applicantId: applicant.data.id,
      });

      // 2. Generate SDK token for frontend
      const sdkToken = await this.onfidoClient.generateSdkToken({
        applicant_id: applicant.data.id,
        application_id: process.env.ONFIDO_APPLICATION_ID!,
      });

      logger.info("SDK token generated for frontend upload");

      // 3. Return token - frontend will upload documents and call createCheck
      return {
        status: "IN_PROGRESS",
        method: "AUTOMATED",
        provider: "ONFIDO",
        applicantId: applicant.data.id,
        sdkToken: sdkToken.data.token,
        reviewRequired: false,
      };
    } catch (error) {
      logger.error("Onfido verification failed, falling back to manual", error);

      return {
        status: "PENDING",
        method: "MANUAL",
        provider: null,
        reviewRequired: true,
        reasons: ["Automated verification failed - manual review required"],
      };
    }
  }

  /**
   * PHASE 2: Hybrid verification
   * Use business rules to decide automated vs manual
   */
  private async hybridVerification(
    request: VerificationRequest,
  ): Promise<VerificationResult> {
    logger.info("Starting hybrid verification");

    // Business rules: When to use automated?
    const useAutomated = this.shouldUseAutomatedVerification(request);

    if (useAutomated) {
      logger.info("Routing to automated verification");
      return this.automatedVerification(request);
    } else {
      logger.info("Routing to manual verification based on business rules");
      return this.manualVerification();
    }
  }

  /**
   * Business rules: When to automate?
   */
  private shouldUseAutomatedVerification(
    request: VerificationRequest,
  ): boolean {
    // Rule 1: Only automate standard UK documents
    const supportedDocs = ["PASSPORT", "DRIVING_LICENSE"];
    if (
      !request.documents?.identityDocument?.type ||
      !supportedDocs.includes(request.documents.identityDocument.type)
    ) {
      logger.info("Non-standard document - manual review");
      return false;
    }

    // Rule 2: Document not expired
    const expiryDate = new Date(request.documents.identityDocument.expiryDate);
    const today = new Date();
    if (expiryDate <= today) {
      logger.info("Expired document - manual review");
      return false;
    }

    // Rule 4: During business hours (optional)
    const hour = new Date().getHours();
    const isBusinessHours = hour >= 9 && hour < 18;
    if (!isBusinessHours) {
      logger.info("Outside business hours - queue for manual review");
      return false;
    }

    return true;
  }

  /**
   * Create check after frontend completes document upload via SDK
   * Called by separate API endpoint
   */
  async createCheck(applicantId: string): Promise<VerificationResult> {
    if (!this.onfidoClient) {
      throw new Error("Onfido not configured");
    }

    try {
      const check = await this.onfidoClient.createCheck({
        applicant_id: applicantId,
        report_names: [
          "document", // ID verification
          "facial_similarity_photo", // Selfie match
          "watchlist_aml", // AML screening
        ],
      });

      logger.info("Onfido check created", { checkId: check.data.id });

      return {
        status: "IN_PROGRESS",
        method: "AUTOMATED",
        provider: "ONFIDO",
        checkId: check.data.id,
        reviewRequired: false,
      };
    } catch (error) {
      logger.error("Failed to create Onfido check", error);
      throw error;
    }
  }
  /**
   * Handle Onfido webhook callback
   */
  async handleOnfidoWebhook(payload: any): Promise<VerificationResult> {
    logger.info("Processing Onfido webhook", { payload });

    const { action, object } = payload;

    if (action === "check.completed") {
      const checkId = object.id;

      // Fetch full check result
      const check = await this.onfidoClient!.findCheck(checkId);

      logger.info("Onfido check completed", {
        checkId,
        result: check.data.result,
      });

      // Map Onfido results to our status
      if (check.data.result === "clear") {
        return {
          status: "APPROVED",
          method: "AUTOMATED",
          provider: "ONFIDO",
          checkId: check.data.id,
          confidence: 95, // High confidence
          reviewRequired: false,
        };
      } else if (check.data.result === "consider") {
        // Edge case - needs manual review
        return {
          status: "PENDING",
          method: "MANUAL",
          provider: "ONFIDO",
          checkId: check.data.id,
          confidence: 50,
          reviewRequired: true,
          reasons: this.extractOnfidoIssues(check),
        };
      } else {
        // Rejected
        return {
          status: "REJECTED",
          method: "AUTOMATED",
          provider: "ONFIDO",
          checkId: check.data.id,
          confidence: 10,
          reviewRequired: false,
          reasons: this.extractOnfidoIssues(check),
        };
      }
    }

    throw new Error("Unhandled webhook action");
  }

  /**
   * Extract issues from Onfido report
   */
  private extractOnfidoIssues(check: any): string[] {
    const issues: string[] = [];

    if (check.reports) {
      check.reports.forEach((report: any) => {
        if (report.result !== "clear" && report.breakdown) {
          Object.entries(report.breakdown).forEach(
            ([key, value]: [string, any]) => {
              if (value.result !== "clear") {
                issues.push(`${key}: ${value.result}`);
              }
            },
          );
        }
      });
    }

    return issues.length > 0 ? issues : ["Verification failed"];
  }
}

// Singleton instance
export const kycVerificationService = new KYCVerificationService();
