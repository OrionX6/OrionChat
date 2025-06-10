"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Paperclip } from "lucide-react";
import { ModelSelector } from "./ModelSelector";
import type { Database } from "@/lib/types/database";
import type { ModelProvider } from "@/lib/constants/models";

type Conversation = Database['public']['Tables']['conversations']['Row'];

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  onTypingChange?: (isTyping: boolean) => void;
  currentConversation?: Conversation | null;
  onModelChange?: (provider: ModelProvider, modelName: string) => void;
}

export function ChatInput({ onSend, disabled = false, onTypingChange, currentConversation, onModelChange }: ChatInputProps) {
  const [message, setMessage] = useState("");

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newMessage = e.target.value;
    setMessage(newMessage);

    // Notify parent about typing state
    if (onTypingChange) {
      onTypingChange(newMessage.trim().length > 0);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSend(message.trim());
      setMessage("");
      // Notify parent that user is no longer typing
      if (onTypingChange) {
        onTypingChange(false);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="border-t border-border/30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-6">
      <div className="max-w-4xl mx-auto">
        <form onSubmit={handleSubmit} className="relative">
          <div className="relative flex items-end gap-3 p-3 border border-border/30 rounded-2xl bg-background/50 hover:border-border/60 focus-within:border-primary/50 transition-colors">
            {/* Attachment button */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 flex-shrink-0 text-muted-foreground hover:text-foreground"
              disabled={disabled}
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            
            {/* Text input */}
            <Textarea
              value={message}
              onChange={handleMessageChange}
              onKeyDown={handleKeyDown}
              placeholder="Type your message here..."
              className="flex-1 min-h-[24px] max-h-[200px] resize-none border-0 p-0 text-base bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/60"
              rows={1}
              disabled={disabled}
            />
            
            {/* Send button */}
            <Button
              type="submit"
              disabled={!message.trim() || disabled}
              size="sm"
              className="h-8 w-8 p-0 flex-shrink-0 rounded-lg"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>

        {/* Model selector and footer */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-3">
            {currentConversation && onModelChange && (
              <ModelSelector
                selectedModel={currentConversation.model_name}
                onModelChange={onModelChange}
                disabled={disabled}
              />
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            Make sure you agree to our{" "}
            <button className="underline hover:no-underline">Terms</button>
            {" "}and{" "}
            <button className="underline hover:no-underline">Privacy Policy</button>
          </div>
        </div>
      </div>
    </div>
  );
}