import { DiseaseType } from "@/server/shared/types/enums";
import { HealthStatusEntity } from "../entity/health.status.entity";
import { IHealthRecordCommandRepo } from "../../port/repo/command/I.health-record.command.repo";
import { IHealthRecordQueryRepo } from "../../port/repo/query/I.health-record.query.repo";
import { IHealthStatusQueryRepo } from "../../port/repo/query/I.health-status.query.repo";
import { IDiseaseRateQueryRepo } from "../../port/repo/query/I.disease-rate.query.repo";
import { IUnitOfWork } from "../../port/repo/I.unit.of.work";
import { BusinessException, BusinessExceptionType } from "../../../shared/exceptions/business.exception";
import { HealthRecordMapper } from "../../query/mapper/health-record.mapper";
import { HealthRecordProjectionView } from "../../query/view/health-record.view";
import {
    calcBmi,
    calcOverallScore,
    getAgeGroup,
    getExposureRates,
    nearestExerciseBucket,
} from "../../../shared/utils/knhanes.lookup";

export class HealthRecordCommandService {
    constructor(
        private uow: IUnitOfWork,
        private healthRecordCommandRepo: IHealthRecordCommandRepo,
        private healthRecordQueryRepo: IHealthRecordQueryRepo,
        private healthStatusQueryRepo: IHealthStatusQueryRepo,
        private diseaseRateQueryRepo: IDiseaseRateQueryRepo,
    ) {}

    async createFromHealthStatus(healthStatus: HealthStatusEntity): Promise<void> {
        if (!healthStatus.id) {
            throw new BusinessException({ type: BusinessExceptionType.HEALTH_STATUS_NOT_FOUND });
        }

        const bmi = calcBmi(healthStatus.weight, healthStatus.height);
        const exposureRates = getExposureRates(
            healthStatus.gender,
            healthStatus.age,
            bmi,
            healthStatus.smokeFreq,
            healthStatus.alcoholFreq,
        );
        const overallScore = calcOverallScore(exposureRates);

        await this.uow.do(
            () =>
                this.healthRecordCommandRepo.upsert({
                    userId: healthStatus.userId,
                    bmi: Math.round(bmi * 10) / 10,
                    exposureRates,
                    overallScore,
                }),
            {
                transactionOptions: { useTransaction: true, isolationLevel: "ReadCommitted" },
                useOptimisticLock: false,
            },
        );
    }

    async getProjectedReduction(
        userId: string,
        disease: DiseaseType,
        currentExerciseFreq?: number,
    ): Promise<HealthRecordProjectionView> {
        const healthRecord = await this.healthRecordQueryRepo.findByUserId(userId);
        const healthStatus = await this.healthStatusQueryRepo.findByUserId(userId);

        if (!healthRecord || !healthStatus) {
            throw new BusinessException({ type: BusinessExceptionType.HEALTH_STATUS_NOT_FOUND });
        }

        const ageGroup = getAgeGroup(healthStatus.age);
        const gender = healthStatus.gender;
        const exerciseFreq = currentExerciseFreq ?? healthStatus.exerciseFreq;
        const currentExposure = healthRecord.exposureRates[disease] ?? 0;

        const project = async (targetDays: number) => {
            const currentRate = await this.diseaseRateQueryRepo.findRate(
                disease,
                gender,
                ageGroup,
                nearestExerciseBucket(exerciseFreq),
            );
            const targetRate = await this.diseaseRateQueryRepo.findRate(
                disease,
                gender,
                ageGroup,
                targetDays,
            );

            if (!currentRate || !targetRate) return currentExposure;
            return Math.round(currentExposure * (targetRate / currentRate) * 10) / 10;
        };

        return HealthRecordMapper.toProjectionView(disease, {
            current: currentExposure,
            EASY: await project(2),
            MODERATE: await project(5),
            HARD: await project(7),
        });
    }
}
