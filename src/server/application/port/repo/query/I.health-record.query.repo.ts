import { Gender } from "@/server/shared/types/enums";
import { HealthRecordEntity } from "../../../command/entity/health-record.entity";

export interface IHealthRecordQueryRepo {
    findByUserId(userId: string): Promise<HealthRecordEntity | null>;
    findOverallScoresByAgeGroupAndGender(ageGroup: string, gender: Gender): Promise<number[]>;
}
