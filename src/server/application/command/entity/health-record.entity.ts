export class HealthRecordEntity {
    id?: string;
    userId: string;
    bmi: number;
    exposureRates: Record<string, number>;
    overallScore: number;

    constructor(data: {
        id?: string;
        userId: string;
        bmi: number;
        exposureRates: Record<string, number>;
        overallScore: number;
    }) {
        this.id = data.id;
        this.userId = data.userId;
        this.bmi = data.bmi;
        this.exposureRates = data.exposureRates;
        this.overallScore = data.overallScore;
    }
}
