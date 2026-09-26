import { IHealthRecordQueryRepo } from "../../port/repo/query/I.health-record.query.repo";
import { IHealthStatusQueryRepo } from "../../port/repo/query/I.health-status.query.repo";
import { BusinessException, BusinessExceptionType } from "../../../shared/exceptions/business.exception";
import { getAgeGroup } from "../../../shared/utils/age-group.util";
import { buildHealthRanking } from "../../../shared/utils/health-ranking.util";
import { HealthRecordMapper } from "../mapper/health-record.mapper";
import { HealthRecordView } from "../view/health-record.view";

export class HealthRecordQueryService {
    constructor(
        private healthRecordQueryRepo: IHealthRecordQueryRepo,
        private healthStatusQueryRepo: IHealthStatusQueryRepo,
    ) {}

    async getMyRecord(userId: string): Promise<HealthRecordView> {
        const [record, healthStatus] = await Promise.all([
            this.healthRecordQueryRepo.findByUserId(userId),
            this.healthStatusQueryRepo.findByUserId(userId),
        ]);

        if (!record) {
            throw new BusinessException({ type: BusinessExceptionType.HEALTH_RECORD_NOT_FOUND });
        }

        if (!healthStatus) {
            throw new BusinessException({ type: BusinessExceptionType.HEALTH_STATUS_NOT_FOUND });
        }

        const ageGroup = getAgeGroup(healthStatus.age);
        const peerScores = await this.healthRecordQueryRepo.findOverallScoresByAgeGroupAndGender(
            ageGroup,
            healthStatus.gender,
        );
        const ranking = buildHealthRanking(
            record.overallScore,
            peerScores,
            ageGroup,
            healthStatus.gender,
        );

        return HealthRecordMapper.toView(record, ranking);
    }
}
