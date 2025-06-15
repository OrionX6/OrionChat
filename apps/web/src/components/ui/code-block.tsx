"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "./button-wrapper";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface CodeBlockProps {
  code: string;
  language?: string;
}

export function CodeBlock({ code, language }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy code:", err);
    }
  };

  return (
    <div className="relative group bg-muted/30 rounded-lg border border-border/50 w-full min-w-0">
      {language && (
        <div className="flex items-center px-4 py-2.5 border-b border-border/30 bg-accent">
          <span className="text-sm text-accent-foreground font-medium">{language}</span>
        </div>
      )}
      <div className={`sticky ${language ? 'top-2' : 'top-2'} right-2 float-right w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity z-10 ${language ? '-mt-8 mr-2' : 'm-2'}`}>
        <div 
          className="w-full h-full rounded transition-colors bg-accent" 
        ></div>
        <Button
          variant="ghost"
          size="sm"
          onClick={copyToClipboard}
          className="absolute inset-0 w-6 h-6 p-0 bg-transparent hover:bg-transparent border-none"
          onMouseEnter={(e) => {
            const bgDiv = e.currentTarget.previousElementSibling as HTMLElement;
            if (bgDiv) {
              const root = document.documentElement;
              const isDark = root.getAttribute('data-theme') === 'dark';
              bgDiv.style.backgroundColor = isDark ? '#475569' : '#cbd5e1';
            }
          }}
          onMouseLeave={(e) => {
            const bgDiv = e.currentTarget.previousElementSibling as HTMLElement;
            if (bgDiv) {
              const root = document.documentElement;
              const isDark = root.getAttribute('data-theme') === 'dark';
              bgDiv.style.backgroundColor = isDark ? '#334155' : '#e2e8f0';
            }
          }}
        >
          {copied ? (
            <Check className="h-3 w-3 text-green-600" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
        </Button>
      </div>
      <div className="relative overflow-hidden">
        <SyntaxHighlighter
          language={language || 'text'}
          style={oneDark}
          customStyle={{
            margin: 0,
            padding: '1rem',
            fontSize: '0.75rem',
            lineHeight: '1.5',
            backgroundColor: 'transparent'
          }}
          codeTagProps={{
            style: {
              backgroundColor: 'transparent'
            }
          }}
          lineProps={{
            style: { backgroundColor: 'transparent' }
          }}
          wrapLongLines={false}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}
