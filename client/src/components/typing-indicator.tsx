import { Bot } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function TypingIndicator() {
  return (
    <div className="flex gap-3 mb-4" data-testid="typing-indicator">
      <Avatar className="h-10 w-10 flex-shrink-0">
        <AvatarFallback className="bg-muted text-muted-foreground">
          <Bot className="h-5 w-5" />
        </AvatarFallback>
      </Avatar>
      
      <div className="flex items-center gap-2 bg-card border border-card-border rounded-2xl rounded-bl-sm px-4 py-3">
        <div className="flex gap-1">
          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0ms", animationDuration: "1.4s" }} />
          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "200ms", animationDuration: "1.4s" }} />
          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "400ms", animationDuration: "1.4s" }} />
        </div>
      </div>
    </div>
  );
}
