import { Difficulty } from "@/server/shared/types/enums";

export type PersistRoutineEntity = RoutineEntity & {
    id: string;
};

export class RoutineEntity {
    id?: string;
    userId: string;
    difficulty: Difficulty;
    summary: string;
    reportReadme: string;
    report: string;
    isActive: boolean;

    constructor(data: {
        id?: string;
        userId: string;
        difficulty: Difficulty;
        summary: string;
        reportReadme: string;
        report?: string;
        isActive: boolean;
    }) {
        this.id = data.id;
        this.userId = data.userId;
        this.difficulty = data.difficulty;
        this.summary = data.summary;
        this.reportReadme = data.reportReadme;
        this.report = data.report ?? data.summary;
        this.isActive = data.isActive;
    }

    static create(data: {
        userId: string;
        difficulty: Difficulty;
        summary: string;
        reportReadme: string;
        report?: string;
        isActive: boolean;
    }): RoutineEntity {
        return new RoutineEntity(data);
    }

    static persist(data: {
        id: string;
        userId: string;
        difficulty: Difficulty;
        summary: string;
        reportReadme: string;
        report?: string;
        isActive: boolean;
    }): PersistRoutineEntity {
        return new RoutineEntity(data) as PersistRoutineEntity;
    }
}
