"use client";

import { memo } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Database } from "@/lib/types/database";

type Message = Database['public']['Tables']['messages']['Row'];

interface MessageBubbleProps {
  message: Message;
}

export const MessageBubble = memo(function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-4 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      <Avatar className="w-8 h-8 flex-shrink-0">
        <AvatarFallback className={`text-xs font-medium ${
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground"
        }`}>
          {isUser ? "U" : "AI"}
        </AvatarFallback>
      </Avatar>

      <div className={`flex flex-col ${isUser ? "items-end" : "items-start"} max-w-[75%] min-w-0`}>
        <div
          className={`rounded-2xl px-4 py-3 ${
            isUser
              ? "bg-primary text-primary-foreground"
              : "bg-muted/50 text-foreground border border-border/50"
          }`}
        >
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{message.content}</p>
        </div>
        <div className={`flex items-center gap-2 mt-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
          <span className="text-xs text-muted-foreground">
            {new Date(message.created_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          {message.model && (
            <span className="text-xs text-muted-foreground bg-muted/30 px-2 py-0.5 rounded-full">
              {message.model}
            </span>
          )}
        </div>
      </div>
    </div>
  );
});