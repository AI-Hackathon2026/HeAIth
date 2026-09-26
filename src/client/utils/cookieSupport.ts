import { api } from "../api/client";
import { BASE_URL, isUsingApiProxy } from "../api/baseUrl";
import { isStandalonePwa } from "./pwa";

const FIRST_PARTY_COOKIE_PROBE = "heaith_cookie_probe";

/** API origin differs from the page — session cookies are cross-site. */
export function isCrossOriginApi(): boolean {
  if (isUsingApiProxy()) return false;

  if (BASE_URL.startsWith("/")) {
    return false;
  }

  try {
    return new URL(BASE_URL).origin !== window.location.origin;
  } catch {
    return false;
  }
}

export function canUseFirstPartyCookies(): boolean {
  try {
    document.cookie = `${FIRST_PARTY_COOKIE_PROBE}=1; SameSite=Lax; path=/`;
    const enabled = document.cookie.includes(`${FIRST_PARTY_COOKIE_PROBE}=1`);
    document.cookie = `${FIRST_PARTY_COOKIE_PROBE}=; Max-Age=0; path=/`;
    return enabled;
  } catch {
    return false;
  }
}

export function supportsStorageAccessRequest(): boolean {
  return typeof document.requestStorageAccess === "function";
}

export async function hasStorageCookieAccess(): Promise<boolean> {
  if (!supportsStorageAccessRequest()) {
    return !isCrossOriginApi();
  }

  try {
    return await document.hasStorageAccess();
  } catch {
    return false;
  }
}

export type StorageAccessResult = "granted" | "denied" | "unsupported";

/** Shows the browser's native cookie/storage permission prompt (requires user gesture). */
export async function requestStorageCookieAccess(): Promise<StorageAccessResult> {
  if (!supportsStorageAccessRequest()) {
    return "unsupported";
  }

  try {
    if (await document.hasStorageAccess()) {
      return "granted";
    }

    await document.requestStorageAccess();
    return (await document.hasStorageAccess()) ? "granted" : "denied";
  } catch {
    return "denied";
  }
}

/** Confirms the server accepted the session cookie after sign-in. */
export async function verifyAuthSession(): Promise<boolean> {
  try {
    await api.listChats();
    return true;
  } catch {
    return false;
  }
}

export async function needsCookiePermissionInPwa(): Promise<boolean> {
  if (!isStandalonePwa()) return false;
  if (isUsingApiProxy()) return false;
  if (!canUseFirstPartyCookies()) return true;
  if (!isCrossOriginApi()) return false;
  return !(await hasStorageCookieAccess());
}

export function shouldWarnAboutCookiesInPwa(): boolean {
  return isStandalonePwa() && !isUsingApiProxy() && isCrossOriginApi();
}

/**
 * Call before sign-in in PWA (must run inside a click/submit handler).
 * Returns true when it is safe to proceed with login.
 */
export async function ensureCookieAccessForLogin(): Promise<{
  ok: boolean;
  reason?: StorageAccessResult;
}> {
  if (!isStandalonePwa() || isUsingApiProxy()) {
    return { ok: true };
  }

  if (!canUseFirstPartyCookies()) {
    return { ok: false, reason: "denied" };
  }

  if (!isCrossOriginApi()) {
    return { ok: true };
  }

  const access = await requestStorageCookieAccess();
  return { ok: access === "granted" || access === "unsupported", reason: access };
}
