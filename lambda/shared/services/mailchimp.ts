import Mailchimp from "@mailchimp/mailchimp_marketing";

Mailchimp.setConfig({
  apiKey: process.env.MAILCHIMP_API_KEY!,
  server: process.env.MAILCHIMP_SERVER_PREFIX!, // e.g., "us1"
});

export interface SubscribeToMailchimpInput {
  email: string;
  firstName?: string;
  lastName?: string;
  listId: string; // Mailchimp audience/list ID
  tags?: string[];
  mergeFields?: Record<string, any>;
}

export class MailchimpService {
  /**
   * Subscribe user to Mailchimp list
   */
  static async subscribe(input: SubscribeToMailchimpInput): Promise<void> {
    try {
      await Mailchimp.lists.addListMember(input.listId, {
        email_address: input.email,
        status: "subscribed",
        merge_fields: {
          FNAME: input.firstName || "",
          LNAME: input.lastName || "",
          ...input.mergeFields,
        },
        tags: input.tags || [],
      });
    } catch (error: any) {
      // If already subscribed, update instead
      if (
        error.status === 400 &&
        error.response?.body?.title === "Member Exists"
      ) {
        await this.updateSubscriber(input);
      } else {
        throw error;
      }
    }
  }

  /**
   * Update existing subscriber
   */
  static async updateSubscriber(
    input: SubscribeToMailchimpInput,
  ): Promise<void> {
    const subscriberHash = this.getSubscriberHash(input.email);

    await Mailchimp.lists.updateListMember(input.listId, subscriberHash, {
      merge_fields: {
        FNAME: input.firstName || "",
        LNAME: input.lastName || "",
        ...input.mergeFields,
      },
    });

    // Add tags
    if (input.tags && input.tags.length > 0) {
      await Mailchimp.lists.updateListMemberTags(input.listId, subscriberHash, {
        tags: input.tags.map((tag) => ({ name: tag, status: "active" })),
      });
    }
  }

  /**
   * Unsubscribe user from list
   */
  static async unsubscribe(email: string, listId: string): Promise<void> {
    const subscriberHash = this.getSubscriberHash(email);

    await Mailchimp.lists.updateListMember(listId, subscriberHash, {
      status: "unsubscribed",
    });
  }

  /**
   * Add tags to subscriber
   */
  static async addTags(
    email: string,
    listId: string,
    tags: string[],
  ): Promise<void> {
    const subscriberHash = this.getSubscriberHash(email);

    await Mailchimp.lists.updateListMemberTags(listId, subscriberHash, {
      tags: tags.map((tag) => ({ name: tag, status: "active" })),
    });
  }

  /**
   * Remove tags from subscriber
   */
  static async removeTags(
    email: string,
    listId: string,
    tags: string[],
  ): Promise<void> {
    const subscriberHash = this.getSubscriberHash(email);

    await Mailchimp.lists.updateListMemberTags(listId, subscriberHash, {
      tags: tags.map((tag) => ({ name: tag, status: "inactive" })),
    });
  }

  /**
   * Get subscriber hash (MD5 of lowercase email)
   */
  private static getSubscriberHash(email: string): string {
    const crypto = require("crypto");
    return crypto.createHash("md5").update(email.toLowerCase()).digest("hex");
  }

  /**
   * Create campaign
   */
  static async createCampaign(input: {
    listId: string;
    subject: string;
    fromName: string;
    fromEmail: string;
    replyTo: string;
    htmlContent: string;
    title: string;
  }): Promise<string> {
    const campaign = await Mailchimp.campaigns.create({
      type: "regular",
      recipients: {
        list_id: input.listId,
      },
      settings: {
        subject_line: input.subject,
        title: input.title,
        from_name: input.fromName,
        reply_to: input.replyTo,
      },
    });

    // Defensive: check for error response
    if (!campaign || typeof campaign !== "object" || !("id" in campaign)) {
      throw new Error(
        "Failed to create Mailchimp campaign: no campaign id returned",
      );
    }

    // Set content
    await Mailchimp.campaigns.setContent((campaign as any).id, {
      html: input.htmlContent,
    });

    return (campaign as any).id;
  }

  /**
   * Send campaign
   */
  static async sendCampaign(campaignId: string): Promise<void> {
    await Mailchimp.campaigns.send(campaignId);
  }
}
