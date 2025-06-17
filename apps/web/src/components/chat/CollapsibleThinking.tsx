"use client";

import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, Brain, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface CollapsibleThinkingProps {
  thinkingContent: string;
  isThinking: boolean;
  isCompleted: boolean;
}

export function CollapsibleThinking({ thinkingContent, isThinking, isCompleted }: CollapsibleThinkingProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Auto-collapse when thinking is completed
  useEffect(() => {
    if (isCompleted && !isThinking) {
      const timer = setTimeout(() => {
        setIsExpanded(false);
      }, 1000); // Wait 1 second before auto-collapsing
      return () => clearTimeout(timer);
    }
  }, [isCompleted, isThinking]);

  // Don't render if there's no thinking content
  if (!thinkingContent && !isThinking) {
    return null;
  }

  return (
    <div className="mb-4">
      <div className="bg-muted/30 dark:bg-muted/10 border border-border rounded-xl overflow-hidden">
        {/* Header */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {isThinking ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : (
                <Brain className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="font-medium text-foreground">
                {isThinking ? "Thinking..." : "Chain of Thought"}
              </span>
            </div>
            {isThinking && (
              <div className="flex space-x-1">
                <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce"></div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {isExpanded ? "Hide" : "Show"}
            </span>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </button>

        {/* Content */}
        <div
          className={cn(
            "transition-all duration-300 ease-in-out overflow-hidden",
            isExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
          )}
        >
          <div className="px-4 pb-4 border-t border-border">
            <div className="mt-3 text-sm text-muted-foreground font-mono whitespace-pre-wrap max-h-80 overflow-y-auto bg-background/50 rounded-lg p-3 border border-border">
              {thinkingContent || (
                <span className="text-muted-foreground italic">Starting to think...</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}