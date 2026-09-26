import type { MealType, NutritionMeal } from "../../../types";
import { MEAL_TYPE_ICONS, MEAL_TYPE_LABELS } from "../../../constants/routine";

interface Props {
  mealType: MealType;
  meals: NutritionMeal[];
  updatingPlanId?: string | null;
  onToggleMeal?: (planId: string, isCompleted: boolean) => void;
}

export function MealSection({
  mealType,
  meals,
  updatingPlanId = null,
  onToggleMeal,
}: Props) {
  const label = MEAL_TYPE_LABELS[mealType] ?? mealType;
  const icon = MEAL_TYPE_ICONS[mealType] ?? "🍽";
  const totalCal = meals.reduce((sum, meal) => sum + meal.calories, 0);
  const done = meals.filter((meal) => meal.isCompleted).length;
  const total = meals.length;
  const allDone = total > 0 && done === total;

  return (
    <div className="routine-nutrition-meal-card">
      <div className="routine-nutrition-meal-header">
        <span className="routine-nutrition-meal-icon" aria-hidden>
          {icon}
        </span>
        <span className="routine-nutrition-meal-label">{label}</span>
        {totalCal > 0 && (
          <span className="routine-nutrition-meal-cal">
            {totalCal.toLocaleString()} kcal
          </span>
        )}
        <span
          className={`routine-nutrition-meal-badge${allDone ? " is-done" : ""}`}
        >
          {done}/{total}
        </span>
      </div>

      <div className="routine-nutrition-meal-body">
        {meals.map((meal) => {
          const foodName = meal.foods[0] ?? "메뉴 정보 없음";
          const disabled =
            !meal.planId || !onToggleMeal || updatingPlanId === meal.planId;

          return (
            <button
              key={meal.planId || `${mealType}-${foodName}`}
              type="button"
              className={`routine-nutrition-food-row${meal.isCompleted ? " is-complete" : ""}`}
              disabled={disabled}
              onClick={() => {
                if (meal.planId) {
                  onToggleMeal?.(meal.planId, meal.isCompleted);
                }
              }}
            >
              <span
                className={`routine-nutrition-food-check${meal.isCompleted ? " is-done" : ""}`}
                aria-hidden
              >
                {meal.isCompleted && "✓"}
              </span>
              <span className="routine-nutrition-food-name">{foodName}</span>
              {meal.calories > 0 && (
                <span className="routine-nutrition-food-cal">
                  {meal.calories.toLocaleString()} kcal
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
