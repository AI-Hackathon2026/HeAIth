import { ExerciseRoutineEntry } from "../../query/view/routine.view";

export type PersistExercisePlanEntity = ExercisePlanEntity & {
    id: string;
};

export class ExercisePlanEntity {    id?: string;
    dailyRoutineId: string;
    exercise: ExerciseRoutineEntry;
    progressPercentage: number;

    constructor(data: {
        id?: string;
        dailyRoutineId: string;
        exercise: ExerciseRoutineEntry;
        progressPercentage: number;
    }) {
        this.id = data.id;
        this.dailyRoutineId = data.dailyRoutineId;
        this.exercise = data.exercise;
        this.progressPercentage = data.progressPercentage;
    }

    static create(data: {
        id?: string;
        dailyRoutineId: string;
        exercise: ExerciseRoutineEntry;
        progressPercentage?: number;
    }): ExercisePlanEntity {
        return new ExercisePlanEntity({
            id: data.id,
            dailyRoutineId: data.dailyRoutineId,
            exercise: data.exercise,
            progressPercentage: data.progressPercentage ?? 0,
        });
    }

    static persist(data: {
        id: string;
        dailyRoutineId: string;
        exercise: ExerciseRoutineEntry;
        progressPercentage?: number;
    }): PersistExercisePlanEntity {
        return new ExercisePlanEntity({
            ...data,
            progressPercentage: data.progressPercentage ?? 0,
        }) as PersistExercisePlanEntity;
    }
}
