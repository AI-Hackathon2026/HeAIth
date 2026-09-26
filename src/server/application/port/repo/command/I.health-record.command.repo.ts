import { HealthRecordEntity } from "../../../command/entity/health-record.entity";

export interface IHealthRecordCommandRepo {
    upsert(data: {
        userId: string;
        bmi: number;
        exposureRates: Record<string, number>;
        overallScore: number;
    }): Promise<HealthRecordEntity>;
}
