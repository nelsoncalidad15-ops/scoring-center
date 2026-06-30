const STORAGE_KEY = "autosol_scoring_center_v2";
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

const seedData = [
  {
    id: uid(),
    sede: "Jujuy",
    fecha: "2025-12-06",
    fechaVenta: "2025-12-06",
    nombre: "BONILLA JEREMIAS JULIAN",
    dni: "42814423",
    fechaNacimiento: "1995-12-28",
    domicilio: "80 VIVIENDA MZA D CASA 5",
    mail: "JEREMIASSM58@HOTMAIL.COM",
    telefono: "3873642560",
    modelo: "TERA 70-30 ADJ ASEG CTA 8/12/24",
    tipoPago: "VISA NARANJA",
    nroSolicitud: "1196609",
    nroCliente: "59543",
    primeraCuota: "",
    importePrimera: "",
    saldoPrimera: "",
    cuotaDos: "",
    vendedor: "ENZO BRANCICH",
    observaciones: "Cliente cargado por recepcion. Sin contacto aun.",
    siac: true,
    tmk: true,
    salesforce: true,
    finalizadas: true,
    responsable: "Recepcion",
    canalScoring: "WhatsApp",
    estado: "Pendiente contacto",
    proximaAccion: "Enviar encuesta",
    resultadoScoring: "Sin scoring",
    motivoResultado: "Pendiente de gestion",
    requiereRecontacto: "No definido",
    ultimaGestion: "2026-06-29",
    encuestaLink: buildSurveyLink("1196609", "BONILLA JEREMIAS JULIAN"),
    respuestas: {},
    gestiones: [
      { fecha: "2026-06-29 10:05", tipo: "Carga", detalle: "Recepcion ingreso la solicitud y la dejo lista para contacto." },
    ],
    creadoEn: "2026-06-29T10:05:00",
  },
  {
    id: uid(),
    sede: "Jujuy",
    fecha: "2025-12-15",
    fechaVenta: "2025-12-13",
    nombre: "CHIHAN GILDA NATALIA",
    dni: "27699927",
    fechaNacimiento: "1980-02-03",
    domicilio: "B EL HUAICO MZ 521A CASA 15",
    mail: "NATALIACHIHAN@GMAIL.COM",
    telefono: "3874157657",
    modelo: "TERA 70-30 ADJ ASEG CTA 8/12/24",
    tipoPago: "VISA MACRO",
    nroSolicitud: "1197485",
    nroCliente: "131390",
    primeraCuota: "",
    importePrimera: "",
    saldoPrimera: "",
    cuotaDos: "$427.501",
    vendedor: "MARCOS CORBALAN",
    observaciones: "Bonificacion 1.000.000 en patentamiento.",
    siac: true,
    tmk: true,
    salesforce: true,
    finalizadas: true,
    responsable: "Contact Center 1",
    canalScoring: "WhatsApp",
    estado: "Encuesta enviada",
    proximaAccion: "Esperar respuesta",
    resultadoScoring: "Sin scoring",
    motivoResultado: "Encuesta enviada y pendiente de respuesta",
    requiereRecontacto: "No definido",
    ultimaGestion: "2026-06-29",
    encuestaLink: buildSurveyLink("1197485", "CHIHAN GILDA NATALIA"),
    respuestas: {},
    gestiones: [
      { fecha: "2026-06-29 09:14", tipo: "WhatsApp", detalle: "Se envio el primer mensaje con acceso a encuesta." },
    ],
    creadoEn: "2026-06-29T09:10:00",
  },
  {
    id: uid(),
    sede: "Salta",
    fecha: "2025-12-22",
    fechaVenta: "2025-12-22",
    nombre: "RODRIGUEZ RICARDO ROBERTO",
    dni: "27267199",
    fechaNacimiento: "1979-04-19",
    domicilio: "BARRIO POLICIAL CALLE 25 DE MAYO",
    mail: "RICHARDRODRIG123@GMAIL.COM",
    telefono: "3877418103",
    modelo: "TERA 70-30 ADJ ASEG CTA 8/12/24",
    tipoPago: "VISA GALICIA",
    nroSolicitud: "1198466",
    nroCliente: "131469",
    primeraCuota: "",
    importePrimera: "",
    saldoPrimera: "",
    cuotaDos: "$427.501",
    vendedor: "ARIEL GALLARDO",
    observaciones: "Beneficio para gastos de entrega y primer service gratis.",
    siac: true,
    tmk: true,
    salesforce: true,
    finalizadas: true,
    responsable: "Contact Center 2",
    canalScoring: "Llamada",
    estado: "Scoring en proceso",
    proximaAccion: "Cerrar scoring",
    resultadoScoring: "Revisar",
    motivoResultado: "Faltan aclaraciones sobre adjudicacion y cuota 2.",
    requiereRecontacto: "Si",
    ultimaGestion: "2026-06-29",
    encuestaLink: buildSurveyLink("1198466", "RODRIGUEZ RICARDO ROBERTO"),
    respuestas: {
      q1: "Si",
      q2: "Parcial",
      q3: "No recuerda",
      q4: "Difiere",
      q5: "Si",
      q6: "VISA GALICIA",
      q7: "Si",
      q8: "3",
      q9: "Si",
      q10: "Si",
      observacionesScoring: "Pide revisar adjudicacion y dice que la cuota 2 no le quedo clara.",
    },
    gestiones: [
      { fecha: "2026-06-29 11:35", tipo: "Llamada", detalle: "Se realizo llamada y se tomo scoring parcial. Quedaron dudas de cuota 2." },
      { fecha: "2026-06-29 12:20", tipo: "Seguimiento", detalle: "Se marco recontacto por parte del asesor comercial." },
    ],
    creadoEn: "2026-06-29T11:20:00",
  },
];

const state = {
  records: loadRecords(),
  currentView: "dashboard",
  sedeFilter: "Todas",
  operatorFilter: "Todos",
  statusFilter: "Todas",
  search: "",
  queueFilter: "Activos",
  selectedId: null,
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

function loadRecords() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seedData));
    return [...seedData];
  }
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? parsed : [...seedData];
  } catch (error) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seedData));
    return [...seedData];
  }
}

function saveRecords() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.records));
}

function filteredRecords() {
  return state.records.filter((record) => {
    const bySede = state.sedeFilter === "Todas" || record.sede === state.sedeFilter;
    const byOperator = state.operatorFilter === "Todos" || record.responsable === state.operatorFilter;
    const byStatus = state.statusFilter === "Todas" || record.estado === state.statusFilter;
    const query = state.search.trim().toLowerCase();
    const haystack = `${record.nombre} ${record.dni} ${record.nroSolicitud} ${record.vendedor} ${record.modelo}`.toLowerCase();
    const bySearch = !query || haystack.includes(query);
    return bySede && byOperator && byStatus && bySearch;
  });
}

function queueRecords() {
  let records = filteredRecords();
  if (state.queueFilter === "Activos") records = records.filter((record) => record.estado !== "Cerrado");
  if (["WhatsApp", "Llamada", "Hibrido"].includes(state.queueFilter)) records = records.filter((record) => record.canalScoring === state.queueFilter);
  return records.sort((a, b) => STATUS_FLOW.indexOf(a.estado) - STATUS_FLOW.indexOf(b.estado));
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-AR").format(date);
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

function renderDashboard() {
  const records = filteredRecords();
  const stats = [
    { label: "Solicitudes visibles", value: records.length, hint: "Base filtrada por sede y operador" },
    { label: "Pendiente contacto", value: records.filter((r) => r.estado === "Pendiente contacto").length, hint: "Listas para mover hoy" },
    { label: "Encuesta enviada", value: records.filter((r) => r.estado === "Encuesta enviada").length, hint: "Esperando respuesta del cliente" },
    { label: "Scoring en proceso", value: records.filter((r) => r.estado === "Scoring en proceso").length, hint: "Casos abiertos para gestionar" },
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
      <p><strong>Proxima accion:</strong> ${record.proximaAccion}</p>
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

  const strip = [
    "Nuevo ingreso",
    "Pendiente contacto",
    "Encuesta enviada",
    "Scoring en proceso",
    "Cerrado",
  ];
  document.getElementById("pipeline-strip").innerHTML = strip.map((status) => `
    <article class="pipeline-card">
      <p class="eyebrow">${status}</p>
      <strong>${records.filter((r) => r.estado === status).length}</strong>
      <p>${pipelineHint(status)}</p>
    </article>
  `).join("");
}

function pipelineHint(status) {
  if (status === "Nuevo ingreso") return "Recien cargadas por recepcion.";
  if (status === "Pendiente contacto") return "Pendientes de primer movimiento.";
  if (status === "Encuesta enviada") return "Con link y a la espera de respuesta.";
  if (status === "Scoring en proceso") return "Con gestion humana en curso.";
  return "Casos listos para archivo o control.";
}

function renderTable() {
  const body = document.getElementById("solicitudes-table-body");
  body.innerHTML = filteredRecords().map((record) => `
    <tr>
      <td>${record.sede}</td>
      <td>
        <strong>${record.nombre}</strong>
        <div>${record.dni}</div>
        <div>${record.nroSolicitud}</div>
      </td>
      <td>${record.modelo}</td>
      <td>${record.vendedor}</td>
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
  `).join("") || '<tr><td colspan="8">No hay solicitudes para este filtro.</td></tr>';
}

function renderQueue() {
  const container = document.getElementById("queue-list");
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

  setSelectValue("detail-responsable", record.responsable || "Recepcion");
  setSelectValue("detail-canal", record.canalScoring || "WhatsApp");
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
      <small>${entry.fecha} · ${entry.tipo}</small>
      <p>${entry.detalle}</p>
    </article>
  `).join("") || '<article class="timeline-item"><p>Sin movimientos registrados.</p></article>';
}

function openRecord(id) {
  state.selectedId = id;
  switchView("gestion");
  renderQueue();
  renderDetail();
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

function openWhatsApp(id) {
  const record = state.records.find((item) => item.id === id);
  if (!record) return;
  const phone = normalizePhone(record.telefono);
  const message = encodeURIComponent(`Hola ${record.nombre}, te escribimos de Autosol por tu solicitud ${record.nroSolicitud}. Queremos avanzar con el scoring de tu plan. Te compartimos el acceso: ${record.encuestaLink}`);
  if (!phone) return;
  window.open(`https://wa.me/54${phone}?text=${message}`, "_blank");
  pushGestion(id, "WhatsApp", "Se preparo el mensaje de WhatsApp con acceso a encuesta.");
  patchRecord(id, { estado: record.estado === "Nuevo ingreso" ? "Encuesta enviada" : record.estado, proximaAccion: "Esperar respuesta", ultimaGestion: today() });
}

function callClient(id) {
  const record = state.records.find((item) => item.id === id);
  if (!record) return;
  const phone = normalizePhone(record.telefono);
  if (!phone) return;
  window.location.href = `tel:+54${phone}`;
  pushGestion(id, "Llamada", "Se disparo una llamada desde la mesa operativa.");
  patchRecord(id, { estado: "Llamada programada", proximaAccion: "Llamar hoy", ultimaGestion: today(), canalScoring: record.canalScoring === "WhatsApp" ? "Hibrido" : record.canalScoring });
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

function patchRecord(id, updates) {
  state.records = state.records.map((record) => record.id === id ? { ...record, ...updates } : record);
  saveRecords();
  renderAll();
}

function pushGestion(id, tipo, detalle) {
  state.records = state.records.map((record) => {
    if (record.id !== id) return record;
    const gestiones = Array.isArray(record.gestiones) ? [...record.gestiones] : [];
    gestiones.push({ fecha: nowStamp(), tipo, detalle });
    return { ...record, gestiones };
  });
  saveRecords();
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

function saveScoring(event) {
  event.preventDefault();
  if (!state.selectedId) return;
  const scoring = calculateScoringFromForm();
  state.records = state.records.map((record) => {
    if (record.id !== state.selectedId) return record;
    return {
      ...record,
      respuestas: scoring.respuestas,
      resultadoScoring: scoring.result,
      motivoResultado: scoring.reason,
      requiereRecontacto: scoring.recontacto,
      estado: scoring.result === "Paso" ? "Cerrado" : "Scoring en proceso",
      proximaAccion: scoring.result === "Paso" ? "Caso cerrado" : "Cerrar scoring",
      ultimaGestion: today(),
    };
  });
  pushGestion(state.selectedId, "Scoring", `Se guardo scoring con resultado ${scoring.result}. Motivo: ${scoring.reason}.`);
  saveRecords();
  renderAll();
}

function saveOperationalChanges() {
  if (!state.selectedId) return;
  const updates = {
    responsable: document.getElementById("detail-responsable").value,
    canalScoring: document.getElementById("detail-canal").value,
    estado: document.getElementById("detail-estado").value,
    proximaAccion: document.getElementById("detail-proxima").value,
    ultimaGestion: today(),
  };
  patchRecord(state.selectedId, updates);
  pushGestion(state.selectedId, "Operacion", `Se actualizaron datos operativos. Estado: ${updates.estado}. Proxima accion: ${updates.proximaAccion}.`);
}

function advanceSelectedStatus() {
  const record = state.records.find((item) => item.id === state.selectedId);
  if (!record) return;
  const next = nextStatus(record.estado);
  patchRecord(record.id, { estado: next, ultimaGestion: today(), proximaAccion: next === "Cerrado" ? "Caso cerrado" : "Continuar gestion" });
  pushGestion(record.id, "Estado", `El caso avanzo a ${next}.`);
}

function addTimelineNote() {
  if (!state.selectedId) return;
  const textarea = document.getElementById("timeline-note");
  const note = textarea.value.trim();
  if (!note) return;
  pushGestion(state.selectedId, "Seguimiento", note);
  textarea.value = "";
  renderAll();
}

function copySurveyLink() {
  const record = state.records.find((item) => item.id === state.selectedId);
  if (!record) return;
  navigator.clipboard.writeText(record.encuestaLink);
  pushGestion(record.id, "Link", "Se copio el link de encuesta para compartir al cliente.");
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

function createRecord(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  const nombre = String(data.get("nombre") || "").trim().toUpperCase();
  const nroSolicitud = String(data.get("nroSolicitud") || "").trim();
  const record = {
    id: uid(),
    sede: data.get("sede"),
    fecha: data.get("fecha"),
    fechaVenta: data.get("fechaVenta"),
    nombre,
    dni: String(data.get("dni") || "").trim(),
    fechaNacimiento: data.get("fechaNacimiento"),
    domicilio: String(data.get("domicilio") || "").trim(),
    mail: String(data.get("mail") || "").trim().toUpperCase(),
    telefono: String(data.get("telefono") || "").trim(),
    modelo: String(data.get("modelo") || "").trim(),
    tipoPago: String(data.get("tipoPago") || "").trim(),
    nroSolicitud,
    nroCliente: String(data.get("nroCliente") || "").trim(),
    primeraCuota: String(data.get("primeraCuota") || "").trim(),
    importePrimera: String(data.get("importePrimera") || "").trim(),
    saldoPrimera: String(data.get("saldoPrimera") || "").trim(),
    cuotaDos: String(data.get("cuotaDos") || "").trim(),
    vendedor: String(data.get("vendedor") || "").trim().toUpperCase(),
    observaciones: String(data.get("observaciones") || "").trim(),
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
    gestiones: [
      { fecha: nowStamp(), tipo: "Carga", detalle: "Se dio de alta la solicitud desde la pantalla de recepcion." },
    ],
    creadoEn: new Date().toISOString(),
  };
  state.records.unshift(record);
  saveRecords();
  form.reset();
  form.sede.value = "Jujuy";
  form.canalScoring.value = "WhatsApp";
  form.proximaAccion.value = "Preparar contacto";
  form.estado.value = "Nuevo ingreso";
  state.selectedId = record.id;
  renderAll();
  switchView("gestion");
}

function fillDemo() {
  const form = document.getElementById("solicitud-form");
  form.sede.value = "Salta";
  form.fecha.value = today();
  form.fechaVenta.value = today();
  form.responsable.value = "Recepcion";
  form.nombre.value = "SANCHEZ LORENA CAROLINA";
  form.dni.value = "30111222";
  form.fechaNacimiento.value = "1987-10-14";
  form.domicilio.value = "BARRIO GRAND BOURG 245";
  form.telefono.value = "3875123456";
  form.mail.value = "LORENA.CAROLINA@MAIL.COM";
  form.canalScoring.value = "Hibrido";
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
    dashboard: "Panel operativo",
    carga: "Nueva solicitud",
    solicitudes: "Base de solicitudes",
    gestion: "Mesa de scoring",
  }[view];
}

function renderAll() {
  renderDashboard();
  renderTable();
  renderQueue();
  renderDetail();
}

function bindEvents() {
  document.querySelectorAll(".nav-item").forEach((button) => {
    button.addEventListener("click", () => switchView(button.dataset.view));
  });
  document.querySelectorAll("[data-quick-nav]").forEach((button) => {
    button.addEventListener("click", () => switchView(button.dataset.quickNav));
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
}

bindEvents();
renderAll();

window.openRecord = openRecord;
window.openWhatsApp = openWhatsApp;
window.callClient = callClient;
