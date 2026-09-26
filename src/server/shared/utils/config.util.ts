import path from "path";

/** Built-in auth settings; these are no longer configured through environment variables. */
const TOKEN_SECRET = "heaith-token-secret";
const ACCESS_TOKEN_EXPIRES_IN = "1h";
const REFRESH_TOKEN_EXPIRES_IN = "7d";

export type ConfigType = {
    NODE_ENV: string;
    TOKEN_SECRET: string;
    ACCESS_TOKEN_EXPIRES_IN: "1h";
    REFRESH_TOKEN_EXPIRES_IN: "7d";
    /** Google Gemini key from .env; AI features return 503 without it. */
    GEMINI_API_KEY?: string;
    /** Writable directory for db.json and uploads: ./data locally, /tmp/heaith on Vercel. */
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
        const bundledDataDir = path.join(process.cwd(), "data");
        this._parsedConfig = {
            NODE_ENV: process.env.NODE_ENV ?? "development",
            TOKEN_SECRET,
            ACCESS_TOKEN_EXPIRES_IN,
            REFRESH_TOKEN_EXPIRES_IN,
            GEMINI_API_KEY: process.env.GEMINI_API_KEY || undefined,
            BUNDLED_DATA_DIR: bundledDataDir,
            RUNTIME_DATA_DIR: process.env.VERCEL ? "/tmp/heaith" : bundledDataDir,
        };
    }

    public parsed() {
        return this._parsedConfig;
    }
}
