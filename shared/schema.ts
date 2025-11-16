import { z } from "zod";

// Message schema for chat conversations
export const messageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
  timestamp: z.string(),
  conversationId: z.string(),
});

export const insertMessageSchema = messageSchema.omit({ id: true, timestamp: true });

export type Message = z.infer<typeof messageSchema>;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

// Conversation schema
export const conversationSchema = z.object({
  id: z.string(),
  startedAt: z.string(),
  lastMessageAt: z.string(),
  status: z.enum(["active", "completed", "escalated"]),
  sentiment: z.enum(["positive", "neutral", "negative", "unknown"]).optional(),
  intent: z.enum(["booking", "inquiry", "faq", "general", "unknown"]).optional(),
  customerName: z.string().optional(),
  customerEmail: z.string().optional(),
  customerPhone: z.string().optional(),
});

export const insertConversationSchema = conversationSchema.omit({ id: true, startedAt: true, lastMessageAt: true });

export type Conversation = z.infer<typeof conversationSchema>;
export type InsertConversation = z.infer<typeof insertConversationSchema>;

// Appointment schema
export const appointmentSchema = z.object({
  id: z.string(),
  conversationId: z.string().optional(),
  customerName: z.string(),
  customerEmail: z.string().optional(),
  customerPhone: z.string().optional(),
  service: z.string(),
  date: z.string(),
  time: z.string(),
  status: z.enum(["pending", "confirmed", "cancelled", "completed"]),
  notes: z.string().optional(),
  createdAt: z.string(),
});

export const insertAppointmentSchema = appointmentSchema.omit({ id: true, createdAt: true });

export type Appointment = z.infer<typeof appointmentSchema>;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;

// Analytics schema
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

// Settings schema
export const settingsSchema = z.object({
  businessName: z.string(),
  businessType: z.string(),
  availableServices: z.array(z.string()),
  workingHours: z.object({
    start: z.string(),
    end: z.string(),
  }),
  timezone: z.string(),
  welcomeMessage: z.string().optional(),
  escalationEmail: z.string().optional(),
});

export const insertSettingsSchema = settingsSchema;

export type Settings = z.infer<typeof settingsSchema>;
export type InsertSettings = z.infer<typeof insertSettingsSchema>;

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
