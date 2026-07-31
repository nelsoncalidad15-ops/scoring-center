import { SUPERVISOR_ROLES, requireRole } from "../lib/auth.mjs";
import { callOperationalAppsScript, callSurveyBridge, hashCaseReference } from "../lib/apps-script.mjs";
import { apiError, empty, json, methodNotAllowed } from "../lib/http.mjs";

const ALLOWED_RESULTS = new Set(["Paso", "Revisar", "No paso"]);
const ALLOWED_SIGNALS = new Set([
  "PLAN_NO_ENTENDIDO",
  "LICITACION_NO_EXPLICADA",
  "ADJUDICACION_NO_ENTENDIDA",
  "CUOTA_DIFERENTE",
  "REQUIERE_RECONTACTO",
  "SENSITIVE_COMMENT",
]);
const PAGE_SIZE = 200;
const MAX_PAGES = 20;

function safeBridgeResponse(item) {
  if (!item || typeof item !== "object") return null;
  const caseKey = String(item.caseKey || "");
  const eventId = String(item.eventId || "");
  const result = String(item.result || "");
  if (!/^[a-f0-9]{64}$/i.test(caseKey) || !/^[a-f0-9]{64}$/i.test(eventId) || !ALLOWED_RESULTS.has(result)) return null;

  return {
    caseKey,
    eventId,
    submittedAt: String(item.submittedAt || "").slice(0, 64),
    result,
    requiresRecontact: item.requiresRecontact === true,
    signals: Array.from(new Set(Array.isArray(item.signals) ? item.signals.filter((signal) => ALLOWED_SIGNALS.has(signal)) : [])).slice(0, 8),
  };
}

async function readBridgeResponses() {
  const responses = [];
  let cursor = "";
  let hasMore = true;
  let pages = 0;

  while (hasMore && pages < MAX_PAGES) {
    const page = await callSurveyBridge({ action: "listNormalizedResponses", cursor, limit: PAGE_SIZE });
    const pageResponses = Array.isArray(page.responses) ? page.responses : [];
    responses.push(...pageResponses);
    cursor = String(page.nextCursor || "");
    hasMore = Boolean(cursor);
    pages += 1;
  }
  return { responses, truncated: hasMore };
}

export default async function surveyResults(request) {
  if (request.method === "OPTIONS") return empty();
  if (request.method !== "GET") return methodNotAllowed(["GET", "OPTIONS"]);

  const auth = await requireRole(SUPERVISOR_ROLES);
  if (auth.response) return auth.response;

  try {
    const salt = process.env.CASE_REFERENCE_SALT;
    if (!salt) throw new Error("Missing CASE_REFERENCE_SALT");

    const [localData, bridgeData] = await Promise.all([
      callOperationalAppsScript({ action: "listRecords" }),
      readBridgeResponses(),
    ]);

    const recordsByCaseKey = new Map();
    (localData.records || []).forEach((record) => {
      const caseId = String(record?.ID || "");
      const reference = String(record?.NRO_SOLICITUD || "");
      if (caseId && reference) recordsByCaseKey.set(hashCaseReference(reference, salt), caseId);
    });

    const seen = new Set();
    const responses = bridgeData.responses
      .map(safeBridgeResponse)
      .filter(Boolean)
      .map((response) => ({ ...response, caseId: recordsByCaseKey.get(response.caseKey) || "" }))
      .filter((response) => response.caseId && !seen.has(response.eventId) && seen.add(response.eventId))
      .map(({ caseKey, ...response }) => response)
      .sort((a, b) => String(b.submittedAt).localeCompare(String(a.submittedAt)));

    return json(200, {
      status: "OK",
      responses,
      meta: { linkedResponses: responses.length, truncated: bridgeData.truncated },
    });
  } catch (error) {
    console.error("[survey-results] bridge request failed");
    return apiError(502, "No se pudieron cargar las encuestas vinculadas en este momento.");
  }
}
