// lambda/marketing/send-property-alert/index.ts
// Admin triggers this when new property is listed

import { MailchimpService } from "@shared/services/mailchimp";
import { PermissionChecker } from "@shared/utils/permissions";
import { Logger } from "@shared/utils/logger";
import type { AppSyncEvent } from "../../shared/types";

const logger = new Logger("SendPropertyAlert");

interface SendPropertyAlertInput {
  propertyId: string;
  propertyName: string;
  location: string;
  expectedROI: number;
  minimumInvestment: number;
  imageUrl: string;
  propertyUrl: string;
}

export const handler = async (event: AppSyncEvent) => {
  logger.info("Sending property alert", { event });

  try {
    const input: SendPropertyAlertInput = event.arguments.input;

    // Authorization: Admin only
    PermissionChecker.requireAdmin(event);

    // Build email HTML
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #0066cc; padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">New Property Alert! 🏡</h1>
        </div>
        
        <div style="padding: 30px;">
          <img src="${input.imageUrl}" style="width: 100%; border-radius: 10px;" />
          
          <h2 style="color: #0066cc; margin-top: 20px;">${input.propertyName}</h2>
          <p style="color: #666; font-size: 16px;">📍 ${input.location}</p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Investment Details</h3>
            <p><strong>Expected ROI:</strong> ${input.expectedROI}% per year</p>
            <p><strong>Minimum Investment:</strong> £${input.minimumInvestment.toLocaleString()}</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${input.propertyUrl}" 
               style="background-color: #0066cc; color: white; padding: 15px 40px; 
                      text-decoration: none; border-radius: 5px; display: inline-block; 
                      font-size: 18px; font-weight: bold;">
              View Property Details
            </a>
          </div>
          
          <p style="color: #999; font-size: 14px; text-align: center;">
            Don't miss this opportunity - properties fill up fast!
          </p>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px;">
          <p>PREPG3 Property Investment Platform</p>
          <p><a href="{{unsubscribe}}" style="color: #0066cc;">Unsubscribe</a> | 
             <a href="${process.env.APP_URL}/settings/notifications" style="color: #0066cc;">Manage Preferences</a></p>
        </div>
      </body>
      </html>
    `;

    // Create campaign in Mailchimp
    const campaignId = await MailchimpService.createCampaign({
      listId: process.env.MAILCHIMP_NEWSLETTER_LIST_ID!,
      subject: `🏡 New Property Available: ${input.propertyName}`,
      title: `Property Alert - ${input.propertyName}`,
      fromName: "PREPG3 Investment Team",
      fromEmail: process.env.FROM_EMAIL!,
      replyTo: process.env.SUPPORT_EMAIL!,
      htmlContent,
    });

    // Send campaign
    await MailchimpService.sendCampaign(campaignId);

    logger.info("Property alert sent", {
      propertyId: input.propertyId,
      campaignId,
    });

    return {
      success: true,
      campaignId,
      message: `Property alert sent to newsletter subscribers`,
    };

  } catch (error) {
    logger.error("Error sending property alert", error);
    throw error;
  }
};