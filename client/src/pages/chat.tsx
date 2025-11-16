import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ChatMessage } from "@/components/chat-message";
import { TypingIndicator } from "@/components/typing-indicator";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";

interface DisplayMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  conversationId: string;
}

export default function Chat() {
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [messages, setMessages] = useState<DisplayMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hello! I'm your AI Receptionist. I can help you with appointments, answer questions about our services, or connect you with the right person. How can I assist you today?",
      timestamp: new Date().toISOString(),
      conversationId: "initial",
    },
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await apiRequest("POST", "/api/chat", {
        message,
        conversationId,
      });
      return await response.json();
    },
    onSuccess: (data: any) => {
      const assistantMessage: DisplayMessage = {
        id: Date.now().toString() + "-assistant",
        role: "assistant",
        content: data.message,
        timestamp: new Date().toISOString(),
        conversationId: data.conversationId,
      };
      setMessages(prev => [...prev, assistantMessage]);
      setConversationId(data.conversationId);
      queryClient.invalidateQueries({ queryKey: ["/api/analytics"] });
    },
  });

  const handleSend = async () => {
    if (!input.trim() || sendMessageMutation.isPending) return;

    const userMessage: DisplayMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date().toISOString(),
      conversationId: conversationId || "temp",
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    await sendMessageMutation.mutateAsync(userMessage.content);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border bg-background px-6 py-4">
        <h1 className="text-2xl font-semibold tracking-tight">Chat</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Have a conversation with your AI Receptionist
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
        <div className="max-w-4xl mx-auto">
          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}
          {sendMessageMutation.isPending && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="border-t border-border bg-background px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <Card className="p-4 flex gap-3">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Type your message... (Press Enter to send, Shift+Enter for new line)"
              className="resize-none min-h-[44px] max-h-[200px] border-0 focus-visible:ring-0 shadow-none p-0"
              rows={1}
              data-testid="input-chat-message"
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || sendMessageMutation.isPending}
              size="icon"
              className="flex-shrink-0"
              data-testid="button-send-message"
            >
              {sendMessageMutation.isPending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
