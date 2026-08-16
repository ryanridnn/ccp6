import { buildSeed } from "../sample-data.js";

const _SVC = (() => {
  const p = location.pathname.split("/");
  return p[1] === "services-preview" ? p[2] : "";
})();

var preview = {
  serviceId: _SVC,
  params: new URLSearchParams(location.search),
  go(viewId, extra = {}) {
    const next = new URLSearchParams();
    next.set("view", viewId);
    for (const [k, v] of Object.entries(extra)) {
      if (v == null || v === "") next.delete(k);
      else next.set(k, String(v));
    }
    location.href = `/services-preview/${this.serviceId}?${next.toString()}`;
  },
};

const ALL_JOBS = buildSeed();

const SERVICE_FIELD_DEFS = [
  { key: "preset_svc_start", label: "PRESET SVC START", field: "startTime", format: (v) => fmtTime(v) },
  { key: "preset_svc_finish", label: "PRESET SVC FINISH", field: "finishTime", format: (v) => fmtTime(v) },
  { key: "preset_svc_hts", label: "PRESET SVC HTS °C", field: "startTempHorsDoeuvre", format: (v) => fmtTemp(v) },
  { key: "preset_svc_htf", label: "PRESET SVC HTF °C", field: "finishTempHorsDoeuvre", format: (v) => fmtTemp(v) },
  { key: "preset_svc_dts", label: "PRESET SVC DTS °C", field: "startTempDessert", format: (v) => fmtTemp(v) },
  { key: "preset_svc_dtf", label: "PRESET SVC DTF °C", field: "finishTempDessert", format: (v) => fmtTemp(v) },
  { key: "preset_svc_duration", label: "PRESET SVC DURATION", field: "exposureDurationMin", format: (v) => v != null ? `${v} min` : "—" },
  { key: "preset_svc_status", label: "PRESET SVC STATUS", field: "complianceResult", format: (v, svc) => v || (svc.startTime ? (svc.finishTime ? "Finished" : "In Progress") : "Not Started") },
];

const ITEM_FIELD_DEFS = [
  { key: "preset_item_sku", label: "PRESET ITEM SKU", field: "sku", format: (v) => v ?? "—" },
  { key: "preset_item_desc", label: "PRESET ITEM DESCRIPTION", field: "item_description", format: (v) => v ?? "—" },
  { key: "preset_item_class", label: "PRESET ITEM CLASS", field: "class", format: (v) => v ?? "—" },
  { key: "preset_item_qty", label: "PRESET ITEM QTY", field: "quantity", format: (v) => v ?? "—" },
  { key: "preset_item_start", label: "PRESET ITEM START", field: "startTime", format: (v) => fmtTime(v) },
  { key: "preset_item_finish", label: "PRESET ITEM FINISH", field: "finishTime", format: (v) => fmtTime(v) },
  { key: "preset_item_start_temp", label: "PRESET ITEM START °C", field: "startTemp", format: (v) => fmtTemp(v) },
  { key: "preset_item_finish_temp", label: "PRESET ITEM FINISH °C", field: "finishTemp", format: (v) => fmtTemp(v) },
  { key: "preset_item_duration", label: "PRESET ITEM DURATION", field: "durationMin", format: (v) => v != null ? `${v} min` : "—" },
  { key: "preset_item_status", label: "PRESET ITEM STATUS", field: "complianceResult", format: (v, it) => v || (it.startTime ? (it.finishTime ? "Finished" : "In Progress") : "Not Started") },
];

const FOOD_CHECKER_FIELD_DEFS = [
  { key: "fc_item_sku", label: "FC ITEM SKU", field: "sku", format: (v) => v ?? "—" },
  { key: "fc_item_desc", label: "FC ITEM DESCRIPTION", field: "item_description", format: (v) => v ?? "—" },
  { key: "fc_item_class", label: "FC ITEM CLASS", field: "class", format: (v) => v ?? "—" },
  { key: "fc_item_qty", label: "FC ITEM QTY", field: "quantity", format: (v) => v ?? "—" },
  { key: "fc_item_start", label: "FC ITEM START", field: "startTime", format: (v) => fmtTime(v) },
  { key: "fc_item_finish", label: "FC ITEM FINISH", field: "finishTime", format: (v) => fmtTime(v) },
  { key: "fc_item_start_temp", label: "FC ITEM START °C", field: "startTemp", format: (v) => fmtTemp(v) },
  { key: "fc_item_finish_temp", label: "FC ITEM FINISH °C", field: "finishTemp", format: (v) => fmtTemp(v) },
  { key: "fc_item_duration", label: "FC ITEM DURATION", field: "durationMin", format: (v) => v != null ? `${v} min` : "—" },
  { key: "fc_item_status", label: "FC ITEM STATUS", field: "complianceResult", format: (v, it) => v || (it.startTime ? (it.finishTime ? "Finished" : "In Progress") : "Not Started") },
];

const PRESET_DISPATCH_FIELD_DEFS = [
  { key: "preset_dispatch_start", label: "PRESET DISPATCH COLD SOAK START", field: "coldSoakStart", format: (v) => fmtTime(v) },
  { key: "preset_dispatch_exit", label: "PRESET DISPATCH BEFORE EXIT", field: "beforeExitTime", format: (v) => fmtTime(v) },
  { key: "preset_dispatch_duration", label: "PRESET DISPATCH DURATION", field: "coldSoakDurationMin", format: (v) => v != null ? `${v} min` : "—" },
  { key: "preset_dispatch_status", label: "PRESET DISPATCH STATUS", field: "status", format: (v) => v ?? "—" },
  { key: "preset_dispatch_compliance", label: "PRESET DISPATCH COMPLIANCE", field: "complianceResult", format: (v) => v ?? "—" },
  { key: "preset_dispatch_temps", label: "PRESET DISPATCH TEMPS", field: "beforeExitTemps", format: (v) => formatTempsObject(v) },
];

const FC_DISPATCH_FIELD_DEFS = [
  { key: "fc_dispatch_start", label: "FC DISPATCH COLD SOAK START", field: "coldSoakStart", format: (v) => fmtTime(v) },
  { key: "fc_dispatch_exit", label: "FC DISPATCH BEFORE EXIT", field: "beforeExitTime", format: (v) => fmtTime(v) },
  { key: "fc_dispatch_duration", label: "FC DISPATCH DURATION", field: "coldSoakDurationMin", format: (v) => v != null ? `${v} min` : "—" },
  { key: "fc_dispatch_status", label: "FC DISPATCH STATUS", field: "status", format: (v) => v ?? "—" },
  { key: "fc_dispatch_compliance", label: "FC DISPATCH COMPLIANCE", field: "complianceResult", format: (v) => v ?? "—" },
  { key: "fc_dispatch_temps", label: "FC DISPATCH TEMPS", field: "beforeExitTemps", format: (v) => formatTempsObject(v) },
];

const SIGNOFF_FIELD_DEFS = [
  { key: "preset_signoff_user", label: "PRESET SIGNOFF USER", stage: "preset" },
  { key: "fc_signoff_user", label: "FC SIGNOFF USER", stage: "foodchecker" },
  { key: "dispatch_signoff_user", label: "DISPATCH SIGNOFF USER", stage: "dispatch" },
];

const COLUMN_DEFS = [
  { key: "job_id", label: "JOB ID" },
  { key: "flight_number", label: "FLIGHT NUMBER" },
  { key: "flight_date", label: "FLIGHT DATE" },
  { key: "etd", label: "ETD" },
  { key: "meal_service", label: "MEAL SERVICE" },
  { key: "ta_group", label: "GROUP" },
  { key: "airline", label: "AIRLINE" },
  { key: "preset", label: "PRESET RESULT" },
  { key: "foodchecker", label: "FOOD CHECKER SUMMARY" },
  { key: "dispatch", label: "DISPATCH RESULT" },
  { key: "overall", label: "OVERALL COMPLIANCE" },
  { key: "verification_status", label: "VERIFICATION STATUS" },
  { key: "status", label: "JOB STATUS" },
  { key: "closedAt", label: "CLOSED TIMESTAMP" },
  { key: "trays_handled", label: "TRAYS / MEALS HANDLED" },
  { key: "staff_count", label: "NO OF STAFF" },
  ...SERVICE_FIELD_DEFS,
  ...ITEM_FIELD_DEFS,
  ...FOOD_CHECKER_FIELD_DEFS,
  ...PRESET_DISPATCH_FIELD_DEFS,
  ...FC_DISPATCH_FIELD_DEFS,
  ...SIGNOFF_FIELD_DEFS,
  { key: "actions", label: "ACTIONS" },
];

let visibleColumns = new Set(
  COLUMN_DEFS.filter((c) =>
    !SERVICE_FIELD_DEFS.some((s) => s.key === c.key) &&
    !ITEM_FIELD_DEFS.some((i) => i.key === c.key) &&
    !FOOD_CHECKER_FIELD_DEFS.some((f) => f.key === c.key) &&
    !PRESET_DISPATCH_FIELD_DEFS.some((d) => d.key === c.key) &&
    !FC_DISPATCH_FIELD_DEFS.some((d) => d.key === c.key) &&
    !SIGNOFF_FIELD_DEFS.some((s) => s.key === c.key)
  ).map((c) => c.key)
);

let dateFilterState = {
  range: "3",
  label: "Last 3 Months",
  startDate: null,
  endDate: null,
  viewDate: new Date(),
  rangeSelecting: false,
};

const PRESET_LABELS = {
  mtd: "Month to Date",
  30: "Last 30 Days",
  3: "Last 3 Months",
  6: "Last 6 Months",
  12: "Last 1 Year",
  36: "Last 3 Years",
  60: "Last 5 Year",
};

// ── Helpers ──────────────────────────────────────────────────────────
function esc(v) {
  return String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[c],
  );
}

function pill(label, cls) {
  return `<span class="status-pill ${cls}">${esc(label)}</span>`;
}

function pillClass(result) {
  if (result === "Compliant") return "compliant";
  if (result === "Non-Compliant") return "nc";
  if (result === "In Progress") return "in-progress";
  if (result === "Overtime") return "overtime";
  if (result === "Warning") return "warning";
  if (result === "Verified") return "compliant";
  if (result === "Not Verified") return "not-started";
  return "not-started";
}

function stageResult(job, stage) {
  if (stage === "preset") {
    const p = job.preset;
    if (p.status === "Submitted")
      return p.complianceResult === "Compliant" ? "Compliant" : "Non-Compliant";
    const services = p.services || [];
    if (services.some((s) => s.startTime && !s.finishTime))
      return "In Progress";
    if (services.some((s) => s.finishTime)) return "In Progress";
    return "Not Started";
  }
  if (stage === "foodchecker") {
    const items = job.foodChecker?.items || [];
    if (!items.length) return "Not Started";
    const finished = items.filter((i) => i.complianceResult);
    if (finished.length === items.length)
      return items.every((i) => i.complianceResult === "Compliant")
        ? "Compliant"
        : "Non-Compliant";
    return items.some((i) => i.startTime) ? "In Progress" : "Not Started";
  }
  if (stage === "dispatch") {
    const d = job.dispatch;
    if (!d) return "—";
    if (d.complianceResult) return d.complianceResult;
    return d.status === "ColdSoak" ? "In Progress" : "Not Started";
  }
  return "—";
}

function overallCompliance(job) {
  const results = ["preset", "foodchecker", "dispatch"]
    .map((s) => stageResult(job, s))
    .filter((r) => r !== "—" && r !== "Not Started");
  if (results.some((r) => r === "Non-Compliant")) return "Non-Compliant";
  if (results.length > 0 && results.every((r) => r === "Compliant"))
    return "Compliant";
  if (results.some((r) => r === "In Progress")) return "In Progress";
  return "Not Started";
}

function verificationStatus(job) {
  return job.signoffs?.length > 0 ? "Verified" : "Not Verified";
}

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function fmtTemp(v) {
  return v != null ? `${v}°C` : "—";
}

function formatServiceFieldList(job, fieldDef) {
  const services = job.preset?.services || [];
  if (!services.length) return "—";
  return `<ul class="service-list">${services.map((svc) => `<li>${fieldDef.format(svc[fieldDef.field], svc)}</li>`).join("")}</ul>`;
}

function formatItemFieldList(job, fieldDef) {
  const items = job.preset?.items || [];
  if (!items.length) return "—";
  return `<ul class="service-list">${items.map((it) => `<li>${fieldDef.format(it[fieldDef.field], it)}</li>`).join("")}</ul>`;
}

function formatFoodCheckerFieldList(job, fieldDef) {
  const items = job.foodChecker?.items || [];
  if (!items.length) return "—";
  return `<ul class="service-list">${items.map((it) => `<li>${fieldDef.format(it[fieldDef.field], it)}</li>`).join("")}</ul>`;
}

function formatTempsObject(temps) {
  if (!temps || !Object.keys(temps).length) return "—";
  return `<ul class="service-list">${Object.entries(temps).map(([name, temp]) => `<li>${name}: ${temp}°C</li>`).join("")}</ul>`;
}

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function applyDateRange(months) {
  const end = endOfDay(new Date());
  const start = new Date();
  if (months === "mtd") {
    start.setDate(1);
  } else if (months === "30") {
    start.setDate(start.getDate() - 30);
  } else {
    start.setMonth(start.getMonth() - parseInt(months, 10));
  }
  dateFilterState = {
    range: String(months),
    label: PRESET_LABELS[months],
    startDate: startOfDay(start),
    endDate: end,
    viewDate: new Date(),
    rangeSelecting: false,
  };
}

function getCellValue(job, key) {
  if (key === "preset") return stageResult(job, "preset");
  if (key === "foodchecker") return stageResult(job, "foodchecker");
  if (key === "dispatch") return stageResult(job, "dispatch");
  if (key === "overall") return overallCompliance(job);
  if (key === "verification_status") return verificationStatus(job);
  if (key === "status")
    return job.job_status || (job.closed ? "Closed" : "Open");
  if (key === "closedAt") return formatDate(job.closedAt);
  if (key === "trays_handled") return job.preset?.traysHandled ?? "—";
  if (key === "staff_count") return job.preset?.staffCount ?? "—";
  const serviceField = SERVICE_FIELD_DEFS.find((s) => s.key === key);
  if (serviceField) return formatServiceFieldList(job, serviceField);
  const itemField = ITEM_FIELD_DEFS.find((i) => i.key === key);
  if (itemField) return formatItemFieldList(job, itemField);
  const foodCheckerField = FOOD_CHECKER_FIELD_DEFS.find((f) => f.key === key);
  if (foodCheckerField) return formatFoodCheckerFieldList(job, foodCheckerField);
  const presetDispatchField = PRESET_DISPATCH_FIELD_DEFS.find((d) => d.key === key);
  if (presetDispatchField) {
    const dispatch = job.dispatchPreset;
    return dispatch ? presetDispatchField.format(dispatch[presetDispatchField.field]) : "—";
  }
  const fcDispatchField = FC_DISPATCH_FIELD_DEFS.find((d) => d.key === key);
  if (fcDispatchField) {
    const dispatch = job.dispatchFC;
    return dispatch ? fcDispatchField.format(dispatch[fcDispatchField.field]) : "—";
  }
  const signoffField = SIGNOFF_FIELD_DEFS.find((s) => s.key === key);
  if (signoffField) {
    const signoff = (job.signoffs || []).find((s) => s.stage === signoffField.stage);
    return signoff ? `${signoff.staffName ?? "—"} (${signoff.staffId ?? "—"})` : "—";
  }
  if (key === "actions") return "";
  return job[key] ?? "—";
}

function goToCurrent() {
  preview.go("pv-5czmym");
}

function matchesFilters(job) {
  const q = (document.getElementById("table-search")?.value || "")
    .trim()
    .toLowerCase();
  if (q) {
    const haystack = [
      job.job_id,
      job.flight_number,
      job.airline,
      job.ta_group,
      job.meal_service,
    ]
      .map((v) => String(v ?? "").toLowerCase())
      .join(" ");
    if (!haystack.includes(q)) return false;
  }

  const filters = Array.from(document.querySelectorAll(".col-filter"));
  for (const f of filters) {
    const val = f.value.trim().toLowerCase();
    if (!val) continue;
    const col = f.dataset.col;
    const cell = String(getCellValue(job, col)).toLowerCase();
    if (!cell.includes(val)) return false;
  }

  if (dateFilterState.startDate && dateFilterState.endDate && job.createdAt) {
    const created = new Date(job.createdAt);
    if (
      created < dateFilterState.startDate ||
      created > dateFilterState.endDate
    )
      return false;
  }

  return true;
}

function filteredJobs() {
  return ALL_JOBS.filter(matchesFilters);
}

// ── Render ───────────────────────────────────────────────────────────
function renderColumnsPanel() {
  const list = document.getElementById("columns-list");
  if (!list) return;
  const q = (document.getElementById("column-search")?.value || "")
    .trim()
    .toLowerCase();
  const defs = COLUMN_DEFS.filter((c) =>
    c.label.toLowerCase().includes(q),
  );
  list.innerHTML = defs
    .map((c) => {
      const checked = visibleColumns.has(c.key) ? "checked" : "";
      return `
      <label class="column-toggle">
        <input type="checkbox" ${checked} onchange="toggleColumn('${c.key}', this.checked)" />
        ${esc(c.label)}
      </label>
    `;
    })
    .join("");
}

function selectAllColumns() {
  const q = (document.getElementById("column-search")?.value || "")
    .trim()
    .toLowerCase();
  COLUMN_DEFS.filter((c) => c.label.toLowerCase().includes(q)).forEach(
    (c) => visibleColumns.add(c.key),
  );
  renderColumnsPanel();
  renderTable();
}

function deselectAllColumns() {
  const q = (document.getElementById("column-search")?.value || "")
    .trim()
    .toLowerCase();
  COLUMN_DEFS.filter((c) => c.label.toLowerCase().includes(q)).forEach(
    (c) => visibleColumns.delete(c.key),
  );
  renderColumnsPanel();
  renderTable();
}

function renderTable() {
  // Update column visibility in header
  document.querySelectorAll(".data-table thead th[data-col]").forEach((th) => {
    const col = th.dataset.col;
    const filters = document.querySelectorAll(
      `.header-filters th[data-col="${col}"]`,
    );
    const show = visibleColumns.has(col);
    th.style.display = show ? "" : "none";
    filters.forEach((f) => (f.style.display = show ? "" : "none"));
  });

  const rows = filteredJobs();
  const tbody = document.getElementById("job-tbody");
  if (!tbody) return;

  if (!rows.length) {
    const colspan = visibleColumns.size;
    tbody.innerHTML = `<tr><td colspan="${colspan}"><div class="empty-state">No jobs match your search.</div></td></tr>`;
    return;
  }

  tbody.innerHTML = rows
    .map((j) => {
      const cells = COLUMN_DEFS.map((c) => {
        if (!visibleColumns.has(c.key)) return "";
        const val = getCellValue(j, c.key);
        if (["preset", "foodchecker", "dispatch", "overall", "verification_status"].includes(c.key)) {
          return `<td>${pill(val, pillClass(val))}</td>`;
        }
        if (c.key === "actions") {
          return `<td>
            <span class="link-icon" onclick="openJob('${esc(j.job_id)}')" title="Open job">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            </span>
          </td>`;
        }
        if (SERVICE_FIELD_DEFS.some((s) => s.key === c.key) || ITEM_FIELD_DEFS.some((i) => i.key === c.key) || FOOD_CHECKER_FIELD_DEFS.some((f) => f.key === c.key) || PRESET_DISPATCH_FIELD_DEFS.some((d) => d.key === c.key) || FC_DISPATCH_FIELD_DEFS.some((d) => d.key === c.key) || SIGNOFF_FIELD_DEFS.some((s) => s.key === c.key)) {
          return `<td>${val}</td>`;
        }
        return `<td>${esc(val)}</td>`;
      }).join("");

      return `<tr>${cells}</tr>`;
    })
    .join("");
}

// ── Actions ────────────────────────────────────────────────────────────
function toggleColumns() {
  const panel = document.getElementById("columns-panel");
  if (!panel) return;
  panel.classList.toggle("hidden");
  if (!panel.classList.contains("hidden")) renderColumnsPanel();
}

function toggleColumn(key, isVisible) {
  if (isVisible) visibleColumns.add(key);
  else visibleColumns.delete(key);
  renderTable();
}

// ── Date filter ──────────────────────────────────────────────────────
function toggleDateFilter() {
  const panel = document.getElementById("date-filter-panel");
  if (!panel) return;
  const opening = panel.classList.contains("hidden");
  if (opening) {
    dateFilterState.viewDate = dateFilterState.endDate
      ? new Date(dateFilterState.endDate)
      : new Date();
  }
  panel.classList.toggle("hidden");
  if (opening) renderCalendar();
}

function applyPresetRange(months) {
  applyDateRange(months);
  updateDateFilterLabel();
  renderCalendar();
  renderTable();
  toggleDateFilter();
}

function updateDateFilterLabel() {
  const label = document.getElementById("date-filter-label");
  if (label) label.textContent = dateFilterState.label;
}

function isDateInRange(date) {
  if (!dateFilterState.startDate) return false;
  const start = startOfDay(dateFilterState.startDate);
  const end = dateFilterState.endDate
    ? endOfDay(dateFilterState.endDate)
    : start;
  const d = startOfDay(date);
  return d >= start && d <= end;
}

function isSameDate(a, b) {
  if (!a || !b) return false;
  return startOfDay(a).toDateString() === startOfDay(b).toDateString();
}

function renderCalendar() {
  const monthSelect = document.getElementById("calendar-month");
  const yearSelect = document.getElementById("calendar-year");
  const daysContainer = document.getElementById("calendar-days");
  if (!monthSelect || !yearSelect || !daysContainer) return;

  // Populate month/year selects
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  monthSelect.innerHTML = months
    .map(
      (m, i) =>
        `<option value="${i}" ${i === dateFilterState.viewDate.getMonth() ? "selected" : ""}>${m}</option>`,
    )
    .join("");

  const currentYear = new Date().getFullYear();
  const years = [];
  for (let y = currentYear - 10; y <= currentYear + 2; y++) years.push(y);
  yearSelect.innerHTML = years
    .map(
      (y) =>
        `<option value="${y}" ${y === dateFilterState.viewDate.getFullYear() ? "selected" : ""}>${y}</option>`,
    )
    .join("");

  // Build days grid
  const year = dateFilterState.viewDate.getFullYear();
  const month = dateFilterState.viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const today = new Date();
  let html = "";

  function renderDay(day, monthOffset, isOutside) {
    const actualMonth = month + monthOffset;
    const date = new Date(year, actualMonth, day);
    const classes = ["calendar-day"];
    if (isOutside) classes.push("outside");
    if (isSameDate(date, today)) classes.push("today");
    if (isSameDate(date, dateFilterState.startDate))
      classes.push("selected", "range-start");
    if (isSameDate(date, dateFilterState.endDate))
      classes.push("selected", "range-end");
    if (!isOutside && isDateInRange(date)) classes.push("in-range");
    if (
      !isOutside &&
      dateFilterState.rangeSelecting &&
      dateFilterState.startDate &&
      isSameDate(date, dateFilterState.startDate)
    ) {
      classes.push("selected");
    }
    const dateAttr = isOutside
      ? ""
      : `data-date="${year}-${actualMonth}-${day}"`;
    return `<button type="button" class="${classes.join(" ")}" ${dateAttr}>${day}</button>`;
  }

  // Previous month trailing days
  for (let i = firstDay - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    html += renderDay(day, 0, true);
  }

  // Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    html += renderDay(day, 0, false);
  }

  // Next month trailing days
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
  const remaining = totalCells - firstDay - daysInMonth;
  for (let day = 1; day <= remaining; day++) {
    html += renderDay(day, 1, true);
  }

  daysContainer.innerHTML = html;

  // Update active preset in UI
  document.querySelectorAll(".preset-option").forEach((btn) => {
    btn.classList.toggle(
      "active",
      btn.getAttribute("onclick")?.includes(`'${dateFilterState.range}'`),
    );
  });
}

function changeMonth(delta) {
  dateFilterState.viewDate.setMonth(
    dateFilterState.viewDate.getMonth() + delta,
  );
  renderCalendar();
}

function selectDate(year, month, day) {
  const selected = startOfDay(new Date(year, month, day));

  if (!dateFilterState.rangeSelecting || !dateFilterState.startDate) {
    // First click: set start date only, wait for finish date
    dateFilterState = {
      ...dateFilterState,
      range: "custom",
      label: selected.toLocaleDateString("en-GB"),
      startDate: selected,
      endDate: null,
      viewDate: new Date(selected),
      rangeSelecting: true,
    };
    updateDateFilterLabel();
    renderCalendar();
    return;
  }

  // Second click: confirm or adjust end date and close
  let start = dateFilterState.startDate;
  let end = endOfDay(new Date(year, month, day));
  let label;
  if (selected < start) {
    [start, end] = [selected, endOfDay(start)];
    label = `${start.toLocaleDateString("en-GB")} - ${dateFilterState.startDate.toLocaleDateString("en-GB")}`;
  } else {
    label = `${start.toLocaleDateString("en-GB")} - ${selected.toLocaleDateString("en-GB")}`;
  }
  dateFilterState = {
    ...dateFilterState,
    range: "custom",
    label,
    startDate: start,
    endDate: end,
    viewDate: new Date(end),
    rangeSelecting: false,
  };
  updateDateFilterLabel();
  renderCalendar();
  renderTable();
  toggleDateFilter();
}

// ── Saved filters ───────────────────────────────────────────────────
const SAVED_FILTERS_KEY = "table-report-saved-filters";
let savedFilters = [];

function loadSavedFilters() {
  try {
    const raw = localStorage.getItem(SAVED_FILTERS_KEY);
    savedFilters = raw ? JSON.parse(raw) : [];
  } catch (e) {
    savedFilters = [];
  }
  renderSavedFilters();
}

function persistSavedFilters() {
  localStorage.setItem(SAVED_FILTERS_KEY, JSON.stringify(savedFilters));
}

function toggleSavedFilters() {
  const panel = document.getElementById("saved-filters-panel");
  if (!panel) return;
  panel.classList.toggle("hidden");
  if (!panel.classList.contains("hidden")) renderSavedFilters();
}

function openSaveFilterModal() {
  const modal = document.getElementById("save-filter-modal");
  const input = document.getElementById("save-filter-name");
  if (modal) modal.classList.remove("hidden");
  if (input) {
    input.value = "";
    input.focus();
  }
}

function closeSaveFilterModal() {
  const modal = document.getElementById("save-filter-modal");
  if (modal) modal.classList.add("hidden");
}

function saveFilter() {
  const input = document.getElementById("save-filter-name");
  const name = input?.value.trim();
  if (!name) return;

  const filterState = {
    name,
    search: document.getElementById("table-search")?.value || "",
    filters: Array.from(document.querySelectorAll(".col-filter")).map((f) => ({
      col: f.dataset.col,
      value: f.value,
    })),
    visibleColumns: Array.from(visibleColumns),
    dateRange: {
      range: dateFilterState.range,
      label: dateFilterState.label,
      startDate: dateFilterState.startDate?.toISOString() || null,
      endDate: dateFilterState.endDate?.toISOString() || null,
      rangeSelecting: dateFilterState.rangeSelecting,
    },
  };

  savedFilters.push(filterState);
  persistSavedFilters();
  renderSavedFilters();
  closeSaveFilterModal();
}

function deleteFilter(index) {
  savedFilters.splice(index, 1);
  persistSavedFilters();
  renderSavedFilters();
}

function applySavedFilter(index) {
  const saved = savedFilters[index];
  if (!saved) return;

  const searchInput = document.getElementById("table-search");
  if (searchInput && saved.search != null) searchInput.value = saved.search;

  document.querySelectorAll(".col-filter").forEach((f) => {
    const savedFilter = saved.filters?.find((x) => x.col === f.dataset.col);
    f.value = savedFilter ? savedFilter.value : "";
  });

  visibleColumns = new Set(
    saved.visibleColumns || COLUMN_DEFS.map((c) => c.key),
  );

  if (saved.dateRange) {
    dateFilterState = {
      ...dateFilterState,
      range: saved.dateRange.range || "3",
      label: saved.dateRange.label || "Last 3 Months",
      startDate: saved.dateRange.startDate
        ? new Date(saved.dateRange.startDate)
        : null,
      endDate: saved.dateRange.endDate
        ? new Date(saved.dateRange.endDate)
        : null,
      rangeSelecting: saved.dateRange.rangeSelecting || false,
    };
  }

  updateDateFilterLabel();
  renderColumnsPanel();
  renderTable();

  const panel = document.getElementById("saved-filters-panel");
  if (panel) panel.classList.add("hidden");
  document
    .querySelectorAll(".saved-filter-menu")
    .forEach((m) => m.classList.add("hidden"));
}

function renderSavedFilters() {
  const list = document.getElementById("saved-filters-list");
  if (!list) return;

  if (!savedFilters.length) {
    list.innerHTML = `<div class="empty-state" style="padding:40px 20px;font-size:13px;">No saved filters yet.</div>`;
    return;
  }

  list.innerHTML = savedFilters
    .map(
      (f, i) => `
        <div class="saved-filter-item-wrap">
          <div class="saved-filter-item" onclick="applySavedFilter(${i})">
            <span class="saved-filter-name">${esc(f.name)}</span>
            <button type="button" class="saved-filter-actions" onclick="event.stopPropagation(); toggleSavedFilterMenu(${i})" aria-label="Actions">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="6" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="12" cy="18" r="2" />
              </svg>
            </button>
          </div>
          <div id="saved-filter-menu-${i}" class="saved-filter-menu hidden">
            <button type="button" onclick="applySavedFilter(${i})">Apply</button>
            <button type="button" class="delete" onclick="deleteFilter(${i})">Delete</button>
          </div>
        </div>
      `,
    )
    .join("");
}

function toggleSavedFilterMenu(index) {
  const menu = document.getElementById(`saved-filter-menu-${index}`);
  if (!menu) return;
  const isHidden = menu.classList.contains("hidden");
  document
    .querySelectorAll(".saved-filter-menu")
    .forEach((m) => m.classList.add("hidden"));
  if (isHidden) menu.classList.remove("hidden");
}

function toggleExportPopover(e) {
  e.stopPropagation();
  const popover = document.getElementById("export-popover");
  if (popover) popover.classList.toggle("hidden");
}

function exportTable() {
  const popover = document.getElementById("export-popover");
  if (popover) popover.classList.add("hidden");

  const pageMode = document.getElementById("export-page")?.value || "active";
  const fileType = document.querySelector('input[name="export-file-type"]:checked')?.value || "pdf";

  let rows;
  if (pageMode === "all") {
    rows = ALL_JOBS;
  } else if (pageMode === "current-jobs") {
    rows = ALL_JOBS.filter((j) => !j.closed);
  } else {
    rows = filteredJobs();
  }

  const visible = COLUMN_DEFS.filter((c) => visibleColumns.has(c.key));
  const headers = visible.map((c) => c.label).concat(["WEB REPORT"]);

  if (fileType === "excel") {
    const lines = [headers.join(",")];
    for (const j of rows) {
      const values = visible.map((c) => {
        const v = getCellValue(j, c.key);
        return String(v ?? "").replace(/,/g, " ");
      });
      values.push("Open");
      lines.push(values.join(","));
    }
    const csv = lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    downloadBlob(blob, "ccp6-jobs.csv");
  } else {
    const html = buildPrintableTable(rows, visible, headers);
    const printWindow = window.open("", "_blank");
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function buildPrintableTable(rows, visibleColumns, headers) {
  const headersHtml = headers.map((h) => `<th>${esc(h)}</th>`).join("");
  const rowsHtml = rows
    .map((j) => {
      const cells = visibleColumns
        .map((c) => {
          const v = getCellValue(j, c.key);
          return `<td>${esc(v)}</td>`;
        })
        .join("");
      return `<tr>${cells}<td><button onclick="window.opener.openJob('${j.job_id}')">Open</button></td></tr>`;
    })
    .join("");

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>CCP6 Jobs Export</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #1e293b; }
          h1 { font-size: 20px; margin-bottom: 16px; }
          table { border-collapse: collapse; width: 100%; font-size: 13px; }
          th, td { border: 1px solid #e2e8f0; padding: 8px; text-align: left; }
          th { background: #f8fafc; font-weight: 600; }
          tr:nth-child(even) { background: #f8fafc; }
          button { background: #6366f1; color: white; border: none; padding: 4px 10px; border-radius: 6px; cursor: pointer; font-size: 12px; }
        </style>
      </head>
      <body>
        <h1>CCP6 Jobs</h1>
        <table>${headersHtml}${rowsHtml}</table>
      </body>
    </html>
  `;
}

function openJob(id) {
  const job = ALL_JOBS.find((j) => j.job_id === id);
  console.log("Open job:", job);
}

// ── Expose to window ───────────────────────────────────────────────────
window.openJob = openJob;
window.preview = preview;
window.goToCurrent = goToCurrent;
window.exportTable = exportTable;
window.toggleExportPopover = toggleExportPopover;
window.toggleColumns = toggleColumns;
window.toggleColumn = toggleColumn;
window.renderColumnsPanel = renderColumnsPanel;
window.selectAllColumns = selectAllColumns;
window.deselectAllColumns = deselectAllColumns;
window.toggleDateFilter = toggleDateFilter;
window.applyPresetRange = applyPresetRange;
window.changeMonth = changeMonth;
window.selectDate = selectDate;
window.renderTable = renderTable;
window.toggleSavedFilters = toggleSavedFilters;
window.openSaveFilterModal = openSaveFilterModal;
window.closeSaveFilterModal = closeSaveFilterModal;
window.saveFilter = saveFilter;
window.deleteFilter = deleteFilter;
window.applySavedFilter = applySavedFilter;
window.toggleSavedFilterMenu = toggleSavedFilterMenu;

// Close panels when clicking outside
document.addEventListener("click", (e) => {
  const columnsPanel = document.getElementById("columns-panel");
  const columnsBtn = document.querySelector(".columns-btn-vertical");
  if (
    columnsPanel &&
    !columnsPanel.classList.contains("hidden") &&
    !columnsPanel.contains(e.target) &&
    !columnsBtn.contains(e.target)
  ) {
    columnsPanel.classList.add("hidden");
  }

  const datePanel = document.getElementById("date-filter-panel");
  const dateTrigger = document.querySelector(".date-filter-trigger");
  if (
    datePanel &&
    !datePanel.classList.contains("hidden") &&
    !datePanel.contains(e.target) &&
    !dateTrigger.contains(e.target)
  ) {
    datePanel.classList.add("hidden");
  }

  const savedFiltersPanel = document.getElementById("saved-filters-panel");
  const menuBtn = document.querySelector(".menu-btn");
  if (
    savedFiltersPanel &&
    !savedFiltersPanel.classList.contains("hidden") &&
    !savedFiltersPanel.contains(e.target) &&
    !menuBtn.contains(e.target)
  ) {
    savedFiltersPanel.classList.add("hidden");
  }

  const exportPopover = document.getElementById("export-popover");
  const exportBtn = document.querySelector(".export-btn");
  if (
    exportPopover &&
    !exportPopover.classList.contains("hidden") &&
    !exportPopover.contains(e.target) &&
    !exportBtn.contains(e.target)
  ) {
    exportPopover.classList.add("hidden");
  }

  document.querySelectorAll(".saved-filter-menu").forEach((m) => {
    if (!m.contains(e.target)) m.classList.add("hidden");
  });
});

document.addEventListener("DOMContentLoaded", () => {
  applyDateRange("3");
  renderTable();
  loadSavedFilters();

  const datePanel = document.getElementById("date-filter-panel");
  if (datePanel) {
    // Stop clicks inside the panel from reaching the document click-outside handler.
    // This prevents the modal from closing when the calendar re-renders during a click.
    datePanel.addEventListener("click", (e) => {
      e.stopPropagation();
    });
  }

  // Calendar day click delegation
  const daysContainer = document.getElementById("calendar-days");
  if (daysContainer) {
    daysContainer.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-date]");
      if (!btn) return;
      const [year, month, day] = btn.dataset.date.split("-").map(Number);
      selectDate(year, month, day);
    });
  }

  // Save filter modal: close on backdrop click and submit on Enter
  const modalOverlay = document.getElementById("save-filter-modal");
  if (modalOverlay) {
    modalOverlay.addEventListener("click", (e) => {
      if (e.target === modalOverlay) closeSaveFilterModal();
    });
  }

  const saveFilterInput = document.getElementById("save-filter-name");
  if (saveFilterInput) {
    saveFilterInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") saveFilter();
    });
  }
});
