// components/NutritionTrendChart.jsx
import React, {useState} from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ReferenceLine} from 'recharts'
import { nutrientMap } from '../utils/nutritionTracker';
import { Cell } from 'recharts';

export function NutritionBarChart({ data, selectedKey, recommendedIntake, onSelectDate }) {
  const current = nutrientMap.find(n => n.key === selectedKey);
  const recommendation = recommendedIntake[current.key] || 0;

  // Calculate average of last 7 days (or fewer if less data)
  const last7Days = data.slice(-7);
  const total = last7Days.reduce((sum, day) => sum + (day[selectedKey] || 0), 0);
  const average = (total / last7Days.length).toFixed(1);

  const [selectedDate, setSelectedDate] = useState(null);

  // Display value depends on selectedDate or average
  let displayValue = `7 Day Average: ${average} ${current.unit}`;
  if (selectedDate) {
    // Find selected day data from data
    const dayData = data.find(d => d.date === selectedDate);
    if (dayData) {
      displayValue = `${new Date(selectedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}: ${dayData[selectedKey]} ${current.unit}`;
    }
  }

  // Handle bar click
  function handleBarClick(data, index, event) {
    if (!data || !data.payload) return;
    const dayDate = data.payload.date;
    setSelectedDate(dayDate);
    if (onSelectDate) onSelectDate(dayDate);
  }  

  return (
    <div className="w-full bg-white dark:bg-gray-800 rounded-xl shadow-md p-3">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
        {current.label} <span className="text-sm text-gray-500"></span>
      </h3>

      <div className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-3">
        {displayValue}
      </div>

      {/* Chart */}
      <div className="w-full h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={data} 
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
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
                return day;
              }}
            />
            <YAxis 
              domain={[0, dataMax => Math.ceil(dataMax * 1.1)]}
              tick={{ fontSize: 12, fontWeight: 500 }}
              tickLine={false}
              axisLine={{ stroke: 'var(--color-border)' }}
              width={36}
              className="text-gray-800 dark:text-gray-200"
            />

            {recommendation > 0 && (
              <ReferenceLine 
                y={recommendation} 
                stroke="#ff4d4f" 
                strokeDasharray="4 4" 
                label={{
                  value: `${recommendation}`,
                  position: 'left',
                  fill: '#ff4d4f',
                  fontSize: 12
                }}
              />
            )}

            <Bar
              dataKey={selectedKey}
              radius={[6, 6, 0, 0]}
              animationDuration={600}
              cursor="pointer"
            >
              {data.map((entry) => (
                <Cell
                  key={entry.date}
                  fill={current.color}
                  opacity={entry.date === selectedDate ? 1 : 0.8}
                  onClick={() => {
                    setSelectedDate(entry.date);
                    if (onSelectDate) onSelectDate(entry.date);
                  }}
                  style={{ cursor: "pointer" }}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
