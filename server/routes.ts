import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { getAIResponse } from "./ai-assistant";
import { chatRequestSchema, insertAppointmentSchema } from "@shared/schema";
import Stripe from "stripe";

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

  const httpServer = createServer(app);

  return httpServer;
}
