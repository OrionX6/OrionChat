"use client";

import { memo } from "react";
import { CodeBlock } from "@/components/ui/code-block";
import type { Database } from "@/lib/types/database";

type Message = Database['public']['Tables']['messages']['Row'];

interface MessageBubbleProps {
  message: Message;
}

function parseMessageContent(content: string) {
  const codeBlockRegex = /```(\w+)?\n?([\s\S]*?)```/g;
  const parts: Array<{ type: 'text' | 'code'; content: string; language?: string }> = [];
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    // Add text before code block
    if (match.index > lastIndex) {
      const textContent = content.slice(lastIndex, match.index);
      if (textContent.trim()) {
        parts.push({ type: 'text', content: textContent });
      }
    }

    // Add code block
    const language = match[1] || undefined;
    const code = match[2].trim();
    parts.push({ type: 'code', content: code, language });

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < content.length) {
    const textContent = content.slice(lastIndex);
    if (textContent.trim()) {
      parts.push({ type: 'text', content: textContent });
    }
  }

  return parts.length > 0 ? parts : [{ type: 'text' as const, content }];
}

export const MessageBubble = memo(function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const contentParts = parseMessageContent(message.content);

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`flex flex-col ${isUser ? "items-end max-w-[75%]" : "items-start flex-1"} min-w-0`}>
        <div
          className={`rounded-2xl w-full min-w-0 ${
            isUser
              ? "bg-primary text-primary-foreground"
              : "bg-muted/50 text-foreground border border-border/50"
          } ${contentParts.some(part => part.type === 'code') ? 'px-0 py-0' : 'px-4 py-3'}`}
        >
          {contentParts.map((part, index) => {
            if (part.type === 'code') {
              return (
                <div key={index} className={`w-full min-w-0 ${contentParts.length === 1 ? 'rounded-2xl overflow-hidden' : 'first:mt-3 last:mb-3'}`}>
                  <CodeBlock code={part.content} language={part.language} />
                </div>
              );
            } else {
              return (
                <p key={index} className={`text-sm leading-relaxed whitespace-pre-wrap break-words ${contentParts.some(part => part.type === 'code') ? 'px-4 py-3' : ''}`}>
                  {part.content}
                </p>
              );
            }
          })}
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