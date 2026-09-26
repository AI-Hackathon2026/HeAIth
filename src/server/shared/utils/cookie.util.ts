import ms, { StringValue } from "ms";
import { NextResponse } from "next/server";
import { IConfigUtil } from "./config.util";

// The API is now served from the same origin as the pages, so SameSite=Lax
// works everywhere (the old Vercel -> EC2 setup needed SameSite=None).
export class CookieUtil {
    constructor(private readonly _configUtil: IConfigUtil) {}

    private _options(maxAgeMs: number, httpOnly = true) {
        return {
            httpOnly,
            secure: this._configUtil.parsed().NODE_ENV === "production",
            sameSite: "lax" as const,
            path: "/",
            maxAge: Math.floor(maxAgeMs / 1000),
        };
    }

    setCookieWithTokens(res: NextResponse, accessToken: string, refreshToken: string, csrfValue: string) {
        const config = this._configUtil.parsed();
        const accessMs = ms(config.ACCESS_TOKEN_EXPIRES_IN as StringValue);
        const refreshMs = ms(config.REFRESH_TOKEN_EXPIRES_IN as StringValue);
        res.cookies.set("accessToken", accessToken, this._options(accessMs));
        res.cookies.set("refreshToken", refreshToken, this._options(refreshMs));
        // Readable by the client, which echoes it in the x-csrf-value header.
        res.cookies.set("csrfValue", csrfValue, this._options(refreshMs + 60 * 1000, false));
    }

    clearAuthCookies(res: NextResponse) {
        for (const name of ["accessToken", "refreshToken", "csrfValue"]) {
            res.cookies.set(name, "", { path: "/", maxAge: 0 });
        }
    }
}
