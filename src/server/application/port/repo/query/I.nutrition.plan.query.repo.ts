export interface NutritionPlanOwnerRow {
    id: string;
    userId: string;
    routineId: string;
    progressPercentage: number;
}

export interface INutritionPlanQueryRepo {
    findOwnedById(planId: string): Promise<NutritionPlanOwnerRow | null>;
}
