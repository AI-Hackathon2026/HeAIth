import { NutritionSummary } from "../../../query/view/routine.view";

export interface INutritionSummaryCommandRepo {
    attachToDailyRoutine(dailyRoutineId: string, summary: NutritionSummary): Promise<void>;
}
