export interface ExercisePlanOwnerRow {
    id: string;
    userId: string;
    routineId: string;
    progressPercentage: number;
}

export interface IExercisePlanQueryRepo {
    findOwnedById(planId: string): Promise<ExercisePlanOwnerRow | null>;
}
