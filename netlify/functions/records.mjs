import { PANEL_ROLES, actorFromUser, requireRole } from "../lib/auth.mjs";
import { callOperationalAppsScript } from "../lib/apps-script.mjs";
import { apiError, empty, json, methodNotAllowed } from "../lib/http.mjs";

const WRITE_ACTIONS = new Set(["createRecord", "updateRecord", "appendGestion"]);
const MAX_BODY_BYTES = 80_000;

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

async function parseBody(request) {
  const raw = await request.text();
  if (!raw || raw.length > MAX_BODY_BYTES) throw new Error("invalid body");
  const payload = JSON.parse(raw);
  if (!isPlainObject(payload)) throw new Error("invalid payload");
  return payload;
}

function safeMutationPayload(payload, actor) {
  if (!WRITE_ACTIONS.has(payload.action)) return null;
  if ((payload.action === "createRecord" || payload.action === "updateRecord") && !isPlainObject(payload.record)) return null;
  if (payload.action === "appendGestion" && !isPlainObject(payload.gestion)) return null;

  if (payload.action === "appendGestion") {
    return { action: payload.action, gestion: payload.gestion, actor };
  }
  return { action: payload.action, record: payload.record, actor };
}

export default async function records(request) {
  if (request.method === "OPTIONS") return empty();

  const auth = await requireRole(PANEL_ROLES);
  if (auth.response) return auth.response;

  try {
    if (request.method === "GET") {
      const data = await callOperationalAppsScript({ action: "listRecords", actor: actorFromUser(auth.user) });
      return json(200, data);
    }
    if (request.method !== "POST") return methodNotAllowed(["GET", "POST", "OPTIONS"]);

    const payload = await parseBody(request);
    const internalPayload = safeMutationPayload(payload, actorFromUser(auth.user));
    if (!internalPayload) return apiError(400, "La operaci?n solicitada no es v?lida.");

    const data = await callOperationalAppsScript(internalPayload);
    return json(200, data);
  } catch (error) {
    console.error("[records] internal request failed", { method: request.method });
    return apiError(502, "No se pudo completar la operaci?n. Intent? nuevamente.");
  }
}
