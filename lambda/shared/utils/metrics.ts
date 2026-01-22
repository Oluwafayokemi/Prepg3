// lambda/shared/utils/metrics.ts

import { CloudWatchClient, PutMetricDataCommand } from "@aws-sdk/client-cloudwatch";
import { Logger } from "./logger";

const cloudwatch = new CloudWatchClient({});
const logger = new Logger("Metrics");

export class MetricsService {
  
  /**
   * Log KYC verification method (manual vs automated)
   */
  static async logKYCVerificationMethod(
    method: 'MANUAL' | 'AUTOMATED' | 'HYBRID',
    status: 'PENDING' | 'IN_PROGRESS' | 'APPROVED' | 'REJECTED'
  ) {
    try {
      await cloudwatch.send(
        new PutMetricDataCommand({
          Namespace: 'PREPG3/KYC',
          MetricData: [
            {
              MetricName: 'VerificationSubmitted',
              Value: 1,
              Unit: 'Count',
              Dimensions: [
                { Name: 'Method', Value: method },
                { Name: 'Status', Value: status },
              ],
              Timestamp: new Date(),
            },
          ],
        })
      );

      logger.info("KYC verification metric logged", { method, status });
    } catch (error) {
      logger.error("Failed to log KYC metric", error);
      // Don't throw - metrics are not critical
    }
  }

  /**
   * Log KYC approval/rejection
   */
  static async logKYCDecision(
    decision: 'APPROVED' | 'REJECTED' | 'MORE_INFO_REQUIRED',
    method: 'MANUAL' | 'AUTOMATED'
  ) {
    try {
      await cloudwatch.send(
        new PutMetricDataCommand({
          Namespace: 'PREPG3/KYC',
          MetricData: [
            {
              MetricName: 'KYCDecision',
              Value: 1,
              Unit: 'Count',
              Dimensions: [
                { Name: 'Decision', Value: decision },
                { Name: 'Method', Value: method },
              ],
              Timestamp: new Date(),
            },
            // Track approval rate
            {
              MetricName: 'ApprovalRate',
              Value: decision === 'APPROVED' ? 100 : 0,
              Unit: 'Percent',
              Dimensions: [
                { Name: 'Method', Value: method },
              ],
              Timestamp: new Date(),
            },
          ],
        })
      );

      logger.info("KYC decision metric logged", { decision, method });
    } catch (error) {
      logger.error("Failed to log KYC decision metric", error);
    }
  }

  /**
   * Log KYC processing time
   */
  static async logKYCProcessingTime(
    submittedAt: string,
    completedAt: string,
    method: 'MANUAL' | 'AUTOMATED'
  ) {
    try {
      const submitted = new Date(submittedAt).getTime();
      const completed = new Date(completedAt).getTime();
      const durationMinutes = (completed - submitted) / 1000 / 60;

      await cloudwatch.send(
        new PutMetricDataCommand({
          Namespace: 'PREPG3/KYC',
          MetricData: [
            {
              MetricName: 'ProcessingTimeMinutes',
              Value: durationMinutes,
              Unit: 'None',
              Dimensions: [
                { Name: 'Method', Value: method },
              ],
              Timestamp: new Date(),
            },
          ],
        })
      );

      logger.info("KYC processing time metric logged", { 
        durationMinutes, 
        method 
      });
    } catch (error) {
      logger.error("Failed to log processing time metric", error);
    }
  }

  /**
   * Log pending KYC queue size
   */
  static async logKYCQueueSize(
    pending: number,
    inProgress: number,
    requiresMoreInfo: number
  ) {
    try {
      await cloudwatch.send(
        new PutMetricDataCommand({
          Namespace: 'PREPG3/KYC',
          MetricData: [
            {
              MetricName: 'PendingKYCCount',
              Value: pending,
              Unit: 'Count',
              Timestamp: new Date(),
            },
            {
              MetricName: 'InProgressKYCCount',
              Value: inProgress,
              Unit: 'Count',
              Timestamp: new Date(),
            },
            {
              MetricName: 'MoreInfoRequiredCount',
              Value: requiresMoreInfo,
              Unit: 'Count',
              Timestamp: new Date(),
            },
            {
              MetricName: 'TotalKYCQueue',
              Value: pending + inProgress + requiresMoreInfo,
              Unit: 'Count',
              Timestamp: new Date(),
            },
          ],
        })
      );

      logger.info("KYC queue size metric logged", { 
        pending, 
        inProgress, 
        requiresMoreInfo 
      });
    } catch (error) {
      logger.error("Failed to log queue size metric", error);
    }
  }

  /**
   * Log Onfido API cost
   */
  static async logOnfidoCost(
    checkType: 'document' | 'facial_similarity' | 'watchlist_aml',
    cost: number
  ) {
    try {
      await cloudwatch.send(
        new PutMetricDataCommand({
          Namespace: 'PREPG3/Costs',
          MetricData: [
            {
              MetricName: 'OnfidoAPICost',
              Value: cost,
              Unit: 'None',
              Dimensions: [
                { Name: 'CheckType', Value: checkType },
              ],
              Timestamp: new Date(),
            },
          ],
        })
      );

      logger.info("Onfido cost metric logged", { checkType, cost });
    } catch (error) {
      logger.error("Failed to log Onfido cost metric", error);
    }
  }
}