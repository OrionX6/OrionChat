"use client";

import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CodeBlock } from "@/components/ui/code-block";
import { ChartDetector } from "@/components/charts/ChartDetector";
import { MermaidDiagram } from "@/components/charts/MermaidDiagram";

interface StreamingMessageBubbleProps {
  content: string;
}

// Function to preprocess content - NO automatic LaTeX wrapping
function preprocessMathContent(content: string): string {
  // DO NOT automatically wrap anything as math
  // Only process content that's already explicitly marked with $ or $$
  // This prevents corruption of regular text with numbers/symbols
  return content;
}

function parseStreamingContent(content: string) {
  if (!content) return [];

  // For streaming content, we need to be more careful about parsing
  // Check if content contains table markers - be more specific to avoid false positives
  const lines = content.split('\n');
  const hasTableStructure = lines.some(line => {
    // Look for lines that have pipes and align with table headers
    const pipesCount = (line.match(/\|/g) || []).length;
    return pipesCount >= 2; // At least start and end pipes plus content
  });
  
  const hasSeparatorLine = lines.some(line => 
    /^\s*\|[\s-:|]+\|\s*$/.test(line) // Table separator line
  );
  
  // If it looks like a table, treat as text and let ReactMarkdown handle it
  if (hasTableStructure || hasSeparatorLine) {
    return [{ type: 'text' as const, content, isComplete: false }];
  }

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
                  {/* Chart Detection for streaming content */}
                  <ChartDetector content={part.content} />
                  
                  <div className="prose prose-base max-w-none dark:prose-invert prose-headings:mt-3 prose-headings:mb-2 prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[]}
                      components={{
                        code({ node, inline, className, children, ...props }: any) {
                          const match = /language-(\w+)/.exec(className || '');
                          const language = match?.[1];
                          const code = String(children).replace(/\n$/, '');
                          
                          return !inline && match ? (
                            <div className="not-prose w-full max-w-none -my-3 first:mt-0 last:mb-0">
                              {language === 'mermaid' ? (
                                <MermaidDiagram chart={code} />
                              ) : (
                                <CodeBlock
                                  code={code}
                                  language={language}
                                />
                              )}
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
                        table({ children }: any) {
                          return (
                            <div className="overflow-x-auto my-4 max-w-full">
                              <table className="min-w-full border-collapse border border-border rounded-md">
                                {children}
                              </table>
                            </div>
                          );
                        },
                        thead({ children }: any) {
                          return <thead className="bg-muted/50">{children}</thead>;
                        },
                        tbody({ children }: any) {
                          return <tbody>{children}</tbody>;
                        },
                        tr({ children }: any) {
                          return <tr className="border-b border-border">{children}</tr>;
                        },
                        th({ children }: any) {
                          return (
                            <th className="border border-border px-3 py-2 text-left font-semibold text-sm bg-muted/30 max-w-xs overflow-hidden text-ellipsis">
                              {children}
                            </th>
                          );
                        },
                        td({ children }: any) {
                          return (
                            <td className="border border-border px-3 py-2 text-sm max-w-xs overflow-hidden text-ellipsis">
                              {children}
                            </td>
                          );
                        },
                      }}
                    >
                      {preprocessMathContent(part.content)}
                    </ReactMarkdown>
                  </div>
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