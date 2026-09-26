import { useMemo, useState } from "react";
import { MEAL_TYPE_ORDER } from "../../constants/routine";
import type { MealType, NutritionMeal, NutritionRoutineDay } from "../../types";
import { DayNavigation } from "./view/DayNavigation";
import { MealSection } from "./view/MealSection";
import { NutritionSummaryCard } from "./view/NutritionSummaryCard";

interface Props {
  days: NutritionRoutineDay[];
  updatingPlanId?: string | null;
  onToggle?: (planId: string, isCompleted: boolean) => void;
}

function groupMealsByType(meals: NutritionMeal[]) {
  const grouped = new Map<MealType, NutritionMeal[]>();

  for (const meal of meals) {
    const bucket = grouped.get(meal.mealType) ?? [];
    bucket.push(meal);
    grouped.set(meal.mealType, bucket);
  }

  return MEAL_TYPE_ORDER.filter((type) => grouped.has(type)).map((mealType) => ({
    mealType,
    meals: grouped.get(mealType)!,
  }));
}

export function NutritionRoutineTracker({
  days,
  updatingPlanId = null,
  onToggle,
}: Props) {
  const [dayIndex, setDayIndex] = useState(0);

  const safeIndex = Math.min(Math.max(0, dayIndex), Math.max(0, days.length - 1));
  const day = days[safeIndex];
  const dayNumber = day?.dayNumber ?? safeIndex + 1;
  const mealGroups = useMemo(
    () => groupMealsByType(day?.meals ?? []),
    [day?.meals],
  );

  const totalMeals = days.reduce((sum, d) => sum + d.meals.length, 0);
  if (totalMeals === 0) {
    return <p className="routine-v2-empty">등록된 영양 루틴이 없습니다.</p>;
  }

  return (
    <div className="routine-v2-day-view routine-nutrition-view">
      <DayNavigation
        currentIndex={safeIndex}
        totalDays={days.length}
        onChange={setDayIndex}
      />

      <NutritionSummaryCard
        averageCalories={day!.averageCalories}
        nutritionSummary={day!.nutritionSummary}
        meals={day!.meals}
      />

      <div className="routine-nutrition-meals-divider" role="separator" />

      <p className="routine-nutrition-summary-sec-label">
        {dayNumber}일차 식단
      </p>

      <div className="routine-nutrition-meals">
        {mealGroups.map(({ mealType, meals }) => (
          <MealSection
            key={`${dayNumber}-${mealType}`}
            mealType={mealType}
            meals={meals}
            updatingPlanId={updatingPlanId}
            onToggleMeal={onToggle}
          />
        ))}
      </div>
    </div>
  );
}
