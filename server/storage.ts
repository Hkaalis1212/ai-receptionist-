import { 
  type Message, 
  type InsertMessage,
  type Conversation,
  type InsertConversation,
  type Appointment,
  type InsertAppointment,
  type Settings,
  type InsertSettings,
  type Analytics,
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Messages
  createMessage(message: InsertMessage): Promise<Message>;
  getMessagesByConversation(conversationId: string): Promise<Message[]>;
  
  // Conversations
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  getConversation(id: string): Promise<Conversation | undefined>;
  updateConversation(id: string, updates: Partial<Conversation>): Promise<Conversation | undefined>;
  getAllConversations(): Promise<Conversation[]>;
  
  // Appointments
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  getAppointment(id: string): Promise<Appointment | undefined>;
  getAllAppointments(): Promise<Appointment[]>;
  updateAppointment(id: string, updates: Partial<Appointment>): Promise<Appointment | undefined>;
  
  // Settings
  getSettings(): Promise<Settings>;
  updateSettings(settings: InsertSettings): Promise<Settings>;
  
  // Analytics
  getAnalytics(): Promise<Analytics>;
}

export class MemStorage implements IStorage {
  private messages: Map<string, Message>;
  private conversations: Map<string, Conversation>;
  private appointments: Map<string, Appointment>;
  private settings: Settings;

  constructor() {
    this.messages = new Map();
    this.conversations = new Map();
    this.appointments = new Map();
    this.settings = {
      businessName: "Your Business",
      businessType: "General",
      availableServices: ["Consultation", "Service", "Support"],
      workingHours: { start: "09:00", end: "17:00" },
      timezone: "UTC",
      welcomeMessage: "",
      escalationEmail: "",
    };
  }

  // Messages
  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = randomUUID();
    const message: Message = {
      ...insertMessage,
      id,
      timestamp: new Date().toISOString(),
    };
    this.messages.set(id, message);
    return message;
  }

  async getMessagesByConversation(conversationId: string): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter((msg) => msg.conversationId === conversationId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  // Conversations
  async createConversation(insertConversation: InsertConversation): Promise<Conversation> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const conversation: Conversation = {
      ...insertConversation,
      id,
      startedAt: now,
      lastMessageAt: now,
    };
    this.conversations.set(id, conversation);
    return conversation;
  }

  async getConversation(id: string): Promise<Conversation | undefined> {
    return this.conversations.get(id);
  }

  async updateConversation(id: string, updates: Partial<Conversation>): Promise<Conversation | undefined> {
    const conversation = this.conversations.get(id);
    if (!conversation) return undefined;
    
    const updated: Conversation = {
      ...conversation,
      ...updates,
      lastMessageAt: new Date().toISOString(),
    };
    this.conversations.set(id, updated);
    return updated;
  }

  async getAllConversations(): Promise<Conversation[]> {
    return Array.from(this.conversations.values());
  }

  // Appointments
  async createAppointment(insertAppointment: InsertAppointment): Promise<Appointment> {
    const id = randomUUID();
    const appointment: Appointment = {
      ...insertAppointment,
      id,
      createdAt: new Date().toISOString(),
    };
    this.appointments.set(id, appointment);
    return appointment;
  }

  async getAppointment(id: string): Promise<Appointment | undefined> {
    return this.appointments.get(id);
  }

  async getAllAppointments(): Promise<Appointment[]> {
    return Array.from(this.appointments.values());
  }

  async updateAppointment(id: string, updates: Partial<Appointment>): Promise<Appointment | undefined> {
    const appointment = this.appointments.get(id);
    if (!appointment) return undefined;
    
    const updated: Appointment = { ...appointment, ...updates };
    this.appointments.set(id, updated);
    return updated;
  }

  // Settings
  async getSettings(): Promise<Settings> {
    return this.settings;
  }

  async updateSettings(newSettings: InsertSettings): Promise<Settings> {
    this.settings = newSettings;
    return this.settings;
  }

  // Analytics
  async getAnalytics(): Promise<Analytics> {
    const conversations = Array.from(this.conversations.values());
    const appointments = Array.from(this.appointments.values());

    const totalConversations = conversations.length;
    const activeConversations = conversations.filter(c => c.status === "active").length;
    const completedConversations = conversations.filter(c => c.status === "completed").length;
    const escalatedConversations = conversations.filter(c => c.status === "escalated").length;

    const totalAppointments = appointments.length;
    const confirmedAppointments = appointments.filter(a => a.status === "confirmed").length;
    const pendingAppointments = appointments.filter(a => a.status === "pending").length;

    const sentimentBreakdown = {
      positive: conversations.filter(c => c.sentiment === "positive").length,
      neutral: conversations.filter(c => c.sentiment === "neutral").length,
      negative: conversations.filter(c => c.sentiment === "negative").length,
      unknown: conversations.filter(c => !c.sentiment || c.sentiment === "unknown").length,
    };

    const intentBreakdown = {
      booking: conversations.filter(c => c.intent === "booking").length,
      inquiry: conversations.filter(c => c.intent === "inquiry").length,
      faq: conversations.filter(c => c.intent === "faq").length,
      general: conversations.filter(c => c.intent === "general").length,
      unknown: conversations.filter(c => !c.intent || c.intent === "unknown").length,
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

export const storage = new MemStorage();
