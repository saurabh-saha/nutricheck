// components/NutritionTrendChart.jsx
import React from 'react'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
    ResponsiveContainer
} from 'recharts'
import { nutrientMap } from '../utils/nutritionTracker';
import { useState } from "react";
  
export function NutritionBarChart({ data, selectedKey, onChange }) {
  const current = nutrientMap.find(n => n.key === selectedKey);

  return (
    <div className="w-full">
      {/* Dropdown */}
      <div className="mb-4">
        <label htmlFor="nutrient-select" className="mr-2 font-medium text-black dark:text-white">
            Select Nutrient:
        </label>
        <select
          id="nutrient-select"
          value={selectedKey}
          onChange={(e) => onChange(e.target.value)}
          className="border rounded px-2 py-1 bg-white text-black dark:bg-gray-800 dark:text-white"
        >
          {nutrientMap.map(({ key, label }) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      {/* Chart */}
      <div className="w-full h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip formatter={(value) => [`${value}${current.unit}`, current.label]} />
            <Legend />
            <Bar dataKey={selectedKey} fill={current.color} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
