"use client";

import { memo, useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { MermaidModal } from './MermaidModal';

interface MermaidDiagramProps {
  chart: string;
  id?: string;
}

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

export const MermaidDiagram = memo(function MermaidDiagram({ chart, id }: MermaidDiagramProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const mermaidId = id || `mermaid-${Math.random().toString(36).substring(2, 11)}`;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [themeKey, setThemeKey] = useState(0); // Force re-render on theme change

  const renderDiagram = async () => {
    if (!elementRef.current || !chart.trim()) return;
    
    try {
      // Initialize mermaid with current theme
      mermaid.initialize(getMermaidConfig());
      
      // Clear any existing content
      if (elementRef.current) {
        elementRef.current.innerHTML = '';
      }
      
      // Parse and validate the mermaid syntax
      const isValid = await mermaid.parse(chart);
      
      if (isValid && elementRef.current) {
        // Render the diagram
        const { svg } = await mermaid.render(`${mermaidId}-${themeKey}`, chart);
        elementRef.current.innerHTML = svg;
      } else if (elementRef.current) {
        elementRef.current.innerHTML = `
          <div class="p-4 border border-red-500 rounded-lg bg-red-50 dark:bg-red-900/20">
            <p class="text-red-700 dark:text-red-300">Invalid Mermaid syntax</p>
          </div>
        `;
      }
    } catch (error) {
      console.error('Mermaid rendering error:', error);
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

  // Listen for theme changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          // Theme changed, trigger re-render
          setThemeKey(prev => prev + 1);
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, []);

  // Re-render when chart or theme changes
  useEffect(() => {
    renderDiagram();
  }, [chart, themeKey]);

  if (!chart.trim()) {
    return null;
  }

  return (
    <>
      <div className="my-6 flex justify-center">
        <div className="max-w-full overflow-x-auto">
          <div 
            ref={elementRef} 
            className="mermaid-diagram cursor-pointer hover:opacity-80 transition-opacity"
            style={{ minHeight: '100px' }}
            onClick={() => setIsModalOpen(true)}
            title="Click to expand diagram"
          />
        </div>
      </div>
      
      <MermaidModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        chart={chart}
        title="Expanded Diagram"
      />
    </>
  );
});