// components/NutritionTrendChart.jsx
import React from 'react'
import {
    BarChart, LineChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
    ResponsiveContainer
} from 'recharts'

export function NutritionTrendChart({ data }) {
    return (
    <div className="w-full h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="calories" stroke="#8884d8" />
            <Line type="monotone" dataKey="protein" stroke="#82ca9d" />
            <Line type="monotone" dataKey="fat" stroke="#ffc658" />
            <Line type="monotone" dataKey="carbs" stroke="#ff8042" />
            <Line type="monotone" dataKey="vitamins" stroke="#00bcd4" />
            <Line type="monotone" dataKey="minerals" stroke="#4caf50" />
        </LineChart>
        </ResponsiveContainer>
    </div>
    )
}

export function NutritionStackedChart({ data }) {
    return (
        <div className="w-full h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip formatter={(value, name) => {
                const unit = name === 'calories' ? 'kcal' : 'g';
                return [`${value}${unit}`, name]
            }} />
            <Legend />
            <Bar dataKey="calories" stackId="a" fill="#8884d8" />
            <Bar dataKey="protein" stackId="a" fill="#82ca9d" />
            <Bar dataKey="fat" stackId="a" fill="#ffc658" />
            <Bar dataKey="carbs" stackId="a" fill="#ff8042" />
            <Bar dataKey="vitamins" stackId="a" fill="#00bcd4" />
            <Bar dataKey="minerals" stackId="a" fill="#4caf50" />
            </BarChart>
        </ResponsiveContainer>
        </div>
    )
}
  
