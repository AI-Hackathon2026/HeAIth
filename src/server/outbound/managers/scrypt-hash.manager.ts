import crypto from "crypto";
import { promisify } from "util";
import { IHashManager } from "../../application/port/managers/I.hash.manager";

const scrypt = promisify(crypto.scrypt) as (
    password: string,
    salt: Buffer,
    keylen: number,
) => Promise<Buffer>;

const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

/** One-way password/token hashing with Node's built-in scrypt. Format: `scrypt$<salt hex>$<hash hex>`. */
export class ScryptHashManager implements IHashManager {
    async hash(plainString: string): Promise<string> {
        const salt = crypto.randomBytes(SALT_LENGTH);
        const derived = await scrypt(plainString, salt, KEY_LENGTH);
        return `scrypt$${salt.toString("hex")}$${derived.toString("hex")}`;
    }

    async compare({
        plainString,
        hashedString,
    }: {
        plainString: string;
        hashedString: string;
    }): Promise<boolean> {
        const [scheme, saltHex, hashHex] = hashedString.split("$");
        if (scheme !== "scrypt" || !saltHex || !hashHex) {
            return false;
        }
        const expected = Buffer.from(hashHex, "hex");
        const derived = await scrypt(plainString, Buffer.from(saltHex, "hex"), expected.length);
        return crypto.timingSafeEqual(derived, expected);
    }
}
