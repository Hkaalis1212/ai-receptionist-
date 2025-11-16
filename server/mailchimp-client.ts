// @ts-ignore - No type definitions available for @mailchimp/mailchimp_marketing
import mailchimp from "@mailchimp/mailchimp_marketing";

export function getMailchimpClient() {
  const apiKey = process.env.MAILCHIMP_API_KEY;
  const serverPrefix = process.env.MAILCHIMP_SERVER_PREFIX;

  if (!apiKey || !serverPrefix) {
    throw new Error("MAILCHIMP_API_KEY and MAILCHIMP_SERVER_PREFIX environment variables are required");
  }

  mailchimp.setConfig({
    apiKey,
    server: serverPrefix,
  });

  return mailchimp;
}

export async function getAudiences() {
  try {
    const client = getMailchimpClient();
    const response = await client.lists.getAllLists();
    
    return response.lists.map((list: any) => ({
      id: list.id,
      name: list.name,
      memberCount: list.stats.member_count,
    }));
  } catch (error) {
    console.error("Error fetching Mailchimp audiences:", error);
    return [];
  }
}

export async function addOrUpdateContact(params: {
  audienceId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  tags?: string[];
  mergeFields?: Record<string, any>;
}) {
  const { audienceId, email, firstName, lastName, phone, tags, mergeFields } = params;

  try {
    const client = getMailchimpClient();
    
    const memberData: any = {
      email_address: email,
      status: "subscribed",
      merge_fields: {
        FNAME: firstName || "",
        LNAME: lastName || "",
        PHONE: phone || "",
        ...mergeFields,
      },
    };

    const subscriberHash = require("crypto")
      .createHash("md5")
      .update(email.toLowerCase())
      .digest("hex");

    const response = await client.lists.setListMember(
      audienceId,
      subscriberHash,
      memberData
    );

    if (tags && tags.length > 0) {
      await client.lists.updateListMemberTags(audienceId, subscriberHash, {
        tags: tags.map(tag => ({ name: tag, status: "active" })),
      });
    }

    return {
      success: true,
      memberId: response.id,
      email: response.email_address,
    };
  } catch (error: any) {
    console.error("Error adding/updating Mailchimp contact:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

export async function getAudienceStats(audienceId: string) {
  try {
    const client = getMailchimpClient();
    const response = await client.lists.getList(audienceId);
    
    return {
      totalMembers: response.stats.member_count,
      subscribedMembers: response.stats.member_count,
      unsubscribed: response.stats.unsubscribe_count,
      cleaned: response.stats.cleaned_count,
      openRate: response.stats.open_rate,
      clickRate: response.stats.click_rate,
    };
  } catch (error) {
    console.error("Error fetching audience stats:", error);
    return null;
  }
}
