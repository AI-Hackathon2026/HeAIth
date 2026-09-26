import path from "path";
import { z } from "zod";

const DEV_TOKEN_SECRET = "heaith-local-dev-token-secret";

export const configSchema = z.object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    TOKEN_SECRET: z.string().min(1).optional(),
    ACCESS_TOKEN_EXPIRES_IN: z.enum(["15m", "1h"]).default("15m"),
    REFRESH_TOKEN_EXPIRES_IN: z.enum(["7d"]).default("7d"),

    // Where db.json and uploaded PDFs are written. Defaults to ./data locally
    // and /tmp/heaith on Vercel (the only writable path there).
    DATA_DIR: z.string().optional(),

    // Admin account created on first start, and the key that allows creating more admins.
    ADMIN_EMAIL: z.email().optional(),
    ADMIN_PASSWORD: z.string().min(1).optional(),
    ADMIN_USERNAME: z.string().min(1).default("admin"),
    ADMIN_SIGNUP_KEY: z.string().min(1).optional(),

    // Optional Gmail SMTP for account notifications. Without it, emails are only logged.
    EMAIL_USER: z.string().optional(),
    EMAIL_PASSWORD: z.string().optional(),

    GEMINI_API_KEY: z.string().optional(),
});

export type ConfigType = Omit<z.infer<typeof configSchema>, "TOKEN_SECRET"> & {
    TOKEN_SECRET: string;
    /** Writable directory for db.json and uploads. */
    RUNTIME_DATA_DIR: string;
    /** Read-only directory with bundled data (document text, KNHANES tables). */
    BUNDLED_DATA_DIR: string;
};

export interface IConfigUtil {
    parsed: () => ConfigType;
}

export class ConfigUtil implements IConfigUtil {
    private _parsedConfig: ConfigType;

    constructor() {
        const result = configSchema.safeParse(process.env);
        if (!result.success) {
            const issue = result.error.issues[0];
            throw new Error(issue.path + ": " + issue.message);
        }

        const env = result.data;
        const isDeployed = env.NODE_ENV === "production" || Boolean(process.env.VERCEL);
        if (!env.TOKEN_SECRET && isDeployed) {
            throw new Error("TOKEN_SECRET must be set in production.");
        }

        const bundledDataDir = path.join(process.cwd(), "data");
        this._parsedConfig = {
            ...env,
            TOKEN_SECRET: env.TOKEN_SECRET ?? DEV_TOKEN_SECRET,
            BUNDLED_DATA_DIR: bundledDataDir,
            RUNTIME_DATA_DIR:
                env.DATA_DIR ?? (process.env.VERCEL ? "/tmp/heaith" : bundledDataDir),
        };
    }

    public parsed() {
        return this._parsedConfig;
    }
}
