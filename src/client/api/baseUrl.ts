/** The API is served by this same Next.js app under /api. */
export const API_PROXY_PATH = "/api";

/** API base path (no trailing slash). */
export const BASE_URL = API_PROXY_PATH;

export function apiUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${BASE_URL}${normalized}`;
}

export function isUsingApiProxy(): boolean {
  return true;
}
