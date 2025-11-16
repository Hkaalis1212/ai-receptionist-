import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, pgEnum, integer, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const messageRoleEnum = pgEnum("message_role", ["user", "assistant", "system"]);
export const conversationStatusEnum = pgEnum("conversation_status", ["active", "completed", "escalated"]);
export const sentimentEnum = pgEnum("sentiment", ["positive", "neutral", "negative", "unknown"]);
export const intentEnum = pgEnum("intent", ["booking", "inquiry", "faq", "general", "unknown"]);
export const appointmentStatusEnum = pgEnum("appointment_status", ["pending", "confirmed", "cancelled", "completed"]);
export const paymentStatusEnum = pgEnum("payment_status", ["pending", "paid", "failed", "refunded"]);
export const smsDirectionEnum = pgEnum("sms_direction", ["inbound", "outbound"]);
export const smsStatusEnum = pgEnum("sms_status", ["queued", "sent", "delivered", "failed", "received"]);
export const callDirectionEnum = pgEnum("call_direction", ["inbound", "outbound"]);
export const callStatusEnum = pgEnum("call_status", ["initiated", "ringing", "in-progress", "completed", "busy", "failed", "no-answer"]);
export const knowledgeBaseCategoryEnum = pgEnum("knowledge_base_category", ["hours", "services", "policies", "directions", "pricing", "contact", "general"]);
export const customerPriorityEnum = pgEnum("customer_priority", ["standard", "vip", "urgent"]);
export const userRoleEnum = pgEnum("user_role", ["admin", "staff", "viewer"]);
export const invitationStatusEnum = pgEnum("invitation_status", ["pending", "accepted", "expired", "cancelled"]);
export const subscriptionStatusEnum = pgEnum("subscription_status", ["active", "cancelled", "past_due", "trialing"]);

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (required for Replit Auth with role-based access)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: userRoleEnum("role").notNull().default("staff"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const upsertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
});

export type UpsertUser = z.infer<typeof upsertUserSchema>;
export type User = typeof users.$inferSelect;

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
  customerPriority: customerPriorityEnum("customer_priority").default("standard"),
  mailchimpMemberId: text("mailchimp_member_id"),
  mailchimpSyncedAt: timestamp("mailchimp_synced_at"),
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
  customerPriority: customerPriorityEnum("customer_priority").default("standard"),
  service: text("service").notNull(),
  date: text("date").notNull(),
  time: text("time").notNull(),
  status: appointmentStatusEnum("status").notNull().default("pending"),
  amountCents: integer("amount_cents").notNull(),
  paymentStatus: paymentStatusEnum("payment_status").notNull().default("pending"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  mailchimpMemberId: text("mailchimp_member_id"),
  mailchimpSyncedAt: timestamp("mailchimp_synced_at"),
  lastReminderSentAt: timestamp("last_reminder_sent_at"),
});

export const insertAppointmentSchema = createInsertSchema(appointments)
  .omit({ 
    id: true, 
    createdAt: true 
  })
  .extend({
    amountCents: z.number().int().positive({
      message: "Amount must be a positive integer in cents"
    })
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
  elevenLabsVoiceId: text("eleven_labs_voice_id"),
  voiceLanguage: text("voice_language").default("en"),
  customCallScript: text("custom_call_script"),
  privacyPolicyUrl: text("privacy_policy_url"),
  recordingDisclosure: text("recording_disclosure").default("This call may be recorded for quality and training purposes."),
  mailchimpAudienceId: text("mailchimp_audience_id"),
  mailchimpEnableSync: text("mailchimp_enable_sync").$type<"true" | "false">().default("false"),
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
  totalCalls: z.number(),
  totalRevenue: z.number(),
  uniqueCustomers: z.number(),
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

// SMS Messages table
export const smsMessages = pgTable("sms_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  twilioMessageSid: text("twilio_message_sid").unique(),
  direction: smsDirectionEnum("direction").notNull(),
  from: text("from").notNull(),
  to: text("to").notNull(),
  body: text("body").notNull(),
  status: smsStatusEnum("status").notNull().default("queued"),
  conversationId: varchar("conversation_id"),
  appointmentId: varchar("appointment_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertSmsMessageSchema = createInsertSchema(smsMessages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type SmsMessage = typeof smsMessages.$inferSelect;
export type InsertSmsMessage = z.infer<typeof insertSmsMessageSchema>;

// Call Logs table
export const callLogs = pgTable("call_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  twilioCallSid: text("twilio_call_sid").unique(),
  direction: callDirectionEnum("direction").notNull(),
  from: text("from").notNull(),
  to: text("to").notNull(),
  status: callStatusEnum("status").notNull().default("initiated"),
  duration: integer("duration"),
  recordingUrl: text("recording_url"),
  conversationId: varchar("conversation_id"),
  appointmentId: varchar("appointment_id"),
  transcript: text("transcript"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertCallLogSchema = createInsertSchema(callLogs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CallLog = typeof callLogs.$inferSelect;
export type InsertCallLog = z.infer<typeof insertCallLogSchema>;

// Knowledge Base table
export const knowledgeBase = pgTable("knowledge_base", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  category: knowledgeBaseCategoryEnum("category").notNull(),
  isActive: integer("is_active").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertKnowledgeBaseSchema = createInsertSchema(knowledgeBase).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type KnowledgeBase = typeof knowledgeBase.$inferSelect;
export type InsertKnowledgeBase = z.infer<typeof insertKnowledgeBaseSchema>;

// Audit logs table for security and compliance tracking
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  action: text("action").notNull(),
  resource: text("resource").notNull(),
  resourceId: text("resource_id"),
  userId: text("user_id"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  details: text("details"),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  timestamp: true,
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;

// Team invitations table
export const invitations = pgTable("invitations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").notNull(),
  role: userRoleEnum("role").notNull().default("viewer"),
  invitedBy: varchar("invited_by").notNull(),
  status: invitationStatusEnum("status").notNull().default("pending"),
  token: varchar("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  acceptedAt: timestamp("accepted_at"),
});

export const insertInvitationSchema = createInsertSchema(invitations).omit({
  id: true,
  createdAt: true,
  acceptedAt: true,
});

export type Invitation = typeof invitations.$inferSelect;
export type InsertInvitation = z.infer<typeof insertInvitationSchema>;

// Subscriptions table for billing and team member limits
export const subscriptions = pgTable("subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().unique().default("default"),
  plan: text("plan").notNull().default("free"),
  status: subscriptionStatusEnum("status").notNull().default("trialing"),
  maxTeamMembers: integer("max_team_members").notNull().default(3),
  currentTeamMembers: integer("current_team_members").notNull().default(0),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  stripePriceId: text("stripe_price_id"),
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;

// Helper type for settings with working hours object
export type SettingsWithWorkingHours = Omit<Settings, 'workingHoursStart' | 'workingHoursEnd'> & {
  workingHours: {
    start: string;
    end: string;
  };
};
