import { ExercisePlanEntity, PersistExercisePlanEntity } from "../../../command/entity/exercise.plan.entity";

export interface IExercisePlanCommandRepo {
    createMany(data: ExercisePlanEntity[]): Promise<PersistExercisePlanEntity[]>;
    deleteByDailyRoutineIds(dailyRoutineIds: string[]): Promise<void>;
    updateProgress(id: string, progressPercentage: number): Promise<PersistExercisePlanEntity>;
}
