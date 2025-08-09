import React, { useState } from "react";
import { useIntake } from "../context/ProfileContext";
import { getTodayDate, getLast7DaysSummary, getDefaultIntake } from "../utils/nutritionTracker";
import { NutritionBarChart } from "./NutritionTrendChart";
import NutrientProgressList from "./NutrientProgressList";
import NutrientBreakdownList from "./NutrientBreakdownList";

export default function NutrientBreakdown({ history, todayData, selectedNutrient, setSelectedNutrient }) {
  const { recommendedIntake } = useIntake();
  const intake = recommendedIntake || getDefaultIntake();

  // New state for selected date from bar click
  const [selectedDate, setSelectedDate] = useState(null);

  // Get last 7 days summary for chart
  const last7DaysData = getLast7DaysSummary(history);

  // Determine which day data to show in NutrientProgressList
  // If selectedDate is set and exists in history, use that data; else fallback to todayData
  const selectedDayEntry = selectedDate
  ? last7DaysData.find(entry => entry.date === selectedDate)
  : null;
  const selectedDayData = selectedDayEntry ? selectedDayEntry : todayData;


  // Filter for NutrientBreakdownList (only for today)
  const dateToFilter = selectedDate || getTodayDate();
  const filtered = history.filter(
    e => e.date === dateToFilter && e.nutrition[selectedNutrient] > 0
  );
  
  const totalEntry = last7DaysData.find(e => e.date === dateToFilter);
  const total = totalEntry ? (totalEntry[selectedNutrient] || 0) : (todayData[selectedNutrient] || 0);


  return (
    <div>
      {/* Chart Section */}
      <div className="mb-6">
        <NutritionBarChart
          data={last7DaysData}
          selectedKey={selectedNutrient}
          recommendedIntake={intake}
          onSelectDate={setSelectedDate} // pass setter to capture clicks
        />
      </div>

      {/* Today or Selected Day vs Recommended */}
      <NutrientProgressList
        todayData={selectedDayData}
        intake={intake}
        selectedNutrient={selectedNutrient}
        setSelectedNutrient={setSelectedNutrient}
      />

      {/* Selected Nutrient Breakdown */}
      <NutrientBreakdownList
        selectedNutrient={selectedNutrient}
        setSelectedNutrient={setSelectedNutrient}
        filtered={filtered}
        total={total}
      />
    </div>
  );
}
