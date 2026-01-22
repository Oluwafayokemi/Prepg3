// lambda/shared/services/kyc-verification-service.ts

import { Logger } from "@shared/utils/logger";
import Onfido from '@onfido/api';

const logger = new Logger("KYCVerificationService");

// Configuration
const KYC_MODE = process.env.KYC_MODE || 'MANUAL'; // MANUAL | AUTOMATED | HYBRID

interface VerificationRequest {
  investorId: string;
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth: string;
  documents: {
    identityDocument: {
      type: string;
      images: string[];
      documentNumber: string;
      expiryDate: string;
    };
    proofOfAddress: {
      type: string;
      images: string[];
      documentDate: string;
    };
  };
}

interface VerificationResult {
  status: 'PENDING' | 'IN_PROGRESS' | 'APPROVED' | 'REJECTED';
  method: 'MANUAL' | 'AUTOMATED';
  provider?: 'ONFIDO' | null;
  checkId?: string;
  confidence?: number;
  reasons?: string[];
  reviewRequired: boolean;
}

/**
 * KYC Verification Service
 * Abstracts verification logic - easy to switch between manual and automated
 */
export class KYCVerificationService {
  
  private onfidoClient?: Onfido;
  
  constructor() {
    // Only initialize Onfido if in AUTOMATED or HYBRID mode
    if (KYC_MODE !== 'MANUAL' && process.env.ONFIDO_API_TOKEN) {
      this.onfidoClient = new Onfido({
        apiToken: process.env.ONFIDO_API_TOKEN!,
        region: Onfido.Region.EU, // UK data residency
      });
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
      case 'MANUAL':
        return this.manualVerification(request);
      
      case 'AUTOMATED':
        return this.automatedVerification(request);
      
      case 'HYBRID':
        return this.hybridVerification(request);
      
      default:
        return this.manualVerification(request);
    }
  }

  /**
   * PHASE 1: Manual verification
   * Documents submitted, admin reviews in UI
   */
  private async manualVerification(request: VerificationRequest): Promise<VerificationResult> {
    logger.info("Routing to manual verification");

    // Just mark as pending for admin review
    return {
      status: 'PENDING',
      method: 'MANUAL',
      provider: null,
      reviewRequired: true,
    };
  }

  /**
   * PHASE 3: Automated verification with Onfido
   * Most checks are automated, complex cases go to manual
   */
  private async automatedVerification(request: VerificationRequest): Promise<VerificationResult> {
    logger.info("Starting automated verification with Onfido");

    if (!this.onfidoClient) {
      throw new Error("Onfido not configured");
    }

    try {
      // 1. Create Onfido applicant
      const applicant = await this.onfidoClient.applicant.create({
        firstName: request.firstName,
        lastName: request.lastName,
        email: request.email,
        dob: request.dateOfBirth,
      });

      logger.info("Onfido applicant created", { applicantId: applicant.id });

      // 2. Upload documents
      // (In real implementation, documents would be uploaded via Onfido SDK on frontend)
      // Here we're just creating the check
      
      // 3. Create verification check
      const check = await this.onfidoClient.check.create({
        applicantId: applicant.id,
        reportNames: [
          'document',                    // ID verification
          'facial_similarity_photo',     // Selfie match
          'right_to_work',              // UK right to work (optional)
          'watchlist_aml',              // AML screening
        ],
      });

      logger.info("Onfido check created", { checkId: check.id });

      // 4. Check is processing - webhook will notify when complete
      return {
        status: 'IN_PROGRESS',
        method: 'AUTOMATED',
        provider: 'ONFIDO',
        checkId: check.id,
        reviewRequired: false, // Unless check result is "consider"
      };

    } catch (error) {
      logger.error("Onfido verification failed, falling back to manual", error);
      
      // Fallback to manual if Onfido fails
      return {
        status: 'PENDING',
        method: 'MANUAL',
        provider: null,
        reviewRequired: true,
        reasons: ['Automated verification failed - manual review required'],
      };
    }
  }

  /**
   * PHASE 2: Hybrid verification
   * Use business rules to decide automated vs manual
   */
  private async hybridVerification(request: VerificationRequest): Promise<VerificationResult> {
    logger.info("Starting hybrid verification");

    // Business rules: When to use automated?
    const useAutomated = this.shouldUseAutomatedVerification(request);

    if (useAutomated) {
      logger.info("Routing to automated verification");
      return this.automatedVerification(request);
    } else {
      logger.info("Routing to manual verification based on business rules");
      return this.manualVerification(request);
    }
  }

  /**
   * Business rules: When to automate?
   */
  private shouldUseAutomatedVerification(request: VerificationRequest): boolean {
    
    // Rule 1: Only automate standard UK documents
    const supportedDocs = ['PASSPORT', 'DRIVING_LICENSE'];
    if (!supportedDocs.includes(request.documents.identityDocument.type)) {
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

    // Rule 3: Clear images (check file sizes as proxy for quality)
    // In real implementation, check image resolution/quality
    const hasGoodImages = request.documents.identityDocument.images.length >= 2;
    if (!hasGoodImages) {
      logger.info("Insufficient images - manual review");
      return false;
    }

    // Rule 4: During business hours (optional - avoid delays)
    const hour = new Date().getHours();
    const isBusinessHours = hour >= 9 && hour < 18;
    if (!isBusinessHours) {
      logger.info("Outside business hours - queue for manual review");
      return false;
    }

    // All checks passed - use automated
    return true;
  }

  /**
   * Handle Onfido webhook callback
   */
  async handleOnfidoWebhook(payload: any): Promise<VerificationResult> {
    logger.info("Processing Onfido webhook", { payload });

    const { action, object } = payload;

    if (action === 'check.completed') {
      const checkId = object.id;
      
      // Fetch full check result
      const check = await this.onfidoClient!.check.find(checkId);

      logger.info("Onfido check completed", {
        checkId,
        result: check.result,
      });

      // Map Onfido results to our status
      if (check.result === 'clear') {
        return {
          status: 'APPROVED',
          method: 'AUTOMATED',
          provider: 'ONFIDO',
          checkId: check.id,
          confidence: 95, // High confidence
          reviewRequired: false,
        };
      } else if (check.result === 'consider') {
        // Edge case - needs manual review
        return {
          status: 'PENDING',
          method: 'MANUAL',
          provider: 'ONFIDO',
          checkId: check.id,
          confidence: 50,
          reviewRequired: true,
          reasons: this.extractOnfidoIssues(check),
        };
      } else {
        // Rejected
        return {
          status: 'REJECTED',
          method: 'AUTOMATED',
          provider: 'ONFIDO',
          checkId: check.id,
          confidence: 10,
          reviewRequired: false,
          reasons: this.extractOnfidoIssues(check),
        };
      }
    }

    throw new Error('Unhandled webhook action');
  }

  /**
   * Extract issues from Onfido report
   */
  private extractOnfidoIssues(check: any): string[] {
    const issues: string[] = [];
    
    if (check.reports) {
      check.reports.forEach((report: any) => {
        if (report.result !== 'clear' && report.breakdown) {
          Object.entries(report.breakdown).forEach(([key, value]: [string, any]) => {
            if (value.result !== 'clear') {
              issues.push(`${key}: ${value.result}`);
            }
          });
        }
      });
    }

    return issues.length > 0 ? issues : ['Verification failed'];
  }
}

// Singleton instance
export const kycVerificationService = new KYCVerificationService();