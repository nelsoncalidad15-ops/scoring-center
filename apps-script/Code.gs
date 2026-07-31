const SHEET_NAMES = {
  JUJUY: "Solicitudes_Jujuy",
  SALTA: "Solicitudes_Salta",
  GESTIONES: "Gestiones_Scoring",
  CATALOGOS: "Catalogos",
  AUDITORIA: "Auditoria_Scoring",
};

const HEADERS = [
  "ID",
  "SEDE",
  "FECHA",
  "FECHA_VENTA",
  "NOMBRE",
  "DNI",
  "FECHA_NACIMIENTO",
  "DOMICILIO",
  "MAIL",
  "TELEFONO",
  "MODELO_PLAN",
  "TIPO_PAGO",
  "NRO_SOLICITUD",
  "NRO_CLIENTE",
  "PRIMERA_CUOTA",
  "IMPORTE_PRIMERA",
  "SALDO_PRIMERA",
  "CUOTA_DOS",
  "VENDEDOR",
  "OBSERVACIONES",
  "SIAC",
  "TMK",
  "SALESFORCE",
  "FINALIZADAS",
  "RESPONSABLE",
  "CANAL_SCORING",
  "ESTADO",
  "PROXIMA_ACCION",
  "RESULTADO_SCORING",
  "MOTIVO_RESULTADO",
  "REQUIERE_RECONTACTO",
  "ULTIMA_GESTION",
  "ENCUESTA_LINK",
  "RESPUESTAS_JSON",
  "CREADO_EN"
];

const GESTION_HEADERS = ["ID_GESTION", "ID_SOLICITUD", "FECHA", "TIPO", "DETALLE", "RESPONSABLE"];
const CATALOG_HEADERS = ["TIPO", "VALOR"];
const AUDIT_HEADERS = ["ID_EVENTO", "FECHA", "ACTOR_ID", "ACTOR_EMAIL", "ROLES", "ACCION", "ID_SOLICITUD", "RESULTADO"];
const ALLOWED_ACTIONS = ["listRecords", "createRecord", "updateRecord", "appendGestion", "getCatalogs"];
const REQUEST_TTL_MS = 5 * 60 * 1000;
const MAX_PAYLOAD_LENGTH = 80000;

function doPost(e) {
  try {
    var envelope = parseEnvelope(e);
    var payload = validateInternalRequest(envelope);
    ensureSetup();
    var action = payload.action;
    var actor = sanitizeActor(payload.actor);

    if (action === "listRecords") return jsonResponse(listRecords());
    if (action === "createRecord") return jsonResponse(withLock(function() { return createRecord(payload.record, actor); }));
    if (action === "updateRecord") return jsonResponse(withLock(function() { return updateRecord(payload.record, actor); }));
    if (action === "appendGestion") return jsonResponse(withLock(function() { return appendGestion(payload.gestion, actor); }));
    if (action === "getCatalogs") return jsonResponse(getCatalogs());

    return jsonResponse({ status: "ERROR", message: "Accion no reconocida." });
  } catch (error) {
    Logger.log("[scoring] solicitud rechazada");
    return jsonResponse({ status: "ERROR", message: "No se pudo procesar la solicitud." });
  }
}

function parseEnvelope(e) {
  if (!e || !e.postData || !e.postData.contents) throw new Error("Solicitud invalida.");
  var envelope = JSON.parse(e.postData.contents);
  if (!isPlainObject(envelope)) throw new Error("Sobre invalido.");
  return envelope;
}

function validateInternalRequest(envelope) {
  if (envelope.protocol !== "SC_INTERNAL_V1") throw new Error("Protocolo invalido.");
  var backendSecret = getRequiredProperty("BACKEND_SECRET");
  var hmacSecret = getRequiredProperty("APPS_SCRIPT_HMAC_SECRET");
  if (!constantTimeEquals(String(envelope.backendSecret || ""), backendSecret)) {
    throw new Error("No autorizado.");
  }

  var timestamp = String(envelope.timestamp || "");
  var timestampNumber = Number(timestamp);
  if (!Number.isFinite(timestampNumber) || Math.abs(Date.now() - timestampNumber) > REQUEST_TTL_MS) {
    throw new Error("Solicitud vencida.");
  }

  var nonce = String(envelope.nonce || "");
  var payloadText = String(envelope.payload || "");
  if (!/^[a-zA-Z0-9-]{20,100}$/.test(nonce) || !payloadText || payloadText.length > MAX_PAYLOAD_LENGTH) {
    throw new Error("Solicitud invalida.");
  }

  var digest = sha256Hex(payloadText);
  if (!constantTimeEquals(String(envelope.digest || ""), digest)) throw new Error("Integridad invalida.");
  var expectedSignature = hmacHex(hmacSecret, timestamp + "." + nonce + "." + digest);
  if (!constantTimeEquals(String(envelope.signature || ""), expectedSignature)) throw new Error("Firma invalida.");

  var payload = JSON.parse(payloadText);
  if (!isPlainObject(payload) || ALLOWED_ACTIONS.indexOf(payload.action) === -1) throw new Error("Accion invalida.");

  if (!claimNonce("scoring-nonce-", nonce, REQUEST_TTL_MS)) throw new Error("Solicitud repetida.");
  return payload;
}

function getRequiredProperty(name) {
  var value = PropertiesService.getScriptProperties().getProperty(name);
  if (!value) throw new Error("Falta configuracion segura.");
  return value;
}

function sha256Hex(value) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, value, Utilities.Charset.UTF_8)
    .map(function(byte) { return (byte + 256) % 256; })
    .map(function(byte) { return ("0" + byte.toString(16)).slice(-2); })
    .join("");
}

function hmacHex(secret, value) {
  return Utilities.computeHmacSha256Signature(value, secret)
    .map(function(byte) { return (byte + 256) % 256; })
    .map(function(byte) { return ("0" + byte.toString(16)).slice(-2); })
    .join("");
}

function constantTimeEquals(left, right) {
  if (left.length !== right.length) return false;
  var difference = 0;
  for (var i = 0; i < left.length; i++) difference |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return difference === 0;
}

function isPlainObject(value) {
  return value && Object.prototype.toString.call(value) === "[object Object]";
}

function withLock(callback) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    return callback();
  } finally {
    lock.releaseLock();
  }
}

function claimNonce(prefix, nonce, ttlMs) {
  return withLock(function() {
    var cache = CacheService.getScriptCache();
    var nonceKey = prefix + nonce;
    if (cache.get(nonceKey)) return false;
    cache.put(nonceKey, "1", Math.ceil(ttlMs / 1000));
    return true;
  });
}

function ensureSetup() {
  ensureSheet(SHEET_NAMES.JUJUY, HEADERS);
  ensureSheet(SHEET_NAMES.SALTA, HEADERS);
  ensureSheet(SHEET_NAMES.GESTIONES, GESTION_HEADERS);
  ensureSheet(SHEET_NAMES.CATALOGOS, CATALOG_HEADERS);
  ensureSheet(SHEET_NAMES.AUDITORIA, AUDIT_HEADERS);
  seedCatalogs();
}

function ensureSheet(name, headers) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(name) || ss.insertSheet(name);
  if (sheet.getMaxColumns() < headers.length) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), headers.length - sheet.getMaxColumns());
  }
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  } else {
    var currentHeaders = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
    for (var i = 0; i < headers.length; i++) {
      if (String(currentHeaders[i] || "") !== headers[i]) throw new Error("La estructura de la planilla operativa no coincide.");
    }
  }
  sheet.setFrozenRows(1);
}

function seedCatalogs() {
  var sheet = getSpreadsheet().getSheetByName(SHEET_NAMES.CATALOGOS);
  if (sheet.getLastRow() > 1) return;
  sheet.getRange(2, 1, 8, 2).setValues([
    ["OPERADOR", "Recepcion"],
    ["OPERADOR", "Contact Center 1"],
    ["OPERADOR", "Contact Center 2"],
    ["OPERADOR", "Supervisor"],
    ["CANAL", "WhatsApp"],
    ["CANAL", "Llamada"],
    ["CANAL", "Hibrido"],
    ["ESTADO", "Pendiente contacto"]
  ]);
}

function listRecords() {
  return {
    status: "OK",
    records: readSheetRecords(SHEET_NAMES.JUJUY).concat(readSheetRecords(SHEET_NAMES.SALTA)).map(toPanelRecord),
    gestiones: readGestiones()
  };
}

function createRecord(record, actor) {
  var sanitizedRecord = sanitizeRecord(record);
  sanitizedRecord.ENCUESTA_LINK = "";
  appendRecord(sheetNameForRecord(sanitizedRecord), sanitizedRecord);
  appendAudit(actor, "createRecord", sanitizedRecord.ID);
  return listRecords();
}

function updateRecord(record, actor) {
  var sanitizedRecord = sanitizeRecord(record);
  var sheetName = sheetNameForRecord(sanitizedRecord);
  var sheet = getSpreadsheet().getSheetByName(sheetName);
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(sanitizedRecord.ID)) {
      var existingRecord = {};
      for (var j = 0; j < HEADERS.length; j++) existingRecord[HEADERS[j]] = data[i][j];
      sanitizedRecord.ENCUESTA_LINK = String(existingRecord.ENCUESTA_LINK || "");
      var row = HEADERS.map(function(header) { return sanitizedRecord[header] || ""; });
      sheet.getRange(i + 1, 1, 1, row.length).setValues([row]);
      appendAudit(actor, "updateRecord", sanitizedRecord.ID);
      return listRecords();
    }
  }
  throw new Error("No se encontro la solicitud para actualizar.");
}

function appendGestion(gestion, actor) {
  var sanitizedGestion = sanitizeGestion(gestion);
  var sheet = getSpreadsheet().getSheetByName(SHEET_NAMES.GESTIONES);
  var row = GESTION_HEADERS.map(function(header) { return sanitizedGestion[header] || ""; });
  sheet.appendRow(row);
  appendAudit(actor, "appendGestion", sanitizedGestion.ID_SOLICITUD);
  return { status: "OK" };
}

function sheetNameForRecord(record) {
  if (record.SEDE === "Jujuy") return SHEET_NAMES.JUJUY;
  if (record.SEDE === "Salta") return SHEET_NAMES.SALTA;
  throw new Error("Sede invalida.");
}

function sanitizeRecord(record) {
  if (!isPlainObject(record)) throw new Error("Registro invalido.");
  var sanitized = {};
  for (var i = 0; i < HEADERS.length; i++) {
    var header = HEADERS[i];
    var value = record[header];
    if (header === "RESPUESTAS_JSON" && isPlainObject(value)) value = JSON.stringify(value);
    sanitized[header] = sanitizeCellValue(value, maxLengthForHeader(header));
  }
  if (!/^[a-zA-Z0-9_-]{6,160}$/.test(sanitized.ID)) throw new Error("ID invalido.");
  if (["Jujuy", "Salta"].indexOf(sanitized.SEDE) === -1) throw new Error("Sede invalida.");
  if (!sanitized.NRO_SOLICITUD) throw new Error("Falta numero de solicitud.");
  return sanitized;
}

function sanitizeGestion(gestion) {
  if (!isPlainObject(gestion)) throw new Error("Gestion invalida.");
  var sanitized = {};
  for (var i = 0; i < GESTION_HEADERS.length; i++) {
    var header = GESTION_HEADERS[i];
    sanitized[header] = sanitizeCellValue(gestion[header], header === "DETALLE" ? 2000 : 300);
  }
  if (!/^[a-zA-Z0-9_-]{6,160}$/.test(sanitized.ID_GESTION) || !sanitized.ID_SOLICITUD) {
    throw new Error("Gestion invalida.");
  }
  return sanitized;
}

function sanitizeActor(actor) {
  var safeActor = isPlainObject(actor) ? actor : {};
  var roles = Array.isArray(safeActor.roles) ? safeActor.roles : [];
  return {
    id: sanitizeCellValue(safeActor.id, 160),
    email: sanitizeCellValue(safeActor.email, 254),
    roles: roles.map(function(role) { return sanitizeCellValue(role, 64); }).slice(0, 8)
  };
}

function maxLengthForHeader(header) {
  if (header === "RESPUESTAS_JSON") return 12000;
  if (header === "OBSERVACIONES" || header === "MOTIVO_RESULTADO") return 4000;
  if (header === "DOMICILIO" || header === "ENCUESTA_LINK") return 1000;
  return 300;
}

function sanitizeCellValue(value, maxLength) {
  var text = value === null || value === undefined ? "" : String(value);
  text = text.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, maxLength);
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function appendAudit(actor, action, requestId) {
  var sheet = getSpreadsheet().getSheetByName(SHEET_NAMES.AUDITORIA);
  sheet.appendRow([
    Utilities.getUuid(),
    new Date().toISOString(),
    actor.id,
    actor.email,
    actor.roles.join(","),
    action,
    sanitizeCellValue(requestId, 160),
    "OK"
  ]);
}

function getCatalogs() {
  var rows = getSpreadsheet().getSheetByName(SHEET_NAMES.CATALOGOS).getDataRange().getValues();
  var operadores = [];
  var canales = [];
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] === "OPERADOR") operadores.push(rows[i][1]);
    if (rows[i][0] === "CANAL") canales.push(rows[i][1]);
  }
  return { status: "OK", operadores: operadores, canales: canales };
}

function appendRecord(sheetName, record) {
  var sheet = getSpreadsheet().getSheetByName(sheetName);
  var row = HEADERS.map(function(header) { return record[header] || ""; });
  sheet.appendRow(row);
}

function readSheetRecords(sheetName) {
  var sheet = getSpreadsheet().getSheetByName(sheetName);
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  var rows = [];
  for (var i = 1; i < data.length; i++) {
    var row = {};
    for (var j = 0; j < HEADERS.length; j++) row[HEADERS[j]] = data[i][j];
    rows.push(row);
  }
  return rows;
}

function toPanelRecord(record) {
  var panelRecord = {};
  for (var i = 0; i < HEADERS.length; i++) {
    var header = HEADERS[i];
    if (header !== "ENCUESTA_LINK") panelRecord[header] = record[header];
  }
  return panelRecord;
}

function readGestiones() {
  var sheet = getSpreadsheet().getSheetByName(SHEET_NAMES.GESTIONES);
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  var rows = [];
  for (var i = 1; i < data.length; i++) {
    var row = {};
    for (var j = 0; j < GESTION_HEADERS.length; j++) row[GESTION_HEADERS[j]] = data[i][j];
    rows.push(row);
  }
  return rows;
}

function getSpreadsheet() {
  var id = getRequiredProperty("SHEET_ID");
  var readOnlySourceId = getRequiredProperty("READONLY_SOURCE_SHEET_ID");
  if (id === readOnlySourceId) {
    throw new Error("La planilla de respuestas no puede ser la planilla operativa.");
  }
  return SpreadsheetApp.openById(id);
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
