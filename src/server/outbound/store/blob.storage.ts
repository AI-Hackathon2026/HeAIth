import { BlobPreconditionFailedError, del, get, put } from "@vercel/blob";
import { createEmptyDb, DbSchema } from "./db.schema";

/** Everything lives under this prefix in the connected Vercel Blob store, as private blobs. */
const PREFIX = "heaith";
const DB_PATHNAME = `${PREFIX}/db.json`;

/** True when a Vercel Blob store is connected to the deployment. */
export const isBlobConfigured = () =>
    Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);

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
        access: "private",
        useCache: false,
        ...(ifNoneMatch ? { ifNoneMatch } : {}),
    });
    if (!result) return null;
    if (result.statusCode === 304) return { unchanged: true as const };
    const text = await new Response(result.stream).text();
    return { unchanged: false as const, text, etag: result.blob.etag };
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
            access: "private",
            contentType,
            addRandomSuffix: false,
            allowOverwrite: true,
        });
    }

    async load(name: string) {
        const result = await get(`${PREFIX}/uploads/${name}`, { access: "private" });
        if (!result || result.statusCode !== 200) return null;
        return Buffer.from(await new Response(result.stream).arrayBuffer());
    }

    async remove(name: string) {
        await del(`${PREFIX}/uploads/${name}`);
    }
}
