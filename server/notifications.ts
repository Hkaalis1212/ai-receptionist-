import { getTwilioClient, getTwilioFromPhoneNumber } from "./twilio-client";
import { storage } from "./storage";
import type { Appointment } from "@shared/schema";

export async function sendAppointmentConfirmationSms(appointment: Appointment) {
  try {
    if (!appointment.customerPhone) {
      console.log("No phone number for appointment", appointment.id);
      return;
    }

    const twilioClient = await getTwilioClient();
    const fromNumber = await getTwilioFromPhoneNumber();

    const body = `Your appointment has been confirmed for ${appointment.service} on ${appointment.date} at ${appointment.time}. Thank you!`;

    const message = await twilioClient.messages.create({
      to: appointment.customerPhone,
      from: fromNumber,
      body,
    });

    await storage.createSmsMessage({
      twilioMessageSid: message.sid,
      direction: "outbound",
      from: fromNumber,
      to: appointment.customerPhone,
      body,
      status: "sent",
      appointmentId: appointment.id,
    });

    console.log(`Confirmation SMS sent for appointment ${appointment.id}`);
  } catch (error) {
    console.error("Failed to send confirmation SMS:", error);
  }
}

export async function sendPaymentReminderSms(appointment: Appointment) {
  try {
    if (!appointment.customerPhone) {
      console.log("No phone number for appointment", appointment.id);
      return;
    }

    const twilioClient = await getTwilioClient();
    const fromNumber = await getTwilioFromPhoneNumber();

    const amountDollars = (appointment.amountCents / 100).toFixed(2);
    const body = `Payment reminder: Your appointment for ${appointment.service} on ${appointment.date} at ${appointment.time} has a pending payment of $${amountDollars}. Please complete payment to confirm.`;

    const message = await twilioClient.messages.create({
      to: appointment.customerPhone,
      from: fromNumber,
      body,
    });

    await storage.createSmsMessage({
      twilioMessageSid: message.sid,
      direction: "outbound",
      from: fromNumber,
      to: appointment.customerPhone,
      body,
      status: "sent",
      appointmentId: appointment.id,
    });

    console.log(`Payment reminder SMS sent for appointment ${appointment.id}`);
  } catch (error) {
    console.error("Failed to send payment reminder SMS:", error);
  }
}

export async function sendAppointmentUpdatedSms(appointment: Appointment, updateMessage: string) {
  try {
    if (!appointment.customerPhone) {
      console.log("No phone number for appointment", appointment.id);
      return;
    }

    const twilioClient = await getTwilioClient();
    const fromNumber = await getTwilioFromPhoneNumber();

    const message = await twilioClient.messages.create({
      to: appointment.customerPhone,
      from: fromNumber,
      body: updateMessage,
    });

    await storage.createSmsMessage({
      twilioMessageSid: message.sid,
      direction: "outbound",
      from: fromNumber,
      to: appointment.customerPhone,
      body: updateMessage,
      status: "sent",
      appointmentId: appointment.id,
    });

    console.log(`Update SMS sent for appointment ${appointment.id}`);
  } catch (error) {
    console.error("Failed to send update SMS:", error);
  }
}
