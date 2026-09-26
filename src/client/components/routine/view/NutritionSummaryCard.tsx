import type { NutritionMeal, NutritionSummaryEntry } from "../../../types";
import { resolveDayTotalCalories } from "../../../utils/nutritionSummary";
import { NutritionDonutChart } from "./NutritionDonutChart";

interface Props {
  averageCalories?: number;
  nutritionSummary?: NutritionSummaryEntry[];
  meals?: NutritionMeal[];
}

export function NutritionSummaryCard({
  averageCalories,
  nutritionSummary,
  meals,
}: Props) {
  if (!nutritionSummary?.length) return null;

  const mealCalories = (meals ?? []).reduce(
    (sum, meal) => sum + meal.calories,
    0,
  );
  const totalCal = resolveDayTotalCalories(averageCalories, mealCalories);

  return (
    <section className="routine-nutrition-summary" aria-label="영양 균형">
      <div className="routine-nutrition-summary-card routine-nutrition-donut-wrap">
        <header className="routine-nutrition-donut-head">
          <h3 className="routine-nutrition-donut-title">오늘의 영양 균형</h3>
        </header>

        <NutritionDonutChart
          entries={nutritionSummary}
          totalCalories={totalCal}
        />
      </div>
    </section>
  );
}
