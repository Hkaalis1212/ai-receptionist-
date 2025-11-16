import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { getAIResponse } from "./ai-assistant";
import { chatRequestSchema, insertAppointmentSchema } from "@shared/schema";
import Stripe from "stripe";
import { getTwilioClient, getTwilioFromPhoneNumber } from "./twilio-client";
import { sendAppointmentConfirmationSms } from "./notifications";
import twilio from "twilio";
import { z } from "zod";
import { textToSpeech, getAvailableVoices } from "./elevenlabs-client";
import { getAudiences, getAudienceStats } from "./mailchimp-client";
import { syncAppointmentCustomer, syncConversationCustomer } from "./mailchimp-sync";

// Initialize Stripe - referenced from blueprint:javascript_stripe
// Only initialize if the secret key is provided
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-10-29.clover",
    })
  : null;

export async function registerRoutes(app: Express): Promise<Server> {
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

      // If we have enough info for a booking, create the appointment
      const entities = aiResponse.extractedEntities;
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

      await storage.createSmsMessage({
        twilioMessageSid: MessageSid,
        direction: "inbound",
        from: From,
        to: To,
        body: Body,
        status: "received",
      });

      res.type('text/xml');
      res.send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
    } catch (error) {
      console.error("SMS webhook error:", error);
      res.type('text/xml');
      res.send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
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

      const greeting = `Hello! You've reached ${settings.businessName}. We're an AI-powered receptionist. Please tell us how we can help you today.`;
      
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Play>${req.protocol}://${req.get('host')}/api/twilio/tts?text=${encodeURIComponent(greeting)}&callSid=${CallSid}</Play>
  <Gather input="speech" action="/api/twilio/voice/gather" method="POST" timeout="3" speechTimeout="auto">
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

      const { CallSid, SpeechResult } = req.body;

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

  const httpServer = createServer(app);

  return httpServer;
}
