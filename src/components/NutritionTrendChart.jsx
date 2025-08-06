// components/NutritionTrendChart.jsx
import React from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, LabelList
} from 'recharts'
import { nutrientMap } from '../utils/nutritionTracker';

export function NutritionBarChart({ data, selectedKey, recommendedIntake }) {
  const current = nutrientMap.find(n => n.key === selectedKey);
  const recommendation = recommendedIntake[current.key] || 0;

  return (
    <div className="w-full bg-white dark:bg-gray-800 rounded-xl shadow-md p-4">
      {/* Header Row */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
          {current.label} Trend <span className="text-sm text-gray-500">({current.unit})</span>
        </h3>
      </div>

      {/* Chart */}
      <div className="w-full h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="#e0e0e0"
              className="dark:stroke-gray-600"
            />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: 'var(--color-border)' }}
              className="text-gray-800 dark:text-gray-200"
              tickFormatter={(dateStr) => {
                const day = new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short' });
                return day; // e.g. "Mon", "Tue"
              }}
            />
            <YAxis 
              domain={[
                0,
                dataMax => Math.ceil(dataMax * 1.1) // 10% headroom
              ]}
              tick={{ fontSize: 12, fontWeight: 500 }}
              tickLine={false}
              axisLine={{ stroke: 'var(--color-border)' }}
              className="text-gray-800 dark:text-gray-200"
            />

            
            {/* Dotted Recommendation Line */}
            {recommendation > 0 && (
              <ReferenceLine 
                y={recommendation} 
                stroke="#ff4d4f" 
                strokeDasharray="4 4" 
                label={{
                  value: `Goal: ${recommendation}${current.unit}`,
                  position: 'right',
                  fill: '#ff4d4f',
                  fontSize: 12
                }}
              />
            )}

            <Bar 
              dataKey={selectedKey} 
              fill={current.color} 
              radius={[6, 6, 0, 0]} 
              animationDuration={600}
            >
              {/* Value labels on top of bars */}
              <LabelList 
                dataKey={selectedKey} 
                position="top" 
                formatter={(val) => `${val}`} 
                className="fill-gray-800 dark:fill-gray-200" 
                style={{
                  fontSize: 12,
                  fontWeight: 500
                }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
