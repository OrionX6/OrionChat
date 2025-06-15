"use client";

import { memo } from "react";
import ReactMarkdown from "react-markdown";
import { CodeBlock } from "@/components/ui/code-block";

interface StreamingMessageBubbleProps {
  content: string;
}

function parseStreamingContent(content: string) {
  if (!content) return [];

  const parts: Array<{ type: 'text' | 'code'; content: string; language?: string; isComplete: boolean }> = [];
  let lastIndex = 0;
  
  // Find all code blocks (both complete and incomplete)
  const codeBlockRegex = /```(?:(\w+)\s*)?\n?([\s\S]*?)(?:```|$)/g;
  let match;
  
  while ((match = codeBlockRegex.exec(content)) !== null) {
    // Add text before code block
    if (match.index > lastIndex) {
      const textContent = content.slice(lastIndex, match.index);
      if (textContent.trim()) {
        parts.push({ type: 'text', content: textContent, isComplete: true });
      }
    }

    // Extract language and code
    const language = match[1] || undefined;
    const code = match[2];
    const isComplete = match[0].endsWith('```');
    
    if (code || !isComplete) {
      parts.push({ 
        type: 'code', 
        content: code, 
        language, 
        isComplete 
      });
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < content.length) {
    const textContent = content.slice(lastIndex);
    if (textContent.trim()) {
      // Check if this looks like unformatted code
      const looksLikeCode = detectCodeContent(textContent);
      if (looksLikeCode) {
        const detectedLanguage = detectLanguageFromContent(textContent);
        parts.push({ 
          type: 'code', 
          content: textContent.trim(), 
          language: detectedLanguage,
          isComplete: false 
        });
      } else {
        parts.push({ type: 'text', content: textContent, isComplete: false });
      }
    }
  }

  // If no parts were found, treat entire content as text
  return parts.length > 0 ? parts : [{ type: 'text' as const, content, isComplete: false }];
}

function detectCodeContent(content: string): boolean {
  const lines = content.split('\n');
  if (lines.length < 3) return false; // Need multiple lines for code detection
  
  const codeIndicators = [
    /<[^>]+>/, // HTML tags
    /^\s*[.#][\w-]+\s*\{/, // CSS selectors
    /^\s*[\w-]+\s*:\s*[^;]+;?\s*$/, // CSS properties
    /^\s*(function|const|let|var|if|for|while|class)\s/, // JS keywords
    /^\s*\/\/.*$/, // Comments
    /^\s*\/\*[\s\S]*?\*\//, // Block comments
    /\{[\s\S]*\}/, // Braces
  ];
  
  const codeLines = lines.filter(line => 
    codeIndicators.some(pattern => pattern.test(line))
  ).length;
  
  return codeLines > lines.length * 0.4; // 40% of lines look like code
}

function detectLanguageFromContent(content: string): string | undefined {
  if (/<(html|head|body|div|span|p|h[1-6])/i.test(content)) return 'html';
  if (/[.#]\w+\s*\{|[\w-]+\s*:\s*[^;]+;/.test(content)) return 'css';
  if (/\b(function|const|let|var|=>)\b/.test(content)) return 'javascript';
  if (/\b(interface|type|import.*from|export)\b/.test(content)) return 'typescript';
  if (/\b(def|class|import|print\s*\()\b/.test(content)) return 'python';
  return undefined;
}

export const StreamingMessageBubble = memo(function StreamingMessageBubble({ content }: StreamingMessageBubbleProps) {
  if (!content) {
    return (
      <div className="flex justify-start">
        <div className="flex flex-col items-start flex-1 min-w-0">
          <div className="bg-muted/50 text-foreground border border-border/50 rounded-2xl px-4 py-3 min-h-[2.5rem] flex items-center">
            <div className="flex space-x-1 items-center">
              <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]"></div>
              <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]"></div>
              <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const contentParts = parseStreamingContent(content);

  return (
    <div className="flex justify-start">
      <div className="flex flex-col items-start flex-1 min-w-0">
        <div
          className={`rounded-2xl w-full min-w-0 bg-muted/50 text-foreground border border-border/50 ${
            contentParts.some(part => part.type === 'code') ? 'px-0 py-0' : 'px-4 py-3'
          }`}
        >
          {contentParts.map((part, index) => {
            if (part.type === 'code') {
              return (
                <div key={index} className={`w-full min-w-0 ${contentParts.length === 1 ? 'rounded-2xl overflow-hidden' : 'first:mt-3 last:mb-3'} relative`}>
                  <CodeBlock code={part.content} language={part.language} />
                  {!part.isComplete && (
                    <div className="absolute top-2 right-2">
                      <div className="flex space-x-1 items-center bg-black/20 backdrop-blur-sm rounded px-2 py-1">
                        <div className="w-1 h-1 bg-blue-400 rounded-full animate-pulse"></div>
                        <span className="text-xs text-blue-400">generating...</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            } else {
              return (
                <div key={index} className={`${contentParts.some(part => part.type === 'code') ? 'px-4 py-3' : ''} relative`}>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                    {part.content}
                  </p>
                  {!part.isComplete && (
                    <span className="inline-flex items-center ml-1">
                      <div className="w-1 h-1 bg-muted-foreground rounded-full animate-pulse"></div>
                    </span>
                  )}
                </div>
              );
            }
          })}
        </div>
      </div>
    </div>
  );
});