import { HealthRecordEntity } from "../../application/command/entity/health-record.entity";
import { HealthStatusEntity } from "../../application/command/entity/health.status.entity";
import { IHealthRecordCommandRepo } from "../../application/port/repo/command/I.health-record.command.repo";
import { IHealthcareCommandRepo } from "../../application/port/repo/command/I.healthcare.command.repo";
import { IDiseaseRateQueryRepo } from "../../application/port/repo/query/I.disease-rate.query.repo";
import { IHealthRecordQueryRepo } from "../../application/port/repo/query/I.health-record.query.repo";
import { IHealthStatusQueryRepo } from "../../application/port/repo/query/I.health-status.query.repo";
import { DISEASE_RATE_BY_EXERCISE } from "../../shared/data/disease-rate.seed";
import {
    TechnicalException,
    TechnicalExceptionType,
} from "../../shared/exceptions/technical.exception";
import { DiseaseType, Gender } from "../../shared/types/enums";
import { getAgeRange } from "../../shared/utils/health-ranking.util";
import { nearestExerciseBucket } from "../../shared/utils/knhanes.lookup";
import { HealthRecordRow, HealthStatusRow } from "../store/db.schema";
import { JsonStore, newId, nowIso } from "../store/json.store";

const toStatusEntity = (row: HealthStatusRow) =>
    new HealthStatusEntity({
        id: row.id,
        userId: row.userId,
        gender: row.gender,
        age: row.age,
        height: row.height,
        weight: row.weight,
        alcoholFreq: row.alcoholFreq,
        smokeFreq: row.smokeFreq,
        exerciseFreq: row.exerciseFreq,
    });

const toRecordEntity = (row: HealthRecordRow) =>
    new HealthRecordEntity({
        id: row.id,
        userId: row.userId,
        bmi: row.bmi,
        exposureRates: row.exposureRates,
        overallScore: row.overallScore,
    });

export class HealthstatusCommandRepo implements IHealthcareCommandRepo {
    constructor(private readonly store: JsonStore) {}

    async create(entity: HealthStatusEntity): Promise<HealthStatusEntity> {
        const row = this.store.write((db) => {
            if (db.healthStatuses.some((s) => s.userId === entity.userId)) {
                throw new TechnicalException({ type: TechnicalExceptionType.UNIQUE_VIOLATION });
            }
            const now = nowIso();
            const created: HealthStatusRow = {
                id: newId(),
                userId: entity.userId,
                gender: entity.gender,
                age: entity.age,
                height: entity.height,
                weight: entity.weight,
                alcoholFreq: entity.alcoholFreq,
                smokeFreq: entity.smokeFreq,
                exerciseFreq: entity.exerciseFreq,
                createdAt: now,
                updatedAt: now,
            };
            db.healthStatuses.push(created);
            return created;
        });
        return toStatusEntity(row);
    }

    async update(entity: HealthStatusEntity): Promise<HealthStatusEntity> {
        const row = this.store.write((db) => {
            const found = db.healthStatuses.find((s) => s.id === entity.id);
            if (!found) throw new TechnicalException({ type: TechnicalExceptionType.RESOURCE_NOT_FOUND });
            Object.assign(found, {
                gender: entity.gender,
                age: entity.age,
                height: entity.height,
                weight: entity.weight,
                alcoholFreq: entity.alcoholFreq,
                smokeFreq: entity.smokeFreq,
                exerciseFreq: entity.exerciseFreq,
                updatedAt: nowIso(),
            });
            return found;
        });
        return toStatusEntity(row);
    }

    async findByUserId(userId: string): Promise<HealthStatusEntity | null> {
        const row = this.store.read((db) => db.healthStatuses.find((s) => s.userId === userId) ?? null);
        return row ? toStatusEntity(row) : null;
    }
}

export class HealthStatusQueryRepo implements IHealthStatusQueryRepo {
    constructor(private readonly store: JsonStore) {}

    async findByUserId(userId: string): Promise<HealthStatusEntity | null> {
        const row = this.store.read((db) => db.healthStatuses.find((s) => s.userId === userId) ?? null);
        return row ? toStatusEntity(row) : null;
    }
}

export class HealthRecordCommandRepo implements IHealthRecordCommandRepo {
    constructor(private readonly store: JsonStore) {}

    async upsert(data: {
        userId: string;
        bmi: number;
        exposureRates: Record<string, number>;
        overallScore: number;
    }): Promise<HealthRecordEntity> {
        const row = this.store.write((db) => {
            const now = nowIso();
            const existing = db.healthRecords.find((r) => r.userId === data.userId);
            if (existing) {
                Object.assign(existing, {
                    bmi: data.bmi,
                    exposureRates: data.exposureRates,
                    overallScore: data.overallScore,
                    updatedAt: now,
                });
                return existing;
            }
            const created: HealthRecordRow = { id: newId(), ...data, createdAt: now, updatedAt: now };
            db.healthRecords.push(created);
            return created;
        });
        return toRecordEntity(row);
    }
}

export class HealthRecordQueryRepo implements IHealthRecordQueryRepo {
    constructor(private readonly store: JsonStore) {}

    async findByUserId(userId: string): Promise<HealthRecordEntity | null> {
        const row = this.store.read((db) => db.healthRecords.find((r) => r.userId === userId) ?? null);
        return row ? toRecordEntity(row) : null;
    }

    async findOverallScoresByAgeGroupAndGender(ageGroup: string, gender: Gender): Promise<number[]> {
        const { min, max } = getAgeRange(ageGroup);
        return this.store.read((db) => {
            const peers = new Set(
                db.healthStatuses
                    .filter((s) => s.gender === gender && s.age >= min && s.age <= max)
                    .map((s) => s.userId),
            );
            return db.healthRecords.filter((r) => peers.has(r.userId)).map((r) => r.overallScore);
        });
    }
}

const rateKey = (disease: string, gender: string, ageGroup: string, days: number) =>
    `${disease}|${gender}|${ageGroup}|${days}`;

/** KNHANES prevalence by exercise frequency; this was a seeded table and is now a static lookup. */
export class DiseaseRateQueryRepo implements IDiseaseRateQueryRepo {
    private readonly rates = new Map(
        DISEASE_RATE_BY_EXERCISE.map((row) => [
            rateKey(row.disease, row.gender, row.ageGroup, row.exerciseDaysPerWeek),
            row.prevalenceRate,
        ]),
    );

    async findRate(
        disease: DiseaseType,
        gender: Gender,
        ageGroup: string,
        exerciseDaysPerWeek: number,
    ): Promise<number | null> {
        const bucket = nearestExerciseBucket(exerciseDaysPerWeek);
        return this.rates.get(rateKey(disease, gender, ageGroup, bucket)) ?? null;
    }
}
