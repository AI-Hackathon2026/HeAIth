import { NutritionPlanEntity, PersistNutritionPlanEntity } from "../../../command/entity/nutrition.plan.entity";

export interface INutritionPlanCommandRepo {
    createMany(data: NutritionPlanEntity[]): Promise<PersistNutritionPlanEntity[]>;
    deleteByDailyRoutineIds(dailyRoutineIds: string[]): Promise<void>;
    updateProgress(id: string, progressPercentage: number): Promise<PersistNutritionPlanEntity>;
}
