import { sendEmail } from './resend-client';
import type { Appointment } from '@shared/schema';

export async function sendAppointmentConfirmationEmail(appointment: Appointment) {
  if (!appointment.customerEmail) {
    console.log('No email address for appointment confirmation');
    return;
  }

  const subject = `Appointment Confirmation - ${appointment.service}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Appointment Confirmed</h2>
      <p>Dear ${appointment.customerName},</p>
      <p>Your appointment has been confirmed with the following details:</p>
      <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
        <p style="margin: 10px 0;"><strong>Service:</strong> ${appointment.service}</p>
        <p style="margin: 10px 0;"><strong>Date:</strong> ${appointment.date}</p>
        <p style="margin: 10px 0;"><strong>Time:</strong> ${appointment.time}</p>
        ${appointment.customerPhone ? `<p style="margin: 10px 0;"><strong>Phone:</strong> ${appointment.customerPhone}</p>` : ''}
      </div>
      <p>If you need to reschedule or cancel, please contact us as soon as possible.</p>
      <p>Thank you for booking with us!</p>
    </div>
  `;

  // Let errors bubble up to caller for proper error handling
  await sendEmail({
    to: appointment.customerEmail,
    subject,
    html,
  });
}

export async function sendAppointmentReminderEmail(appointment: Appointment) {
  if (!appointment.customerEmail) {
    return;
  }

  const subject = `Appointment Reminder - ${appointment.service}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Appointment Reminder</h2>
      <p>Dear ${appointment.customerName},</p>
      <p>This is a friendly reminder about your upcoming appointment:</p>
      <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
        <p style="margin: 10px 0;"><strong>Service:</strong> ${appointment.service}</p>
        <p style="margin: 10px 0;"><strong>Date:</strong> ${appointment.date}</p>
        <p style="margin: 10px 0;"><strong>Time:</strong> ${appointment.time}</p>
      </div>
      <p>We look forward to seeing you!</p>
      <p>If you need to reschedule or cancel, please let us know as soon as possible.</p>
    </div>
  `;

  // Let errors bubble up to caller for proper error handling
  await sendEmail({
    to: appointment.customerEmail,
    subject,
    html,
  });
}

export async function sendAppointmentCancellationEmail(appointment: Appointment) {
  if (!appointment.customerEmail) {
    return;
  }

  const subject = `Appointment Cancelled - ${appointment.service}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Appointment Cancelled</h2>
      <p>Dear ${appointment.customerName},</p>
      <p>Your appointment has been cancelled:</p>
      <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
        <p style="margin: 10px 0;"><strong>Service:</strong> ${appointment.service}</p>
        <p style="margin: 10px 0;"><strong>Date:</strong> ${appointment.date}</p>
        <p style="margin: 10px 0;"><strong>Time:</strong> ${appointment.time}</p>
      </div>
      <p>If you'd like to reschedule, please contact us. We'd be happy to find a new time that works for you.</p>
      <p>Thank you!</p>
    </div>
  `;

  // Let errors bubble up to caller for proper error handling
  await sendEmail({
    to: appointment.customerEmail,
    subject,
    html,
  });
}
