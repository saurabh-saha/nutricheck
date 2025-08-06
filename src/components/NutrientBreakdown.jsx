import { useIntake } from "../context/ProfileContext";
import { getTodayDate, getLast7DaysSummary, getDefaultIntake } from "../utils/nutritionTracker"
import { NutritionBarChart } from "./NutritionTrendChart"
import NutrientProgressList from "./NutrientProgressList"
import NutrientBreakdownList from "./NutrientBreakdownList"

export default function NutrientBreakdown({ history, todayData, selectedNutrient, setSelectedNutrient }) {
  const { recommendedIntake } = useIntake();
  const intake = recommendedIntake || getDefaultIntake();

  const filtered = history.filter(
    e => e.date === getTodayDate() && e.nutrition[selectedNutrient] > 0
  );
  const total = todayData[selectedNutrient] || 0;

  return (
    <div>
      {/* Chart Section */}
      <div className="mb-6">
        <NutritionBarChart
          data={getLast7DaysSummary(history)}
          selectedKey={selectedNutrient}
          recommendedIntake={intake}
        />
      </div>

      {/* Today vs Recommended */}
      <NutrientProgressList
        todayData={todayData}
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
