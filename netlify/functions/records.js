function getCorsOrigin(event) {
  const configuredOrigins = [
    process.env.SITE_ORIGIN,
    process.env.URL,
    process.env.DEPLOY_PRIME_URL,
  ].filter(Boolean);
  const requestOrigin = event.headers.origin || event.headers.Origin;
  if (requestOrigin && configuredOrigins.includes(requestOrigin)) return requestOrigin;
  return configuredOrigins[0] || "null";
}

async function callAppsScript(payload) {
  const appsScriptUrl = process.env.APPS_SCRIPT_URL;
  const backendSecret = process.env.BACKEND_SECRET;

  if (!appsScriptUrl || !backendSecret) {
    throw new Error("Faltan APPS_SCRIPT_URL o BACKEND_SECRET en Netlify.");
  }

  const response = await fetch(appsScriptUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, backendSecret }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Apps Script error ${response.status}: ${text}`);
  }

  return response.json();
}

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": getCorsOrigin(event),
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  try {
    if (event.httpMethod === "GET") {
      const data = await callAppsScript({ action: "listRecords" });
      return { statusCode: 200, headers, body: JSON.stringify(data) };
    }

    if (event.httpMethod === "POST") {
      const payload = JSON.parse(event.body || "{}");
      const data = await callAppsScript(payload);
      return { statusCode: 200, headers, body: JSON.stringify(data) };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ status: "ERROR", message: "Metodo no permitido" }) };
  } catch (error) {
    console.error("[records]", error);
    return { statusCode: 500, headers, body: JSON.stringify({ status: "ERROR", message: error.message || "No se pudo procesar la operacion." }) };
  }
};
