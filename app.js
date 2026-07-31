const API_ENDPOINTS = {
  records: "/.netlify/functions/records",
  catalogs: "/.netlify/functions/catalogs",
};

const SURVEY_BASE_URL = "https://plan-encuesta.netlify.app/?t=";
const STATUS_FLOW = [
  "Nuevo ingreso",
  "Pendiente contacto",
  "Encuesta enviada",
  "Llamada programada",
  "Scoring en proceso",
  "Cerrado",
];

const STATUS_INFO = {
  "Nuevo ingreso": { className: "status-nuevo", short: "Nuevo ingreso" },
  "Pendiente contacto": { className: "status-pendiente", short: "Pendiente contacto" },
  "Encuesta enviada": { className: "status-enviado", short: "Encuesta enviada" },
  "Llamada programada": { className: "status-llamada", short: "Llamada programada" },
  "Scoring en proceso": { className: "status-proceso", short: "Scoring en proceso" },
  "Cerrado": { className: "status-cerrado", short: "Cerrado" },
};

const DEFAULT_OPERATORS = ["Recepcion", "Contact Center 1", "Contact Center 2", "Supervisor"];
const DEFAULT_CHANNELS = ["WhatsApp", "Llamada", "Hibrido"];
const MANUAL_STEPS_TOTAL = 12;

const state = {
  records: [],
  currentView: "pendientes",
  sedeFilter: "Todas",
  operatorFilter: "Todos",
  statusFilter: "Todas",
  boardFilter: "Todos",
  search: "",
  queueFilter: "Activos",
  selectedId: null,
  callModeRecordId: null,
  currentStep: 0,
  catalogs: {
    operadores: [...DEFAULT_OPERATORS],
    canales: [...DEFAULT_CHANNELS],
  },
  loading: true,
};

function uid() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function buildSurveyLink(nroSolicitud, nombre) {
  const clean = String(nroSolicitud || "SOL").replace(/\W/g, "").slice(-8) || "SOL00001";
  const seed = String(nombre || "CLIENTE").replace(/\W/g, "").toUpperCase().slice(0, 4) || "AUTO";
  return `${SURVEY_BASE_URL}${seed}${clean}`;
}

function normalizePhone(value) {
  return String(value || "").replace(/\D/g, "").replace(/^54/, "");
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function nowStamp() {
  return new Intl.DateTimeFormat("es-AR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date()).replace(",", "");
}

function normalizeDateInput(value) {
  if (!value) return "";
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    if (/^\d{4}-\d{2}-\d{2}T/.test(trimmed)) return trimmed.slice(0, 10);
    const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (match) {
      const [, day, month, year] = match;
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeUpper(value) {
  return normalizeText(value).toUpperCase();
}

function isAffirmative(value) {
  return [true, "true", "TRUE", "SI", "Si", "si", "X", "x", 1, "1", "on"].includes(value);
}

function boolToSheet(value) {
  return value ? "SI" : "";
}

function statusBadge(status) {
  const info = STATUS_INFO[status] || STATUS_INFO["Nuevo ingreso"];
  return `<span class="status-chip ${info.className}">${info.short}</span>`;
}

function resultBadge(result) {
  if (result === "Paso") return '<span class="status-chip result-paso">Paso</span>';
  if (result === "Revisar") return '<span class="status-chip result-revisar">Revisar</span>';
  if (result === "No paso") return '<span class="status-chip result-nopaso">No paso</span>';
  return '<span class="status-chip neutral-chip">Sin scoring</span>';
}

function notify(message) {
  window.alert(message);
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch (error) {
    throw new Error(text || "Respuesta invalida del servidor.");
  }
  if (!response.ok || data.status === "ERROR") {
    throw new Error(data.message || `Error ${response.status}`);
  }
  return data;
}

async function apiListRecords() {
  return fetchJson(API_ENDPOINTS.records);
}

async function apiGetCatalogs() {
  return fetchJson(API_ENDPOINTS.catalogs);
}

async function apiPostRecords(payload) {
  return fetchJson(API_ENDPOINTS.records, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

function apiGestionToUi(gestion) {
  return {
    id: normalizeText(gestion.ID_GESTION) || uid(),
    fecha: normalizeText(gestion.FECHA),
    tipo: normalizeText(gestion.TIPO),
    detalle: normalizeText(gestion.DETALLE),
    responsable: normalizeText(gestion.RESPONSABLE),
  };
}

function parseResponses(raw) {
  if (!raw) return {};
  if (typeof raw === "object") return raw;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    return {};
  }
}

function hasSurveyResponses(record) {
  const respuestas = record.respuestas || {};
  return Object.keys(respuestas).some((key) => normalizeText(respuestas[key]));
}

function getSurveySummary(record) {
  const respuestas = record.respuestas || {};
  if (normalizeText(respuestas.q4)) return `P4: ${respuestas.q4}`;
  if (normalizeText(respuestas.q1)) return `P1: ${respuestas.q1}`;
  if (normalizeText(respuestas.q7)) return `P7: ${respuestas.q7}`;
  return "Sin detalle";
}

function apiRecordToUiRecord(record, gestiones) {
  return {
    id: normalizeText(record.ID) || uid(),
    sede: normalizeText(record.SEDE) || "Jujuy",
    fecha: normalizeDateInput(record.FECHA),
    fechaVenta: normalizeDateInput(record.FECHA_VENTA),
    nombre: normalizeUpper(record.NOMBRE),
    dni: normalizeText(record.DNI),
    fechaNacimiento: normalizeDateInput(record.FECHA_NACIMIENTO),
    domicilio: normalizeText(record.DOMICILIO),
    mail: normalizeUpper(record.MAIL),
    telefono: normalizeText(record.TELEFONO),
    modelo: normalizeText(record.MODELO_PLAN),
    tipoPago: normalizeText(record.TIPO_PAGO),
    nroSolicitud: normalizeText(record.NRO_SOLICITUD),
    nroCliente: normalizeText(record.NRO_CLIENTE),
    primeraCuota: normalizeText(record.PRIMERA_CUOTA),
    importePrimera: normalizeText(record.IMPORTE_PRIMERA),
    saldoPrimera: normalizeText(record.SALDO_PRIMERA),
    cuotaDos: normalizeText(record.CUOTA_DOS),
    vendedor: normalizeUpper(record.VENDEDOR),
    observaciones: normalizeText(record.OBSERVACIONES),
    siac: isAffirmative(record.SIAC),
    tmk: isAffirmative(record.TMK),
    salesforce: isAffirmative(record.SALESFORCE),
    finalizadas: isAffirmative(record.FINALIZADAS),
    responsable: normalizeText(record.RESPONSABLE) || "Recepcion",
    canalScoring: normalizeText(record.CANAL_SCORING) || "WhatsApp",
    estado: normalizeText(record.ESTADO) || "Nuevo ingreso",
    proximaAccion: normalizeText(record.PROXIMA_ACCION) || "Preparar contacto",
    resultadoScoring: normalizeText(record.RESULTADO_SCORING) || "Sin scoring",
    motivoResultado: normalizeText(record.MOTIVO_RESULTADO) || "Pendiente de gestion",
    requiereRecontacto: normalizeText(record.REQUIERE_RECONTACTO) || "No definido",
    ultimaGestion: normalizeDateInput(record.ULTIMA_GESTION) || normalizeText(record.ULTIMA_GESTION),
    encuestaLink: normalizeText(record.ENCUESTA_LINK) || buildSurveyLink(record.NRO_SOLICITUD, record.NOMBRE),
    respuestas: parseResponses(record.RESPUESTAS_JSON),
    gestiones: gestiones.map(apiGestionToUi).sort((a, b) => String(a.fecha).localeCompare(String(b.fecha))),
    creadoEn: normalizeText(record.CREADO_EN),
  };
}

function uiRecordToApiRecord(record) {
  return {
    ID: record.id,
    SEDE: record.sede,
    FECHA: record.fecha,
    FECHA_VENTA: record.fechaVenta,
    NOMBRE: record.nombre,
    DNI: record.dni,
    FECHA_NACIMIENTO: record.fechaNacimiento,
    DOMICILIO: record.domicilio,
    MAIL: record.mail,
    TELEFONO: record.telefono,
    MODELO_PLAN: record.modelo,
    TIPO_PAGO: record.tipoPago,
    NRO_SOLICITUD: record.nroSolicitud,
    NRO_CLIENTE: record.nroCliente,
    PRIMERA_CUOTA: record.primeraCuota,
    IMPORTE_PRIMERA: record.importePrimera,
    SALDO_PRIMERA: record.saldoPrimera,
    CUOTA_DOS: record.cuotaDos,
    VENDEDOR: record.vendedor,
    OBSERVACIONES: record.observaciones,
    SIAC: boolToSheet(record.siac),
    TMK: boolToSheet(record.tmk),
    SALESFORCE: boolToSheet(record.salesforce),
    FINALIZADAS: boolToSheet(record.finalizadas),
    RESPONSABLE: record.responsable,
    CANAL_SCORING: record.canalScoring,
    ESTADO: record.estado,
    PROXIMA_ACCION: record.proximaAccion,
    RESULTADO_SCORING: record.resultadoScoring,
    MOTIVO_RESULTADO: record.motivoResultado,
    REQUIERE_RECONTACTO: record.requiereRecontacto,
    ULTIMA_GESTION: record.ultimaGestion,
    ENCUESTA_LINK: record.encuestaLink,
    RESPUESTAS_JSON: JSON.stringify(record.respuestas || {}),
    CREADO_EN: record.creadoEn,
  };
}

function buildGestionPayload(recordId, tipo, detalle, responsable) {
  return {
    ID_GESTION: uid(),
    ID_SOLICITUD: recordId,
    FECHA: nowStamp(),
    TIPO: tipo,
    DETALLE: detalle,
    RESPONSABLE: responsable || "Sistema",
  };
}

function replaceStateFromApi(records, gestiones) {
  const gestionesById = new Map();
  (gestiones || []).forEach((gestion) => {
    const key = normalizeText(gestion.ID_SOLICITUD);
    if (!gestionesById.has(key)) gestionesById.set(key, []);
    gestionesById.get(key).push(gestion);
  });

  state.records = (records || [])
    .map((record) => apiRecordToUiRecord(record, gestionesById.get(normalizeText(record.ID)) || []))
    .sort((a, b) => String(b.creadoEn || "").localeCompare(String(a.creadoEn || "")));

  if (state.selectedId && !state.records.some((record) => record.id === state.selectedId)) {
    state.selectedId = state.records[0]?.id || null;
  }
  if (!state.selectedId && state.records.length) {
    state.selectedId = state.records[0].id;
  }
  if (state.callModeRecordId && !state.records.some((record) => record.id === state.callModeRecordId)) {
    state.callModeRecordId = null;
  }
}

function syncSelectOptions(id, options, selectedValue) {
  const select = document.getElementById(id);
  if (!select) return;
  const finalOptions = Array.from(new Set(options.filter(Boolean)));
  const current = selectedValue || select.value;
  select.innerHTML = finalOptions.map((option) => `<option value="${option}">${option}</option>`).join("");
  if (finalOptions.includes(current)) {
    select.value = current;
  } else if (finalOptions.length) {
    select.value = finalOptions[0];
  }
}

function getFormField(name) {
  return document.querySelector(`#solicitud-form [name="${name}"]`);
}

function applyCatalogs(catalogs) {
  state.catalogs = {
    operadores: Array.isArray(catalogs?.operadores) && catalogs.operadores.length ? catalogs.operadores : [...DEFAULT_OPERATORS],
    canales: Array.isArray(catalogs?.canales) && catalogs.canales.length ? catalogs.canales : [...DEFAULT_CHANNELS],
  };

  syncSelectOptions("global-operator-filter", ["Todos", ...state.catalogs.operadores], state.operatorFilter);
  syncSelectOptions("detail-responsable", state.catalogs.operadores, state.catalogs.operadores[0]);
  syncSelectOptions("detail-canal", state.catalogs.canales, state.catalogs.canales[0]);

  const formResponsable = getFormField("responsable");
  if (formResponsable) {
    formResponsable.innerHTML = state.catalogs.operadores.map((option) => `<option value="${option}">${option}</option>`).join("");
    formResponsable.value = state.catalogs.operadores[0];
  }

  const formCanal = getFormField("canalScoring");
  if (formCanal) {
    formCanal.innerHTML = state.catalogs.canales.map((option) => `<option value="${option}">${option}</option>`).join("");
    formCanal.value = state.catalogs.canales[0];
  }
}

async function refreshData() {
  state.loading = true;
  renderAll();
  const [recordsData, catalogsData] = await Promise.all([
    apiListRecords(),
    apiGetCatalogs().catch(() => ({ status: "OK", operadores: [...DEFAULT_OPERATORS], canales: [...DEFAULT_CHANNELS] })),
  ]);
  replaceStateFromApi(recordsData.records, recordsData.gestiones);
  applyCatalogs(catalogsData);
  state.loading = false;
  renderAll();
}

async function runMutation(task, successMessage) {
  try {
    await task();
    await refreshData();
    if (successMessage) notify(successMessage);
  } catch (error) {
    console.error(error);
    notify(`No se pudo guardar: ${error.message || error}`);
  }
}

function allVisibleRecords() {
  return state.records.filter((record) => {
    const bySede = state.sedeFilter === "Todas" || record.sede === state.sedeFilter;
    const byOperator = state.operatorFilter === "Todos" || record.responsable === state.operatorFilter;
    const query = state.search.trim().toLowerCase();
    const haystack = `${record.nombre} ${record.nroSolicitud} ${record.vendedor} ${record.modelo}`.toLowerCase();
    const bySearch = !query || haystack.includes(query);
    return bySede && byOperator && bySearch;
  });
}

function filteredRecords() {
  return allVisibleRecords().filter((record) => {
    const byStatus = state.statusFilter === "Todas" || record.estado === state.statusFilter;
    const byBoard = state.boardFilter === "Todos" || record.estado === state.boardFilter;
    return byStatus && byBoard;
  });
}

function pendingRecords() {
  return filteredRecords().filter((record) => record.resultadoScoring !== "No paso");
}

function rejectedRecords() {
  return allVisibleRecords().filter((record) => record.resultadoScoring === "No paso");
}

function surveyRecords() {
  return allVisibleRecords().filter((record) => hasSurveyResponses(record) || record.estado === "Encuesta enviada");
}

function queueRecords() {
  let records = allVisibleRecords().filter((record) => record.resultadoScoring !== "No paso");
  if (state.queueFilter === "Activos") records = records.filter((record) => record.estado !== "Cerrado");
  if (["WhatsApp", "Llamada", "Hibrido"].includes(state.queueFilter)) records = records.filter((record) => record.canalScoring === state.queueFilter);
  return records.sort((a, b) => STATUS_FLOW.indexOf(a.estado) - STATUS_FLOW.indexOf(b.estado));
}

function findNextPendingRecord() {
  return queueRecords().find((record) => ["Nuevo ingreso", "Pendiente contacto", "Llamada programada", "Scoring en proceso", "Encuesta enviada"].includes(record.estado)) || null;
}

function renderMetrics() {
  const visible = allVisibleRecords();
  document.getElementById("metric-contactar").textContent = visible.filter((record) => ["Nuevo ingreso", "Pendiente contacto"].includes(record.estado)).length;
  document.getElementById("metric-enviada").textContent = visible.filter((record) => record.estado === "Encuesta enviada").length;
  document.getElementById("metric-respondidas").textContent = visible.filter((record) => hasSurveyResponses(record)).length;
  document.getElementById("metric-rechazados").textContent = visible.filter((record) => record.resultadoScoring === "No paso").length;
}

function renderTable() {
  const body = document.getElementById("solicitudes-table-body");
  if (state.loading) {
    body.innerHTML = '<tr><td colspan="7">Cargando...</td></tr>';
    return;
  }

  const records = pendingRecords();
  body.innerHTML = records.map((record) => `
    <tr>
      <td>
        <strong>${record.nombre}</strong>
        <div>${record.telefono || "-"}</div>
        <div>${record.nroSolicitud}</div>
      </td>
      <td>${record.modelo}</td>
      <td>${record.vendedor}</td>
      <td>${record.responsable}</td>
      <td>${record.canalScoring}</td>
      <td>${statusBadge(record.estado)}</td>
      <td>
        <div class="row-actions">
          <button class="whatsapp-button" type="button" onclick="openWhatsApp('${record.id}')">WhatsApp</button>
          <button class="call-button" type="button" onclick="callClient('${record.id}')">Llamar</button>
          <button class="action-button" type="button" onclick="openRecord('${record.id}')">Gestionar</button>
        </div>
      </td>
    </tr>
  `).join("") || '<tr><td colspan="7">No hay casos para este filtro.</td></tr>';
}

function renderSurveySummary() {
  const records = surveyRecords();
  const answered = records.filter((record) => hasSurveyResponses(record));
  const pending = records.filter((record) => !hasSurveyResponses(record) && record.estado === "Encuesta enviada");
  const review = answered.filter((record) => record.resultadoScoring === "Revisar" || record.resultadoScoring === "No paso");

  document.getElementById("survey-summary-grid").innerHTML = [
    { label: "Respondidas", value: answered.length },
    { label: "Sin responder", value: pending.length },
    { label: "Para revisar", value: review.length },
  ].map((item) => `
    <article class="survey-summary-card">
      <span>${item.label}</span>
      <strong>${item.value}</strong>
    </article>
  `).join("");
}

function renderSurveyTable() {
  const body = document.getElementById("survey-table-body");
  if (state.loading) {
    body.innerHTML = '<tr><td colspan="6">Cargando...</td></tr>';
    return;
  }

  const records = surveyRecords();
  body.innerHTML = records.map((record) => `
    <tr>
      <td>
        <strong>${record.nombre}</strong>
        <div>${record.telefono || "-"}</div>
      </td>
      <td>${record.nroSolicitud}</td>
      <td>${statusBadge(record.estado)}</td>
      <td>${resultBadge(record.resultadoScoring)}</td>
      <td>${hasSurveyResponses(record) ? getSurveySummary(record) : "Sin respuestas recibidas"}</td>
      <td>
        <div class="row-actions">
          <button class="action-button" type="button" onclick="openRecord('${record.id}')">Ver ficha</button>
        </div>
      </td>
    </tr>
  `).join("") || '<tr><td colspan="6">No hay encuestas para mostrar.</td></tr>';
}

function isScoringResolved(record) {
  return ["Paso", "Revisar", "No paso"].includes(normalizeText(record.resultadoScoring));
}

function wasSurveySent(record) {
  if (record.estado === "Encuesta enviada" || record.proximaAccion === "Esperar respuesta") return true;
  return (record.gestiones || []).some((gestion) => {
    const type = normalizeText(gestion.tipo).toLowerCase();
    const detail = normalizeText(gestion.detalle).toLowerCase();
    return type === "whatsapp" && detail.includes("encuesta");
  });
}

function hasIndicatorResponses(record) {
  const respuestas = record.respuestas || {};
  const questionKeys = ["q1", "q2", "q3", "q4", "q5", "q6", "q7", "q8", "q9", "q10"];
  return questionKeys.filter((key) => normalizeText(respuestas[key])).length >= 2;
}

function indicatorPercent(value, total) {
  return total ? `${Math.round((value / total) * 100)}%` : "-";
}

function escapeIndicatorHtml(value) {
  const entities = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return String(value ?? "").replace(/[&<>"']/g, (character) => entities[character]);
}

function getIndicatorAlert(record) {
  const respuestas = record.respuestas || {};
  if (record.resultadoScoring === "No paso") {
    return { priority: 1, label: "No paso", tone: "danger", detail: record.motivoResultado || "Revisar rechazo" };
  }
  if (record.requiereRecontacto === "Si" || respuestas.q10 === "Si") {
    return { priority: 2, label: "Recontactar", tone: "warning", detail: record.motivoResultado || "El cliente pidio recontacto" };
  }
  if (record.resultadoScoring === "Revisar") {
    return { priority: 3, label: "Revisar scoring", tone: "warning", detail: record.motivoResultado || "Tiene observaciones para revisar" };
  }
  if (wasSurveySent(record) && !hasIndicatorResponses(record)) {
    return { priority: 4, label: "Sin respuesta", tone: "info", detail: "Encuesta enviada, sin respuestas registradas" };
  }
  return null;
}

function indicatorBarsMarkup(items, total, emptyMessage) {
  if (!total) return `<p class="empty-indicator">${emptyMessage}</p>`;
  return items.map((item) => {
    const percent = Math.round((item.value / total) * 100);
    return `
      <div class="indicator-bar-row">
        <div class="indicator-bar-label">
          <span>${item.label}</span>
          <strong>${item.value}</strong>
        </div>
        <div class="indicator-bar-track"><span class="${item.tone || ""}" style="width: ${percent}%"></span></div>
        <small>${indicatorPercent(item.value, total)}</small>
      </div>
    `;
  }).join("");
}

function getIndicatorSignals(records) {
  const signals = [
    { label: "Plan no entendido", test: (respuestas) => respuestas.q1 === "No" },
    { label: "Licitacion no explicada", test: (respuestas) => respuestas.q2 === "No" },
    { label: "Adjudicacion no entendida", test: (respuestas) => respuestas.q3 === "No" },
    { label: "Diferencia en cuota 2", test: (respuestas) => respuestas.q4 === "No" || respuestas.q4 === "Difiere" },
    { label: "No reconoce al asesor", test: (respuestas) => respuestas.q7 === "No" },
    { label: "Puntaje bajo al asesor", test: (respuestas) => normalizeText(respuestas.q8) && Number(respuestas.q8) <= 2 },
    { label: "Recontacto solicitado", test: (respuestas) => respuestas.q10 === "Si" },
    { label: "Comentario sensible", test: (respuestas) => /(engano|reclamo|molesto|disconforme|demanda|denuncia)/i.test(respuestas.observacionesScoring || "") },
  ];

  return signals.map((signal) => ({
    label: signal.label,
    value: records.filter((record) => signal.test(record.respuestas || {})).length,
    tone: "warning",
  })).filter((signal) => signal.value > 0).sort((a, b) => b.value - a.value);
}

function renderIndicators() {
  const kpiGrid = document.getElementById("indicator-kpi-grid");
  if (!kpiGrid) return;

  const funnel = document.getElementById("indicator-funnel");
  const results = document.getElementById("indicator-results");
  const signals = document.getElementById("indicator-signals");
  const alertsBody = document.getElementById("indicator-alerts-body");
  const advisorsBody = document.getElementById("indicator-advisors-body");

  const filterNote = document.getElementById("indicator-filter-note");
  if (state.loading) {
    kpiGrid.innerHTML = '<article class="indicator-kpi-card"><span>Indicadores</span><strong>Cargando...</strong></article>';
    funnel.innerHTML = '<p class="empty-indicator">Cargando registros...</p>';
    results.innerHTML = "";
    signals.innerHTML = "";
    alertsBody.innerHTML = '<tr><td colspan="4">Cargando...</td></tr>';
    advisorsBody.innerHTML = '<tr><td colspan="6">Cargando...</td></tr>';
    return;
  }

  const records = allVisibleRecords();
  const surveysSent = records.filter(wasSurveySent);

  if (filterNote) {
    const activeFilters = [];
    if (state.sedeFilter !== "Todas") activeFilters.push(`Sede: ${state.sedeFilter}`);
    if (state.operatorFilter !== "Todos") activeFilters.push(`Responsable: ${state.operatorFilter}`);
    if (state.search.trim()) activeFilters.push("Busqueda activa");
    filterNote.textContent = activeFilters.length ? `Filtros activos: ${activeFilters.join(" | ")}` : "Sin filtros globales activos.";
  }
  const answersRegistered = records.filter(hasIndicatorResponses);
  const surveyAnswers = surveysSent.filter(hasIndicatorResponses);
  const scored = records.filter(isScoringResolved);
  const passed = scored.filter((record) => record.resultadoScoring === "Paso");
  const review = scored.filter((record) => record.resultadoScoring === "Revisar");
  const failed = scored.filter((record) => record.resultadoScoring === "No paso");
  const surveyScored = surveyAnswers.filter(isScoringResolved);
  const surveyPassed = surveyScored.filter((record) => record.resultadoScoring === "Paso");
  const recontacts = records.filter((record) => record.requiereRecontacto === "Si" || record.respuestas?.q10 === "Si");
  const alerts = records.map((record) => ({ record, alert: getIndicatorAlert(record) }))
    .filter((item) => item.alert)
    .sort((a, b) => a.alert.priority - b.alert.priority);

  const kpis = [
    { label: "Casos visibles", value: records.length, note: "Base de la lectura" },
    { label: "Encuestas enviadas", value: surveysSent.length, note: `${indicatorPercent(surveysSent.length, records.length)} de los casos` },
    { label: "Respuestas cargadas", value: answersRegistered.length, note: surveysSent.length ? `${indicatorPercent(surveyAnswers.length, surveysSent.length)} de respuesta sobre envios` : answersRegistered.length ? "Cargadas por gestion manual" : "Sin respuestas registradas" },
    { label: "Scoring resuelto", value: scored.length, note: `${indicatorPercent(scored.length, records.length)} de los casos` },
    { label: "Tasa de prioridad", value: indicatorPercent(alerts.length, records.length), note: `${alerts.length} casos para priorizar`, tone: "attention" },
  ];

  kpiGrid.innerHTML = kpis.map((item) => `
    <article class="indicator-kpi-card ${item.tone || ""}">
      <span>${item.label}</span>
      <strong>${item.value}</strong>
      <small>${item.note}</small>
    </article>
  `).join("");

  const funnelStages = [
    { label: "Casos cargados", value: records.length },
    { label: "Encuestas enviadas", value: surveysSent.length },
    { label: "Respuestas de encuesta", value: surveyAnswers.length },
    { label: "Scoring desde encuesta", value: surveyScored.length },
    { label: "Paso desde encuesta", value: surveyPassed.length },
  ];

  funnel.innerHTML = records.length ? funnelStages.map((stage, index) => {
    const base = index === 0 ? records.length : funnelStages[index - 1].value;
    return `
      <article class="funnel-step">
        <span>${stage.label}</span>
        <strong>${stage.value}</strong>
        <small>${index === 0 ? "Base visible" : `${indicatorPercent(stage.value, base)} del paso anterior`}</small>
      </article>
    `;
  }).join("") : '<p class="empty-indicator">No hay casos para los filtros seleccionados.</p>';

  results.innerHTML = indicatorBarsMarkup([
    { label: "Paso", value: passed.length, tone: "success" },
    { label: "Revisar", value: review.length, tone: "warning" },
    { label: "No paso", value: failed.length, tone: "danger" },
  ], scored.length, "Aun no hay scoring resuelto.") + `
    <div class="indicator-inline-note"><strong>${recontacts.length}</strong> requieren recontacto.</div>
  `;

  const signalItems = getIndicatorSignals(answersRegistered);
  signals.innerHTML = signalItems.length
    ? indicatorBarsMarkup(signalItems, answersRegistered.length, "")
    : '<p class="empty-indicator">No se detectaron senales de alerta en las respuestas cargadas.</p>';

  alertsBody.innerHTML = alerts.map(({ record, alert }) => `
    <tr>
      <td><strong>${escapeIndicatorHtml(record.nombre)}</strong><div class="indicator-cell-note">${escapeIndicatorHtml(record.nroSolicitud)}</div></td>
      <td><span class="status-chip indicator-alert-${alert.tone}">${alert.label}</span><div class="indicator-cell-note">${escapeIndicatorHtml(alert.detail)}</div></td>
      <td>${escapeIndicatorHtml(record.responsable || "-")}</td>
      <td><button class="action-button" type="button" data-indicator-record-id="${escapeIndicatorHtml(record.id)}">Gestionar</button></td>
    </tr>
  `).join("") || '<tr><td colspan="4">No hay casos que requieran accion inmediata.</td></tr>';


  if (alertsBody.querySelectorAll) {
    alertsBody.querySelectorAll("[data-indicator-record-id]").forEach((button) => {
      button.addEventListener("click", () => openRecord(button.dataset.indicatorRecordId));
    });
  }
  const advisorMap = new Map();
  records.forEach((record) => {
    const name = normalizeText(record.vendedor) || "Sin asesor";
    if (!advisorMap.has(name)) {
      advisorMap.set(name, { name, total: 0, scored: 0, passed: 0, alerts: 0, ratings: [] });
    }
    const advisor = advisorMap.get(name);
    advisor.total += 1;
    if (isScoringResolved(record)) advisor.scored += 1;
    if (record.resultadoScoring === "Paso") advisor.passed += 1;
    if (getIndicatorAlert(record)) advisor.alerts += 1;
    const rating = Number(record.respuestas?.q8);
    if (normalizeText(record.respuestas?.q8) && Number.isFinite(rating)) advisor.ratings.push(rating);
  });

  const advisors = Array.from(advisorMap.values()).sort((a, b) => b.alerts - a.alerts || b.total - a.total || a.name.localeCompare(b.name));
  advisorsBody.innerHTML = advisors.map((advisor) => {
    const average = advisor.ratings.length
      ? (advisor.ratings.reduce((sum, rating) => sum + rating, 0) / advisor.ratings.length).toFixed(1)
      : "-";
    const passRate = advisor.scored ? `${advisor.passed}/${advisor.scored} (${indicatorPercent(advisor.passed, advisor.scored)})` : "-";
    return `
      <tr>
        <td><strong>${escapeIndicatorHtml(advisor.name)}</strong></td>
        <td>${advisor.total}</td>
        <td>${advisor.scored}</td>
        <td>${passRate}</td>
        <td>${advisor.alerts}</td>
        <td>${average === "-" ? average : `${average} / 5 (${advisor.ratings.length})`}</td>
      </tr>
    `;
  }).join("") || '<tr><td colspan="6">No hay asesores en los registros seleccionados.</td></tr>';
}

function renderRejectedTable() {
  const body = document.getElementById("rejected-table-body");
  if (state.loading) {
    body.innerHTML = '<tr><td colspan="5">Cargando...</td></tr>';
    return;
  }

  const records = rejectedRecords();
  body.innerHTML = records.map((record) => `
    <tr>
      <td>
        <strong>${record.nombre}</strong>
        <div>${record.telefono || "-"}</div>
      </td>
      <td>${record.nroSolicitud}</td>
      <td>${record.vendedor}</td>
      <td>${record.motivoResultado || "-"}</td>
      <td><button class="action-button" type="button" onclick="openRecord('${record.id}')">Ver caso</button></td>
    </tr>
  `).join("") || '<tr><td colspan="5">No hay rechazados.</td></tr>';
}

function renderQueue() {
  const container = document.getElementById("queue-list");
  if (state.loading) {
    container.innerHTML = '<article class="queue-card"><p>Cargando...</p></article>';
    return;
  }

  container.innerHTML = queueRecords().map((record) => `
    <article class="queue-card ${record.id === state.selectedId ? "active" : ""}" onclick="openRecord('${record.id}')">
      <div class="queue-card-top">
        <strong>${record.nombre}</strong>
        ${statusBadge(record.estado)}
      </div>
      <div class="queue-meta">${record.sede} Â· ${record.nroSolicitud}</div>
      <div class="queue-meta">${record.canalScoring} Â· ${record.responsable}</div>
      <div class="queue-meta">${record.proximaAccion}</div>
    </article>
  `).join("") || '<article class="queue-card"><p>Sin casos.</p></article>';
}

function renderCallMode(record) {
  const isCallMode = state.callModeRecordId === record.id;
  document.getElementById("call-mode-off").classList.toggle("hidden", isCallMode);
  document.getElementById("call-mode-on").classList.toggle("hidden", !isCallMode);
  document.getElementById("manual-mode-button").classList.toggle("hidden", isCallMode);
  document.getElementById("contact-flow-note").classList.toggle("hidden", isCallMode);
}

function renderManualStep() {
  const isCallMode = Boolean(state.callModeRecordId);
  const steps = Array.from(document.querySelectorAll(".step-card"));
  steps.forEach((step, index) => {
    step.classList.toggle("active", isCallMode && index === state.currentStep);
  });

  if (!isCallMode) return;

  const progress = ((state.currentStep + 1) / MANUAL_STEPS_TOTAL) * 100;
  document.getElementById("step-progress-bar").style.width = `${progress}%`;
  document.getElementById("step-counter").textContent = state.currentStep < 10
    ? `Pregunta ${state.currentStep + 1} de 10`
    : state.currentStep === 10
      ? "Observaciones"
      : "Resumen";

  document.getElementById("step-prev-button").classList.toggle("hidden", state.currentStep === 0);
  document.getElementById("step-next-button").classList.toggle("hidden", state.currentStep >= MANUAL_STEPS_TOTAL - 1);
  document.getElementById("save-scoring-button").classList.toggle("hidden", state.currentStep < MANUAL_STEPS_TOTAL - 1);
  document.getElementById("calculate-button").classList.toggle("hidden", state.currentStep < 10);
}

function renderDetail() {
  const record = state.records.find((item) => item.id === state.selectedId);
  const empty = document.getElementById("empty-detail");
  const detail = document.getElementById("detail-content");
  if (!record) {
    empty.classList.remove("hidden");
    detail.classList.add("hidden");
    return;
  }

  empty.classList.add("hidden");
  detail.classList.remove("hidden");

  document.getElementById("detail-sede").textContent = `${record.sede} Â· Solicitud ${record.nroSolicitud}`;
  document.getElementById("detail-name").textContent = record.nombre;
  document.getElementById("detail-plan").textContent = `${record.modelo} Â· ${record.vendedor}`;
  document.getElementById("detail-status").outerHTML = statusBadge(record.estado).replace("<span", '<span id="detail-status"');
  document.getElementById("detail-result").outerHTML = resultBadge(record.resultadoScoring).replace("<span", '<span id="detail-result"');
  document.getElementById("detail-owner").textContent = `${record.responsable} Â· ${record.canalScoring}`;

  document.getElementById("detail-contact-lines").innerHTML = `
    <div><strong>Telefono:</strong> ${record.telefono || "-"}</div>
    <div><strong>Mail:</strong> ${record.mail || "-"}</div>
    <div><strong>Monto cuota 2:</strong> ${record.cuotaDos || "-"}</div>
    <div><strong>Pago:</strong> ${record.tipoPago || "-"}</div>
    <div><strong>Observaciones:</strong> ${record.observaciones || "-"}</div>
  `;

  setSelectValue("detail-responsable", record.responsable || state.catalogs.operadores[0] || "Recepcion");
  setSelectValue("detail-canal", record.canalScoring || state.catalogs.canales[0] || "WhatsApp");
  setSelectValue("detail-estado", record.estado || "Nuevo ingreso");
  setSelectValue("detail-proxima", record.proximaAccion || "Preparar contacto");

  const scoringForm = document.getElementById("scoring-form");
  scoringForm.q1.value = record.respuestas?.q1 || "";
  scoringForm.q2.value = record.respuestas?.q2 || "";
  scoringForm.q3.value = record.respuestas?.q3 || "";
  scoringForm.q4.value = record.respuestas?.q4 || "";
  scoringForm.q5.value = record.respuestas?.q5 || "";
  scoringForm.q6.value = record.respuestas?.q6 || "";
  scoringForm.q7.value = record.respuestas?.q7 || "";
  scoringForm.q8.value = record.respuestas?.q8 || "";
  scoringForm.q9.value = record.respuestas?.q9 || "";
  scoringForm.q10.value = record.respuestas?.q10 || "";
  scoringForm.observacionesScoring.value = record.respuestas?.observacionesScoring || "";

  document.getElementById("result-display").value = record.resultadoScoring || "Sin scoring";
  document.getElementById("reason-display").value = record.motivoResultado || "Pendiente";
  document.getElementById("recontact-display").value = record.requiereRecontacto || "No definido";

  document.getElementById("timeline-list").innerHTML = (record.gestiones || []).slice().reverse().map((entry) => `
    <article class="timeline-item">
      <small>${entry.fecha} Â· ${entry.tipo}${entry.responsable ? ` Â· ${entry.responsable}` : ""}</small>
      <p>${entry.detalle}</p>
    </article>
  `).join("") || '<article class="timeline-item"><p>Sin movimientos.</p></article>';

  renderCallMode(record);
  renderManualStep();
}

function setSelectValue(id, value) {
  const element = document.getElementById(id);
  if (element) element.value = value;
}

function nextStatus(current) {
  const index = STATUS_FLOW.indexOf(current);
  if (index === -1 || index === STATUS_FLOW.length - 1) return "Cerrado";
  return STATUS_FLOW[index + 1];
}

function openRecord(id) {
  state.selectedId = id;
  if (state.callModeRecordId && state.callModeRecordId !== id) {
    state.callModeRecordId = null;
    state.currentStep = 0;
  }
  switchView("gestion");
  renderAll();
}

function enableCallMode(id) {
  state.selectedId = id;
  state.callModeRecordId = id;
  state.currentStep = 0;
  switchView("gestion");
  renderAll();
}

function nextManualStep() {
  if (state.currentStep < MANUAL_STEPS_TOTAL - 1) {
    state.currentStep += 1;
    if (state.currentStep === MANUAL_STEPS_TOTAL - 1) {
      calculateScoringFromForm();
    }
    renderManualStep();
  }
}

function prevManualStep() {
  if (state.currentStep > 0) {
    state.currentStep -= 1;
    renderManualStep();
  }
}

async function persistRecord(record, gestion) {
  await apiPostRecords({ action: "updateRecord", record: uiRecordToApiRecord(record) });
  if (gestion) {
    await apiPostRecords({ action: "appendGestion", gestion });
  }
}

async function openWhatsApp(id) {
  const record = state.records.find((item) => item.id === id);
  if (!record) return;
  const phone = normalizePhone(record.telefono);
  if (!phone) {
    notify("Este cliente no tiene telefono valido.");
    return;
  }

  state.callModeRecordId = null;
  state.currentStep = 0;
  const message = encodeURIComponent(`Hola ${record.nombre}, te escribimos de Autosol por tu solicitud ${record.nroSolicitud}. Queremos avanzar con el scoring de tu plan. Te compartimos el acceso: ${record.encuestaLink}`);
  window.open(`https://wa.me/54${phone}?text=${message}`, "_blank");

  const nextRecord = {
    ...record,
    estado: record.estado === "Nuevo ingreso" ? "Encuesta enviada" : record.estado,
    proximaAccion: "Esperar respuesta",
    ultimaGestion: today(),
  };

  const gestion = buildGestionPayload(record.id, "WhatsApp", "Se preparo el mensaje de WhatsApp con acceso a encuesta.", record.responsable);
  await runMutation(() => persistRecord(nextRecord, gestion), "WhatsApp registrado.");
}

async function callClient(id) {
  const record = state.records.find((item) => item.id === id);
  if (!record) return;
  const phone = normalizePhone(record.telefono);
  if (!phone) {
    notify("Este cliente no tiene telefono valido.");
    return;
  }

  enableCallMode(id);
  window.location.href = `tel:+54${phone}`;
  const nextRecord = {
    ...record,
    estado: "Llamada programada",
    proximaAccion: "Llamar hoy",
    ultimaGestion: today(),
    canalScoring: record.canalScoring === "WhatsApp" ? "Hibrido" : "Llamada",
  };

  const gestion = buildGestionPayload(record.id, "Llamada", "Se inicio gestion manual por llamada.", record.responsable);
  await runMutation(() => persistRecord(nextRecord, gestion), "Llamada registrada.");
}

function calculateScoringFromForm() {
  const form = document.getElementById("scoring-form");
  const respuestas = {
    q1: form.q1.value,
    q2: form.q2.value,
    q3: form.q3.value,
    q4: form.q4.value,
    q5: form.q5.value,
    q6: form.q6.value.trim(),
    q7: form.q7.value,
    q8: form.q8.value,
    q9: form.q9.value,
    q10: form.q10.value,
    observacionesScoring: form.observacionesScoring.value.trim(),
  };

  const issues = [];
  let result = "Paso";
  let recontacto = respuestas.q10 === "Si" ? "Si" : "No";

  if (respuestas.q1 === "No") issues.push("P1: no entendia el plan");
  if (respuestas.q2 === "No") issues.push("P2: no le explicaron licitacion");
  if (respuestas.q3 === "No") issues.push("P3: no entendio adjudicacion");
  if (respuestas.q4 === "No" || respuestas.q4 === "Difiere") issues.push("P4: diferencia en cuota 2");
  if (respuestas.q7 === "No") issues.push("P7: no reconoce al vendedor");
  if (parseInt(respuestas.q8 || "5", 10) <= 2) issues.push(`P8: calificacion baja (${respuestas.q8})`);
  if (respuestas.q10 === "Si") issues.push("P10: requiere recontacto");

  if (respuestas.observacionesScoring && /(engano|reclamo|molesto|disconforme|demanda|denuncia)/i.test(respuestas.observacionesScoring)) {
    issues.push("Obs: comentario sensible del cliente");
  }

  if (issues.some((item) => item.startsWith("P7")) || issues.some((item) => item.startsWith("Obs"))) {
    result = "No paso";
    recontacto = "Si";
  } else if (issues.length) {
    result = "Revisar";
  }

  if (!issues.length) issues.push("Sin objeciones");

  const reason = issues.join(" | ");
  document.getElementById("result-display").value = result;
  document.getElementById("reason-display").value = reason;
  document.getElementById("recontact-display").value = recontacto;
  return { respuestas, result, reason, recontacto };
}

async function saveScoring(event) {
  event.preventDefault();
  if (!state.selectedId) return;
  const record = state.records.find((item) => item.id === state.selectedId);
  if (!record) return;

  const scoring = calculateScoringFromForm();
  const nextRecord = {
    ...record,
    respuestas: scoring.respuestas,
    resultadoScoring: scoring.result,
    motivoResultado: scoring.reason,
    requiereRecontacto: scoring.recontacto,
    estado: scoring.result === "Paso" ? "Cerrado" : "Scoring en proceso",
    proximaAccion: scoring.result === "Paso" ? "Caso cerrado" : "Revisar scoring",
    ultimaGestion: today(),
    canalScoring: record.canalScoring === "WhatsApp" ? "Hibrido" : "Llamada",
  };

  const gestion = buildGestionPayload(record.id, "Scoring", `Se guardo scoring con resultado ${scoring.result}. ${scoring.reason}.`, record.responsable);
  await runMutation(() => persistRecord(nextRecord, gestion), "Scoring guardado con exito.");
}

async function saveOperationalChanges() {
  if (!state.selectedId) return;
  const record = state.records.find((item) => item.id === state.selectedId);
  if (!record) return;

  const updates = {
    ...record,
    responsable: document.getElementById("detail-responsable").value,
    canalScoring: document.getElementById("detail-canal").value,
    estado: document.getElementById("detail-estado").value,
    proximaAccion: document.getElementById("detail-proxima").value,
    ultimaGestion: today(),
  };

  const gestion = buildGestionPayload(record.id, "Operacion", `Operacion actualizada. Estado: ${updates.estado}. Proxima: ${updates.proximaAccion}.`, updates.responsable);
  await runMutation(() => persistRecord(updates, gestion), "Operacion guardada.");
}

async function advanceSelectedStatus() {
  const record = state.records.find((item) => item.id === state.selectedId);
  if (!record) return;
  const next = nextStatus(record.estado);
  const nextRecord = {
    ...record,
    estado: next,
    ultimaGestion: today(),
    proximaAccion: next === "Cerrado" ? "Caso cerrado" : "Continuar",
  };

  const gestion = buildGestionPayload(record.id, "Estado", `Avanzo a ${next}.`, record.responsable);
  await runMutation(() => persistRecord(nextRecord, gestion), "Estado actualizado.");
}

async function addTimelineNote() {
  if (!state.selectedId) return;
  const record = state.records.find((item) => item.id === state.selectedId);
  if (!record) return;

  const textarea = document.getElementById("timeline-note");
  const note = textarea.value.trim();
  if (!note) return;

  const nextRecord = { ...record, ultimaGestion: today() };
  const gestion = buildGestionPayload(record.id, "Seguimiento", note, record.responsable);
  await runMutation(() => persistRecord(nextRecord, gestion), "Nota agregada.");
  textarea.value = "";
}

async function copySurveyLink() {
  const record = state.records.find((item) => item.id === state.selectedId);
  if (!record) return;
  try {
    await navigator.clipboard.writeText(record.encuestaLink);
    notify("Link copiado.");
  } catch (error) {
    notify("No se pudo copiar el link.");
  }
}

function openSurvey() {
  const record = state.records.find((item) => item.id === state.selectedId);
  if (!record) return;
  window.open(record.encuestaLink, "_blank");
}

function exportCsv() {
  const headers = ["NOMBRE", "SOLICITUD", "ASESOR", "RESPONSABLE", "CANAL", "ESTADO", "RESULTADO", "MOTIVO"];
  const rows = allVisibleRecords().map((record) => [
    record.nombre,
    record.nroSolicitud,
    record.vendedor,
    record.responsable,
    record.canalScoring,
    record.estado,
    record.resultadoScoring,
    record.motivoResultado,
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell || "").replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `scoring-center-${today()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

async function createRecord(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  const nombre = normalizeUpper(data.get("nombre"));
  const nroSolicitud = normalizeText(data.get("nroSolicitud"));

  const record = {
    id: uid(),
    sede: data.get("sede"),
    fecha: normalizeDateInput(data.get("fecha")) || today(),
    fechaVenta: normalizeDateInput(data.get("fechaVenta")),
    nombre,
    dni: normalizeText(data.get("dni")),
    fechaNacimiento: normalizeDateInput(data.get("fechaNacimiento")),
    domicilio: normalizeText(data.get("domicilio")),
    mail: normalizeUpper(data.get("mail")),
    telefono: normalizeText(data.get("telefono")),
    modelo: normalizeText(data.get("modelo")),
    tipoPago: normalizeText(data.get("tipoPago")),
    nroSolicitud,
    nroCliente: normalizeText(data.get("nroCliente")),
    primeraCuota: normalizeText(data.get("primeraCuota")),
    importePrimera: normalizeText(data.get("importePrimera")),
    saldoPrimera: normalizeText(data.get("saldoPrimera")),
    cuotaDos: normalizeText(data.get("cuotaDos")),
    vendedor: normalizeUpper(data.get("vendedor")),
    observaciones: normalizeText(data.get("observaciones")),
    siac: isAffirmative(data.get("siac")),
    tmk: isAffirmative(data.get("tmk")),
    salesforce: isAffirmative(data.get("salesforce")),
    finalizadas: isAffirmative(data.get("finalizadas")),
    responsable: data.get("responsable"),
    canalScoring: data.get("canalScoring"),
    estado: data.get("estado"),
    proximaAccion: data.get("proximaAccion"),
    resultadoScoring: "Sin scoring",
    motivoResultado: "Pendiente de gestion",
    requiereRecontacto: "No definido",
    ultimaGestion: today(),
    encuestaLink: buildSurveyLink(nroSolicitud, nombre),
    respuestas: {},
    creadoEn: new Date().toISOString(),
  };

  const gestion = buildGestionPayload(record.id, "Carga", "Se dio de alta la solicitud.", record.responsable);

  await runMutation(async () => {
    await apiPostRecords({ action: "createRecord", record: uiRecordToApiRecord(record) });
    await apiPostRecords({ action: "appendGestion", gestion });
  }, "Solicitud creada.");

  form.reset();
  form.sede.value = "Jujuy";
  getFormField("fecha").value = today();
  getFormField("proximaAccion").value = "Enviar encuesta";
  getFormField("estado").value = "Pendiente contacto";
  getFormField("responsable").value = state.catalogs.operadores[0] || "Recepcion";
  getFormField("canalScoring").value = state.catalogs.canales[0] || "WhatsApp";
  state.selectedId = record.id;
  state.callModeRecordId = null;
  state.currentStep = 0;
  switchView("gestion");
}

function fillDemo() {
  const form = document.getElementById("solicitud-form");
  form.sede.value = "Salta";
  getFormField("fecha").value = today();
  getFormField("responsable").value = state.catalogs.operadores[0] || "Recepcion";
  form.nroSolicitud.value = "1200555";
  form.nombre.value = "SANCHEZ LORENA CAROLINA";
  form.telefono.value = "3875123456";
  form.mail.value = "LORENA.CAROLINA@MAIL.COM";
  form.modelo.value = "AMAROK PLAN EXCLUSIVO 70-30";
  form.vendedor.value = "MARIANO PEREZ";
  form.cuotaDos.value = "$445.000";
  form.tipoPago.value = "VISA MACRO";
  form.observaciones.value = "Cliente con interes en entrega temprana.";
  getFormField("canalScoring").value = "WhatsApp";
  getFormField("proximaAccion").value = "Enviar encuesta";
  getFormField("estado").value = "Pendiente contacto";
}

function switchView(view) {
  state.currentView = view;
  document.querySelectorAll(".nav-tab").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === view);
  });
  document.querySelectorAll(".view").forEach((section) => {
    section.classList.toggle("active", section.id === `view-${view}`);
  });
}

function renderBoardSegments() {
  document.querySelectorAll("[data-board-filter]").forEach((button) => {
    button.classList.toggle("active", button.dataset.boardFilter === state.boardFilter);
  });
}

function renderAll() {
  renderMetrics();
  renderBoardSegments();
  renderTable();
  renderSurveySummary();
  renderSurveyTable();
  renderIndicators();
  renderRejectedTable();
  renderQueue();
  renderDetail();
}

function jumpToBoardFilter(filter) {
  state.boardFilter = filter;
  state.statusFilter = "Todas";
  document.getElementById("status-filter").value = "Todas";
  switchView("pendientes");
  renderAll();
}

function openNextPending() {
  const nextRecord = findNextPendingRecord();
  if (!nextRecord) {
    notify("No hay casos pendientes.");
    return;
  }
  openRecord(nextRecord.id);
}

function bindEvents() {
  document.querySelectorAll(".nav-tab").forEach((button) => {
    button.addEventListener("click", () => switchView(button.dataset.view));
  });

  document.querySelectorAll("[data-board-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      state.boardFilter = button.dataset.boardFilter;
      renderAll();
    });
  });

  document.getElementById("global-sede-filter").addEventListener("change", (event) => {
    state.sedeFilter = event.target.value;
    renderAll();
  });

  document.getElementById("global-operator-filter").addEventListener("change", (event) => {
    state.operatorFilter = event.target.value;
    renderAll();
  });

  document.getElementById("status-filter").addEventListener("change", (event) => {
    state.statusFilter = event.target.value;
    renderAll();
  });

  document.getElementById("search-input").addEventListener("input", (event) => {
    state.search = event.target.value;
    renderAll();
  });

  document.getElementById("queue-filter").addEventListener("change", (event) => {
    state.queueFilter = event.target.value;
    renderAll();
  });

  document.getElementById("solicitud-form").addEventListener("submit", createRecord);
  document.getElementById("fill-demo-button").addEventListener("click", fillDemo);
  document.getElementById("calculate-button").addEventListener("click", () => {
    calculateScoringFromForm();
    if (state.currentStep < MANUAL_STEPS_TOTAL - 1) {
      state.currentStep = MANUAL_STEPS_TOTAL - 1;
      renderManualStep();
    }
  });
  document.getElementById("scoring-form").addEventListener("submit", saveScoring);
  document.getElementById("save-ops-button").addEventListener("click", saveOperationalChanges);
  document.getElementById("advance-status-button").addEventListener("click", advanceSelectedStatus);
  document.getElementById("add-note-button").addEventListener("click", addTimelineNote);
  document.getElementById("copy-link-button").addEventListener("click", copySurveyLink);
  document.getElementById("open-survey-button").addEventListener("click", openSurvey);
  document.getElementById("send-whatsapp-button").addEventListener("click", () => openWhatsApp(state.selectedId));
  document.getElementById("call-button").addEventListener("click", () => callClient(state.selectedId));
  document.getElementById("manual-mode-button").addEventListener("click", () => {
    if (state.selectedId) enableCallMode(state.selectedId);
  });
  document.getElementById("step-next-button").addEventListener("click", nextManualStep);
  document.getElementById("step-prev-button").addEventListener("click", prevManualStep);
  document.getElementById("export-button").addEventListener("click", exportCsv);
  document.getElementById("refresh-button").addEventListener("click", () => refreshData().catch((error) => notify(error.message || error)));
  document.getElementById("take-next-button").addEventListener("click", openNextPending);
  document.getElementById("open-contact-button").addEventListener("click", () => jumpToBoardFilter("Pendiente contacto"));
  document.getElementById("open-sent-button").addEventListener("click", () => jumpToBoardFilter("Encuesta enviada"));
}

async function initApp() {
  bindEvents();
  applyCatalogs({ operadores: DEFAULT_OPERATORS, canales: DEFAULT_CHANNELS });
  const fechaField = getFormField("fecha");
  if (fechaField) fechaField.value = today();
  renderAll();
  try {
    await refreshData();
  } catch (error) {
    state.loading = false;
    renderAll();
    console.error(error);
    notify(`No pude conectar la app con Sheets. ${error.message || error}`);
  }
}

initApp();

window.openRecord = openRecord;
window.openWhatsApp = openWhatsApp;
window.callClient = callClient;
