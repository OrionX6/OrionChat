"use client";

import { useState, useEffect } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

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
    <div className="mb-2">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors py-2"
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
        <span className="text-sm font-medium">
          Reasoning
        </span>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="mt-3 ml-6 text-sm text-muted-foreground whitespace-pre-wrap">
          {thinkingContent || (
            <span className="italic">Starting to think...</span>
          )}
        </div>
      )}
    </div>
  );
}