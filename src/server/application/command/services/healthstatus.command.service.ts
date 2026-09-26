import { CreateHealthstatusDto, UpdateHealthStatusDto } from "../../../Inbound/controller/_communication/request/healthcare.request";
import { IHealthcareCommandRepo as IHealthstatusCommandRepo } from "../../port/repo/command/I.healthcare.command.repo";
import { IUnitOfWork } from "../../port/repo/I.unit.of.work";
import {
    HealthcareAssessmentView,
    ObesityStatus,
} from "../../query/view/healthcare.assessment.view";
import { HealthStatusEntity } from "../entity/health.status.entity";
import { HealthRecordCommandService } from "./health-record.command.service";
import { BusinessException, BusinessExceptionType } from "../../../shared/exceptions/business.exception";
const OBESITY_CRITERIA = "BMI 25 kg/m² 이상: 비만, 18.5 kg/m² 미만: 저체중";

export class HealthstatusCommandService {
    constructor(
        private uow: IUnitOfWork,
        private healthstatusCommandRepo: IHealthstatusCommandRepo,
        private healthRecordCommandService: HealthRecordCommandService,
    ) { }

    async createHealthstatus(userId: string, dto: CreateHealthstatusDto): Promise<HealthcareAssessmentView> {
        const existing = await this.healthstatusCommandRepo.findByUserId(userId);
        if (existing) {
            return this._buildAssessment(existing);
        }
        
        const entity = HealthStatusEntity.create(userId, {
            gender: dto.gender,
            age: dto.age,
            height: dto.height,
            weight: dto.weight,
            alcoholFreq: dto.alcoholFreq,
            smokeFreq: dto.smokeFreq,
            exerciseFreq: dto.exerciseFreq,
        });

        const saved = await this.healthstatusCommandRepo.create(entity);

        await this.healthRecordCommandService.createFromHealthStatus(saved);

        return this._buildAssessment(saved);
    }

    async getHealthstatus(userId: string): Promise<HealthStatusEntity> {
        const healthStatus = await this.healthstatusCommandRepo.findByUserId(userId);
        if (!healthStatus) {
            throw new BusinessException({ type: BusinessExceptionType.HEALTH_STATUS_NOT_FOUND });
        }
        return healthStatus;
    }

    async updateHealthstatus(userId: string, dto: UpdateHealthStatusDto): Promise<HealthcareAssessmentView> {
        const existing = await this.healthstatusCommandRepo.findByUserId(userId);
        if (!existing?.id || existing.id !== dto.id) {
            throw new BusinessException({ type: BusinessExceptionType.HEALTH_STATUS_NOT_FOUND });
        }

        const entity = existing.update({
            id: dto.id,
            gender: dto.gender,
            age: dto.age,
            height: dto.height,
            weight: dto.weight,
            alcoholFreq: dto.alcoholFreq,
            smokeFreq: dto.smokeFreq,
            exerciseFreq: dto.exerciseFreq,
        });

        const saved = await this.uow.do(
            () => this.healthstatusCommandRepo.update(entity),
            {
                transactionOptions: { useTransaction: true, isolationLevel: "ReadCommitted" },
                useOptimisticLock: false,
            },
        );

        await this.healthRecordCommandService.createFromHealthStatus(saved);

        return this._buildAssessment(saved);
    }

    private _buildAssessment(record: HealthStatusEntity): HealthcareAssessmentView {
        const heightM = record.height / 100;
        const bmi = Number((record.weight / (heightM ** 2)).toFixed(1));

        const obesityStatus = this._assessObesity(bmi);

        return {
            id: record.id!,
            userId: record.userId,
            gender: record.gender,
            age: record.age,
            height: record.height,
            weight: record.weight,
            bmi,
            obesity: {
                status: obesityStatus,
                label: this._obesityLabel(obesityStatus),
                criteria: OBESITY_CRITERIA,
                vulnerabilityGuide: this._obesityVulnerability(record.gender, record.age, obesityStatus),
                lifestyleGuide: this._obesityLifestyleGuide(obesityStatus),
            },
            lifestyle: {
                alcoholFreq: record.alcoholFreq,
                smokeFreq: record.smokeFreq,
                exerciseFreq: record.exerciseFreq,
                alcoholGuide: this._alcoholGuide(record.alcoholFreq),
                smokingGuide: this._smokingGuide(record.smokeFreq),
                exerciseGuide: this._exerciseGuide(record.exerciseFreq),
            },
        };
    }

    private _assessObesity(bmi: number): ObesityStatus {
        if (bmi >= 25) return "obese";
        if (bmi < 18.5) return "underweight";
        return "normal";
    }

    private _obesityLabel(status: ObesityStatus): string {
        if (status === "obese") return "비만";
        if (status === "underweight") return "저체중";
        return "정상 체중";
    }

    private _ageDecade(age: number): number {
        return Math.floor(age / 10) * 10;
    }

    private _obesityVulnerability(
        gender: string,
        age: number,
        status: ObesityStatus,
    ): string | null {
        const decade = this._ageDecade(age);

        if (gender === "MALE" && status === "obese") {
            if (decade === 30) {
                return "남성 30대 비만 유병률은 49.1%로 약 절반 수준입니다. 동년배 대비 체중 관리가 특히 중요해요.";
            }
            if (decade === 40) {
                return "남성 40대 비만 유병률은 61.7%로 가장 높은 편입니다. 강력한 체중 관리 경고가 필요해요.";
            }
            if (decade === 50) {
                return "남성 50대 비만 유병률은 48.1%입니다. 이 연령대 남성은 체중 관리에 각별히 유의해야 해요.";
            }
        }

        if (gender === "FEMALE" && status === "underweight" && decade === 20) {
            return "여성 20대 저체중 유병률은 19.3%로 매우 높습니다. 과도한 체중 감량보다 균형 잡힌 영양 섭취가 필요해요.";
        }

        if (gender === "FEMALE" && status === "obese" && age >= 70) {
            return "70대 이상 여성 비만율은 38.3%로 가장 높습니다. 연령에 맞춘 저강도 운동과 식습관 관리를 권장해요.";
        }

        return null;
    }

    private _obesityLifestyleGuide(status: ObesityStatus): string | null {
        if (status !== "obese") return null;
        return (
            "비만인 사람의 89.1%는 스스로 비만임을 인지하지만, 실제 체중 감소를 시도하는 비율은 59.5%에 불과합니다. " +
            "인지에서 그치지 말고 걷기·식단 조절 등 구체적인 행동 변화로 옮겨 보세요."
        );
    }

    private _alcoholGuide(alcoholFreq: number): string | null {
        if (alcoholFreq >= 5) {
            return "주 5회 이상 음주는 간·혈압·체중에 부담을 줍니다. 주 2회 이하로 줄이는 것을 권장합니다.";
        }
        if (alcoholFreq >= 3) {
            return "주 3~4회 음주는 적정 수준을 넘을 수 있습니다. 음주 없는 날을 늘려 보세요.";
        }
        return null;
    }

    private _smokingGuide(smokeFreq: number): string | null {
        if (smokeFreq >= 1) {
            return "흡연은 심혈관·호흡기 질환 위험을 높입니다. 금연 상담이나 대체 습관을 통해 점진적으로 줄여 보세요.";
        }
        return null;
    }

    private _exerciseGuide(exerciseFreq: number): string | null {
        if (exerciseFreq <= 1) {
            return "주 1회 이하 운동은 WHO 권장(주 150분 중등도)에 크게 못 미칩니다. 가벼운 걷기부터 시작해 보세요.";
        }
        if (exerciseFreq <= 3) {
            return "운동 빈도를 주 3~4회로 늘리면 체중·혈압 관리에 도움이 됩니다.";
        }
        return null;
    }
}
