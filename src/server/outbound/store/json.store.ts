import crypto from "crypto";
import fs from "fs";
import path from "path";
import { RemoteDbStorage } from "./blob.storage";
import { rebaseDb } from "./db.merge";
import { createEmptyDb, DbSchema } from "./db.schema";

const MAX_SAVE_ATTEMPTS = 5;

/**
 * File-based replacement for the PostgreSQL database: the whole dataset is one
 * JSON text file. Repositories use the synchronous read()/write() API against
 * an in-memory copy.
 *
 * - Local mode: the file is data/db.json. Every write is flushed atomically
 *   (temp file + rename) and the file is re-read when its mtime changes.
 * - Remote mode (Vercel Blob): call sync() before handling a request and
 *   commit() after it. sync() pulls the latest file, and commit() saves with a
 *   conditional write; if another instance saved first, our changes are
 *   merged into its version (row by row) and the save is retried.
 */
export class JsonStore {
    private _cache: DbSchema | null = null;
    private _mtimeMs = -1;

    // Remote mode state
    private _base: DbSchema | null = null;
    private _etag: string | null = null;
    private _loaded = false;
    private _writeVersion = 0;
    private _savedVersion = 0;
    private _commitQueue: Promise<void> = Promise.resolve();

    constructor(
        private readonly _filePath: string,
        private readonly _remote: RemoteDbStorage | null = null,
    ) {}

    get isRemote() {
        return this._remote !== null;
    }

    /** Runs `fn` against a snapshot; the result is deep-cloned so callers cannot mutate the cache. */
    read<T>(fn: (db: DbSchema) => T): T {
        return structuredClone(fn(this._load()));
    }

    /** Runs `fn` against the live data; locally the file is written immediately. */
    write<T>(fn: (db: DbSchema) => T): T {
        const db = this._load();
        const result = fn(db);
        if (this._remote) {
            this._writeVersion++;
        } else {
            this._persist(db);
        }
        return structuredClone(result);
    }

    /** Remote mode: fetch the latest data file unless this instance has unsaved changes. */
    async sync(): Promise<void> {
        if (!this._remote) return;
        if (this._loaded && this._writeVersion !== this._savedVersion) return;

        const result = await this._remote.load(this._loaded ? this._etag : null);
        if (result.status === "loaded") {
            this._applyRemote(result.db, result.etag);
        } else if (result.status === "missing" && !this._loaded) {
            this._applyRemote(createEmptyDb(), null);
        }
        this._loaded = true;
    }

    /** Remote mode: save changes made since the last save. Commits run one at a time. */
    commit(): Promise<void> {
        if (!this._remote) return Promise.resolve();
        const run = this._commitQueue.then(() => this._saveRemote());
        this._commitQueue = run.catch(() => undefined);
        return run;
    }

    private async _saveRemote() {
        const remote = this._remote!;
        for (let attempt = 1; attempt <= MAX_SAVE_ATTEMPTS; attempt++) {
            const version = this._writeVersion;
            if (version === this._savedVersion || !this._cache) return;

            const snapshot = structuredClone(this._cache);
            const result = await remote.save(snapshot, this._etag);
            if (result.status === "saved") {
                this._etag = result.etag;
                this._base = snapshot;
                this._savedVersion = version;
                continue; // Save again if more writes arrived meanwhile.
            }

            // Another instance saved first: merge our changes into its version and retry.
            const latest = await remote.load(null);
            if (latest.status !== "loaded") continue;
            this._cache = rebaseDb(this._base ?? createEmptyDb(), this._cache, latest.db);
            this._base = latest.db;
            this._etag = latest.etag;
        }
        throw new Error("Could not save data: too many concurrent updates. Please retry.");
    }

    private _applyRemote(db: DbSchema, etag: string | null) {
        this._cache = db;
        this._base = structuredClone(db);
        this._etag = etag;
    }

    private _load(): DbSchema {
        if (this._remote) {
            if (!this._cache) {
                throw new Error("JsonStore.sync() must run before the data is used.");
            }
            return this._cache;
        }

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
