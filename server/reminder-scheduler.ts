import { storage } from './storage';
import { sendAppointmentReminderEmail } from './email-notifications';
import { getTwilioClient, getTwilioFromPhoneNumber } from './twilio-client';

export async function sendAppointmentReminder(appointmentId: string) {
  // Fetch fresh appointment data
  const appointment = await storage.getAppointment(appointmentId);
  
  if (!appointment) {
    const error = new Error(`Appointment not found: ${appointmentId}`);
    console.error(error.message);
    throw error;
  }

  // Don't send reminders for cancelled or completed appointments
  if (appointment.status === 'cancelled' || appointment.status === 'completed') {
    console.log('Skipping reminder for cancelled/completed appointment');
    return; // Normal skip, not an error
  }

  // Idempotency check: skip if reminder was sent in the last 12 hours
  if (appointment.lastReminderSentAt) {
    const lastSent = new Date(appointment.lastReminderSentAt);
    const now = new Date();
    const hoursSinceLastReminder = (now.getTime() - lastSent.getTime()) / (1000 * 60 * 60);
    
    if (hoursSinceLastReminder < 12) {
      console.log(`Reminder already sent ${hoursSinceLastReminder.toFixed(1)}h ago for appointment ${appointmentId}`);
      return; // Normal skip, not an error
    }
  }

  // Update timestamp BEFORE attempting delivery (optimistic approach)
  // This ensures idempotency even if external services fail
  await storage.updateAppointment(appointmentId, {
    lastReminderSentAt: new Date(),
  });

  const deliveryErrors: Error[] = [];

  // Send email reminder
  if (appointment.customerEmail) {
    try {
      await sendAppointmentReminderEmail(appointment);
    } catch (error) {
      console.error('Email reminder failed:', error);
      deliveryErrors.push(error as Error);
    }
  }

  // Send SMS reminder
  if (appointment.customerPhone) {
    try {
      const twilioClient = getTwilioClient();
      const fromNumber = await getTwilioFromPhoneNumber();
      
      if (twilioClient && fromNumber) {
        const client = await twilioClient;
        await client.messages.create({
          body: `Reminder: You have an appointment for ${appointment.service} on ${appointment.date} at ${appointment.time}. See you soon!`,
          to: appointment.customerPhone,
          from: fromNumber,
        });
      }
    } catch (error) {
      console.error('SMS reminder failed:', error);
      deliveryErrors.push(error as Error);
    }
  }

  // If any delivery failed, throw to signal failure to API caller
  if (deliveryErrors.length > 0) {
    const error = new Error(
      `Reminder delivery failed for ${deliveryErrors.length} channel(s): ${deliveryErrors.map(e => e.message).join('; ')}`
    );
    console.error(error.message);
    throw error;
  }

  console.log('Reminder sent successfully for appointment:', appointmentId);
}

export async function scheduleRemindersForUpcomingAppointments() {
  try {
    const appointments = await storage.getAllAppointments();
    const settings = await storage.getSettings();
    
    // Get current date and time
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Find appointments happening tomorrow
    const upcomingAppointments = appointments.filter(apt => {
      if (apt.status === 'cancelled' || apt.status === 'completed') {
        return false;
      }
      
      const aptDate = new Date(apt.date);
      return aptDate.toDateString() === tomorrow.toDateString();
    });

    console.log(`Found ${upcomingAppointments.length} appointments for tomorrow`);

    // Send reminders for each appointment (continue even if some fail)
    for (const appointment of upcomingAppointments) {
      try {
        await sendAppointmentReminder(appointment.id);
      } catch (error) {
        // Log error but continue processing other reminders
        console.error(`Failed to send reminder for appointment ${appointment.id}:`, error);
      }
    }
  } catch (error) {
    console.error('Failed to schedule reminders:', error);
  }
}

// Run reminder check every hour
export function startReminderScheduler() {
  // Run immediately on startup
  scheduleRemindersForUpcomingAppointments().catch(err => {
    console.error('Initial reminder check failed:', err);
  });

  // Then run every hour
  const intervalId = setInterval(() => {
    scheduleRemindersForUpcomingAppointments().catch(err => {
      console.error('Reminder scheduler error:', err);
    });
  }, 60 * 60 * 1000); // Every hour

  console.log('Reminder scheduler started');
  
  return intervalId;
}
