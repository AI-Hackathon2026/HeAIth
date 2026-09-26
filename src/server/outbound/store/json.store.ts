import crypto from "crypto";
import fs from "fs";
import path from "path";
import { createEmptyDb, DbSchema } from "./db.schema";

/**
 * File-backed replacement for the PostgreSQL database.
 *
 * The whole dataset lives in one JSON text file. Reads and writes are
 * synchronous, so a mutation and its flush to disk can never interleave with
 * another request inside the same Node process. The file is re-read whenever
 * its mtime changes, which keeps several local processes (e.g. `next dev`
 * workers) in sync.
 */
export class JsonStore {
    private _cache: DbSchema | null = null;
    private _mtimeMs = -1;

    constructor(private readonly _filePath: string) {}

    get filePath() {
        return this._filePath;
    }

    /** Runs `fn` against a snapshot; the result is deep-cloned so callers cannot mutate the cache. */
    read<T>(fn: (db: DbSchema) => T): T {
        return structuredClone(fn(this._load()));
    }

    /** Runs `fn` against the live data and persists the file afterwards. */
    write<T>(fn: (db: DbSchema) => T): T {
        const db = this._load();
        const result = fn(db);
        this._persist(db);
        return structuredClone(result);
    }

    private _load(): DbSchema {
        let mtimeMs: number;
        try {
            mtimeMs = fs.statSync(this._filePath).mtimeMs;
        } catch {
            if (!this._cache) {
                this._cache = createEmptyDb();
                this._persist(this._cache);
            }
            return this._cache;
        }

        if (this._cache && mtimeMs === this._mtimeMs) {
            return this._cache;
        }

        const raw = fs.readFileSync(this._filePath, "utf8");
        // Fill in collections added after the file was first created.
        this._cache = { ...createEmptyDb(), ...(JSON.parse(raw) as Partial<DbSchema>) };
        this._mtimeMs = mtimeMs;
        return this._cache;
    }

    private _persist(db: DbSchema) {
        fs.mkdirSync(path.dirname(this._filePath), { recursive: true });
        const tmpPath = `${this._filePath}.${process.pid}.tmp`;
        fs.writeFileSync(tmpPath, JSON.stringify(db, null, 2), "utf8");
        fs.renameSync(tmpPath, this._filePath);
        this._mtimeMs = fs.statSync(this._filePath).mtimeMs;
    }
}

export const newId = () => crypto.randomUUID();
export const nowIso = () => new Date().toISOString();

/** Removes a routine and everything hanging off it (daily routines, plans, food items, summaries). */
export function deleteRoutineCascade(db: DbSchema, routineId: string) {
    const dailies = db.dailyRoutines.filter((d) => d.routineId === routineId);
    const dailyIds = new Set(dailies.map((d) => d.id));
    const summaryIds = new Set(dailies.map((d) => d.nutritionSummaryId).filter(Boolean));
    deletePlansForDailyRoutines(db, dailyIds);
    db.exercisePlans = db.exercisePlans.filter((p) => !dailyIds.has(p.dailyRoutineId));
    db.dailyRoutines = db.dailyRoutines.filter((d) => d.routineId !== routineId);
    db.nutritionSummaries = db.nutritionSummaries.filter((s) => !summaryIds.has(s.id));
    db.routines = db.routines.filter((r) => r.id !== routineId);
}

export function deletePlansForDailyRoutines(db: DbSchema, dailyIds: Set<string>) {
    const planIds = new Set(
        db.nutritionPlans.filter((p) => dailyIds.has(p.dailyRoutineId)).map((p) => p.id),
    );
    db.nutritionFoodItems = db.nutritionFoodItems.filter((i) => !planIds.has(i.nutritionPlanId));
    db.nutritionPlans = db.nutritionPlans.filter((p) => !planIds.has(p.id));
}

export function deleteChatCascade(db: DbSchema, chatId: string) {
    db.messages = db.messages.filter((m) => m.chatId !== chatId);
    db.chats = db.chats.filter((c) => c.id !== chatId);
}

/** Mirrors the `onDelete: Cascade` relations of the old Prisma `User` model. */
export function deleteUserCascade(db: DbSchema, userId: string) {
    for (const routine of db.routines.filter((r) => r.userId === userId)) {
        deleteRoutineCascade(db, routine.id);
    }
    for (const chat of db.chats.filter((c) => c.userId === userId)) {
        deleteChatCascade(db, chat.id);
    }
    db.healthStatuses = db.healthStatuses.filter((r) => r.userId !== userId);
    db.healthRecords = db.healthRecords.filter((r) => r.userId !== userId);
    db.characterProgress = db.characterProgress.filter((r) => r.userId !== userId);
    db.planProgressEvents = db.planProgressEvents.filter((r) => r.userId !== userId);
    db.users = db.users.filter((u) => u.id !== userId);
}
