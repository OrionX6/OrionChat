"use client";

import { memo } from "react";
import ReactMarkdown from "react-markdown";
import { CodeBlock } from "@/components/ui/code-block";
import type { Database } from "@/lib/types/database";

type Message = Database['public']['Tables']['messages']['Row'];

interface MessageBubbleProps {
  message: Message;
}

// Removed unused functions since we're now using ReactMarkdown

export const MessageBubble = memo(function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`flex flex-col ${isUser ? "items-end max-w-[75%]" : "items-start flex-1"} min-w-0`}>
        <div
          className={`rounded-2xl w-full min-w-0 ${
            isUser
              ? "bg-primary text-primary-foreground px-4 py-3"
              : "bg-muted/50 text-foreground border border-border/50"
          }`}
        >
          {isUser ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
              {message.content}
            </p>
          ) : (
            <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:mt-3 prose-headings:mb-2 prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0">
              <ReactMarkdown
                components={{
                  code({ node, inline, className, children, ...props }: any) {
                    const match = /language-(\w+)/.exec(className || '');
                    return !inline && match ? (
                      <div className="not-prose w-full -mx-4 -my-3 first:mt-0 last:mb-0">
                        <CodeBlock
                          code={String(children).replace(/\n$/, '')}
                          language={match[1]}
                        />
                      </div>
                    ) : (
                      <code className="bg-muted px-1 py-0.5 rounded text-sm" {...props}>
                        {children}
                      </code>
                    );
                  },
                  p({ children }: any) {
                    return <p className="text-sm leading-relaxed">{children}</p>;
                  },
                  h1({ children }: any) {
                    return <h1 className="text-lg font-semibold">{children}</h1>;
                  },
                  h2({ children }: any) {
                    return <h2 className="text-base font-semibold">{children}</h2>;
                  },
                  h3({ children }: any) {
                    return <h3 className="text-sm font-semibold">{children}</h3>;
                  },
                  ul({ children }: any) {
                    return <ul className="text-sm space-y-1 ml-4">{children}</ul>;
                  },
                  ol({ children }: any) {
                    return <ol className="text-sm space-y-1 ml-4">{children}</ol>;
                  },
                  li({ children }: any) {
                    return <li className="text-sm">{children}</li>;
                  },
                  strong({ children }: any) {
                    return <strong className="font-semibold">{children}</strong>;
                  },
                  em({ children }: any) {
                    return <em className="italic">{children}</em>;
                  },
                  blockquote({ children }: any) {
                    return (
                      <blockquote className="border-l-4 border-muted-foreground/20 pl-4 italic text-muted-foreground">
                        {children}
                      </blockquote>
                    );
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}
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