import { getUser } from "@netlify/identity";
import { apiError } from "./http.mjs";

export const ROLE = Object.freeze({
  ADMIN: "scoring_admin",
  OPERATOR: "scoring_operator",
  SUPERVISOR: "scoring_supervisor",
});

export const PANEL_ROLES = Object.freeze([ROLE.OPERATOR, ROLE.SUPERVISOR, ROLE.ADMIN]);
export const SUPERVISOR_ROLES = Object.freeze([ROLE.SUPERVISOR, ROLE.ADMIN]);

export function userHasRole(user, allowedRoles) {
  const roles = new Set(Array.isArray(user?.roles) ? user.roles : []);
  return allowedRoles.some((role) => roles.has(role));
}

export async function requireRole(allowedRoles) {
  const user = await getUser();
  if (!user) return { response: apiError(401, "Inici? sesi?n para acceder al panel.") };
  if (!userHasRole(user, allowedRoles)) {
    return { response: apiError(403, "Tu cuenta no tiene permisos para esta operaci?n.") };
  }
  return { user };
}

export function actorFromUser(user) {
  return {
    id: String(user?.id || "").slice(0, 160),
    email: String(user?.email || "").slice(0, 254),
    roles: Array.isArray(user?.roles) ? user.roles.filter((role) => typeof role === "string").slice(0, 8) : [],
  };
}
