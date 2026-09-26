import { createEmptyDb, DbSchema } from "./db.schema";

type Row = { id: string };

/**
 * Three-way merge used when another server instance saved the data file
 * after we last read it. Every change this instance made since `base`
 * (rows added, changed or deleted, matched by id) is replayed onto
 * `remote`; rows we did not touch keep the remote version.
 */
export function rebaseDb(base: DbSchema, local: DbSchema, remote: DbSchema): DbSchema {
    const merged: DbSchema = { ...createEmptyDb(), ...structuredClone(remote) };

    for (const key of Object.keys(createEmptyDb()) as (keyof DbSchema)[]) {
        const baseValue = base[key];
        const localValue = local[key];

        if (key === "hiddenDocumentIds") {
            merged.hiddenDocumentIds = mergeIdList(base.hiddenDocumentIds, local.hiddenDocumentIds, merged.hiddenDocumentIds);
        } else if (key === "settings") {
            merged.settings = { ...merged.settings, ...changedEntries(base.settings, local.settings) };
        } else if (Array.isArray(localValue)) {
            (merged[key] as Row[]) = mergeRows(
                (baseValue ?? []) as Row[],
                localValue as Row[],
                (merged[key] ?? []) as Row[],
            );
        }
    }
    return merged;
}

function mergeRows(base: Row[], local: Row[], remote: Row[]): Row[] {
    const baseById = new Map(base.map((row) => [row.id, row]));
    const localIds = new Set(local.map((row) => row.id));
    const result = new Map(remote.map((row) => [row.id, row]));

    for (const row of local) {
        const before = baseById.get(row.id);
        if (!before || JSON.stringify(before) !== JSON.stringify(row)) {
            result.set(row.id, structuredClone(row));
        }
    }
    for (const id of baseById.keys()) {
        if (!localIds.has(id)) result.delete(id);
    }
    return [...result.values()];
}

function mergeIdList(base: string[], local: string[], remote: string[]): string[] {
    const added = local.filter((id) => !base.includes(id));
    const removed = new Set(base.filter((id) => !local.includes(id)));
    return [...new Set([...remote, ...added])].filter((id) => !removed.has(id));
}

function changedEntries<T extends object>(base: T, local: T): Partial<T> {
    const changed: Partial<T> = {};
    for (const [key, value] of Object.entries(local) as [keyof T, T[keyof T]][]) {
        if (JSON.stringify(base[key]) !== JSON.stringify(value)) changed[key] = value;
    }
    return changed;
}
