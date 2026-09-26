import {
    DailyRoutineEntity,
    PersistDailyRoutineEntity,
} from "../../application/command/entity/daily.routine.entity";
import {
    ExercisePlanEntity,
    PersistExercisePlanEntity,
} from "../../application/command/entity/exercise.plan.entity";
import {
    NutritionFoodItemEntity,
    PersistNutritionFoodItemEntity,
} from "../../application/command/entity/nutrition.food.item.entity";
import {
    NutritionPlanEntity,
    PersistNutritionPlanEntity,
} from "../../application/command/entity/nutrition.plan.entity";
import { PersistRoutineEntity, RoutineEntity } from "../../application/command/entity/routine.entity";
import { IDailyRoutineCommandRepo } from "../../application/port/repo/command/I.daily.routine.command.repo";
import { IExercisePlanCommandRepo } from "../../application/port/repo/command/I.exercise.command.repo";
import { INutritionFoodItemCommandRepo } from "../../application/port/repo/command/I.nutrition.food.item.command.repo";
import { INutritionPlanCommandRepo } from "../../application/port/repo/command/I.nutrition.plan.command.repo";
import { INutritionSummaryCommandRepo } from "../../application/port/repo/command/I.nutrition.summary.command.repo";
import { IRoutineCommandRepo } from "../../application/port/repo/command/I.routine.command.repo";
import { IExercisePlanQueryRepo } from "../../application/port/repo/query/I.exercise.plan.query.repo";
import { INutritionFoodItemQueryRepo } from "../../application/port/repo/query/I.nutrition.food.item.query.repo";
import { INutritionPlanQueryRepo } from "../../application/port/repo/query/I.nutrition.plan.query.repo";
import {
    ActiveRoutineMeta,
    IRoutineQueryRepo,
} from "../../application/port/repo/query/I.routine.query.repo";
import { RoutineMapper } from "../../application/query/mapper/routine.mapper";
import { NutritionSummary } from "../../application/query/view/routine.view";
import {
    TechnicalException,
    TechnicalExceptionType,
} from "../../shared/exceptions/technical.exception";
import { toNutritionSummaryCreateInput } from "../../shared/utils/routine-generation.util";
import { DbSchema, NutritionFoodItemRow, NutritionPlanRow, RoutineRow } from "../store/db.schema";
import {
    deletePlansForDailyRoutines,
    deleteRoutineCascade,
    JsonStore,
    newId,
    nowIso,
} from "../store/json.store";

const notFound = () => new TechnicalException({ type: TechnicalExceptionType.RESOURCE_NOT_FOUND });

const toRoutineEntity = (routine: RoutineRow): PersistRoutineEntity =>
    RoutineEntity.persist({
        id: routine.id,
        userId: routine.userId,
        difficulty: routine.difficulty,
        summary: routine.summary || routine.report,
        reportReadme: routine.reportReadme,
        report: routine.summary || routine.report,
        isActive: routine.isActive,
    });

const toFoodItemEntity = (row: NutritionFoodItemRow): PersistNutritionFoodItemEntity =>
    NutritionFoodItemEntity.persist({
        id: row.id,
        nutritionPlanId: row.nutritionPlanId,
        name: row.name,
        calories: row.calories,
        sortOrder: row.sortOrder,
        progressPercentage: row.progressPercentage,
    });

const sortedFoodItems = (db: DbSchema, planId: string) =>
    db.nutritionFoodItems
        .filter((item) => item.nutritionPlanId === planId)
        .sort((a, b) => a.sortOrder - b.sortOrder);

const toNutritionPlanEntity = (db: DbSchema, plan: NutritionPlanRow): PersistNutritionPlanEntity =>
    NutritionPlanEntity.persist({
        id: plan.id,
        dailyRoutineId: plan.dailyRoutineId,
        mealType: plan.mealType,
        foods: sortedFoodItems(db, plan.id).map((item) => item.name),
        calories: plan.calories,
        progressPercentage: plan.progressPercentage,
    });

/** Walks dailyRoutine -> routine for ownership checks; only active routines count. */
const findActiveOwner = (db: DbSchema, dailyRoutineId: string) => {
    const daily = db.dailyRoutines.find((d) => d.id === dailyRoutineId);
    const routine = daily && db.routines.find((r) => r.id === daily.routineId);
    if (!daily || !routine || !routine.isActive) return null;
    return { userId: routine.userId, routineId: routine.id };
};

export class RoutineCommandRepo implements IRoutineCommandRepo {
    constructor(private readonly store: JsonStore) {}

    async create(entity: RoutineEntity): Promise<PersistRoutineEntity> {
        const row = this.store.write((db) => {
            if (db.routines.some((r) => r.userId === entity.userId)) {
                throw new TechnicalException({ type: TechnicalExceptionType.UNIQUE_VIOLATION });
            }
            const now = nowIso();
            const created: RoutineRow = {
                id: newId(),
                userId: entity.userId,
                difficulty: entity.difficulty,
                summary: entity.summary,
                reportReadme: entity.reportReadme,
                report: entity.summary,
                isActive: entity.isActive,
                createdAt: now,
                updatedAt: now,
            };
            db.routines.push(created);
            return created;
        });
        return toRoutineEntity(row);
    }

    async update(
        id: string,
        data: Partial<Pick<RoutineRow, "difficulty" | "summary" | "reportReadme" | "report" | "isActive">>,
    ): Promise<PersistRoutineEntity> {
        const row = this.store.write((db) => {
            const routine = db.routines.find((r) => r.id === id);
            if (!routine) throw notFound();
            Object.assign(routine, data, { updatedAt: nowIso() });
            return routine;
        });
        return toRoutineEntity(row);
    }

    async deactivate(id: string): Promise<void> {
        await this.update(id, { isActive: false });
    }

    async deleteByUserId(userId: string): Promise<void> {
        this.store.write((db) => {
            for (const routine of db.routines.filter((r) => r.userId === userId)) {
                deleteRoutineCascade(db, routine.id);
            }
        });
    }
}

export class RoutineQueryRepo implements IRoutineQueryRepo {
    constructor(private readonly store: JsonStore) {}

    async findActiveByUserId(userId: string) {
        const meta = await this.findActiveMetaByUserId(userId);
        return meta?.schedule ?? null;
    }

    async findActiveMetaByUserId(userId: string): Promise<ActiveRoutineMeta | null> {
        return this.store.read((db) => {
            const routine = db.routines.find((r) => r.userId === userId && r.isActive);
            if (!routine) return null;

            const dailyRoutines = db.dailyRoutines
                .filter((d) => d.routineId === routine.id)
                .map((daily) => ({
                    id: daily.id,
                    dayOfWeek: daily.dayOfWeek,
                    nutritionPlans: db.nutritionPlans
                        .filter((p) => p.dailyRoutineId === daily.id)
                        .map((plan) => ({ ...plan, foodItems: sortedFoodItems(db, plan.id) })),
                    exercisePlans: db.exercisePlans.filter((p) => p.dailyRoutineId === daily.id),
                    nutritionSummary:
                        db.nutritionSummaries.find((s) => s.id === daily.nutritionSummaryId) ?? null,
                }));

            return {
                id: routine.id,
                schedule: RoutineMapper.toScheduleView({ ...routine, dailyRoutines }),
            };
        });
    }

    async findById(id: string): Promise<RoutineEntity | null> {
        const row = this.store.read((db) => db.routines.find((r) => r.id === id) ?? null);
        return row ? toRoutineEntity(row) : null;
    }
}

export class DailyRoutineCommandRepo implements IDailyRoutineCommandRepo {
    constructor(private readonly store: JsonStore) {}

    async createMany(data: DailyRoutineEntity[]): Promise<PersistDailyRoutineEntity[]> {
        if (data.length === 0) return [];
        const rows = this.store.write((db) =>
            data.map((item) => {
                if (db.dailyRoutines.some((d) => d.routineId === item.routineId && d.dayOfWeek === item.dayOfWeek)) {
                    throw new TechnicalException({ type: TechnicalExceptionType.UNIQUE_VIOLATION });
                }
                const now = nowIso();
                const row = {
                    id: newId(),
                    routineId: item.routineId,
                    dayOfWeek: item.dayOfWeek,
                    nutritionSummaryId: null,
                    createdAt: now,
                    updatedAt: now,
                };
                db.dailyRoutines.push(row);
                return row;
            }),
        );
        return rows.map((row) => DailyRoutineEntity.persist(row) as PersistDailyRoutineEntity);
    }
}

export class NutritionPlanCommandRepo implements INutritionPlanCommandRepo {
    constructor(private readonly store: JsonStore) {}

    async createMany(data: NutritionPlanEntity[]): Promise<PersistNutritionPlanEntity[]> {
        if (data.length === 0) return [];
        return this.store.write((db) =>
            data.map((plan) => {
                const now = nowIso();
                const row: NutritionPlanRow = {
                    id: newId(),
                    dailyRoutineId: plan.dailyRoutineId,
                    mealType: plan.mealType,
                    calories: plan.calories,
                    progressPercentage: plan.progressPercentage,
                    createdAt: now,
                    updatedAt: now,
                };
                db.nutritionPlans.push(row);
                plan.foodItems.forEach((item, index) => {
                    db.nutritionFoodItems.push({
                        id: newId(),
                        nutritionPlanId: row.id,
                        name: item.name,
                        calories: item.calories,
                        sortOrder: index,
                        progressPercentage: 0,
                        createdAt: now,
                        updatedAt: now,
                    });
                });
                return toNutritionPlanEntity(db, row);
            }),
        );
    }

    async deleteByDailyRoutineIds(dailyRoutineIds: string[]): Promise<void> {
        if (dailyRoutineIds.length === 0) return;
        this.store.write((db) => deletePlansForDailyRoutines(db, new Set(dailyRoutineIds)));
    }

    async updateProgress(id: string, progressPercentage: number): Promise<PersistNutritionPlanEntity> {
        return this.store.write((db) => {
            const plan = db.nutritionPlans.find((p) => p.id === id);
            if (!plan) throw notFound();
            plan.progressPercentage = progressPercentage;
            plan.updatedAt = nowIso();
            return toNutritionPlanEntity(db, plan);
        });
    }
}

export class NutritionPlanQueryRepo implements INutritionPlanQueryRepo {
    constructor(private readonly store: JsonStore) {}

    async findOwnedById(planId: string) {
        return this.store.read((db) => {
            const plan = db.nutritionPlans.find((p) => p.id === planId);
            const owner = plan && findActiveOwner(db, plan.dailyRoutineId);
            if (!plan || !owner) return null;
            return { id: plan.id, ...owner, progressPercentage: plan.progressPercentage };
        });
    }
}

export class NutritionFoodItemCommandRepo implements INutritionFoodItemCommandRepo {
    constructor(private readonly store: JsonStore) {}

    async createManyForPlan(nutritionPlanId: string, items: NutritionFoodItemEntity[]) {
        if (items.length === 0) return [];
        const rows = this.store.write((db) =>
            items.map((item) => {
                const now = nowIso();
                const row: NutritionFoodItemRow = {
                    id: newId(),
                    nutritionPlanId,
                    name: item.name,
                    calories: item.calories,
                    sortOrder: item.sortOrder,
                    progressPercentage: item.progressPercentage,
                    createdAt: now,
                    updatedAt: now,
                };
                db.nutritionFoodItems.push(row);
                return row;
            }),
        );
        return rows.map(toFoodItemEntity);
    }

    async updateProgress(id: string, progressPercentage: number) {
        const row = this.store.write((db) => {
            const item = db.nutritionFoodItems.find((i) => i.id === id);
            if (!item) throw notFound();
            item.progressPercentage = progressPercentage;
            item.updatedAt = nowIso();
            return item;
        });
        return toFoodItemEntity(row);
    }

    async listByNutritionPlanId(nutritionPlanId: string) {
        return this.store.read((db) => sortedFoodItems(db, nutritionPlanId)).map(toFoodItemEntity);
    }
}

export class NutritionFoodItemQueryRepo implements INutritionFoodItemQueryRepo {
    constructor(private readonly store: JsonStore) {}

    async findOwnedById(foodItemId: string) {
        return this.store.read((db) => {
            const item = db.nutritionFoodItems.find((i) => i.id === foodItemId);
            const plan = item && db.nutritionPlans.find((p) => p.id === item.nutritionPlanId);
            const owner = plan && findActiveOwner(db, plan.dailyRoutineId);
            if (!item || !owner) return null;
            return {
                id: item.id,
                ...owner,
                nutritionPlanId: item.nutritionPlanId,
                progressPercentage: item.progressPercentage,
            };
        });
    }
}

export class NutritionSummaryCommandRepo implements INutritionSummaryCommandRepo {
    constructor(private readonly store: JsonStore) {}

    async attachToDailyRoutine(dailyRoutineId: string, summary: NutritionSummary): Promise<void> {
        this.store.write((db) => {
            const daily = db.dailyRoutines.find((d) => d.id === dailyRoutineId);
            if (!daily) throw notFound();
            const now = nowIso();
            const id = newId();
            db.nutritionSummaries.push({
                id,
                ...toNutritionSummaryCreateInput(summary),
                createdAt: now,
                updatedAt: now,
            });
            // Drop the summary this one replaces so it doesn't linger unreferenced.
            if (daily.nutritionSummaryId) {
                const previous = daily.nutritionSummaryId;
                db.nutritionSummaries = db.nutritionSummaries.filter((s) => s.id !== previous);
            }
            daily.nutritionSummaryId = id;
            daily.updatedAt = now;
        });
    }
}

export class ExercisePlanCommandRepo implements IExercisePlanCommandRepo {
    constructor(private readonly store: JsonStore) {}

    async createMany(data: ExercisePlanEntity[]): Promise<PersistExercisePlanEntity[]> {
        if (data.length === 0) return [];
        const rows = this.store.write((db) =>
            data.map((plan) => {
                const now = nowIso();
                const row = {
                    id: newId(),
                    dailyRoutineId: plan.dailyRoutineId,
                    exercises: plan.exercise as unknown,
                    progressPercentage: plan.progressPercentage,
                    createdAt: now,
                    updatedAt: now,
                };
                db.exercisePlans.push(row);
                return row;
            }),
        );
        return rows.map((row, index) =>
            ExercisePlanEntity.persist({
                id: row.id,
                dailyRoutineId: row.dailyRoutineId,
                exercise: data[index].exercise,
                progressPercentage: row.progressPercentage,
            }),
        );
    }

    async deleteByDailyRoutineIds(dailyRoutineIds: string[]): Promise<void> {
        if (dailyRoutineIds.length === 0) return;
        const ids = new Set(dailyRoutineIds);
        this.store.write((db) => {
            db.exercisePlans = db.exercisePlans.filter((p) => !ids.has(p.dailyRoutineId));
        });
    }

    async updateProgress(id: string, progressPercentage: number) {
        const row = this.store.write((db) => {
            const plan = db.exercisePlans.find((p) => p.id === id);
            if (!plan) throw notFound();
            plan.progressPercentage = progressPercentage;
            plan.updatedAt = nowIso();
            return plan;
        });
        return ExercisePlanEntity.persist({
            id: row.id,
            dailyRoutineId: row.dailyRoutineId,
            exercise: row.exercises as ExercisePlanEntity["exercise"],
            progressPercentage: row.progressPercentage,
        });
    }
}

export class ExercisePlanQueryRepo implements IExercisePlanQueryRepo {
    constructor(private readonly store: JsonStore) {}

    async findOwnedById(planId: string) {
        return this.store.read((db) => {
            const plan = db.exercisePlans.find((p) => p.id === planId);
            const owner = plan && findActiveOwner(db, plan.dailyRoutineId);
            if (!plan || !owner) return null;
            return { id: plan.id, ...owner, progressPercentage: plan.progressPercentage };
        });
    }
}
