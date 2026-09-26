export function splitCaloriesAcrossFoods(totalCalories: number, foodCount: number): number[] {
    if (foodCount <= 0) return [];

    const perFood = Math.floor(totalCalories / foodCount);
    const calories = Array.from({ length: foodCount }, () => perFood);
    calories[foodCount - 1] = totalCalories - perFood * (foodCount - 1);
    return calories;
}

export function computeAggregateProgressPercentages(
    items: Array<{ progressPercentage: number }>,
): number {
    if (items.length === 0) return 0;

    const total = items.reduce((sum, item) => sum + item.progressPercentage, 0);
    return Math.round(total / items.length);
}
