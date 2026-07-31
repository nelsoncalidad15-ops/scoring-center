import { createHash, createHmac, randomUUID } from "node:crypto";

const REQUEST_TIMEOUT_MS = 12_000;

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function sha256Hex(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function signedEnvelope(payload, secret) {
  const payloadText = JSON.stringify(payload);
  const timestamp = String(Date.now());
  const nonce = randomUUID();
  const digest = sha256Hex(payloadText);
  const signature = createHmac("sha256", secret)
    .update(`${timestamp}.${nonce}.${digest}`, "utf8")
    .digest("hex");

  return { protocol: "SC_INTERNAL_V1", payload: payloadText, timestamp, nonce, digest, signature };
}

async function postSigned(url, envelope, label) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(envelope),
      signal: controller.signal,
    });
    const text = await response.text();
    if (!response.ok || text.length > 1_000_000) throw new Error(`${label} HTTP failure`);

    let data;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      throw new Error(`${label} invalid JSON`);
    }
    if (!data || data.status !== "OK") throw new Error(`${label} rejected request`);
    return data;
  } finally {
    clearTimeout(timeout);
  }
}

export async function callOperationalAppsScript(payload) {
  const url = required("APPS_SCRIPT_URL");
  const backendSecret = required("BACKEND_SECRET");
  const hmacSecret = required("APPS_SCRIPT_HMAC_SECRET");
  return postSigned(url, { ...signedEnvelope(payload, hmacSecret), backendSecret }, "operational Apps Script");
}

export async function callSurveyBridge(payload) {
  const url = required("SURVEY_BRIDGE_URL");
  const hmacSecret = required("SURVEY_BRIDGE_HMAC_SECRET");
  return postSigned(url, signedEnvelope(payload, hmacSecret), "survey bridge");
}

export function normalizeCaseReference(value) {
  return String(value ?? "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function hashCaseReference(value, salt) {
  return createHmac("sha256", salt).update(normalizeCaseReference(value), "utf8").digest("hex");
}
