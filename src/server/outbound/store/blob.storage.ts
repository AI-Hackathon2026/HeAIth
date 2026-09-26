import { BlobPreconditionFailedError, del, get, put } from "@vercel/blob";
import { createEmptyDb, DbSchema } from "./db.schema";

/** Everything lives under this prefix in the connected Vercel Blob store, as private blobs. */
const PREFIX = "heaith";
const DB_PATHNAME = `${PREFIX}/db.json`;

type BlobCredentials =
    | { kind: "token"; source: string; options: { token: string } }
    | { kind: "store-id"; source: string; options: { storeId: string } };

/**
 * Finds the credentials Vercel added when the Blob store was connected. Depending
 * on the store and the chosen env-var prefix these can be a read-write token
 * (BLOB_READ_WRITE_TOKEN, or <PREFIX>_READ_WRITE_TOKEN) or only a store id
 * (BLOB_STORE_ID / BLOB_READ_WRITE_TOKEN_STORE_ID) used with Vercel's automatic
 * OIDC credentials. They are passed explicitly to every Blob call.
 */
function resolveBlobCredentials(): BlobCredentials | null {
    const env = Object.entries(process.env).filter(
        (entry): entry is [string, string] => typeof entry[1] === "string" && entry[1].trim() !== "",
    );
    const byName = (name: string) => env.find(([key]) => key === name);

    const token =
        byName("BLOB_READ_WRITE_TOKEN") ??
        env.find(([, value]) => value.trim().startsWith("vercel_blob_rw_"));
    if (token) return { kind: "token", source: token[0], options: { token: token[1].trim() } };

    const storeId =
        byName("BLOB_STORE_ID") ??
        byName("BLOB_READ_WRITE_TOKEN_STORE_ID") ??
        env.find(([key, value]) => key.endsWith("_STORE_ID") && value.trim().startsWith("store_"));
    if (storeId) return { kind: "store-id", source: storeId[0], options: { storeId: storeId[1].trim() } };

    return null;
}

const credentials = () => {
    const found = resolveBlobCredentials();
    if (!found) throw new Error("Vercel Blob credentials are not configured.");
    return found.options;
};

/** True when a Vercel Blob store is connected to the deployment. */
export const isBlobConfigured = () => resolveBlobCredentials() !== null;

/** Which credential was found (names only, never values), for the health check. */
export const describeBlobCredentials = () => {
    const found = resolveBlobCredentials();
    return found ? { kind: found.kind, variable: found.source } : null;
};

export type RemoteLoadResult =
    | { status: "unchanged" }
    | { status: "missing" }
    | { status: "loaded"; db: DbSchema; etag: string };

export type RemoteSaveResult = { status: "saved"; etag: string } | { status: "conflict" };

/** Where JsonStore keeps db.json when it is not on the local disk. */
export interface RemoteDbStorage {
    load(ifNoneMatch: string | null): Promise<RemoteLoadResult>;
    /** Saves only if the stored file still has `ifMatch` as its ETag (null = must not exist yet). */
    save(db: DbSchema, ifMatch: string | null): Promise<RemoteSaveResult>;
}

async function readText(pathname: string, ifNoneMatch?: string | null) {
    const result = await get(pathname, {
        ...credentials(),
        access: "private",
        useCache: false,
        ...(ifNoneMatch ? { ifNoneMatch } : {}),
    });
    if (!result) return null;
    if (result.statusCode === 304) return { unchanged: true as const };
    const text = await new Response(result.stream).text();
    // Compressed responses carry a weak ETag (W/"…"), which never satisfies ifMatch.
    // The underlying value is the blob's strong ETag, so strip the prefix.
    const etag = result.blob.etag.replace(/^W\//, "");
    return { unchanged: false as const, text, etag };
}

export class BlobDbStorage implements RemoteDbStorage {
    async load(ifNoneMatch: string | null): Promise<RemoteLoadResult> {
        const result = await readText(DB_PATHNAME, ifNoneMatch);
        if (!result) return { status: "missing" };
        if (result.unchanged) return { status: "unchanged" };
        const db = { ...createEmptyDb(), ...(JSON.parse(result.text) as Partial<DbSchema>) };
        return { status: "loaded", db, etag: result.etag };
    }

    async save(db: DbSchema, ifMatch: string | null): Promise<RemoteSaveResult> {
        try {
            const result = await put(DB_PATHNAME, JSON.stringify(db, null, 2), {
                ...credentials(),
                access: "private",
                contentType: "application/json",
                addRandomSuffix: false,
                cacheControlMaxAge: 60,
                // First save must create the file; later saves must replace the exact version we read.
                ...(ifMatch ? { ifMatch } : { allowOverwrite: false }),
            });
            return { status: "saved", etag: result.etag };
        } catch (err) {
            // ETag mismatch, or the file was created by another instance first.
            if (err instanceof BlobPreconditionFailedError || (!ifMatch && isAlreadyExistsError(err))) {
                return { status: "conflict" };
            }
            throw err;
        }
    }
}

const isAlreadyExistsError = (err: unknown) =>
    err instanceof Error && /already exists/i.test(err.message);

/** Storage for PDFs uploaded through the admin page and their extracted text. */
export interface UploadStorage {
    save(name: string, body: Buffer | string, contentType: string): Promise<void>;
    load(name: string): Promise<Buffer | null>;
    remove(name: string): Promise<void>;
}

export class BlobUploadStorage implements UploadStorage {
    async save(name: string, body: Buffer | string, contentType: string) {
        await put(`${PREFIX}/uploads/${name}`, body, {
            ...credentials(),
            access: "private",
            contentType,
            addRandomSuffix: false,
            allowOverwrite: true,
        });
    }

    async load(name: string) {
        const result = await get(`${PREFIX}/uploads/${name}`, { ...credentials(), access: "private" });
        if (!result || result.statusCode !== 200) return null;
        return Buffer.from(await new Response(result.stream).arrayBuffer());
    }

    async remove(name: string) {
        await del(`${PREFIX}/uploads/${name}`, credentials());
    }
}
