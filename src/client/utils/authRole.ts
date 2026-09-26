import { api, clearRole, loadRole, saveRole } from "../api/client";

export function isAdminRole(role: string | undefined | null): boolean {
  if (!role) return false;
  const normalized = role.trim().toUpperCase();
  return (
    normalized === "ADMIN" ||
    normalized === "ROLE_ADMIN" ||
    normalized === "ADMINISTRATOR"
  );
}

export async function verifyIsAdmin(roleFromSignIn?: string): Promise<boolean> {
  if (isAdminRole(roleFromSignIn) || isAdminRole(loadRole())) {
    saveRole("admin");
    return true;
  }

  try {
    await api.listFiles();
    saveRole("admin");
    return true;
  } catch {
    clearRole();
    return false;
  }
}
