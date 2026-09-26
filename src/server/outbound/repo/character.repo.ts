import {
    IPlanProgressEventCommandRepo,
    IPlanProgressEventQueryRepo,
} from "../../application/port/repo/I.plan.progress.event.repo";
import {
    IUserCharacterProgressCommandRepo,
    IUserCharacterProgressQueryRepo,
    UserCharacterProgressRow,
} from "../../application/port/repo/I.user.character.progress.repo";
import {
    TechnicalException,
    TechnicalExceptionType,
} from "../../shared/exceptions/technical.exception";
import { CharacterStage, HeroStyle, PlanType } from "../../shared/types/enums";
import { CharacterProgressRow, DbSchema } from "../store/db.schema";
import { JsonStore, newId, nowIso } from "../store/json.store";

const toRow = ({ id, userId, level, xp, stage, heroStyle, totalCompletions }: CharacterProgressRow) => ({
    id,
    userId,
    level,
    xp,
    stage,
    heroStyle,
    totalCompletions,
});

/** Same defaults as the old Prisma model. */
const findOrCreateRow = (db: DbSchema, userId: string): CharacterProgressRow => {
    const existing = db.characterProgress.find((c) => c.userId === userId);
    if (existing) return existing;
    const now = nowIso();
    const created: CharacterProgressRow = {
        id: newId(),
        userId,
        level: 1,
        xp: 0,
        stage: CharacterStage.SPROUT,
        heroStyle: HeroStyle.IRON,
        totalCompletions: 0,
        createdAt: now,
        updatedAt: now,
    };
    db.characterProgress.push(created);
    return created;
};

export class UserCharacterProgressQueryRepo implements IUserCharacterProgressQueryRepo {
    constructor(private readonly store: JsonStore) {}

    async findByUserId(userId: string): Promise<UserCharacterProgressRow | null> {
        const row = this.store.read((db) => db.characterProgress.find((c) => c.userId === userId) ?? null);
        return row ? toRow(row) : null;
    }
}

export class UserCharacterProgressCommandRepo implements IUserCharacterProgressCommandRepo {
    constructor(private readonly store: JsonStore) {}

    async findOrCreate(userId: string): Promise<UserCharacterProgressRow> {
        return toRow(this.store.write((db) => findOrCreateRow(db, userId)));
    }

    async update(
        userId: string,
        data: Pick<UserCharacterProgressRow, "level" | "xp" | "stage" | "totalCompletions">,
    ): Promise<UserCharacterProgressRow> {
        const row = this.store.write((db) => {
            const found = db.characterProgress.find((c) => c.userId === userId);
            if (!found) throw new TechnicalException({ type: TechnicalExceptionType.RESOURCE_NOT_FOUND });
            Object.assign(found, data, { updatedAt: nowIso() });
            return found;
        });
        return toRow(row);
    }

    async updateHeroStyle(userId: string, heroStyle: HeroStyle): Promise<UserCharacterProgressRow> {
        const row = this.store.write((db) => {
            const found = findOrCreateRow(db, userId);
            found.heroStyle = heroStyle;
            found.updatedAt = nowIso();
            return found;
        });
        return toRow(row);
    }
}

export class PlanProgressEventQueryRepo implements IPlanProgressEventQueryRepo {
    constructor(private readonly store: JsonStore) {}

    async exists(userId: string, planId: string, progressPercentage: number): Promise<boolean> {
        return this.store.read((db) =>
            db.planProgressEvents.some(
                (e) =>
                    e.userId === userId &&
                    e.planId === planId &&
                    e.progressPercentage === progressPercentage,
            ),
        );
    }
}

export class PlanProgressEventCommandRepo implements IPlanProgressEventCommandRepo {
    constructor(private readonly store: JsonStore) {}

    async create(data: {
        userId: string;
        routineId: string;
        planType: PlanType;
        planId: string;
        progressPercentage: number;
        xpGranted: number;
    }): Promise<void> {
        this.store.write((db) => {
            const duplicate = db.planProgressEvents.some(
                (e) =>
                    e.userId === data.userId &&
                    e.planId === data.planId &&
                    e.progressPercentage === data.progressPercentage,
            );
            if (duplicate) {
                throw new TechnicalException({ type: TechnicalExceptionType.UNIQUE_VIOLATION });
            }
            db.planProgressEvents.push({ id: newId(), ...data, createdAt: nowIso() });
        });
    }
}
