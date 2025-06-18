"use client";

import { memo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { CodeBlock } from "@/components/ui/code-block";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Copy, RotateCcw, FileText, Image as ImageIcon, Download } from "lucide-react";
import type { Database } from "@/lib/types/database";
import Image from "next/image";
import { CollapsibleThinking } from "./CollapsibleThinking";

type Message = Database['public']['Tables']['messages']['Row'] & {
  attachments?: FileAttachment[] | string;
  thinking_content?: string;
};

interface FileAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  preview_url?: string;
}

interface MessageBubbleProps {
  message: Message;
  onRetry?: () => void;
}

// Function to preprocess content and wrap standalone LaTeX commands in math delimiters
function preprocessMathContent(content: string): string {
  let processedContent = content;

  // More sophisticated pattern to match complete LaTeX expressions
  // This handles nested braces and complex expressions like \boxed{6:00 \text{ AM the next day}}
  const latexPattern = /(?<!\$)\\(?:boxed|frac|sum|int|prod|lim|sqrt|text|mathbf|mathit|mathrm|operatorname|left|right|begin|end)\b(?:\{(?:[^{}]|\{[^{}]*\})*\}|\[[^\]]*\])*(?!\$)/g;

  // Find all matches and wrap them
  processedContent = processedContent.replace(latexPattern, (match) => {
    // Don't wrap if it's already inside math delimiters
    return `$${match}$`;
  });

  return processedContent;
}

export const MessageBubble = memo(function MessageBubble({ message, onRetry }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);
  
  // Parse attachments if they exist
  const attachments: FileAttachment[] = message.attachments 
    ? typeof message.attachments === 'string' 
      ? JSON.parse(message.attachments) 
      : message.attachments
    : [];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`flex flex-col ${isUser ? "items-end max-w-[75%]" : "items-start flex-1"} min-w-0`}>
        {/* File attachments */}
        {attachments.length > 0 && (
          <div className={`mb-3 ${isUser ? "flex justify-end" : ""}`}>
            <div className="flex flex-wrap gap-2 max-w-full">
              {attachments.map((file) => (
                <div key={file.id} className="flex-shrink-0">
                  {file.type.startsWith('image/') ? (
                    <div className="relative max-w-[200px] max-h-[200px] rounded-lg overflow-hidden border border-border/20">
                      {file.preview_url ? (
                        <Image
                          src={file.preview_url}
                          alt={file.name}
                          width={200}
                          height={200}
                          className="object-cover w-full h-auto"
                        />
                      ) : (
                        <div className="w-full h-32 bg-muted/50 flex items-center justify-center">
                          <ImageIcon className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white p-1">
                        <p className="text-xs truncate">{file.name}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-2 border border-border/20 min-w-[120px]">
                      <FileText className="h-4 w-4 text-red-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs truncate">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(file.size / 1024 / 1024).toFixed(1)} MB
                        </p>
                      </div>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button className="p-1 hover:bg-muted rounded">
                              <Download className="h-3 w-3" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Download file</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Chain of thought for assistant messages */}
        {!isUser && message.thinking_content && (
          <div className="w-full mb-4">
            <CollapsibleThinking 
              thinkingContent={message.thinking_content}
              isThinking={false}
              isCompleted={true}
            />
          </div>
        )}

        <div
          className={`w-full min-w-0 ${
            isUser
              ? "bg-primary text-primary-foreground px-4 py-3 rounded-2xl"
              : "text-foreground"
          }`}
        >
          {isUser ? (
            <p className="text-base leading-relaxed whitespace-pre-wrap break-words">
              {message.content}
            </p>
          ) : (
            <div className="prose prose-base max-w-none dark:prose-invert prose-headings:mt-3 prose-headings:mb-2 prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0">
              <ReactMarkdown
                remarkPlugins={[remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={{
                  code({ node, inline, className, children, ...props }: any) {
                    const match = /language-(\w+)/.exec(className || '');
                    return !inline && match ? (
                      <div className="not-prose w-full max-w-none -my-3 first:mt-0 last:mb-0">
                        <CodeBlock
                          code={String(children).replace(/\n$/, '')}
                          language={match[1]}
                        />
                      </div>
                    ) : (
                      <code className="bg-muted px-1 py-0.5 rounded text-base" {...props}>
                        {children}
                      </code>
                    );
                  },
                  p({ children }: any) {
                    return <p className="mb-3 last:mb-0 text-base leading-relaxed">{children}</p>;
                  },
                  h1({ children }: any) {
                    return <h1 className="text-lg font-semibold mt-4 mb-2 first:mt-0">{children}</h1>;
                  },
                  h2({ children }: any) {
                    return <h2 className="text-base font-semibold mt-4 mb-2 first:mt-0">{children}</h2>;
                  },
                  h3({ children }: any) {
                    return <h3 className="text-base font-semibold mt-3 mb-1 first:mt-0">{children}</h3>;
                  },
                  ul({ children }: any) {
                    return <ul className="text-base space-y-1 ml-6 list-disc list-outside mb-3">{children}</ul>;
                  },
                  ol({ children }: any) {
                    return <ol className="text-base space-y-1 ml-6 list-decimal list-outside mb-3">{children}</ol>;
                  },
                  li({ children }: any) {
                    return <li className="text-base">{children}</li>;
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
                  hr({ }: any) {
                    return <hr className="border-border my-4" />;
                  },
                }}
              >
                {preprocessMathContent(message.content)}
              </ReactMarkdown>
            </div>
          )}
        </div>
        <div className={`flex items-center gap-2 mt-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
          <span className="text-xs text-muted-foreground">
            {message.created_at ? new Date(message.created_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }) : "Now"}
          </span>
          {message.model && (
            <span className="text-xs text-muted-foreground bg-muted/30 px-2 py-0.5 rounded-full">
              {message.model}
            </span>
          )}
          
          {!isUser && (
            <TooltipProvider>
              <div className="flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={handleCopy}
                      className="p-1 rounded hover:bg-muted/50 transition-colors"
                      aria-label="Copy message"
                    >
                      <Copy className="h-3 w-3 text-muted-foreground" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{copied ? "Copied!" : "Copy message"}</p>
                  </TooltipContent>
                </Tooltip>
                
                {onRetry && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={onRetry}
                        className="p-1 rounded hover:bg-muted/50 transition-colors"
                        aria-label="Retry message"
                      >
                        <RotateCcw className="h-3 w-3 text-muted-foreground" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Retry message</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            </TooltipProvider>
          )}
        </div>
      </div>
    </div>
  );
});