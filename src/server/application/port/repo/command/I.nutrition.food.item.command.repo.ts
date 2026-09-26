import {
    NutritionFoodItemEntity,
    PersistNutritionFoodItemEntity,
} from "../../../command/entity/nutrition.food.item.entity";

export interface INutritionFoodItemCommandRepo {
    createManyForPlan(
        nutritionPlanId: string,
        items: NutritionFoodItemEntity[],
    ): Promise<PersistNutritionFoodItemEntity[]>;
    updateProgress(id: string, progressPercentage: number): Promise<PersistNutritionFoodItemEntity>;
    listByNutritionPlanId(nutritionPlanId: string): Promise<PersistNutritionFoodItemEntity[]>;
}
