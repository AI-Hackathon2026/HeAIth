export interface NutritionFoodItemOwnerRow {
    id: string;
    userId: string;
    routineId: string;
    nutritionPlanId: string;
    progressPercentage: number;
}

export interface INutritionFoodItemQueryRepo {
    findOwnedById(foodItemId: string): Promise<NutritionFoodItemOwnerRow | null>;
}
