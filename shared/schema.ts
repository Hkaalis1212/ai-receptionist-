import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, pgEnum, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const messageRoleEnum = pgEnum("message_role", ["user", "assistant", "system"]);
export const conversationStatusEnum = pgEnum("conversation_status", ["active", "completed", "escalated"]);
export const sentimentEnum = pgEnum("sentiment", ["positive", "neutral", "negative", "unknown"]);
export const intentEnum = pgEnum("intent", ["booking", "inquiry", "faq", "general", "unknown"]);
export const appointmentStatusEnum = pgEnum("appointment_status", ["pending", "confirmed", "cancelled", "completed"]);
export const paymentStatusEnum = pgEnum("payment_status", ["pending", "paid", "failed", "refunded"]);

// Messages table
export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  role: messageRoleEnum("role").notNull(),
  content: text("content").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  conversationId: varchar("conversation_id").notNull(),
});

export const insertMessageSchema = createInsertSchema(messages).omit({ 
  id: true, 
  timestamp: true 
});

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

// Conversations table
export const conversations = pgTable("conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  lastMessageAt: timestamp("last_message_at").notNull().defaultNow(),
  status: conversationStatusEnum("status").notNull().default("active"),
  sentiment: sentimentEnum("sentiment").default("unknown"),
  intent: intentEnum("intent").default("unknown"),
  customerName: text("customer_name"),
  customerEmail: text("customer_email"),
  customerPhone: text("customer_phone"),
});

export const insertConversationSchema = createInsertSchema(conversations).omit({ 
  id: true, 
  startedAt: true, 
  lastMessageAt: true 
});

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;

// Appointments table
export const appointments = pgTable("appointments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id"),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email"),
  customerPhone: text("customer_phone"),
  service: text("service").notNull(),
  date: text("date").notNull(),
  time: text("time").notNull(),
  status: appointmentStatusEnum("status").notNull().default("pending"),
  amountCents: integer("amount_cents"),
  paymentStatus: paymentStatusEnum("payment_status").default("pending"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAppointmentSchema = createInsertSchema(appointments).omit({ 
  id: true, 
  createdAt: true 
});

export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;

// Settings table (singleton)
export const settings = pgTable("settings", {
  id: varchar("id").primaryKey().default("default"),
  businessName: text("business_name").notNull(),
  businessType: text("business_type").notNull(),
  businessPhone: text("business_phone"),
  availableServices: text("available_services").array().notNull(),
  workingHoursStart: text("working_hours_start").notNull(),
  workingHoursEnd: text("working_hours_end").notNull(),
  timezone: text("timezone").notNull(),
  welcomeMessage: text("welcome_message"),
  escalationEmail: text("escalation_email"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertSettingsSchema = createInsertSchema(settings).omit({ 
  id: true, 
  updatedAt: true 
});

export type Settings = typeof settings.$inferSelect;
export type InsertSettings = z.infer<typeof insertSettingsSchema>;

// Analytics schema (computed, not stored)
export const analyticsSchema = z.object({
  totalConversations: z.number(),
  activeConversations: z.number(),
  completedConversations: z.number(),
  escalatedConversations: z.number(),
  totalAppointments: z.number(),
  confirmedAppointments: z.number(),
  pendingAppointments: z.number(),
  sentimentBreakdown: z.object({
    positive: z.number(),
    neutral: z.number(),
    negative: z.number(),
    unknown: z.number(),
  }),
  intentBreakdown: z.object({
    booking: z.number(),
    inquiry: z.number(),
    faq: z.number(),
    general: z.number(),
    unknown: z.number(),
  }),
  averageResponseTime: z.number().optional(),
});

export type Analytics = z.infer<typeof analyticsSchema>;

// Chat request/response types
export const chatRequestSchema = z.object({
  message: z.string(),
  conversationId: z.string().optional(),
  metadata: z.object({
    customerName: z.string().optional(),
    customerEmail: z.string().optional(),
    customerPhone: z.string().optional(),
  }).optional(),
});

export const chatResponseSchema = z.object({
  message: z.string(),
  conversationId: z.string(),
  intent: z.enum(["booking", "inquiry", "faq", "general", "unknown"]).optional(),
  sentiment: z.enum(["positive", "neutral", "negative", "unknown"]).optional(),
  requiresEscalation: z.boolean().optional(),
  extractedEntities: z.object({
    name: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    service: z.string().optional(),
    date: z.string().optional(),
    time: z.string().optional(),
  }).optional(),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;
export type ChatResponse = z.infer<typeof chatResponseSchema>;

// Helper type for settings with working hours object
export type SettingsWithWorkingHours = Omit<Settings, 'workingHoursStart' | 'workingHoursEnd'> & {
  workingHours: {
    start: string;
    end: string;
  };
};
