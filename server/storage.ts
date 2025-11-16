import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq, desc, sql } from "drizzle-orm";
import * as schema from "@shared/schema";
import {
  type Message,
  type InsertMessage,
  type Conversation,
  type InsertConversation,
  type Appointment,
  type InsertAppointment,
  type Settings,
  type InsertSettings,
  type SettingsWithWorkingHours,
  type Analytics,
} from "@shared/schema";

const client = neon(process.env.DATABASE_URL!);
const db = drizzle(client, { schema });

export interface IStorage {
  // Messages
  createMessage(message: InsertMessage): Promise<Message>;
  getMessagesByConversation(conversationId: string): Promise<Message[]>;

  // Conversations
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  getConversation(id: string): Promise<Conversation | undefined>;
  updateConversation(
    id: string,
    updates: Partial<Conversation>
  ): Promise<Conversation | undefined>;
  getAllConversations(): Promise<Conversation[]>;

  // Appointments
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  getAppointment(id: string): Promise<Appointment | undefined>;
  getAllAppointments(): Promise<Appointment[]>;
  updateAppointment(
    id: string,
    updates: Partial<Appointment>
  ): Promise<Appointment | undefined>;

  // Settings
  getSettings(): Promise<SettingsWithWorkingHours>;
  updateSettings(settings: Partial<InsertSettings>): Promise<SettingsWithWorkingHours>;

  // Analytics
  getAnalytics(): Promise<Analytics>;
}

export class DatabaseStorage implements IStorage {
  // Messages
  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const [message] = await db
      .insert(schema.messages)
      .values(insertMessage)
      .returning();
    return message;
  }

  async getMessagesByConversation(conversationId: string): Promise<Message[]> {
    return await db
      .select()
      .from(schema.messages)
      .where(eq(schema.messages.conversationId, conversationId))
      .orderBy(schema.messages.timestamp);
  }

  // Conversations
  async createConversation(
    insertConversation: InsertConversation
  ): Promise<Conversation> {
    const [conversation] = await db
      .insert(schema.conversations)
      .values(insertConversation)
      .returning();
    return conversation;
  }

  async getConversation(id: string): Promise<Conversation | undefined> {
    const [conversation] = await db
      .select()
      .from(schema.conversations)
      .where(eq(schema.conversations.id, id));
    return conversation;
  }

  async updateConversation(
    id: string,
    updates: Partial<Conversation>
  ): Promise<Conversation | undefined> {
    const [updated] = await db
      .update(schema.conversations)
      .set({ ...updates, lastMessageAt: new Date() })
      .where(eq(schema.conversations.id, id))
      .returning();
    return updated;
  }

  async getAllConversations(): Promise<Conversation[]> {
    return await db
      .select()
      .from(schema.conversations)
      .orderBy(desc(schema.conversations.lastMessageAt));
  }

  // Appointments
  async createAppointment(
    insertAppointment: InsertAppointment
  ): Promise<Appointment> {
    const [appointment] = await db
      .insert(schema.appointments)
      .values(insertAppointment)
      .returning();
    return appointment;
  }

  async getAppointment(id: string): Promise<Appointment | undefined> {
    const [appointment] = await db
      .select()
      .from(schema.appointments)
      .where(eq(schema.appointments.id, id));
    return appointment;
  }

  async getAllAppointments(): Promise<Appointment[]> {
    return await db
      .select()
      .from(schema.appointments)
      .orderBy(desc(schema.appointments.createdAt));
  }

  async updateAppointment(
    id: string,
    updates: Partial<Appointment>
  ): Promise<Appointment | undefined> {
    const [updated] = await db
      .update(schema.appointments)
      .set(updates)
      .where(eq(schema.appointments.id, id))
      .returning();
    return updated;
  }

  // Settings
  async getSettings(): Promise<SettingsWithWorkingHours> {
    let [settingsRow] = await db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.id, "default"));

    if (!settingsRow) {
      // Create default settings
      [settingsRow] = await db
        .insert(schema.settings)
        .values({
          id: "default",
          businessName: "Your Business",
          businessType: "General",
          businessPhone: "",
          availableServices: ["Consultation", "Service", "Support"],
          workingHoursStart: "09:00",
          workingHoursEnd: "17:00",
          timezone: "UTC",
          welcomeMessage: "",
          escalationEmail: "",
        })
        .returning();
    }

    return {
      ...settingsRow,
      workingHours: {
        start: settingsRow.workingHoursStart,
        end: settingsRow.workingHoursEnd,
      },
    };
  }

  async updateSettings(
    updates: Partial<InsertSettings>
  ): Promise<SettingsWithWorkingHours> {
    const dbUpdates: any = { ...updates };
    
    // Handle workingHours object if present
    if ('workingHours' in updates && updates.workingHours) {
      const wh = updates.workingHours as any;
      dbUpdates.workingHoursStart = wh.start;
      dbUpdates.workingHoursEnd = wh.end;
      delete dbUpdates.workingHours;
    }

    const [updated] = await db
      .update(schema.settings)
      .set(dbUpdates)
      .where(eq(schema.settings.id, "default"))
      .returning();

    return {
      ...updated,
      workingHours: {
        start: updated.workingHoursStart,
        end: updated.workingHoursEnd,
      },
    };
  }

  // Analytics
  async getAnalytics(): Promise<Analytics> {
    const conversations = await db.select().from(schema.conversations);
    const appointments = await db.select().from(schema.appointments);

    const totalConversations = conversations.length;
    const activeConversations = conversations.filter(
      (c) => c.status === "active"
    ).length;
    const completedConversations = conversations.filter(
      (c) => c.status === "completed"
    ).length;
    const escalatedConversations = conversations.filter(
      (c) => c.status === "escalated"
    ).length;

    const totalAppointments = appointments.length;
    const confirmedAppointments = appointments.filter(
      (a) => a.status === "confirmed"
    ).length;
    const pendingAppointments = appointments.filter(
      (a) => a.status === "pending"
    ).length;

    const sentimentBreakdown = {
      positive: conversations.filter((c) => c.sentiment === "positive").length,
      neutral: conversations.filter((c) => c.sentiment === "neutral").length,
      negative: conversations.filter((c) => c.sentiment === "negative").length,
      unknown: conversations.filter(
        (c) => !c.sentiment || c.sentiment === "unknown"
      ).length,
    };

    const intentBreakdown = {
      booking: conversations.filter((c) => c.intent === "booking").length,
      inquiry: conversations.filter((c) => c.intent === "inquiry").length,
      faq: conversations.filter((c) => c.intent === "faq").length,
      general: conversations.filter((c) => c.intent === "general").length,
      unknown: conversations.filter(
        (c) => !c.intent || c.intent === "unknown"
      ).length,
    };

    return {
      totalConversations,
      activeConversations,
      completedConversations,
      escalatedConversations,
      totalAppointments,
      confirmedAppointments,
      pendingAppointments,
      sentimentBreakdown,
      intentBreakdown,
    };
  }
}

export const storage = new DatabaseStorage();
