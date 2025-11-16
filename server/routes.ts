import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { getAIResponse } from "./ai-assistant";
import { chatRequestSchema, insertAppointmentSchema } from "@shared/schema";
import Stripe from "stripe";
import { getTwilioClient, getTwilioFromPhoneNumber } from "./twilio-client";
import { sendAppointmentConfirmationSms } from "./notifications";
import { sendAppointmentConfirmationEmail, sendAppointmentCancellationEmail } from "./email-notifications";
import twilio from "twilio";
import { z } from "zod";
import { textToSpeech, getAvailableVoices } from "./elevenlabs-client";
import { getAudiences, getAudienceStats } from "./mailchimp-client";
import { syncAppointmentCustomer, syncConversationCustomer } from "./mailchimp-sync";
import { startReminderScheduler, sendAppointmentReminder } from "./reminder-scheduler";
import { logDataModification, logApiAccess } from "./audit-logger";
import { setupAuth, isAuthenticated, requireRole } from "./replitAuth";

// Initialize Stripe - referenced from blueprint:javascript_stripe
// Only initialize if the secret key is provided
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-10-29.clover",
    })
  : null;

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // User management routes (admin only)
  app.get('/api/users', isAuthenticated, requireRole(['admin']), async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.patch('/api/users/:id/role', isAuthenticated, requireRole(['admin']), async (req, res) => {
    try {
      const { id } = req.params;
      const { role } = req.body;

      if (!['admin', 'staff', 'viewer'].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      const user = await storage.updateUserRole(id, role);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json(user);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  // POST /api/chat - Handle chat messages with AI
  app.post("/api/chat", async (req, res) => {
    try {
      const validatedData = chatRequestSchema.parse(req.body);
      const { message, conversationId, metadata } = validatedData;

      // Get or create conversation
      let conversation = conversationId
        ? await storage.getConversation(conversationId)
        : undefined;

      if (!conversation) {
        conversation = await storage.createConversation({
          status: "active",
          sentiment: "unknown",
          intent: "unknown",
          customerName: metadata?.customerName,
          customerEmail: metadata?.customerEmail,
          customerPhone: metadata?.customerPhone,
        });
      }

      // Save user message
      await storage.createMessage({
        role: "user",
        content: message,
        conversationId: conversation.id,
      });

      // Get conversation history and settings
      const messages = await storage.getMessagesByConversation(conversation.id);
      const settings = await storage.getSettings();

      // Get AI response
      const aiResponse = await getAIResponse(message, { messages, settings });

      // Save AI message
      await storage.createMessage({
        role: "assistant",
        content: aiResponse.message,
        conversationId: conversation.id,
      });

      // Update conversation with extracted information
      const updates: any = {
        intent: aiResponse.intent,
        sentiment: aiResponse.sentiment,
      };

      if (aiResponse.extractedEntities.name) {
        updates.customerName = aiResponse.extractedEntities.name;
      }
      if (aiResponse.extractedEntities.email) {
        updates.customerEmail = aiResponse.extractedEntities.email;
      }
      if (aiResponse.extractedEntities.phone) {
        updates.customerPhone = aiResponse.extractedEntities.phone;
      }

      if (aiResponse.requiresEscalation) {
        updates.status = "escalated";
      }

      conversation = await storage.updateConversation(conversation.id, updates);

      // Handle appointment intents
      const entities = aiResponse.extractedEntities;
      
      // Handle booking - create new appointment
      if (
        aiResponse.intent === "booking" &&
        entities.name &&
        entities.service &&
        entities.date &&
        entities.time
      ) {
        await storage.createAppointment({
          conversationId: conversation!.id,
          customerName: entities.name,
          customerEmail: entities.email,
          customerPhone: entities.phone,
          service: entities.service,
          date: entities.date,
          time: entities.time,
          status: "pending",
          amountCents: 5000, // Default $50.00 - can be configured per service
          paymentStatus: "pending",
          notes: `Booked via AI Receptionist`,
        });

        await storage.updateConversation(conversation!.id, {
          status: "completed",
        });
      }
      
      // Handle reschedule - update existing appointment
      if (aiResponse.intent === "reschedule" && entities.name) {
        // Find customer's appointment by name/email/phone (fresh query)
        const appointments = await storage.getAllAppointments();
        const customerAppointment = appointments.find(apt => 
          apt.status !== "cancelled" && apt.status !== "completed" &&
          (apt.customerName.toLowerCase() === entities.name?.toLowerCase() ||
           (entities.email && apt.customerEmail?.toLowerCase() === entities.email.toLowerCase()) ||
           (entities.phone && apt.customerPhone === entities.phone))
        );

        if (customerAppointment && entities.date && entities.time) {
          const updated = await storage.updateAppointment(customerAppointment.id, {
            date: entities.date,
            time: entities.time,
            service: entities.service || customerAppointment.service,
          });
          
          // Re-fetch to ensure we have latest data
          const refreshed = await storage.getAppointment(customerAppointment.id);
          
          // Send update notifications with the REFRESHED appointment
          if (refreshed) {
            sendAppointmentConfirmationSms(refreshed).catch(err => {
              console.error("Failed to send reschedule SMS:", err);
            });
            
            sendAppointmentConfirmationEmail(refreshed).catch(err => {
              console.error("Failed to send reschedule email:", err);
            });
            
            syncAppointmentCustomer(refreshed).catch(err => {
              console.error("Failed to sync rescheduled appointment to Mailchimp:", err);
            });
          }
        }
      }
      
      // Handle cancel - cancel existing appointment
      if (aiResponse.intent === "cancel" && entities.name) {
        // Find customer's appointment by name/email/phone (fresh query)
        const appointments = await storage.getAllAppointments();
        const customerAppointment = appointments.find(apt => 
          apt.status !== "cancelled" && apt.status !== "completed" &&
          (apt.customerName.toLowerCase() === entities.name?.toLowerCase() ||
           (entities.email && apt.customerEmail?.toLowerCase() === entities.email.toLowerCase()) ||
           (entities.phone && apt.customerPhone === entities.phone))
        );

        if (customerAppointment) {
          const cancelled = await storage.updateAppointment(customerAppointment.id, {
            status: "cancelled",
          });
          
          // Re-fetch to ensure we have latest data
          const refreshed = await storage.getAppointment(customerAppointment.id);
          
          // Send cancellation notifications with the REFRESHED appointment
          if (refreshed) {
            if (refreshed.customerPhone) {
              const twilioClient = getTwilioClient();
              const fromNumber = await getTwilioFromPhoneNumber();
              
              if (twilioClient && fromNumber) {
                const client = await twilioClient;
                client.messages.create({
                  body: `Your appointment for ${refreshed.service} on ${refreshed.date} at ${refreshed.time} has been cancelled. Contact us if you'd like to reschedule.`,
                  to: refreshed.customerPhone,
                  from: fromNumber,
                }).catch((err: any) => {
                  console.error("Failed to send cancellation SMS:", err);
                });
              }
            }
            
            sendAppointmentCancellationEmail(refreshed).catch(err => {
              console.error("Failed to send cancellation email:", err);
            });
            
            syncAppointmentCustomer(refreshed).catch(err => {
              console.error("Failed to sync cancelled appointment to Mailchimp:", err);
            });
          }
        }
      }

      res.json({
        message: aiResponse.message,
        conversationId: conversation!.id,
        intent: aiResponse.intent,
        sentiment: aiResponse.sentiment,
        requiresEscalation: aiResponse.requiresEscalation,
        extractedEntities: aiResponse.extractedEntities,
      });
    } catch (error) {
      console.error("Chat error:", error);
      res.status(500).json({ error: "Failed to process message" });
    }
  });

  // POST /api/appointments - Create appointment
  app.post("/api/appointments", async (req, res) => {
    try {
      const validatedData = insertAppointmentSchema.parse(req.body);
      const appointment = await storage.createAppointment(validatedData);
      
      // Send confirmation notifications
      sendAppointmentConfirmationSms(appointment).catch(err => {
        console.error("Failed to send confirmation SMS:", err);
      });
      
      sendAppointmentConfirmationEmail(appointment).catch(err => {
        console.error("Failed to send confirmation email:", err);
      });
      
      // Auto-sync to Mailchimp if enabled
      syncAppointmentCustomer(appointment).catch(err => {
        console.error("Failed to sync appointment to Mailchimp:", err);
      });
      
      res.json(appointment);
    } catch (error) {
      console.error("Create appointment error:", error);
      res.status(400).json({ error: "Invalid appointment data" });
    }
  });

  // GET /api/appointments - List all appointments
  app.get("/api/appointments", async (req, res) => {
    try {
      const appointments = await storage.getAllAppointments();
      res.json(appointments);
    } catch (error) {
      console.error("Get appointments error:", error);
      res.status(500).json({ error: "Failed to fetch appointments" });
    }
  });

  // GET /api/appointments/:id - Get single appointment
  app.get("/api/appointments/:id", async (req, res) => {
    try {
      const appointment = await storage.getAppointment(req.params.id);
      if (!appointment) {
        return res.status(404).json({ error: "Appointment not found" });
      }
      res.json(appointment);
    } catch (error) {
      console.error("Get appointment error:", error);
      res.status(500).json({ error: "Failed to fetch appointment" });
    }
  });

  // PUT /api/appointments/:id - Update appointment
  app.put("/api/appointments/:id", async (req, res) => {
    try {
      const appointment = await storage.getAppointment(req.params.id);
      if (!appointment) {
        return res.status(404).json({ error: "Appointment not found" });
      }

      // Validate update data
      const updateSchema = insertAppointmentSchema.partial();
      const validatedData = updateSchema.parse(req.body);

      const updated = await storage.updateAppointment(req.params.id, validatedData);
      
      if (updated) {
        // Send notifications about the change
        sendAppointmentConfirmationSms(updated).catch(err => {
          console.error("Failed to send update SMS:", err);
        });
        
        sendAppointmentConfirmationEmail(updated).catch(err => {
          console.error("Failed to send update email:", err);
        });
        
        // Sync to Mailchimp if enabled
        syncAppointmentCustomer(updated).catch(err => {
          console.error("Failed to sync updated appointment to Mailchimp:", err);
        });
      }

      res.json(updated);
    } catch (error) {
      console.error("Update appointment error:", error);
      res.status(400).json({ error: "Invalid appointment data" });
    }
  });

  // POST /api/appointments/:id/cancel - Cancel appointment
  app.post("/api/appointments/:id/cancel", async (req, res) => {
    try {
      const appointment = await storage.getAppointment(req.params.id);
      if (!appointment) {
        return res.status(404).json({ error: "Appointment not found" });
      }

      if (appointment.status === "cancelled") {
        return res.status(400).json({ error: "Appointment is already cancelled" });
      }

      const updated = await storage.updateAppointment(req.params.id, {
        status: "cancelled",
      });

      if (updated) {
        // Send cancellation notifications
        if (updated.customerPhone) {
          const twilioClient = getTwilioClient();
          const fromNumber = await getTwilioFromPhoneNumber();
          
          if (twilioClient && fromNumber) {
            const client = await twilioClient;
            client.messages.create({
              body: `Your appointment for ${updated.service} on ${updated.date} at ${updated.time} has been cancelled. Contact us if you'd like to reschedule.`,
              to: updated.customerPhone,
              from: fromNumber,
            }).catch((err: any) => {
              console.error("Failed to send cancellation SMS:", err);
            });
          }
        }
        
        sendAppointmentCancellationEmail(updated).catch(err => {
          console.error("Failed to send cancellation email:", err);
        });
      }

      res.json(updated);
    } catch (error) {
      console.error("Cancel appointment error:", error);
      res.status(500).json({ error: "Failed to cancel appointment" });
    }
  });

  // POST /api/create-payment-intent - Create Stripe payment intent for appointment
  // Referenced from blueprint:javascript_stripe
  app.post("/api/create-payment-intent", async (req, res) => {
    try {
      // Check if Stripe is configured
      if (!stripe) {
        return res.status(503).json({ 
          error: "Stripe payment processing is not configured. Please contact support." 
        });
      }

      const { appointmentId } = req.body;

      if (!appointmentId) {
        return res.status(400).json({ error: "Missing appointmentId" });
      }

      // Fetch appointment from database to get the authoritative amount
      const appointment = await storage.getAppointment(appointmentId);

      if (!appointment) {
        return res.status(404).json({ error: "Appointment not found" });
      }

      // Validate appointment has an amount set
      if (!appointment.amountCents || appointment.amountCents <= 0) {
        return res.status(400).json({ 
          error: "Appointment does not have a valid payment amount" 
        });
      }

      // Create PaymentIntent with Stripe using the amount from the database
      const paymentIntent = await stripe.paymentIntents.create({
        amount: appointment.amountCents,
        currency: "usd",
        metadata: {
          appointmentId,
        },
      });

      // Update appointment with payment intent ID
      await storage.updateAppointment(appointmentId, {
        stripePaymentIntentId: paymentIntent.id,
      });

      res.json({ 
        clientSecret: paymentIntent.client_secret,
        amount: appointment.amountCents 
      });
    } catch (error: any) {
      console.error("Create payment intent error:", error);
      res.status(500).json({ 
        error: "Error creating payment intent: " + error.message 
      });
    }
  });

  // POST /api/confirm-payment - Update appointment after successful payment
  app.post("/api/confirm-payment", async (req, res) => {
    try {
      const { appointmentId } = req.body;

      if (!appointmentId) {
        return res.status(400).json({ error: "Missing appointmentId" });
      }

      // Update appointment payment status
      const appointment = await storage.updateAppointment(appointmentId, {
        paymentStatus: "paid",
        status: "confirmed",
      });

      // Send confirmation SMS if phone number is available
      if (appointment) {
        sendAppointmentConfirmationSms(appointment).catch(err => {
          console.error("Failed to send confirmation SMS:", err);
        });
        
        // Auto-sync to Mailchimp on payment confirmation
        syncAppointmentCustomer(appointment).catch(err => {
          console.error("Failed to sync appointment to Mailchimp:", err);
        });
      }

      res.json(appointment);
    } catch (error: any) {
      console.error("Confirm payment error:", error);
      res.status(500).json({ 
        error: "Error confirming payment: " + error.message 
      });
    }
  });

  // GET /api/analytics - Get analytics data
  app.get("/api/analytics", async (req, res) => {
    try {
      const analytics = await storage.getAnalytics();
      res.json(analytics);
    } catch (error) {
      console.error("Get analytics error:", error);
      res.status(500).json({ error: "Failed to fetch analytics" });
    }
  });

  // GET /api/audit-logs - Get audit logs (for admin dashboard)
  app.get("/api/audit-logs", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const logs = await storage.getAllAuditLogs(limit);
      res.json(logs);
    } catch (error) {
      console.error("Get audit logs error:", error);
      res.status(500).json({ error: "Failed to fetch audit logs" });
    }
  });

  // GET /api/settings - Get settings
  app.get("/api/settings", async (req, res) => {
    try {
      const settings = await storage.getSettings();
      res.json(settings);
    } catch (error) {
      console.error("Get settings error:", error);
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  // POST /api/settings - Update settings
  app.post("/api/settings", async (req, res) => {
    try {
      const settings = await storage.updateSettings(req.body);
      await logDataModification("UPDATE", "settings", "default", req, "Business settings updated");
      res.json(settings);
    } catch (error) {
      console.error("Update settings error:", error);
      res.status(400).json({ error: "Invalid settings data" });
    }
  });

  // Validation schema for sending SMS
  const sendSmsSchema = z.object({
    to: z.string().min(1, "Phone number is required"),
    body: z.string().min(1, "Message body is required"),
    appointmentId: z.string().optional(),
  });

  // POST /api/twilio/sms/send - Send SMS
  app.post("/api/twilio/sms/send", async (req, res) => {
    try {
      const validatedData = sendSmsSchema.parse(req.body);
      const { to, body, appointmentId } = validatedData;

      const twilioClient = await getTwilioClient();
      const fromNumber = await getTwilioFromPhoneNumber();

      if (!fromNumber) {
        return res.status(500).json({ 
          error: "Twilio phone number not configured" 
        });
      }

      const message = await twilioClient.messages.create({
        to,
        from: fromNumber,
        body,
      });

      const smsMessage = await storage.createSmsMessage({
        twilioMessageSid: message.sid,
        direction: "outbound",
        from: fromNumber,
        to,
        body,
        status: "sent",
        appointmentId,
      });

      res.json(smsMessage);
    } catch (error) {
      console.error("Send SMS error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to send SMS" });
    }
  });

  // Helper function to validate Twilio webhook signature
  async function validateTwilioRequest(req: any): Promise<boolean> {
    try {
      const twilioClient = await getTwilioClient();
      const authToken = (twilioClient as any).password;
      
      const twilioSignature = req.headers['x-twilio-signature'];
      if (!twilioSignature) {
        console.error("Missing Twilio signature header");
        return false;
      }

      const url = `https://${req.headers.host}${req.originalUrl}`;
      const isValid = twilio.validateRequest(
        authToken,
        twilioSignature,
        url,
        req.body
      );

      if (!isValid) {
        console.error("Invalid Twilio signature");
      }

      return isValid;
    } catch (error) {
      console.error("Twilio validation error:", error);
      return false;
    }
  }

  // POST /api/twilio/sms/webhook - Receive SMS (Twilio webhook)
  app.post("/api/twilio/sms/webhook", async (req, res) => {
    try {
      // Validate Twilio signature
      const isValid = await validateTwilioRequest(req);
      if (!isValid) {
        return res.status(403).send('Forbidden');
      }

      const { MessageSid, From, To, Body } = req.body;

      // Store incoming SMS
      await storage.createSmsMessage({
        twilioMessageSid: MessageSid,
        direction: "inbound",
        from: From,
        to: To,
        body: Body,
        status: "received",
      });

      // Find or create conversation for this phone number
      const conversations = await storage.getAllConversations();
      let conversation = conversations.find(c => c.customerPhone === From);
      
      if (!conversation) {
        conversation = await storage.createConversation({
          status: "active",
          sentiment: "unknown",
          intent: "unknown",
          customerPhone: From,
        });
      }

      // Get conversation history and settings
      const messages = await storage.getMessagesByConversation(conversation.id);
      const settings = await storage.getSettings();

      // Get AI response
      const aiResponse = await getAIResponse(Body, { messages, settings });

      // Save user message
      await storage.createMessage({
        role: "user",
        content: Body,
        conversationId: conversation.id,
      });

      // Save AI message
      await storage.createMessage({
        role: "assistant",
        content: aiResponse.message,
        conversationId: conversation.id,
      });

      // Update conversation with extracted information
      const updates: any = {
        intent: aiResponse.intent,
        sentiment: aiResponse.sentiment,
      };

      if (aiResponse.extractedEntities.name) {
        updates.customerName = aiResponse.extractedEntities.name;
      }
      if (aiResponse.extractedEntities.email) {
        updates.customerEmail = aiResponse.extractedEntities.email;
      }

      await storage.updateConversation(conversation.id, updates);

      // Handle appointment actions
      const entities = aiResponse.extractedEntities;
      
      // Handle booking
      if (
        aiResponse.intent === "booking" &&
        entities.name &&
        entities.service &&
        entities.date &&
        entities.time
      ) {
        await storage.createAppointment({
          conversationId: conversation.id,
          customerName: entities.name,
          customerEmail: entities.email,
          customerPhone: From,
          service: entities.service,
          date: entities.date,
          time: entities.time,
          status: "pending",
          amountCents: 5000,
          paymentStatus: "pending",
          notes: `Booked via SMS`,
        });
      }

      // Handle reschedule
      if (aiResponse.intent === "reschedule" && entities.name) {
        const appointments = await storage.getAllAppointments();
        const customerAppointment = appointments.find(apt => 
          apt.status !== "cancelled" && apt.status !== "completed" &&
          (apt.customerPhone === From || apt.customerName.toLowerCase() === entities.name?.toLowerCase())
        );

        if (customerAppointment && entities.date && entities.time) {
          const updated = await storage.updateAppointment(customerAppointment.id, {
            date: entities.date,
            time: entities.time,
            service: entities.service || customerAppointment.service,
          });
          
          // Confirmation will be sent via TwiML response automatically
        }
      }

      // Handle cancel
      if (aiResponse.intent === "cancel") {
        const appointments = await storage.getAllAppointments();
        const customerAppointment = appointments.find(apt => 
          apt.status !== "cancelled" && apt.status !== "completed" &&
          apt.customerPhone === From
        );

        if (customerAppointment) {
          const cancelled = await storage.updateAppointment(customerAppointment.id, {
            status: "cancelled",
          });
          
          // Confirmation will be sent via TwiML response automatically
        }
      }

      // Send AI response back via TwiML
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${aiResponse.message}</Message>
</Response>`;

      res.type('text/xml');
      res.send(twiml);
    } catch (error) {
      console.error("SMS webhook error:", error);
      const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Sorry, we're experiencing technical difficulties. Please try again later or call us.</Message>
</Response>`;
      res.type('text/xml');
      res.send(errorTwiml);
    }
  });

  // POST /api/twilio/voice/webhook - Handle incoming calls (Twilio webhook)
  app.post("/api/twilio/voice/webhook", async (req, res) => {
    try {
      // Validate Twilio signature
      const isValid = await validateTwilioRequest(req);
      if (!isValid) {
        return res.status(403).send('Forbidden');
      }

      const { CallSid, From, To, CallStatus } = req.body;

      let callLog = await storage.getCallLogBySid(CallSid);
      
      if (!callLog) {
        callLog = await storage.createCallLog({
          twilioCallSid: CallSid,
          direction: "inbound",
          from: From,
          to: To,
          status: CallStatus || "initiated",
        });
      }

      const settings = await storage.getSettings();

      // Personalized caller identification: Look up caller by phone number
      let customerName: string | null = null;
      let customerPriority: string = "standard";
      let shouldEscalate = false;

      // Check for existing customer by phone number
      const existingConversations = await storage.getAllConversations();
      const knownConversation = existingConversations.find(c => c.customerPhone === From);
      if (knownConversation) {
        customerName = knownConversation.customerName;
        customerPriority = knownConversation.customerPriority || "standard";
      } else {
        // Check appointments
        const appointments = await storage.getAllAppointments();
        const knownAppointment = appointments.find(a => a.customerPhone === From);
        if (knownAppointment) {
          customerName = knownAppointment.customerName;
          customerPriority = knownAppointment.customerPriority || "standard";
        }
      }

      // Intelligent routing: Check business hours
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentTime = currentHour * 60 + currentMinute;
      
      const [startHour, startMin] = settings.workingHoursStart.split(":").map(Number);
      const [endHour, endMin] = settings.workingHoursEnd.split(":").map(Number);
      const startTime = startHour * 60 + startMin;
      const endTime = endHour * 60 + endMin;
      
      const isDuringBusinessHours = currentTime >= startTime && currentTime <= endTime;

      // Escalate VIP or urgent customers, or calls outside business hours
      if (customerPriority === "vip" || customerPriority === "urgent" || !isDuringBusinessHours) {
        shouldEscalate = true;
      }

      // Start call recording using Twilio REST API
      const twilioClient = getTwilioClient();
      if (twilioClient) {
        const client = await twilioClient;
        try {
          await client.calls(CallSid).recordings.create({
            recordingStatusCallback: `${req.protocol}://${req.get('host')}/api/twilio/voice/status`,
          });
        } catch (error) {
          console.error("Failed to start call recording:", error);
        }
      }

      // Build personalized greeting with privacy disclosure
      let greeting = "";
      
      // Privacy disclosure (compliance requirement)
      const disclosure = settings.recordingDisclosure || "This call may be recorded for quality and training purposes.";
      greeting += disclosure + " ";

      // Personalized greeting if caller is known
      if (customerName) {
        greeting += `Hello ${customerName}! Welcome back to ${settings.businessName}. `;
        if (customerPriority === "vip") {
          greeting += "As one of our valued VIP customers, we're giving you priority service. ";
        }
      } else {
        greeting += `Hello! You've reached ${settings.businessName}. `;
      }

      // Custom call script or default message
      if (settings.customCallScript) {
        greeting += settings.customCallScript;
      } else {
        if (!isDuringBusinessHours) {
          greeting += `We're currently outside our business hours of ${settings.workingHoursStart} to ${settings.workingHoursEnd}. However, our AI assistant is here to help. `;
        }
        greeting += "Please tell us how we can help you today.";
      }

      // Escalation routing
      let routingAction = "/api/twilio/voice/gather";
      if (shouldEscalate && settings.escalationEmail) {
        // In a real system, this would trigger an alert to staff
        console.log(`ESCALATION ALERT: ${customerPriority} customer ${customerName || "Unknown"} calling from ${From}`);
      }
      
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Play>${req.protocol}://${req.get('host')}/api/twilio/tts?text=${encodeURIComponent(greeting)}&callSid=${CallSid}</Play>
  <Gather input="speech" action="${routingAction}" method="POST" timeout="3" speechTimeout="auto">
    <Pause length="1"/>
  </Gather>
  <Play>${req.protocol}://${req.get('host')}/api/twilio/tts?text=${encodeURIComponent("We didn't receive your response. Please call back. Goodbye!")}</Play>
</Response>`;

      res.type('text/xml');
      res.send(twiml);
    } catch (error) {
      console.error("Voice webhook error:", error);
      const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">We're experiencing technical difficulties. Please try again later. Goodbye!</Say>
</Response>`;
      res.type('text/xml');
      res.send(errorTwiml);
    }
  });

  // POST /api/twilio/voice/gather - Process speech input from call
  app.post("/api/twilio/voice/gather", async (req, res) => {
    try {
      // Validate Twilio signature
      const isValid = await validateTwilioRequest(req);
      if (!isValid) {
        return res.status(403).send('Forbidden');
      }

      const { CallSid, SpeechResult, From } = req.body;

      let callLog = await storage.getCallLogBySid(CallSid);
      
      if (callLog) {
        await storage.updateCallLog(callLog.id, {
          transcript: SpeechResult,
          status: "in-progress",
        });
      }

      const settings = await storage.getSettings();
      const messages: any[] = [];

      const aiResponse = await getAIResponse(SpeechResult || "Hello", {
        messages,
        settings,
      });

      // Handle appointment actions via phone call
      const entities = aiResponse.extractedEntities;
      
      // Handle booking
      if (
        aiResponse.intent === "booking" &&
        entities.name &&
        entities.service &&
        entities.date &&
        entities.time
      ) {
        await storage.createAppointment({
          customerName: entities.name,
          customerEmail: entities.email,
          customerPhone: From,
          service: entities.service,
          date: entities.date,
          time: entities.time,
          status: "pending",
          amountCents: 5000,
          paymentStatus: "pending",
          notes: `Booked via phone call`,
        });
      }

      // Handle reschedule
      if (aiResponse.intent === "reschedule" && From) {
        const appointments = await storage.getAllAppointments();
        const customerAppointment = appointments.find(apt => 
          apt.status !== "cancelled" && apt.status !== "completed" &&
          apt.customerPhone === From
        );

        if (customerAppointment && entities.date && entities.time) {
          const updated = await storage.updateAppointment(customerAppointment.id, {
            date: entities.date,
            time: entities.time,
            service: entities.service || customerAppointment.service,
          });
          
          // AI voice response will confirm the update
        }
      }

      // Handle cancel
      if (aiResponse.intent === "cancel" && From) {
        const appointments = await storage.getAllAppointments();
        const customerAppointment = appointments.find(apt => 
          apt.status !== "cancelled" && apt.status !== "completed" &&
          apt.customerPhone === From
        );

        if (customerAppointment) {
          const cancelled = await storage.updateAppointment(customerAppointment.id, {
            status: "cancelled",
          });
          
          // AI voice response will confirm the cancellation
        }
      }

      const followUp = "Is there anything else I can help you with?";
      const goodbye = "Thank you for calling. Goodbye!";

      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Play>${req.protocol}://${req.get('host')}/api/twilio/tts?text=${encodeURIComponent(aiResponse.message)}</Play>
  <Gather input="speech" action="/api/twilio/voice/gather" method="POST" timeout="3" speechTimeout="auto">
    <Play>${req.protocol}://${req.get('host')}/api/twilio/tts?text=${encodeURIComponent(followUp)}</Play>
  </Gather>
  <Play>${req.protocol}://${req.get('host')}/api/twilio/tts?text=${encodeURIComponent(goodbye)}</Play>
  <Hangup/>
</Response>`;

      res.type('text/xml');
      res.send(twiml);
    } catch (error) {
      console.error("Voice gather error:", error);
      const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">I apologize, but I'm having trouble understanding. Please try again later. Goodbye!</Say>
  <Hangup/>
</Response>`;
      res.type('text/xml');
      res.send(errorTwiml);
    }
  });

  // POST /api/twilio/voice/status - Call status updates (Twilio webhook)
  app.post("/api/twilio/voice/status", async (req, res) => {
    try {
      // Validate Twilio signature
      const isValid = await validateTwilioRequest(req);
      if (!isValid) {
        return res.status(403).send('Forbidden');
      }

      const { CallSid, CallStatus, CallDuration, RecordingUrl } = req.body;

      const callLog = await storage.getCallLogBySid(CallSid);
      
      if (callLog) {
        await storage.updateCallLog(callLog.id, {
          status: CallStatus,
          duration: CallDuration ? parseInt(CallDuration) : undefined,
          recordingUrl: RecordingUrl,
        });
      }

      res.sendStatus(200);
    } catch (error) {
      console.error("Voice status webhook error:", error);
      res.sendStatus(200);
    }
  });

  // GET /api/communications - Get SMS and call logs
  app.get("/api/communications", async (req, res) => {
    try {
      const smsMessages = await storage.getAllSmsMessages();
      const callLogs = await storage.getAllCallLogs();
      
      res.json({ smsMessages, callLogs });
    } catch (error) {
      console.error("Get communications error:", error);
      res.status(500).json({ error: "Failed to fetch communications" });
    }
  });

  // GET /api/twilio/tts - Generate speech audio with ElevenLabs
  app.get("/api/twilio/tts", async (req, res) => {
    try {
      const text = req.query.text as string;
      
      if (!text) {
        return res.status(400).send("Missing text parameter");
      }

      const settings = await storage.getSettings();
      const voiceId = settings.elevenLabsVoiceId || undefined;

      const audioBuffer = await textToSpeech(text, voiceId);
      
      res.set({
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length,
      });
      
      res.send(audioBuffer);
    } catch (error) {
      console.error("TTS error:", error);
      res.status(500).send("Text-to-speech generation failed");
    }
  });

  // GET /api/elevenlabs/voices - Get available ElevenLabs voices
  app.get("/api/elevenlabs/voices", async (req, res) => {
    try {
      const voices = await getAvailableVoices();
      res.json(voices);
    } catch (error) {
      console.error("Get voices error:", error);
      res.status(500).json({ error: "Failed to fetch voices" });
    }
  });

  // GET /api/mailchimp/audiences - Get Mailchimp audiences/lists
  app.get("/api/mailchimp/audiences", async (req, res) => {
    try {
      const audiences = await getAudiences();
      res.json(audiences);
    } catch (error) {
      console.error("Get Mailchimp audiences error:", error);
      res.status(500).json({ error: "Failed to fetch audiences" });
    }
  });

  // GET /api/mailchimp/stats - Get Mailchimp audience statistics
  app.get("/api/mailchimp/stats", async (req, res) => {
    try {
      const settings = await storage.getSettings();
      
      if (!settings.mailchimpAudienceId) {
        return res.json({ configured: false });
      }

      const stats = await getAudienceStats(settings.mailchimpAudienceId);
      res.json({ configured: true, stats });
    } catch (error) {
      console.error("Get Mailchimp stats error:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // POST /api/mailchimp/sync-appointment - Manually sync an appointment to Mailchimp
  app.post("/api/mailchimp/sync-appointment", async (req, res) => {
    try {
      const { appointmentId } = req.body;
      
      if (!appointmentId) {
        return res.status(400).json({ error: "appointmentId is required" });
      }

      const appointment = await storage.getAppointment(appointmentId);
      
      if (!appointment) {
        return res.status(404).json({ error: "Appointment not found" });
      }

      const result = await syncAppointmentCustomer(appointment);
      res.json(result);
    } catch (error) {
      console.error("Sync appointment error:", error);
      res.status(500).json({ error: "Failed to sync appointment" });
    }
  });

  // POST /api/mailchimp/sync-conversation - Manually sync a conversation to Mailchimp
  app.post("/api/mailchimp/sync-conversation", async (req, res) => {
    try {
      const { conversationId } = req.body;
      
      if (!conversationId) {
        return res.status(400).json({ error: "conversationId is required" });
      }

      const conversation = await storage.getConversation(conversationId);
      
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      const result = await syncConversationCustomer(conversation);
      res.json(result);
    } catch (error) {
      console.error("Sync conversation error:", error);
      res.status(500).json({ error: "Failed to sync conversation" });
    }
  });

  // POST /api/reminders/send - Manually send reminder for an appointment
  app.post("/api/reminders/send", async (req, res) => {
    try {
      const { appointmentId } = req.body;
      
      if (!appointmentId) {
        return res.status(400).json({ error: "appointmentId is required" });
      }

      await sendAppointmentReminder(appointmentId);
      res.json({ success: true, message: "Reminder sent successfully" });
    } catch (error) {
      console.error("Send reminder error:", error);
      res.status(500).json({ error: "Failed to send reminder" });
    }
  });

  // Knowledge Base endpoints
  // GET /api/knowledge-base - Get all knowledge base entries
  app.get("/api/knowledge-base", async (req, res) => {
    try {
      const entries = await storage.getAllKnowledgeBase();
      res.json(entries);
    } catch (error) {
      console.error("Get knowledge base error:", error);
      res.status(500).json({ error: "Failed to fetch knowledge base" });
    }
  });

  // POST /api/knowledge-base - Create new knowledge base entry
  app.post("/api/knowledge-base", async (req, res) => {
    try {
      const entry = await storage.createKnowledgeBase(req.body);
      await logDataModification("CREATE", "knowledge_base", entry.id, req, `KB entry: ${entry.question.substring(0, 50)}`);
      res.json(entry);
    } catch (error) {
      console.error("Create knowledge base error:", error);
      res.status(500).json({ error: "Failed to create knowledge base entry" });
    }
  });

  // PUT /api/knowledge-base/:id - Update knowledge base entry
  app.put("/api/knowledge-base/:id", async (req, res) => {
    try {
      const updated = await storage.updateKnowledgeBase(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ error: "Knowledge base entry not found" });
      }
      await logDataModification("UPDATE", "knowledge_base", req.params.id, req, "KB entry updated");
      res.json(updated);
    } catch (error) {
      console.error("Update knowledge base error:", error);
      res.status(500).json({ error: "Failed to update knowledge base entry" });
    }
  });

  // DELETE /api/knowledge-base/:id - Delete knowledge base entry
  app.delete("/api/knowledge-base/:id", async (req, res) => {
    try {
      await storage.deleteKnowledgeBase(req.params.id);
      await logDataModification("DELETE", "knowledge_base", req.params.id, req, "KB entry deleted");
      res.json({ success: true });
    } catch (error) {
      console.error("Delete knowledge base error:", error);
      res.status(500).json({ error: "Failed to delete knowledge base entry" });
    }
  });

  // Start the reminder scheduler
  startReminderScheduler();

  const httpServer = createServer(app);

  return httpServer;
}
