import OpenAI from "openai";
import { type Message, type Settings } from "@shared/schema";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY
});

interface ConversationContext {
  messages: Message[];
  settings: Settings;
}

interface AIResponse {
  message: string;
  intent: "booking" | "inquiry" | "faq" | "general" | "unknown";
  sentiment: "positive" | "neutral" | "negative" | "unknown";
  requiresEscalation: boolean;
  extractedEntities: {
    name?: string;
    email?: string;
    phone?: string;
    service?: string;
    date?: string;
    time?: string;
  };
}

export async function getAIResponse(
  userMessage: string,
  context: ConversationContext
): Promise<AIResponse> {
  const { messages, settings } = context;

  const systemPrompt = buildSystemPrompt(settings);
  const conversationHistory = buildConversationHistory(messages, userMessage);

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
      messages: [
        { role: "system", content: systemPrompt },
        ...conversationHistory,
      ],
      max_completion_tokens: 8192,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);

    return {
      message: parsed.message || "I apologize, but I'm having trouble understanding. Could you please rephrase that?",
      intent: parsed.intent || "unknown",
      sentiment: parsed.sentiment || "neutral",
      requiresEscalation: parsed.requiresEscalation || false,
      extractedEntities: parsed.extractedEntities || {},
    };
  } catch (error) {
    console.error("AI response error:", error);
    return {
      message: "I apologize, but I'm experiencing technical difficulties. Please try again in a moment.",
      intent: "unknown",
      sentiment: "neutral",
      requiresEscalation: true,
      extractedEntities: {},
    };
  }
}

function buildSystemPrompt(settings: Settings): string {
  const services = settings.availableServices.join(", ");
  
  return `You are an intelligent AI Receptionist for ${settings.businessName}, a ${settings.businessType} business.

Your role is to:
1. Greet customers warmly and professionally
2. Answer questions about services, hours, and general information
3. Help customers book appointments
4. Collect necessary information (name, email, phone, preferred service, date/time)
5. Detect customer sentiment and urgency
6. Escalate complex issues to human staff when needed

Business Information:
- Name: ${settings.businessName}
- Type: ${settings.businessType}
- Available Services: ${services}
- Working Hours: ${settings.workingHours.start} - ${settings.workingHours.end} ${settings.timezone}
${settings.welcomeMessage ? `- Custom Welcome: ${settings.welcomeMessage}` : ""}

IMPORTANT: You must ALWAYS respond in valid JSON format with this structure:
{
  "message": "Your conversational response to the customer",
  "intent": "booking" | "inquiry" | "faq" | "general" | "unknown",
  "sentiment": "positive" | "neutral" | "negative" | "unknown",
  "requiresEscalation": boolean,
  "extractedEntities": {
    "name": "customer name if mentioned",
    "email": "customer email if mentioned",
    "phone": "customer phone if mentioned",
    "service": "requested service if mentioned",
    "date": "requested date if mentioned (YYYY-MM-DD format)",
    "time": "requested time if mentioned (HH:MM format)"
  }
}

Guidelines:
- Be warm, professional, and helpful
- If booking an appointment, collect: name, service, date, time (email/phone optional but helpful)
- Detect intent: "booking" for appointments, "inquiry" for questions about services, "faq" for general questions, "general" for chitchat
- Assess sentiment: positive, neutral, or negative based on tone
- Set requiresEscalation to true if: customer is angry, request is complex, or you can't help
- Extract entities mentioned in the conversation for tracking
- Keep responses concise but informative
- If customer asks about availability, suggest times within working hours
- Always respond in JSON format as specified above`;
}

function buildConversationHistory(
  messages: Message[],
  newUserMessage: string
): Array<{ role: "user" | "assistant"; content: string }> {
  const history = messages
    .slice(-10)
    .map((msg) => ({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    }));

  history.push({
    role: "user",
    content: newUserMessage,
  });

  return history;
}

export async function analyzeSentiment(text: string): Promise<"positive" | "neutral" | "negative"> {
  const lowerText = text.toLowerCase();
  
  const positiveWords = ["thank", "great", "excellent", "perfect", "wonderful", "amazing", "love", "appreciate"];
  const negativeWords = ["bad", "terrible", "awful", "horrible", "disappointed", "angry", "frustrated", "worst"];
  
  const hasPositive = positiveWords.some(word => lowerText.includes(word));
  const hasNegative = negativeWords.some(word => lowerText.includes(word));
  
  if (hasPositive && !hasNegative) return "positive";
  if (hasNegative && !hasPositive) return "negative";
  return "neutral";
}
