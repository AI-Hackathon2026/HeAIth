import { DiseaseType, Gender } from "@/server/shared/types/enums";

export interface IDiseaseRateQueryRepo {
    findRate(
        disease: DiseaseType,
        gender: Gender,
        ageGroup: string,
        exerciseDaysPerWeek: number,
    ): Promise<number | null>;
}
