import { PANEL_ROLES, actorFromUser, requireRole } from "../lib/auth.mjs";
import { callOperationalAppsScript } from "../lib/apps-script.mjs";
import { apiError, empty, json, methodNotAllowed } from "../lib/http.mjs";

export default async function catalogs(request) {
  if (request.method === "OPTIONS") return empty();
  if (request.method !== "GET") return methodNotAllowed(["GET", "OPTIONS"]);

  const auth = await requireRole(PANEL_ROLES);
  if (auth.response) return auth.response;

  try {
    const data = await callOperationalAppsScript({ action: "getCatalogs", actor: actorFromUser(auth.user) });
    return json(200, data);
  } catch (error) {
    console.error("[catalogs] internal request failed");
    return apiError(502, "No se pudieron cargar los cat?logos.");
  }
}
