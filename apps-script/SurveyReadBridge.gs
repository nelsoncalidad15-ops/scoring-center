/*
 * Proyecto Apps Script INDEPENDIENTE y de solo lectura.
 * No copiar este archivo dentro del proyecto operativo ni vincularlo a la planilla fuente.
 * Este c?digo no contiene operaciones de escritura sobre Google Sheets.
 */
const BRIDGE_PROTOCOL = "SC_INTERNAL_V1";
const BRIDGE_TTL_MS = 5 * 60 * 1000;
const BRIDGE_MAX_PAYLOAD = 5000;
const DEFAULT_SOURCE_TAB = "Respuestas_Scoring";
const HEADER_ALIASES = {
  responseId: ["IDRESPUESTA", "RESPUESTAID", "ID", "RESPONSEID"],
  submittedAt: ["FECHARESPUESTA", "FECHA", "MARCATEMPORAL", "TIMESTAMP", "FECHAYHORA"],
  requestNumber: ["NROSOLICITUD", "NROSOL", "NUMEROSOLICITUD", "SOLICITUD", "NROSOLICITUDPLAN"],
  result: ["RESULTADOSCORING", "RESULTADO", "ESTADOSCORING", "PASOSCORING", "SCORINGRESULT"],
  q1: ["Q1", "P1", "PREGUNTA1"],
  q2: ["Q2", "P2", "PREGUNTA2"],
  q3: ["Q3", "P3", "PREGUNTA3"],
  q4: ["Q4", "P4", "PREGUNTA4"],
  q9: ["Q9", "P9", "PREGUNTA9"],
  q10: ["Q10", "P10", "PREGUNTA10", "COMENTARIO", "COMENTARIOS", "OBSERVACION", "OBSERVACIONES"],
};

function doPost(e) {
  try {
    var envelope = bridgeParseEnvelope(e);
    var payload = bridgeValidateRequest(envelope);
    if (payload.action !== "listNormalizedResponses") throw new Error("Accion invalida.");
    return bridgeJsonResponse(bridgeReadNormalizedResponses(payload));
  } catch (error) {
    Logger.log("[survey-bridge] solicitud rechazada");
    return bridgeJsonResponse({ status: "ERROR", message: "No se pudieron leer las encuestas." });
  }
}

function bridgeParseEnvelope(e) {
  if (!e || !e.postData || !e.postData.contents) throw new Error("Solicitud invalida.");
  var envelope = JSON.parse(e.postData.contents);
  if (!bridgeIsPlainObject(envelope) || envelope.protocol !== BRIDGE_PROTOCOL) throw new Error("Protocolo invalido.");
  return envelope;
}

function bridgeValidateRequest(envelope) {
  var secret = bridgeRequiredProperty("SURVEY_BRIDGE_HMAC_SECRET");
  var timestamp = String(envelope.timestamp || "");
  var timestampNumber = Number(timestamp);
  var nonce = String(envelope.nonce || "");
  var payloadText = String(envelope.payload || "");
  if (!Number.isFinite(timestampNumber) || Math.abs(Date.now() - timestampNumber) > BRIDGE_TTL_MS) throw new Error("Solicitud vencida.");
  if (!/^[a-zA-Z0-9-]{20,100}$/.test(nonce) || !payloadText || payloadText.length > BRIDGE_MAX_PAYLOAD) throw new Error("Solicitud invalida.");

  var digest = bridgeSha256Hex(payloadText);
  if (!bridgeConstantTimeEquals(String(envelope.digest || ""), digest)) throw new Error("Integridad invalida.");
  var expected = bridgeHmacHex(secret, timestamp + "." + nonce + "." + digest);
  if (!bridgeConstantTimeEquals(String(envelope.signature || ""), expected)) throw new Error("Firma invalida.");

  var payload = JSON.parse(payloadText);
  if (!bridgeIsPlainObject(payload)) throw new Error("Carga invalida.");
  if (!bridgeClaimNonce(nonce)) throw new Error("Solicitud repetida.");
  return payload;
}

function bridgeClaimNonce(nonce) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var cache = CacheService.getScriptCache();
    var nonceKey = "survey-bridge-nonce-" + nonce;
    if (cache.get(nonceKey)) return false;
    cache.put(nonceKey, "1", Math.ceil(BRIDGE_TTL_MS / 1000));
    return true;
  } finally {
    lock.releaseLock();
  }
}

function bridgeReadNormalizedResponses(payload) {
  var sourceId = bridgeRequiredProperty("SURVEY_SOURCE_SHEET_ID");
  var sourceTab = PropertiesService.getScriptProperties().getProperty("SURVEY_SOURCE_TAB") || DEFAULT_SOURCE_TAB;
  var caseSalt = bridgeRequiredProperty("CASE_REFERENCE_SALT");
  var eventSalt = bridgeRequiredProperty("SURVEY_BRIDGE_HMAC_SECRET");
  var sheet = SpreadsheetApp.openById(sourceId).getSheetByName(sourceTab);
  if (!sheet) throw new Error("Pestana de respuestas no encontrada.");

  var lastRow = sheet.getLastRow();
  var lastColumn = sheet.getLastColumn();
  if (lastRow < 2 || lastColumn < 1) return { status: "OK", responses: [], nextCursor: "" };

  var headers = sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0];
  var indexes = bridgeResolveIndexes(headers);
  if (indexes.requestNumber === -1 || indexes.result === -1) throw new Error("Falta mapeo de columnas obligatorio.");

  var limit = bridgeLimit(payload.limit);
  var cursor = bridgeCursor(payload.cursor);
  var startRow = Math.max(2, cursor + 1);
  if (startRow > lastRow) return { status: "OK", responses: [], nextCursor: "" };

  var endRow = Math.min(lastRow, startRow + limit - 1);
  var rows = sheet.getRange(startRow, 1, endRow - startRow + 1, lastColumn).getDisplayValues();
  var responses = [];
  for (var i = 0; i < rows.length; i++) {
    var normalized = bridgeNormalizeRow(rows[i], indexes, startRow + i, caseSalt, eventSalt);
    if (normalized) responses.push(normalized);
  }

  return {
    status: "OK",
    responses: responses,
    nextCursor: endRow < lastRow ? String(endRow) : ""
  };
}

function bridgeNormalizeRow(row, indexes, rowNumber, caseSalt, eventSalt) {
  var requestNumber = bridgeReadValue(row, indexes.requestNumber);
  var result = bridgeNormalizeResult(bridgeReadValue(row, indexes.result));
  if (!requestNumber || !result) return null;

  var q1 = bridgeReadValue(row, indexes.q1);
  var q2 = bridgeReadValue(row, indexes.q2);
  var q3 = bridgeReadValue(row, indexes.q3);
  var q4 = bridgeReadValue(row, indexes.q4);
  var q9 = bridgeReadValue(row, indexes.q9);
  var q10 = bridgeReadValue(row, indexes.q10);
  var requiresRecontact = bridgeIsAffirmative(q9);
  var signals = [];
  if (bridgeIsNegative(q1)) signals.push("PLAN_NO_ENTENDIDO");
  if (bridgeIsNegative(q2)) signals.push("LICITACION_NO_EXPLICADA");
  if (bridgeIsNegative(q3)) signals.push("ADJUDICACION_NO_ENTENDIDA");
  if (bridgeIsNegative(q4) || bridgeCanonical(q4) === "DIFIERE") signals.push("CUOTA_DIFERENTE");
  if (requiresRecontact) signals.push("REQUIERE_RECONTACTO");
  if (bridgeHasSensitiveComment(q10)) signals.push("SENSITIVE_COMMENT");

  var sourceResponseId = bridgeReadValue(row, indexes.responseId) || ("ROW-" + rowNumber + "-" + requestNumber);
  return {
    eventId: bridgeHmacHex(eventSalt, "event|" + sourceResponseId),
    caseKey: bridgeHmacHex(caseSalt, bridgeNormalizeCaseReference(requestNumber)),
    submittedAt: bridgeReadValue(row, indexes.submittedAt).slice(0, 64),
    result: result,
    requiresRecontact: requiresRecontact,
    signals: signals
  };
}

function bridgeResolveIndexes(headers) {
  var indexes = {};
  Object.keys(HEADER_ALIASES).forEach(function(key) {
    indexes[key] = bridgeFindHeader(headers, HEADER_ALIASES[key]);
  });
  return indexes;
}

function bridgeFindHeader(headers, aliases) {
  for (var i = 0; i < headers.length; i++) {
    if (aliases.indexOf(bridgeCanonical(headers[i])) !== -1) return i;
  }
  return -1;
}

function bridgeReadValue(row, index) {
  return index >= 0 && index < row.length ? String(row[index] || "").trim() : "";
}

function bridgeNormalizeResult(value) {
  var normalized = bridgeCanonical(value);
  if (normalized.indexOf("NOPASO") !== -1) return "No paso";
  if (normalized.indexOf("REQUIEREREVISION") !== -1 || normalized.indexOf("REVISAR") !== -1) return "Revisar";
  if (normalized.indexOf("PASO") !== -1) return "Paso";
  return "";
}

function bridgeNormalizeCaseReference(value) {
  return String(value || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function bridgeCanonical(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function bridgeIsAffirmative(value) {
  return ["SI", "S", "TRUE", "1", "X"].indexOf(bridgeCanonical(value)) !== -1;
}

function bridgeIsNegative(value) {
  return ["NO", "FALSE", "0"].indexOf(bridgeCanonical(value)) !== -1;
}

function bridgeHasSensitiveComment(value) {
  return /(engano|reclamo|molesto|disconforme|demanda|denuncia|estafa)/i.test(String(value || ""));
}

function bridgeLimit(value) {
  var parsed = Number(value);
  if (!Number.isFinite(parsed)) return 200;
  return Math.max(1, Math.min(500, Math.floor(parsed)));
}

function bridgeCursor(value) {
  var parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.floor(parsed);
}

function bridgeRequiredProperty(name) {
  var value = PropertiesService.getScriptProperties().getProperty(name);
  if (!value) throw new Error("Falta configuracion segura.");
  return value;
}

function bridgeSha256Hex(value) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, value, Utilities.Charset.UTF_8)
    .map(function(byte) { return (byte + 256) % 256; })
    .map(function(byte) { return ("0" + byte.toString(16)).slice(-2); })
    .join("");
}

function bridgeHmacHex(secret, value) {
  return Utilities.computeHmacSha256Signature(value, secret)
    .map(function(byte) { return (byte + 256) % 256; })
    .map(function(byte) { return ("0" + byte.toString(16)).slice(-2); })
    .join("");
}

function bridgeConstantTimeEquals(left, right) {
  if (left.length !== right.length) return false;
  var difference = 0;
  for (var i = 0; i < left.length; i++) difference |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return difference === 0;
}

function bridgeIsPlainObject(value) {
  return value && Object.prototype.toString.call(value) === "[object Object]";
}

function bridgeJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
