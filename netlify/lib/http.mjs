const BASE_HEADERS = {
  "cache-control": "private, no-store, max-age=0",
  "content-type": "application/json; charset=utf-8",
  "cross-origin-resource-policy": "same-origin",
  "permissions-policy": "camera=(), geolocation=(), microphone=()",
  "pragma": "no-cache",
  "referrer-policy": "no-referrer",
  "vary": "Cookie",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
};

export function json(status, payload, extraHeaders = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...BASE_HEADERS, ...extraHeaders },
  });
}

export function empty(status = 204, extraHeaders = {}) {
  return new Response(null, { status, headers: { ...BASE_HEADERS, ...extraHeaders } });
}

export function apiError(status, message, extraHeaders = {}) {
  return json(status, { status: "ERROR", message }, extraHeaders);
}

export function methodNotAllowed(methods) {
  return apiError(405, "M?todo no permitido.", { Allow: methods.join(", ") });
}
