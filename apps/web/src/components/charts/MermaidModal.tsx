"use client";

import { memo, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import mermaid from 'mermaid';

// Get current theme configuration
function getMermaidConfig() {
  if (typeof window === 'undefined') return {};
  
  const isDark = document.documentElement.classList.contains('dark');
  
  return {
    startOnLoad: false,
    theme: (isDark ? 'dark' : 'default') as 'dark' | 'default',
    securityLevel: 'loose' as 'loose',
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
    pie: {
      textPosition: 0.75
    },
    themeVariables: isDark ? {
      background: 'transparent',
      primaryColor: '#8884d8',
      primaryTextColor: '#ffffff',
      primaryBorderColor: '#374151',
      lineColor: '#374151',
      secondaryColor: '#82ca9d',
      tertiaryColor: '#ffc658'
    } : {
      background: 'transparent',
      primaryColor: '#8884d8',
      primaryTextColor: '#000000',
      primaryBorderColor: '#d1d5db',
      lineColor: '#d1d5db',
      secondaryColor: '#82ca9d',
      tertiaryColor: '#ffc658'
    }
  };
}

interface MermaidModalProps {
  isOpen: boolean;
  onClose: () => void;
  chart: string;
  title?: string;
}

export const MermaidModal = memo(function MermaidModal({ 
  isOpen, 
  onClose, 
  chart,
  title = "Diagram"
}: MermaidModalProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const mermaidId = `modal-mermaid-${Math.random().toString(36).substring(2, 11)}`;

  useEffect(() => {
    if (isOpen && chart.trim()) {
      const renderDiagram = async () => {
        // Wait longer for the modal DOM to be fully ready
        await new Promise(resolve => setTimeout(resolve, 500));
        
        if (!elementRef.current) {
          console.log('Modal element ref not available');
          return;
        }

        try {
          // Initialize mermaid with current theme
          mermaid.initialize(getMermaidConfig());
          
          // Clear any existing content
          elementRef.current.innerHTML = '';
          
          // Parse and validate the mermaid syntax
          const isValid = await mermaid.parse(chart);
          
          if (isValid && elementRef.current) {
            // Render the diagram with unique modal ID
            const { svg } = await mermaid.render(mermaidId, chart);
            elementRef.current.innerHTML = svg;
          } else if (elementRef.current) {
            elementRef.current.innerHTML = `
              <div class="p-4 border border-red-500 rounded-lg bg-red-50 dark:bg-red-900/20">
                <p class="text-red-700 dark:text-red-300">Invalid Mermaid syntax</p>
              </div>
            `;
          }
        } catch (error) {
          console.error('Mermaid modal rendering error:', error);
          if (elementRef.current) {
            elementRef.current.innerHTML = `
              <div class="p-4 border border-yellow-500 rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
                <p class="text-yellow-700 dark:text-yellow-300">Error rendering diagram</p>
                <pre class="text-xs mt-2 text-gray-600 dark:text-gray-400">${chart}</pre>
              </div>
            `;
          }
        }
      };

      renderDiagram();
    }
  }, [isOpen, chart, mermaidId]);

  if (!chart.trim()) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Click and drag to pan, scroll to zoom
          </DialogDescription>
        </DialogHeader>
        <div className="w-full flex justify-center p-4">
          <div className="w-full max-w-none overflow-x-auto">
            <div 
              ref={elementRef} 
              className="mermaid-diagram-modal w-full"
              style={{ minHeight: '200px' }}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
});