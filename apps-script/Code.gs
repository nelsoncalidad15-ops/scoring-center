const SHEET_NAMES = {
  JUJUY: "Solicitudes_Jujuy",
  SALTA: "Solicitudes_Salta",
  GESTIONES: "Gestiones_Scoring",
  CATALOGOS: "Catalogos",
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
  "CREADO_EN"
];

const GESTION_HEADERS = ["ID_GESTION", "ID_SOLICITUD", "FECHA", "TIPO", "DETALLE", "RESPONSABLE"];
const CATALOG_HEADERS = ["TIPO", "VALOR"];

function doPost(e) {
  try {
    validateSecret(e);
    ensureSetup();
    var payload = JSON.parse(e.postData.contents || "{}");
    var action = payload.action;

    if (action === "listRecords") return jsonResponse(listRecords());
    if (action === "createRecord") return jsonResponse(createRecord(payload.record));
    if (action === "updateRecord") return jsonResponse(updateRecord(payload.record));
    if (action === "appendGestion") return jsonResponse(appendGestion(payload.gestion));
    if (action === "getCatalogs") return jsonResponse(getCatalogs());

    return jsonResponse({ status: "ERROR", message: "Accion no reconocida." });
  } catch (error) {
    return jsonResponse({ status: "ERROR", message: error.toString() });
  }
}

function validateSecret(e) {
  var payload = JSON.parse(e.postData.contents || "{}");
  var secret = PropertiesService.getScriptProperties().getProperty("BACKEND_SECRET");
  if (!secret || payload.backendSecret !== secret) {
    throw new Error("No autorizado.");
  }
}

function ensureSetup() {
  ensureSheet(SHEET_NAMES.JUJUY, HEADERS);
  ensureSheet(SHEET_NAMES.SALTA, HEADERS);
  ensureSheet(SHEET_NAMES.GESTIONES, GESTION_HEADERS);
  ensureSheet(SHEET_NAMES.CATALOGOS, CATALOG_HEADERS);
  seedCatalogs();
}

function ensureSheet(name, headers) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(name) || ss.insertSheet(name);
  if (sheet.getLastRow() === 0 || sheet.getLastColumn() === 0) {
    sheet.clear();
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    return;
  }
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
    records: readSheetRecords(SHEET_NAMES.JUJUY).concat(readSheetRecords(SHEET_NAMES.SALTA)),
    gestiones: readGestiones()
  };
}

function createRecord(record) {
  var sheetName = record.SEDE === "Salta" ? SHEET_NAMES.SALTA : SHEET_NAMES.JUJUY;
  appendRecord(sheetName, record);
  return listRecords();
}

function updateRecord(record) {
  var sheetName = record.SEDE === "Salta" ? SHEET_NAMES.SALTA : SHEET_NAMES.JUJUY;
  var sheet = getSpreadsheet().getSheetByName(sheetName);
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(record.ID)) {
      var row = HEADERS.map(function(header) { return record[header] || ""; });
      sheet.getRange(i + 1, 1, 1, row.length).setValues([row]);
      return listRecords();
    }
  }
  throw new Error("No se encontro la solicitud para actualizar.");
}

function appendGestion(gestion) {
  var sheet = getSpreadsheet().getSheetByName(SHEET_NAMES.GESTIONES);
  var row = GESTION_HEADERS.map(function(header) { return gestion[header] || ""; });
  sheet.appendRow(row);
  return { status: "OK" };
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
  var id = PropertiesService.getScriptProperties().getProperty("SHEET_ID");
  if (!id) throw new Error("Falta SHEET_ID en Script Properties.");
  return SpreadsheetApp.openById(id);
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
