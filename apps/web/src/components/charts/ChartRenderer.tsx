"use client";

import { memo } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ChartData {
  name: string;
  value: number;
  percentage?: number;
  color?: string;
}

interface ChartRendererProps {
  data: ChartData[];
  type: 'pie' | 'bar';
  title?: string;
  width?: number;
  height?: number;
}

const DEFAULT_COLORS = [
  '#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1',
  '#d084d0', '#ffb347', '#87ceeb', '#dda0dd', '#98fb98',
  '#f0e68c', '#ff6347', '#40e0d0', '#ee82ee', '#90ee90'
];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

export const ChartRenderer = memo(function ChartRenderer({ 
  data, 
  type, 
  title, 
  width = 400, 
  height = 300 
}: ChartRendererProps) {
  if (!data || data.length === 0) {
    return null;
  }

  // Add colors to data if not provided
  const coloredData = data.map((item, index) => ({
    ...item,
    color: item.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length]
  }));

  if (type === 'pie') {
    return (
      <div className="my-6 flex flex-col items-center">
        {title && (
          <h3 className="text-lg font-semibold mb-4 text-center">{title}</h3>
        )}
        <div className="w-full max-w-2xl">
          <ResponsiveContainer width="100%" height={height}>
            <PieChart>
              <Pie
                data={coloredData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={false}
                outerRadius={Math.min(width, height) / 3}
                fill="#8884d8"
                dataKey="value"
              >
                {coloredData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number) => [formatCurrency(value), 'Amount']}
                labelFormatter={(label) => `Category: ${label}`}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        {/* Data table below chart */}
        <div className="mt-4 w-full max-w-2xl">
          <table className="w-full border-collapse border border-border rounded-md text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="border border-border px-3 py-2 text-left font-semibold">Category</th>
                <th className="border border-border px-3 py-2 text-right font-semibold">Amount</th>
                <th className="border border-border px-3 py-2 text-right font-semibold">Percentage</th>
              </tr>
            </thead>
            <tbody>
              {coloredData.map((item, index) => (
                <tr key={index}>
                  <td className="border border-border px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: item.color }}
                      />
                      {item.name}
                    </div>
                  </td>
                  <td className="border border-border px-3 py-2 text-right">
                    {formatCurrency(item.value)}
                  </td>
                  <td className="border border-border px-3 py-2 text-right">
                    {formatPercentage(item.percentage || 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (type === 'bar') {
    return (
      <div className="my-6">
        {title && (
          <h3 className="text-lg font-semibold mb-4 text-center">{title}</h3>
        )}
        <div className="w-full">
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={coloredData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                angle={-45}
                textAnchor="end"
                height={100}
                interval={0}
              />
              <YAxis 
                tickFormatter={formatCurrency}
              />
              <Tooltip 
                formatter={(value: number) => [formatCurrency(value), 'Amount']}
                labelFormatter={(label) => `Category: ${label}`}
              />
              <Legend />
              <Bar dataKey="value" fill="#8884d8" name="Amount">
                {coloredData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  return null;
});