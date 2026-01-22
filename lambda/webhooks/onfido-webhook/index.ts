// lambda/webhooks/onfido-webhook/index.ts

import { MetricsService } from "@shared/utils/metrics";

export const handler = async (event: any) => {
  const { action, object } = event.body;

  if (action === 'check.completed') {
    const check = await onfidoClient.check.find(object.id);

    // 📊 LOG METRICS: Onfido result + cost
    await MetricsService.logKYCDecision(
      check.result === 'clear' ? 'APPROVED' : 'REJECTED',
      'AUTOMATED'
    );

    // Log cost (estimate based on check type)
    let cost = 0;
    check.reportNames.forEach((report: string) => {
      if (report === 'document') cost += 1.5;
      if (report === 'facial_similarity_photo') cost += 1.0;
      if (report === 'watchlist_aml') cost += 0.5;
    });

    await MetricsService.logOnfidoCost('document', cost);

    // Process the check result...
  }
};