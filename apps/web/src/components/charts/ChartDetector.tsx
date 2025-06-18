"use client";

import { memo } from 'react';
import { ChartRenderer } from './ChartRenderer';

interface ChartData {
  name: string;
  value: number;
  percentage?: number;
}

interface ChartDetectorProps {
  content: string;
}

function parseChartData(content: string): { data: ChartData[]; type: 'pie' | 'bar'; title?: string } | null {
  const lines = content.split('\n');
  const data: ChartData[] = [];
  let title: string | undefined;
  let chartType: 'pie' | 'bar' = 'pie';

  // Look for chart indicators
  const hasChartIndicators = content.toLowerCase().includes('pie chart') || 
                            content.toLowerCase().includes('bar chart') ||
                            content.toLowerCase().includes('breakdown') ||
                            (content.includes('%') && content.includes('$'));

  if (!hasChartIndicators) {
    return null;
  }

  // Determine chart type
  if (content.toLowerCase().includes('bar chart')) {
    chartType = 'bar';
  }

  // Extract title if present
  const titleMatch = content.match(/(?:pie chart|bar chart|breakdown)\s*(?:of|for)?\s*([^.\n]+)/i);
  if (titleMatch) {
    title = titleMatch[1].trim();
  }

  // Pattern to match lines with category, amount, and percentage
  // Examples:
  // "Transfers Out (Zelle/Internal) $3,404.00 57.87%"
  // "Utilities & Bills $539.10 9.15%"
  const dataPattern = /^(.+?)\s+\$?([\d,]+\.?\d*)\s+(\d+\.?\d*)%/;
  
  // Pattern for simpler format with just name and percentage
  const simplePattern = /^["']?([^"']+)["']?\s*[:\-]?\s*(\d+\.?\d*)%?/;

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    // Try detailed pattern first (with amount and percentage)
    const detailedMatch = trimmedLine.match(dataPattern);
    if (detailedMatch) {
      const name = detailedMatch[1].trim();
      const value = parseFloat(detailedMatch[2].replace(/,/g, ''));
      const percentage = parseFloat(detailedMatch[3]);
      
      if (!isNaN(value) && !isNaN(percentage) && name.length > 0) {
        data.push({ name, value, percentage });
        continue;
      }
    }

    // Try to extract data from expense breakdown format
    // Example: "Food & Dining: 4.39%"
    const breakdownMatch = trimmedLine.match(/^([^:]+):\s*(\d+\.?\d*)%/);
    if (breakdownMatch) {
      const name = breakdownMatch[1].trim().replace(/['"]/g, '');
      const percentage = parseFloat(breakdownMatch[2]);
      
      if (!isNaN(percentage) && name.length > 0) {
        // Estimate value from percentage if total is mentioned
        let estimatedValue = percentage;
        const totalMatch = content.match(/total.*?\$?([\d,]+\.?\d*)/i);
        if (totalMatch) {
          const total = parseFloat(totalMatch[1].replace(/,/g, ''));
          if (!isNaN(total)) {
            estimatedValue = (total * percentage) / 100;
          }
        }
        data.push({ name, value: estimatedValue, percentage });
        continue;
      }
    }

    // Pattern for lines like: "Transfers Out (Zelle/Internal)" "57.87"
    if (trimmedLine.includes('%') || trimmedLine.includes('$')) {
      const parts = trimmedLine.split(/\s+/);
      let name = '';
      let value = 0;
      let percentage = 0;

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        
        // Check if this part contains a percentage
        if (part.includes('%')) {
          percentage = parseFloat(part.replace('%', ''));
          if (!isNaN(percentage)) {
            // Everything before this is likely the name
            name = parts.slice(0, i).join(' ').trim();
            break;
          }
        }
        
        // Check if this part contains a dollar amount
        if (part.includes('$') || /^\d+[,.]?\d*$/.test(part.replace(/[,$]/g, ''))) {
          const cleanValue = part.replace(/[$,]/g, '');
          const parsedValue = parseFloat(cleanValue);
          if (!isNaN(parsedValue)) {
            value = parsedValue;
            // Everything before this is likely the name
            if (name === '') {
              name = parts.slice(0, i).join(' ').trim();
            }
          }
        }
      }

      if (name && (value > 0 || percentage > 0)) {
        data.push({ name, value, percentage });
      }
    }
  }

  // Filter out duplicates and invalid entries
  const uniqueData = data.filter((item, index, self) => 
    item.name.length > 2 && // Ensure name is meaningful
    !item.name.toLowerCase().includes('total') && // Exclude total rows
    self.findIndex(d => d.name === item.name) === index // Remove duplicates
  );

  return uniqueData.length >= 2 ? { data: uniqueData, type: chartType, title } : null;
}

export const ChartDetector = memo(function ChartDetector({ content }: ChartDetectorProps) {
  const chartInfo = parseChartData(content);
  
  if (!chartInfo) {
    return null;
  }

  return (
    <div className="my-4 p-4 border border-border rounded-lg bg-muted/10">
      <ChartRenderer 
        data={chartInfo.data}
        type={chartInfo.type}
        title={chartInfo.title}
        height={400}
      />
    </div>
  );
});