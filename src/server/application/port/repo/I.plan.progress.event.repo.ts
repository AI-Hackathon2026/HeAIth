import { PlanType } from "@/server/shared/types/enums";

export interface IPlanProgressEventQueryRepo {
    exists(userId: string, planId: string, progressPercentage: number): Promise<boolean>;
}

export interface IPlanProgressEventCommandRepo {
    create(data: {
        userId: string;
        routineId: string;
        planType: PlanType;
        planId: string;
        progressPercentage: number;
        xpGranted: number;
    }): Promise<void>;
}
