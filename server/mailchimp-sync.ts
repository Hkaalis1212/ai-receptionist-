import { storage } from "./storage";
import { addOrUpdateContact } from "./mailchimp-client";
import type { Appointment, Conversation } from "@shared/schema";

export async function syncCustomerToMailchimp(params: {
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  source: "appointment" | "conversation";
  sourceId: string;
  service?: string;
  sentiment?: string;
  status?: string;
}) {
  try {
    const settings = await storage.getSettings();
    
    if (!settings.mailchimpAudienceId || settings.mailchimpEnableSync !== "true") {
      console.log("Mailchimp sync is disabled or audience not configured");
      return { success: false, reason: "sync_disabled" };
    }

    const { email, firstName, lastName, phone, source, sourceId, service, sentiment, status } = params;

    const tags: string[] = [];
    
    if (source) tags.push(`Source: ${source}`);
    if (service) tags.push(`Service: ${service}`);
    if (sentiment && sentiment !== "unknown") tags.push(`Sentiment: ${sentiment}`);
    if (status) tags.push(`Status: ${status}`);

    const mergeFields: Record<string, any> = {
      SOURCE: source,
      LASTCNTCT: new Date().toISOString().split('T')[0],
    };

    if (service) {
      mergeFields.SERVICE = service;
    }

    const result = await addOrUpdateContact({
      audienceId: settings.mailchimpAudienceId,
      email,
      firstName,
      lastName,
      phone,
      tags,
      mergeFields,
    });

    if (result.success && result.memberId) {
      if (source === "appointment") {
        await storage.updateAppointment(sourceId, {
          mailchimpMemberId: result.memberId,
          mailchimpSyncedAt: new Date(),
        });
      } else if (source === "conversation") {
        await storage.updateConversation(sourceId, {
          mailchimpMemberId: result.memberId,
          mailchimpSyncedAt: new Date(),
        });
      }
    }

    return result;
  } catch (error: any) {
    console.error("Error syncing to Mailchimp:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

export async function syncAppointmentCustomer(appointment: Appointment) {
  if (!appointment.customerEmail) {
    return { success: false, reason: "no_email" };
  }

  const [firstName, ...lastNameParts] = (appointment.customerName || "").split(" ");
  const lastName = lastNameParts.join(" ");

  return await syncCustomerToMailchimp({
    email: appointment.customerEmail,
    firstName,
    lastName,
    phone: appointment.customerPhone || undefined,
    source: "appointment",
    sourceId: appointment.id,
    service: appointment.service,
    status: appointment.status,
  });
}

export async function syncConversationCustomer(conversation: Conversation) {
  if (!conversation.customerEmail) {
    return { success: false, reason: "no_email" };
  }

  const [firstName, ...lastNameParts] = (conversation.customerName || "").split(" ");
  const lastName = lastNameParts.join(" ");

  return await syncCustomerToMailchimp({
    email: conversation.customerEmail,
    firstName,
    lastName,
    phone: conversation.customerPhone || undefined,
    source: "conversation",
    sourceId: conversation.id,
    sentiment: conversation.sentiment || undefined,
    status: conversation.status,
  });
}
