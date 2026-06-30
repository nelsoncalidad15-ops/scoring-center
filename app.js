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

const state = {
  records: [],
  currentView: "dashboard",
  sedeFilter: "Todas",
  operatorFilter: "Todos",
  statusFilter: "Todas",
  boardFilter: "Todos",
  search: "",
  queueFilter: "Activos",
  selectedId: null,
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
  return [true, "true", "TRUE", "SI", "Si", "si", "X", "x", 1, "1"].includes(value);
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
    const haystack = `${record.nombre} ${record.dni} ${record.nroSolicitud} ${record.vendedor} ${record.modelo}`.toLowerCase();
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

function queueRecords() {
  let records = allVisibleRecords();
  if (state.queueFilter === "Activos") records = records.filter((record) => record.estado !== "Cerrado");
  if (["WhatsApp", "Llamada", "Hibrido"].includes(state.queueFilter)) records = records.filter((record) => record.canalScoring === state.queueFilter);
  return records.sort((a, b) => STATUS_FLOW.indexOf(a.estado) - STATUS_FLOW.indexOf(b.estado));
}

function findNextPendingRecord() {
  return allVisibleRecords()
    .filter((record) => ["Pendiente contacto", "Nuevo ingreso", "Llamada programada", "Scoring en proceso"].includes(record.estado))
    .sort((a, b) => STATUS_FLOW.indexOf(a.estado) - STATUS_FLOW.indexOf(b.estado))[0] || null;
}

function formatStatusHint(status) {
  if (status === "Pendiente contacto") return "Primera accion pendiente";
  if (status === "Encuesta enviada") return "Esperando respuesta del cliente";
  if (status === "Llamada programada") return "Listo para contacto telefonico";
  if (status === "Scoring en proceso") return "Tiene puntos para revisar";
  if (status === "Cerrado") return "Caso finalizado";
  return "Alta recien ingresada";
}

function renderDashboard() {
  const records = allVisibleRecords();
  const stats = [
    { label: "Solicitudes visibles", value: records.length, hint: "Base filtrada por sede y responsable" },
    { label: "Por contactar", value: records.filter((r) => ["Nuevo ingreso", "Pendiente contacto"].includes(r.estado)).length, hint: "Casos para mover ahora" },
    { label: "Encuesta enviada", value: records.filter((r) => r.estado === "Encuesta enviada").length, hint: "Pendientes de respuesta" },
    { label: "En revision", value: records.filter((r) => r.estado === "Scoring en proceso").length, hint: "Necesitan cierre u observacion" },
  ];

  document.getElementById("stat-grid").innerHTML = stats.map((item) => `
    <article class="stat-card">
      <p class="eyebrow">${item.label}</p>
      <strong>${item.value}</strong>
      <span>${item.hint}</span>
    </article>
  `).join("");

  const priorityList = records
    .filter((r) => r.estado !== "Cerrado")
    .sort((a, b) => STATUS_FLOW.indexOf(a.estado) - STATUS_FLOW.indexOf(b.estado))
    .slice(0, 5);

  document.getElementById("priority-list").innerHTML = priorityList.map((record) => `
    <article class="stack-card">
      <h4>${record.nombre}</h4>
      <p>${record.sede} · ${record.nroSolicitud} · ${record.canalScoring}</p>
      <p><strong>Estado:</strong> ${record.estado}</p>
      <p><strong>Proxima accion:</strong> ${record.proximaAccion}</p>
      <button class="action-button" type="button" onclick="openRecord('${record.id}')">Abrir caso</button>
    </article>
  `).join("") || '<article class="stack-card"><h4>Sin pendientes</h4><p>No hay casos activos con los filtros actuales.</p></article>';

  const recent = [...records]
    .flatMap((record) => (record.gestiones || []).map((entry) => ({ ...entry, nombre: record.nombre, solicitud: record.nroSolicitud })))
    .sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)))
    .slice(0, 5);

  document.getElementById("recent-list").innerHTML = recent.map((entry) => `
    <article class="stack-card">
      <h4>${entry.nombre}</h4>
      <p>${entry.fecha} · Solicitud ${entry.solicitud}</p>
      <p>${entry.detalle}</p>
    </article>
  `).join("") || '<article class="stack-card"><h4>Sin actividad</h4><p>Todavia no hay movimientos guardados.</p></article>';

  const newest = [...records]
    .sort((a, b) => String(b.creadoEn || "").localeCompare(String(a.creadoEn || "")))
    .slice(0, 4);

  document.getElementById("new-records-list").innerHTML = newest.map((record) => `
    <article class="stack-card">
      <h4>${record.nombre}</h4>
      <p>${record.sede} · ${record.nroSolicitud}</p>
      <p><strong>Ingreso:</strong> ${record.fecha || "-"}</p>
      <p><strong>Canal sugerido:</strong> ${record.canalScoring}</p>
    </article>
  `).join("") || '<article class="stack-card"><h4>Sin ingresos</h4><p>No hay altas recientes para mostrar.</p></article>';

  const strip = ["Nuevo ingreso", "Pendiente contacto", "Encuesta enviada", "Scoring en proceso", "Cerrado"];
  document.getElementById("pipeline-strip").innerHTML = strip.map((status) => `
    <article class="pipeline-card">
      <p class="eyebrow">${status}</p>
      <strong>${records.filter((r) => r.estado === status).length}</strong>
      <p>${formatStatusHint(status)}</p>
    </article>
  `).join("");
}

function renderBoardSummary() {
  const records = filteredRecords();
  const summary = [
    {
      title: "Casos visibles",
      value: records.length,
      hint: "Con tus filtros actuales",
    },
    {
      title: "Accion inmediata",
      value: records.filter((record) => ["Nuevo ingreso", "Pendiente contacto", "Llamada programada"].includes(record.estado)).length,
      hint: "WhatsApp o llamada",
    },
    {
      title: "En seguimiento",
      value: records.filter((record) => ["Encuesta enviada", "Scoring en proceso"].includes(record.estado)).length,
      hint: "Esperando o revisando",
    },
  ];

  document.getElementById("board-summary").innerHTML = summary.map((item) => `
    <article class="summary-card">
      <p class="eyebrow">${item.title}</p>
      <strong>${item.value}</strong>
      <p>${item.hint}</p>
    </article>
  `).join("");
}

function renderTable() {
  const body = document.getElementById("solicitudes-table-body");
  if (state.loading) {
    body.innerHTML = '<tr><td colspan="9">Cargando solicitudes...</td></tr>';
    return;
  }

  const records = filteredRecords();
  body.innerHTML = records.map((record) => `
    <tr>
      <td>${record.sede}</td>
      <td>
        <strong>${record.nombre}</strong>
        <div>${record.dni}</div>
        <div>${record.nroSolicitud}</div>
      </td>
      <td>${record.modelo}</td>
      <td>${record.vendedor}</td>
      <td>${record.responsable}</td>
      <td>${record.canalScoring}</td>
      <td>${statusBadge(record.estado)}</td>
      <td>${resultBadge(record.resultadoScoring)}</td>
      <td>
        <div class="row-actions">
          <button class="whatsapp-button" type="button" onclick="openWhatsApp('${record.id}')">WhatsApp</button>
          <button class="call-button" type="button" onclick="callClient('${record.id}')">Llamar</button>
          <button class="action-button" type="button" onclick="openRecord('${record.id}')">Gestionar</button>
        </div>
      </td>
    </tr>
  `).join("") || '<tr><td colspan="9">No hay solicitudes para este filtro.</td></tr>';
}

function renderQueue() {
  const container = document.getElementById("queue-list");
  if (state.loading) {
    container.innerHTML = '<article class="queue-card"><h4>Cargando</h4><p>Traemos la base desde Sheets.</p></article>';
    return;
  }

  container.innerHTML = queueRecords().map((record) => `
    <article class="queue-card ${record.id === state.selectedId ? "active" : ""}" onclick="openRecord('${record.id}')">
      <div class="queue-card-top">
        <div>
          <h4>${record.nombre}</h4>
          <div class="queue-meta">${record.sede} · ${record.nroSolicitud}</div>
        </div>
        ${statusBadge(record.estado)}
      </div>
      <p class="queue-meta">${record.canalScoring} · ${record.responsable}</p>
      <p class="queue-meta"><strong>Proxima:</strong> ${record.proximaAccion}</p>
      <p class="queue-meta"><strong>Resultado:</strong> ${record.resultadoScoring}</p>
    </article>
  `).join("") || '<article class="queue-card"><h4>Sin casos</h4><p>No hay registros en la cola actual.</p></article>';
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
  document.getElementById("detail-sede").textContent = `${record.sede} · Solicitud ${record.nroSolicitud}`;
  document.getElementById("detail-name").textContent = record.nombre;
  document.getElementById("detail-plan").textContent = `${record.modelo} · Vendedor ${record.vendedor}`;
  document.getElementById("detail-status").outerHTML = statusBadge(record.estado).replace("<span", '<span id="detail-status"');
  document.getElementById("detail-result").outerHTML = resultBadge(record.resultadoScoring).replace("<span", '<span id="detail-result"');
  document.getElementById("detail-owner").textContent = `${record.responsable} · ${record.canalScoring}`;
  document.getElementById("detail-contact-lines").innerHTML = `
    <div><strong>Telefono:</strong> ${record.telefono || "-"}</div>
    <div><strong>Mail:</strong> ${record.mail || "-"}</div>
    <div><strong>DNI:</strong> ${record.dni || "-"}</div>
    <div><strong>Ultima gestion:</strong> ${record.ultimaGestion || "-"}</div>
    <div><strong>Observaciones:</strong> ${record.observaciones || "Sin observaciones"}</div>
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
      <small>${entry.fecha} · ${entry.tipo}${entry.responsable ? ` · ${entry.responsable}` : ""}</small>
      <p>${entry.detalle}</p>
    </article>
  `).join("") || '<article class="timeline-item"><p>Sin movimientos registrados.</p></article>';
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
  switchView("gestion");
  renderQueue();
  renderDetail();
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

  const message = encodeURIComponent(`Hola ${record.nombre}, te escribimos de Autosol por tu solicitud ${record.nroSolicitud}. Queremos avanzar con el scoring de tu plan. Te compartimos el acceso: ${record.encuestaLink}`);
  window.open(`https://wa.me/54${phone}?text=${message}`, "_blank");

  const nextRecord = {
    ...record,
    estado: record.estado === "Nuevo ingreso" ? "Encuesta enviada" : record.estado,
    proximaAccion: "Esperar respuesta",
    ultimaGestion: today(),
  };

  const gestion = buildGestionPayload(record.id, "WhatsApp", "Se preparo el mensaje de WhatsApp con acceso a encuesta.", record.responsable);
  await runMutation(() => persistRecord(nextRecord, gestion), "WhatsApp listo y gestion guardada.");
}

async function callClient(id) {
  const record = state.records.find((item) => item.id === id);
  if (!record) return;
  const phone = normalizePhone(record.telefono);
  if (!phone) {
    notify("Este cliente no tiene telefono valido.");
    return;
  }

  window.location.href = `tel:+54${phone}`;
  const nextRecord = {
    ...record,
    estado: "Llamada programada",
    proximaAccion: "Llamar hoy",
    ultimaGestion: today(),
    canalScoring: record.canalScoring === "WhatsApp" ? "Hibrido" : record.canalScoring,
  };

  const gestion = buildGestionPayload(record.id, "Llamada", "Se disparo una llamada desde la mesa operativa.", record.responsable);
  await runMutation(() => persistRecord(nextRecord, gestion), "Llamada registrada en la ficha.");
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

  if ([respuestas.q1, respuestas.q2, respuestas.q3, respuestas.q4].includes("No")) {
    result = "Revisar";
    issues.push("Informacion comercial no del todo clara");
  }
  if (respuestas.q4 === "Difiere") {
    result = "Revisar";
    issues.push("Diferencia detectada en cuota 2");
  }
  if (respuestas.q7 === "No") {
    result = "No paso";
    recontacto = "Si";
    issues.push("No reconoce correctamente al vendedor");
  }
  if (parseInt(respuestas.q8 || "5", 10) <= 2) {
    result = result === "Paso" ? "Revisar" : result;
    recontacto = "Si";
    issues.push("Calificacion baja al vendedor");
  }
  if (respuestas.observacionesScoring && /(engano|reclamo|molesto|disconforme|demanda|denuncia)/i.test(respuestas.observacionesScoring)) {
    result = "No paso";
    recontacto = "Si";
    issues.push("Observacion sensible del cliente");
  }
  if (!issues.length) issues.push("Validacion general conforme");

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
    proximaAccion: scoring.result === "Paso" ? "Caso cerrado" : "Cerrar scoring",
    ultimaGestion: today(),
  };

  const gestion = buildGestionPayload(record.id, "Scoring", `Se guardo scoring con resultado ${scoring.result}. Motivo: ${scoring.reason}.`, record.responsable);
  await runMutation(() => persistRecord(nextRecord, gestion), "Scoring guardado en Sheets.");
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

  const gestion = buildGestionPayload(record.id, "Operacion", `Se actualizaron datos operativos. Estado: ${updates.estado}. Proxima accion: ${updates.proximaAccion}.`, updates.responsable);
  await runMutation(() => persistRecord(updates, gestion), "Cambios operativos guardados.");
}

async function advanceSelectedStatus() {
  const record = state.records.find((item) => item.id === state.selectedId);
  if (!record) return;
  const next = nextStatus(record.estado);
  const nextRecord = {
    ...record,
    estado: next,
    ultimaGestion: today(),
    proximaAccion: next === "Cerrado" ? "Caso cerrado" : "Continuar gestion",
  };

  const gestion = buildGestionPayload(record.id, "Estado", `El caso avanzo a ${next}.`, record.responsable);
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
  await runMutation(() => persistRecord(nextRecord, gestion), "Movimiento agregado al historial.");
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
  const headers = [
    "SEDE", "FECHA", "NOMBRE", "DNI", "TELEFONO", "MAIL", "PLAN", "TIPO_PAGO", "NRO_SOLICITUD", "NRO_CLIENTE", "VENDEDOR", "RESPONSABLE", "CANAL", "ESTADO", "PROXIMA_ACCION", "RESULTADO_SCORING", "MOTIVO_RESULTADO", "OBSERVACIONES"
  ];
  const rows = filteredRecords().map((record) => [
    record.sede,
    record.fecha,
    record.nombre,
    record.dni,
    record.telefono,
    record.mail,
    record.modelo,
    record.tipoPago,
    record.nroSolicitud,
    record.nroCliente,
    record.vendedor,
    record.responsable,
    record.canalScoring,
    record.estado,
    record.proximaAccion,
    record.resultadoScoring,
    record.motivoResultado,
    record.observaciones,
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
    fecha: normalizeDateInput(data.get("fecha")),
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
    siac: data.has("siac"),
    tmk: data.has("tmk"),
    salesforce: data.has("salesforce"),
    finalizadas: data.has("finalizadas"),
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

  const gestion = buildGestionPayload(record.id, "Carga", "Se dio de alta la solicitud desde la pantalla de recepcion.", record.responsable);

  await runMutation(async () => {
    await apiPostRecords({ action: "createRecord", record: uiRecordToApiRecord(record) });
    await apiPostRecords({ action: "appendGestion", gestion });
  }, "Solicitud creada en Sheets.");

  form.reset();
  form.sede.value = "Jujuy";
  form.proximaAccion.value = "Preparar contacto";
  form.estado.value = "Nuevo ingreso";
  getFormField("responsable").value = state.catalogs.operadores[0] || "Recepcion";
  getFormField("canalScoring").value = state.catalogs.canales[0] || "WhatsApp";
  state.selectedId = record.id;
  switchView("gestion");
}

function fillDemo() {
  const form = document.getElementById("solicitud-form");
  form.sede.value = "Salta";
  form.fecha.value = today();
  form.fechaVenta.value = today();
  getFormField("responsable").value = state.catalogs.operadores[0] || "Recepcion";
  form.nombre.value = "SANCHEZ LORENA CAROLINA";
  form.dni.value = "30111222";
  form.fechaNacimiento.value = "1987-10-14";
  form.domicilio.value = "BARRIO GRAND BOURG 245";
  form.telefono.value = "3875123456";
  form.mail.value = "LORENA.CAROLINA@MAIL.COM";
  getFormField("canalScoring").value = "Hibrido";
  form.modelo.value = "AMAROK PLAN EXCLUSIVO 70-30";
  form.tipoPago.value = "VISA MACRO";
  form.nroSolicitud.value = "1200555";
  form.nroCliente.value = "145220";
  form.primeraCuota.value = "$125.000";
  form.importePrimera.value = "$125.000";
  form.saldoPrimera.value = "$0";
  form.cuotaDos.value = "$445.000";
  form.vendedor.value = "MARIANO PEREZ";
  form.proximaAccion.value = "Enviar encuesta";
  form.estado.value = "Pendiente contacto";
  form.observaciones.value = "Cliente con interes en entrega temprana y consulta por bonificacion de patentamiento.";
}

function switchView(view) {
  state.currentView = view;
  document.querySelectorAll(".nav-item").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === view);
  });
  document.querySelectorAll(".view").forEach((section) => {
    section.classList.toggle("active", section.id === `view-${view}`);
  });

  document.getElementById("view-title").textContent = {
    dashboard: "Resumen operativo",
    carga: "Nueva solicitud",
    solicitudes: "Bandeja operativa",
    gestion: "Gestionar caso",
  }[view];
}

function renderBoardSegments() {
  document.querySelectorAll("[data-board-filter]").forEach((button) => {
    button.classList.toggle("active", button.dataset.boardFilter === state.boardFilter);
  });
}

function renderAll() {
  renderDashboard();
  renderBoardSegments();
  renderBoardSummary();
  renderTable();
  renderQueue();
  renderDetail();
}

function jumpToBoardFilter(filter) {
  state.boardFilter = filter;
  state.statusFilter = "Todas";
  document.getElementById("status-filter").value = "Todas";
  switchView("solicitudes");
  renderAll();
}

function openNextPending() {
  const nextRecord = findNextPendingRecord();
  if (!nextRecord) {
    notify("No hay casos pendientes con los filtros actuales.");
    return;
  }
  openRecord(nextRecord.id);
}

function bindEvents() {
  document.querySelectorAll(".nav-item").forEach((button) => {
    button.addEventListener("click", () => switchView(button.dataset.view));
  });

  document.querySelectorAll("[data-quick-nav]").forEach((button) => {
    button.addEventListener("click", () => switchView(button.dataset.quickNav));
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
  document.getElementById("calculate-button").addEventListener("click", calculateScoringFromForm);
  document.getElementById("scoring-form").addEventListener("submit", saveScoring);
  document.getElementById("save-ops-button").addEventListener("click", saveOperationalChanges);
  document.getElementById("advance-status-button").addEventListener("click", advanceSelectedStatus);
  document.getElementById("add-note-button").addEventListener("click", addTimelineNote);
  document.getElementById("copy-link-button").addEventListener("click", copySurveyLink);
  document.getElementById("open-survey-button").addEventListener("click", openSurvey);
  document.getElementById("send-whatsapp-button").addEventListener("click", () => openWhatsApp(state.selectedId));
  document.getElementById("call-button").addEventListener("click", () => callClient(state.selectedId));
  document.getElementById("export-button").addEventListener("click", exportCsv);
  document.getElementById("refresh-button").addEventListener("click", () => refreshData().catch((error) => notify(error.message || error)));
  document.getElementById("take-next-button").addEventListener("click", openNextPending);
  document.getElementById("open-pending-button").addEventListener("click", () => jumpToBoardFilter("Pendiente contacto"));
  document.getElementById("open-survey-sent-button").addEventListener("click", () => jumpToBoardFilter("Encuesta enviada"));
  document.getElementById("open-review-button").addEventListener("click", () => jumpToBoardFilter("Scoring en proceso"));
}

async function initApp() {
  bindEvents();
  applyCatalogs({ operadores: DEFAULT_OPERATORS, canales: DEFAULT_CHANNELS });
  renderAll();
  try {
    await refreshData();
  } catch (error) {
    state.loading = false;
    renderAll();
    console.error(error);
    notify(`No pude conectar la app con Sheets. Revisemos APPS_SCRIPT_URL, BACKEND_SECRET y el deploy del Apps Script. Detalle: ${error.message || error}`);
  }
}

initApp();

window.openRecord = openRecord;
window.openWhatsApp = openWhatsApp;
window.callClient = callClient;
