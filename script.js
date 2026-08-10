import { buildSeed, seedStaff, seedFlights } from "./sample-data.js";

const _SVC = (() => {
  const p = location.pathname.split("/");
  return p[1] === "services-preview" ? p[2] : "";
})();

// ── Data store ──────────────────────────────────────────────────────
// fetchJson fails fast (timeout + non-2xx) so loadJobs never hangs on a
// missing/slow preview-store route and the UI can render the seed instead.
function fetchJson(url, opts, ms = 3000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { ...opts, signal: ctrl.signal })
    .then((r) => {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    })
    .finally(() => clearTimeout(timer));
}

const store = {
  save: (collection, data) =>
    fetchJson(`/api/public/preview-store/${_SVC}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ collection, data }),
    }).catch(() => ({ ok: false })),
  list: (collection) =>
    fetchJson(
      `/api/public/preview-store/${_SVC}?collection=${collection}`,
      { cache: "no-store" },
    ).catch(() => []),
  records: (collection) =>
    fetchJson(
      `/api/public/preview-store/${_SVC}?collection=${collection}&mode=all`,
      { cache: "no-store" },
    ).catch(() => []),
  get: (collection, key) =>
    fetchJson(
      `/api/public/preview-store/${_SVC}?collection=${collection}&key=${encodeURIComponent(key)}`,
      { cache: "no-store" },
    ).then((r) => (r && r.record ? r.record : r)).catch(() => null),
  set: (collection, key, data) =>
    fetchJson(`/api/public/preview-store/${_SVC}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ collection, key, data }),
    }).catch(() => ({ ok: false })),
  del: (id) =>
    fetch(`/api/public/preview-store/${_SVC}?id=${id}`, { method: "DELETE" }).catch(() => {}),
};

// ── Cross-preview navigation ────────────────────────────────────────
var preview = {
  serviceId: _SVC,
  params: new URLSearchParams(location.search),
  currentViewId() {
    return this.params.get("view") || "";
  },
  recordId() {
    return this.params.get("record") || this.params.get("id") || "";
  },
  recordKey(record) {
    return record?.slotKey || record?.data?.id || record?.id || "";
  },
  async loadSubmission(recordId = this.recordId()) {
    if (!recordId) return null;
    const direct = await store.get("submissions", recordId);
    if (direct?.record) return direct.record;
    const { records = [] } = await store.records("submissions");
    return (
      records.find(
        (r) =>
          r.slotKey === recordId ||
          r.id === recordId ||
          r.data?.id === recordId,
      ) || null
    );
  },
  go(viewId, extra = {}) {
    const next = new URLSearchParams();
    next.set("view", viewId);
    for (const [k, v] of Object.entries(extra)) {
      if (v == null || v === "") next.delete(k);
      else next.set(k, String(v));
    }
    location.href = `/services-preview/${this.serviceId}?${next.toString()}`;
  },
  openRecord(viewId, recordId) {
    this.go(viewId, { record: recordId });
  },
  backTo(viewId) {
    this.go(viewId, { record: null, id: null });
  },
  _embedQueue: Promise.resolve(),
  embed: function (viewId, target, props) {
    if (props === undefined) props = {};
    var self = this;
    var run = async function () {
      var el =
        typeof target === "string" ? document.querySelector(target) : target;
      if (!el) {
        console.error("[preview.embed] target not found:", target);
        return null;
      }
      var colon = viewId.indexOf(":");
      var svcId, vid;
      if (colon !== -1) {
        svcId = viewId.slice(0, colon);
        vid = viewId.slice(colon + 1);
      } else {
        svcId = self.serviceId;
        vid = viewId;
      }
      var src = "/services-preview/" + svcId + "/component/" + vid + ".js";
      var embedKey = svcId + ":" + vid;
      var script = document.querySelector(
        'script[data-embed="' + embedKey + '"]',
      );
      var tag = script && script.dataset.tag ? script.dataset.tag : null;
      if (!tag) {
        if (script && !script.dataset.tag) {
          script.remove();
          script = null;
        }
        var captured = null;
        var origDefine = customElements.define.bind(customElements);
        customElements.define = function (name, ctor, opts) {
          if (!captured && typeof name === "string" && name.indexOf("-") !== -1)
            captured = name;
          return origDefine(name, ctor, opts);
        };
        try {
          script = document.createElement("script");
          script.type = "module";
          script.src = src;
          script.dataset.embed = embedKey;
          await new Promise(function (res, rej) {
            script.onload = function () {
              res();
            };
            script.onerror = function () {
              rej(new Error("failed to load " + src));
            };
            document.head.appendChild(script);
          });
          for (
            var i = 0;
            i < 40 && !captured && !window.__previewElementName;
            i++
          ) {
            await new Promise(function (r) {
              setTimeout(r, 25);
            });
          }
        } finally {
          customElements.define = origDefine;
        }
        tag = captured || window.__previewElementName || null;
      }
      if (!tag) {
        console.error("[preview.embed] component defined no element:", vid);
        return null;
      }
      script.dataset.tag = tag;
      await customElements.whenDefined(tag);
      var node = document.createElement(tag);
      for (var k in props) {
        if (!Object.prototype.hasOwnProperty.call(props, k)) continue;
        var v = props[k];
        try {
          node[k] = v;
        } catch (e) {}
        if (v != null && typeof v !== "object") node.setAttribute(k, String(v));
      }
      el.replaceChildren(node);
      return node;
    };
    var next = this._embedQueue.then(run, run);
    this._embedQueue = next.catch(function () {});
    return next;
  },
};

if (!window.preview) window.preview = preview;

// ── VIEWS config ────────────────────────────────────────────────────
const VIEWS = {
  current: "pv-ccp6-current",
  all: "pv-ccp6-all",
  create: "pv-ccp6-create",
  detail: "pv-ccp6-detail",
  report: "pv-ccp6-report",
};

const SCREEN_IDS = {
  current: "screen-current",
  all: "screen-all",
  create: "screen-create",
  detail: "screen-detail",
  report: "screen-report",
};

// ── Configuration ───────────────────────────────────────────────────
const CONFIG = {
  mealServices: ["Breakfast", "Lunch", "Dinner"],
  taGroups: ["A", "B", "C", "D"],
  airlines: [
    { code: "QF", name: "Qantas (QF)" },
    { code: "UA", name: "United Airlines (UA)" },
    { code: "OAL", name: "Standard / Other Airline" },
  ],
  defaultAirline: "OAL",
  ruleSets: {
    STANDARD: { exposureMax: 45, presetTempMax: 15, coldSoakMin: 120, dispatchTempMax: 15 },
    UA: { exposureMax: 30, presetTempMax: 15, coldSoakMin: 120, dispatchTempMax: 4 },
    QF: { exposureMax: 45, presetTempMax: 15, coldSoakMin: 180, dispatchTempMax: 5 },
  },
  airlineRule: { QF: "QF", UA: "UA", OAL: "STANDARD" },
  warningThresholdMin: 5,
};

// ── State ───────────────────────────────────────────────────────────
const state = {
  jobs: [],
  activeJobId: null,
  activeTab: "preset",
  currentScreen: "current",
  siccFilter: "SICC1",
  signoff: {
    open: false,
    stage: null,
    jobId: null,
    method: "staffid",
    resolved: null,
  },
};

// ── Routing ─────────────────────────────────────────────────────────
function fillSelect(el, options, value) {
  el.innerHTML = "";
  for (const opt of options) {
    const o = document.createElement("option");
    o.value = opt;
    o.textContent = opt;
    el.appendChild(o);
  }
  el.value = value;
}

let selectedCreateFlight = null;
let createInitDone = false;

function renderCreate() {
  // Initialize segmented buttons for Group
  initGroupButtons();
  initCreateFlightDropdown();
}

function initGroupButtons() {
  const container = document.getElementById("create-group-buttons");
  const hiddenInput = document.getElementById("create-group");
  if (!container || !hiddenInput) return;
  
  // Set default to A
  hiddenInput.value = "A";
  const firstBtn = container.querySelector(".segment-btn[data-value='A']");
  if (firstBtn) firstBtn.classList.add("active");
  
  // Add click handlers
  container.querySelectorAll(".segment-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      container.querySelectorAll(".segment-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      hiddenInput.value = btn.dataset.value;
    });
  });
}

function initCreateFlightDropdown() {
  const input = document.getElementById("create-flight");
  const list = document.getElementById("create-flight-list");
  if (!input || !list) return;
  const flights = seedFlights();
  const render = () => {
    const q = input.value.trim().toLowerCase();
    const matches = flights.filter(
      (f) =>
        !q ||
        f.flight_number.toLowerCase().includes(q) ||
        f.airline.toLowerCase().includes(q),
    );
    list.innerHTML = matches.length
      ? matches
          .map(
            (f) =>
              `<div class="dropdown-item" data-flight="${esc(f.flight_number)}">${esc(f.flight_number)} <span class="dropdown-meta">${esc(f.airline)} · ${esc(f.meal_service)} · ETD ${esc(f.etd)}</span></div>`,
          )
          .join("")
      : `<div class="dropdown-empty">No matching flights</div>`;
    list.classList.toggle("hidden", matches.length === 0);
  };
  if (!createInitDone) {
    createInitDone = true;
    input.addEventListener("input", () => {
      selectedCreateFlight = null;
      render();
    });
    input.addEventListener("focus", render);
    input.addEventListener("blur", () => {
      setTimeout(() => list.classList.add("hidden"), 150);
    });
    list.addEventListener("click", (e) => {
      const item = e.target.closest(".dropdown-item");
      if (!item) return;
      selectCreateFlight(flights.find((f) => f.flight_number === item.dataset.flight));
      list.classList.add("hidden");
    });
  } else {
    input.value = "";
    selectedCreateFlight = null;
    list.classList.add("hidden");
  }
}

function selectCreateFlight(f) {
  if (!f) return;
  selectedCreateFlight = f;
  document.getElementById("create-flight").value = f.flight_number;
  if (f.etd) document.getElementById("create-etd").value = f.etd;
}



function nextJobId(flightDate) {
  const stamp = flightDate.replace(/-/g, "").slice(2); // YYMMDD
  let max = 0;
  for (const j of state.jobs) {
    if (j.job_id && j.job_id.startsWith("CCP6-" + stamp)) {
      const n = parseInt(j.job_id.split("-").pop(), 10);
      if (n > max) max = n;
    }
  }
  return "CCP6-" + stamp + "-" + String(max + 1).padStart(2, "0");
}

function buildLinkedItems(flight, jobId) {
  const items = [];
  const classes = ["Economy", "Premium Economy", "Business"];
  const n = flight.count || 1;
  for (let i = 0; i < n; i++) {
    items.push({
      link_id: "LINK-" + jobId + "-" + (i + 1),
      ccp5_record_id: "CP5-" + flight.flight_number + "-" + (i + 1),
      sku: String(100000 + i),
      item_description: "CCP5 linked item " + (i + 1),
      class: classes[i % classes.length],
      quantity: 24 + i * 12,
    });
  }
  return items;
}

function navigate(screen, opts) {
  const id = SCREEN_IDS[screen] || SCREEN_IDS.current;
  for (const key of Object.keys(SCREEN_IDS)) {
    document.getElementById(SCREEN_IDS[key]).classList.toggle("hidden", key !== screen);
  }
  state.currentScreen = screen;
  if (screen === "detail") {
    state.activeJobId = opts?.jobId || state.activeJobId;
    state.activeTab = opts?.tab || "preset";
  }
  if (screen === "report") state.activeJobId = opts?.jobId || state.activeJobId;
  if (window.__renderHooks?.[screen]) window.__renderHooks[screen]();
  window.scrollTo({ top: 0 });
}

function openJob(jobId) {
  navigate("detail", { jobId });
}

function openReport(jobId) {
  navigate("report", { jobId });
}

function submitCreateJob(event) {
  event.preventDefault();
  const flight = selectedCreateFlight;
  const etd = document.getElementById("create-etd")?.value;
  const group = document.getElementById("create-group")?.value;
  if (!flight) {
    alert("Select a flight number first.");
    return;
  }
  if (!etd) {
    alert("ETD is required.");
    return;
  }
  if (!group) {
    alert("Group is required.");
    return;
  }
  // SICC1 uses STANDARD rule set
  const ruleSet = "STANDARD";
  const site = flight.site || "SICC2";
  const flightDate = flight.flight_date;
  const jobId = nextJobId(flightDate);
  const now = new Date().toISOString();
  const job = {
    job_id: jobId,
    flight_number: flight.flight_number,
    flight_date: flightDate,
    etd,
    ta_group: group,
    rule_set: ruleSet,
    site,
    job_status: "Open",
    closed: false,
    createdAt: now,
    linkedItems: buildLinkedItems(flight, jobId),
    preset: {
      status: "NotStarted", startTime: null, finishTime: null,
      startTempHorsDoeuvre: null, finishTempHorsDoeuvre: null,
      startTempDessert: null, finishTempDessert: null,
      traysHandled: 0, staffCount: 0, exposureDurationMin: null, complianceResult: null,
      services: [{}],
    },
    foodChecker: { status: "NotStarted", items: [] },
    dispatch: null,
    signoffs: [],
    exceptions: [],
    history: [{ at: now, actor: "FAA", field: "job", from: "", to: "created", stage: "header", version: 1 }],
  };
  state.jobs.unshift(job);
  persistJob(job);
  navigate("detail", { jobId });
}
function openSignoff(stage) {
  state.signoff = { open: true, stage, jobId: state.activeJobId, method: "staffid", resolved: null };
  document.getElementById("signoff-stage").textContent =
    stage === "preset" ? "Preset" : stage === "foodchecker" ? "Food Checker" : "Dispatch";
  document.getElementById("signoff-input-label").textContent = "Staff ID";
  document.getElementById("signoff-input").value = "";
  document.getElementById("signoff-input").disabled = false;
  document.getElementById("signoff-confirm").classList.add("hidden");
  document.getElementById("signoff-error").classList.add("hidden");
  renderSignoffMethods();
  document.getElementById("signoff-overlay").classList.remove("hidden");
  document.getElementById("signoff-input").focus();
}

function closeSignoff() {
  state.signoff.open = false;
  document.getElementById("signoff-overlay").classList.add("hidden");
}

function renderSignoffMethods() {
  const wrap = document.getElementById("signoff-methods");
  wrap.innerHTML = "";
  const methods = ["staffid", "nfc"];
  for (const m of methods) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "method-chip" + (m === state.signoff.method ? " active" : "");
    b.textContent = m === "staffid" ? "Staff ID" : "NFC Card";
    b.onclick = () => {
      state.signoff.method = m;
      renderSignoffMethods();
    };
    wrap.appendChild(b);
  }
}

function resolveIdentity() {
  const input = document.getElementById("signoff-input").value.trim();
  const staff = seedStaff().find(
    (s) => s.staffId.toLowerCase() === input.toLowerCase(),
  );
  const err = document.getElementById("signoff-error");
  const confirm = document.getElementById("signoff-confirm");
  if (!staff) {
    err.textContent = "Staff ID not found. Check the ID or tap the card again.";
    err.classList.remove("hidden");
    confirm.classList.add("hidden");
    return;
  }
  err.classList.add("hidden");
  state.signoff.resolved = staff;
  document.getElementById("signoff-name").textContent = `${staff.staffName} (${staff.staffId})`;
  document.getElementById("signoff-role").textContent = `Role: ${staff.role} · Capture: ${state.signoff.method.toUpperCase()}`;
  document.getElementById("signoff-input").disabled = true;
  confirm.classList.remove("hidden");
}

function confirmSignoff(confirmed) {
  const confirm = document.getElementById("signoff-confirm");
  if (!confirmed) {
    document.getElementById("signoff-input").disabled = false;
    state.signoff.resolved = null;
    confirm.classList.add("hidden");
    return;
  }
  commitStage(state.signoff.stage, state.signoff.resolved, state.signoff.method);
  closeSignoff();
  renderDetail();
}

// ── Data load / seed ─────────────────────────────────────────────────
function normalizeRecords(res) {
  const arr = Array.isArray(res) ? res : res?.records || [];
  return arr
    .map((r) => {
      if (r && r.data && r.data.job_id) return r.data;
      if (r && r.job_id) return r;
      // Some stores nest the record under {data:{...}} or {record:{...}}
      if (r && typeof r === "object") {
        const nested = r.record || r.job || r.value;
        if (nested && nested.job_id) return nested;
      }
      return r;
    })
    .filter((r) => r && typeof r === "object" && (r.job_id || r.linkedItems));
}

// Resolve a job from a platform record id (job_id, slotKey, platform id,
// data.id, or a linked CCP5 record id). Falls back to the exact job_id.
function findJobByRecord(recordId) {
  if (!recordId) return null;
  return (
    state.jobs.find((j) => j.job_id === recordId) ||
    state.jobs.find((j) => j.slotKey === recordId) ||
    state.jobs.find((j) => j.id === recordId || j.data?.id === recordId) ||
    state.jobs.find((j) =>
      (j.linkedItems || []).some((l) => l.link_id === recordId || l.ccp5_record_id === recordId),
    ) ||
    null
  );
}

async function loadJobs() {
  let jobs = [];
  try {
    jobs = normalizeRecords(await store.records("ccp6_jobs"));
  } catch (e) {
    jobs = [];
  }
  if (!jobs.length) {
    jobs = buildSeed();
    for (const j of jobs) {
      try {
        await store.set("ccp6_jobs", j.job_id, j);
      } catch (e) {}
    }
  }
  state.jobs = jobs;
}

// ── Current CCP6 Jobs ────────────────────────────────────────────────
function esc(v) {
  return String(v ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
}

function ruleFor(job) {
  return CONFIG.ruleSets[job.rule_set] || CONFIG.ruleSets.STANDARD;
}

function elapsedMin(ts) {
  if (!ts) return null;
  return Math.max(0, (Date.now() - new Date(ts).getTime()) / 60000);
}

function fmtElapsed(min) {
  if (min == null) return "—";
  const m = Math.floor(min);
  const s = Math.round((min - m) * 60);
  return String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
}

function formatTime(timestamp) {
  if (!timestamp) return "";
  const d = new Date(timestamp);
  return d.toTimeString().slice(0, 5);
}

function livePresetStatus(job) {
  const p = job.preset || {};
  if (p.status === "Submitted") return { label: p.complianceResult === "Compliant" ? "Compliant" : "Non-Compliant", cls: p.complianceResult === "Compliant" ? "compliant" : "nc" };
  if (!p.startTime) return { label: "Not Started", cls: "not-started", el: null };
  const el = elapsedMin(p.startTime);
  const rule = ruleFor(job);
  if (el > rule.exposureMax) return { label: "Overtime", cls: "overtime", el };
  const warnAt = rule.exposureMax - CONFIG.warningThresholdMin;
  if (el >= warnAt) return { label: "Warning", cls: "warning", el };
  return { label: "In Progress", cls: "in-progress", el };
}

function fcSummary(job) {
  const items = job.foodChecker?.items || [];
  let inProg = 0;
  let done = 0;
  let maxEl = 0;
  for (const it of items) {
    const finished = it.finishTime || it.status === "Compliant" || it.status === "NonCompliant";
    if (finished) done += 1;
    else if (it.startTime) {
      inProg += 1;
      maxEl = Math.max(maxEl, elapsedMin(it.startTime));
    }
  }
  return { total: items.length, inProg, done, maxEl: maxEl || null };
}

function dispatchSummary(job) {
  const d = job.dispatch;
  if (job.site !== "SICC2") return null;
  if (d?.status === "Submitted") {
    return { label: d.complianceResult === "Compliant" ? "Compliant" : "Non-Compliant", cls: d.complianceResult === "Compliant" ? "compliant" : "nc" };
  }
  const el = d?.coldSoakStart ? elapsedMin(d.coldSoakStart) : null;
  if (el == null) return { label: "Locked", cls: "locked" };
  const min = ruleFor(job).coldSoakMin;
  if (el >= min) return { label: "Eligible for dispatch", cls: "eligible", el };
  return { label: "Cold Soak", cls: "cold-soak", el };
}

function pill(label, cls, el) {
  const time = el != null ? `<span class="pill-elapsed">${fmtElapsed(el)}</span>` : "";
  return `<span class="status-pill ${cls}">${label}${time}</span>`;
}

function jobCard(job) {
  const preset = livePresetStatus(job);
  const fc = fcSummary(job);
  const disp = dispatchSummary(job);
  const totalQty = (job.linkedItems || []).reduce((s, it) => s + (it.quantity || 0), 0);
  const cardId = "card-" + esc(job.job_id);
  return `
    <div class="job-card" data-job="${esc(job.job_id)}" id="${cardId}">
      <div class="job-card-head">
        <div>
          <div class="job-card-flight">${esc(job.flight_number)} · ${esc(job.flight_date)}</div>
          <div class="job-card-meta">ETD ${esc(job.etd)} · ${esc(job.meal_service)} · Grp ${esc(job.ta_group)} · ${esc(job.airline)} · ${esc(job.site)}</div>
        </div>
        <span class="job-id">${esc(job.job_id)}</span>
      </div>
      <div class="card-rows">
        <div class="card-row"><span class="card-row-label">Preset</span><span class="preset-pill" data-preset>${pill(preset.label, preset.cls, preset.el)}</span></div>
        <div class="card-row">
          <span class="card-row-label">Food Checker</span>
          <span data-fc>${fc.done}/${fc.total} done${fc.inProg ? " · " + fmtElapsed(fc.maxEl) : ""}</span>
        </div>
        ${disp ? `<div class="card-row"><span class="card-row-label">Dispatch</span><span class="dispatch-pill" data-dispatch>${pill(disp.label, disp.cls, disp.el)}</span></div>` : ""}
        <div class="card-row"><span class="card-row-label">Linked sources</span><span>${(job.linkedItems || []).length} items · ${totalQty} qty</span></div>
      </div>
      <button type="button" class="btn-primary card-action" onclick="openJob('${esc(job.job_id)}')">Open Job</button>
    </div>`;
}

function filterBySICC(site) {
  state.siccFilter = site;
  document.querySelectorAll('.sicc-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.sicc === site);
  });
  renderCurrent();
}
window.filterBySICC = filterBySICC;

function renderCurrent() {
  const grid = document.getElementById("current-grid");
  const jobs = state.jobs.filter((j) => j.closed !== true && j.job_status !== "Voided" && j.site === state.siccFilter);
  if (!jobs.length) {
    grid.innerHTML = `<div class="empty-state">No active CCP6 jobs. Create a job to get started.</div>`;
    return;
  }
  grid.innerHTML = jobs.map(jobCard).join("");
}

// Update only the live timer nodes in place so the grid is NOT rebuilt every
// second (which broke clicks and caused layout jumps).
function tickCurrent() {
  const grid = document.getElementById("current-grid");
  if (!grid) return;
  for (const job of state.jobs) {
    if (job.closed === true || job.job_status === "Voided") continue;
    const card = grid.querySelector('[data-job="' + job.job_id + '"]');
    if (!card) continue;
    const presetEl = card.querySelector("[data-preset]");
    if (presetEl) {
      const st = livePresetStatus(job);
      presetEl.innerHTML = pill(st.label, st.cls, st.el);
    }
    const fcEl = card.querySelector("[data-fc]");
    if (fcEl) {
      const fc = fcSummary(job);
      fcEl.textContent = fc.done + "/" + fc.total + " done" + (fc.inProg ? " · " + fmtElapsed(fc.maxEl) : "");
    }
    const dispEl = card.querySelector("[data-dispatch]");
    if (dispEl) {
      const d = dispatchSummary(job);
      dispEl.innerHTML = pill(d.label, d.cls, d.el);
    }
  }
}

function startTicker() {
  setInterval(() => {
    if (state.currentScreen === "current") tickCurrent();
    else if (state.currentScreen === "detail") tickDetailLive();
  }, 1000);
}

// ── Job Detail ──────────────────────────────────────────────────────
function currentJob() {
  return state.jobs.find((j) => j.job_id === state.activeJobId);
}

function hmLimits(job) {
  const r = ruleFor(job);
  return {
    exposureMax: r.exposureMax,
    presetTempMax: r.presetTempMax,
    coldSoakMin: r.coldSoakMin,
    dispatchTempMax: r.dispatchTempMax,
  };
}

function calcTPMH(svc) {
  if (svc.traysHandled == null || svc.staffCount == null || svc.startTime == null || svc.finishTime == null) return "—";
  const hours = (new Date(svc.finishTime) - new Date(svc.startTime)) / (60 * 60 * 1000);
  if (hours <= 0 || svc.staffCount <= 0) return "—";
  const tpmh = svc.traysHandled / (svc.staffCount * hours);
  return tpmh.toFixed(1);
}

function title(stage) {
  return stage === "preset" ? "Preset" : stage === "foodchecker" ? "Food Checker" : "Dispatch";
}

function num(id) {
  const v = document.getElementById(id)?.value;
  return v === "" || v == null ? null : parseFloat(v);
}

function timeOfDayHM(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}

function hmParse(hhmm) {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function persistJob(job) {
  try {
    store.set("ccp6_jobs", job.job_id, job).catch(() => {});
  } catch (e) {}
}

function maybeCloseJob(job) {
  const done = [];
  done.push(job.preset?.status === "Submitted");
  done.push(job.foodChecker?.status === "Submitted");
  if (job.site === "SICC2") done.push(job.dispatch?.status === "Submitted");
  if (done.every(Boolean) && !job.closed) {
    job.closed = true;
    job.job_status = "Closed";
    job.closedAt = new Date().toISOString();
    job.history.push({ at: job.closedAt, actor: "system", field: "job", from: "Open", to: "Closed", stage: "job", version: 1 });
  }
}

// ── Detail rendering ────────────────────────────────────────────────
function renderDetail() {
  const job = currentJob();
  if (!job) {
    document.getElementById("detail-body").innerHTML = `<div class="empty-state">Job not found.</div>`;
    return;
  }
  document.getElementById("detail-title").textContent = `CCP6 Job · ${job.flight_number}`;
  document.getElementById("detail-flight-sub").classList.add("hidden");
  renderHeader(job);
  renderTabs(job);
  const body = document.getElementById("detail-body");
  if (state.activeTab === "preset") renderPreset(body, job);
  else if (state.activeTab === "foodchecker") renderFoodChecker(body, job);
}

// Reusable per-field wrapper (used by both read-only detail header and editable create header)
function headerField(label, control) {
  return `<div class="form-group job-header-field">
    <label class="form-label">${esc(label)}</label>${control}
  </div>`;
}

// Build the control HTML for header fields. editable=false → disabled (read-only).
function headerControls(job, editable) {
  const dis = editable ? "" : "disabled";
  const sel = (id, value, options) =>
    `<select class="form-input" id="${id}" ${dis}>${options
      .map((o) => `<option ${o === value ? "selected" : ""}>${esc(o)}</option>`)
      .join("")}</select>`;
  const txt = (id, value, extra = "") =>
    `<input type="text" class="form-input ${extra}" id="${id}" value="${esc(value ?? "")}" ${dis} />`;

  const fields = [
    ["Flight Number", txt("h-flight", editable ? "" : job.flight_number)],
    ["ETD (24h)", txt("h-etd", editable ? "" : job.etd)],
    ["Group", sel("h-group", editable ? "" : job.ta_group, CONFIG.taGroups)],
  ];
  return fields.map(([label, control]) => headerField(label, control)).join("");
}

// Active-instance detail header → read-only
function renderHeader(job) {
  document.getElementById("detail-header").innerHTML = headerControls(job, false);
}

function renderTabs(job) {
  const el = document.getElementById("detail-tabs");
  const tabs = [
    {
      id: "preset",
      title: "Preset",
      subtitle: "FAA · flight-level, service sets",
      status: presetLiveState(job),
    },
    {
      id: "foodchecker",
      title: "Food Checker",
      subtitle: "Timer per item · mandatory for every job",
      status: fcLiveState(job),
    },
  ];
  el.innerHTML = tabs
    .map(
      (t) => `
        <div class="tab-card${state.activeTab === t.id ? " active" : ""}" onclick="switchTab('${t.id}')">
          <div class="tab-header">
            <span class="tab-title">${t.title}</span>
            <span class="status-pill ${t.status.cls}">${t.status.label}</span>
          </div>
          <div class="tab-subtitle">${t.subtitle}</div>
        </div>
      `,
    )
    .join("");
}

function switchTab(tab) {
  if (state.activeTab === "foodchecker" && tab !== "foodchecker") stopFCTimer();
  state.activeTab = tab;
  renderDetail();
}

// ── Sign-off submit UI ──────────────────────────────────────────────
function renderSubmittedPanel(job, stage) {
  const so = (job.signoffs || []).find((s) => s.stage === stage);
  return `<div class="panel"><span class="status-pill submitted">Submitted</span>${
    so ? ` <span style="margin-left:8px">by ${esc(so.staffName)} (${esc(so.staffId)}) · ${esc(new Date(so.submittedAt).toLocaleString())}</span>` : ""
  }</div>`;
}

function submitButton(stage, disabled) {
  return `<button type="button" class="btn-primary" onclick="submitStage('${stage}')" ${disabled ? "disabled" : ""}>Submit ${title(stage)}</button>`;
}

// ── Exception fields ────────────────────────────────────────────────
function exceptionKey(scope) {
  return scope === "preset" || scope === "dispatch" ? "exc-" + scope : "exc-fc-" + scope;
}

function exceptionFields(scope) {
  const key = exceptionKey(scope);
  return `
    <div class="form-grid">
      <div class="form-group"><label class="form-label required">Root Cause</label>
        <select class="form-input" id="${key}-root"><option>Find root cause</option><option>Equipment</option><option>Process</option><option>Manpower</option><option>Other</option></select></div>
      <div class="form-group"><label class="form-label">Other Reason</label>
        <input type="text" class="form-input" id="${key}-other" /></div>
      <div class="form-group"><label class="form-label required">Immediate Correction</label>
        <input type="text" class="form-input" id="${key}-immediate" /></div>
      <div class="form-group"><label class="form-label required">Corrective Action</label>
        <input type="text" class="form-input" id="${key}-corrective" /></div>
      <div class="form-group"><label class="form-label">Food Disposed</label>
        <select class="form-input" id="${key}-disposed"><option value="No">No</option><option value="Yes">Yes</option></select></div>
      <div class="form-group"><label class="form-label">Remarks</label>
        <input type="text" class="form-input" id="${key}-remarks" /></div>
    </div>`;
}

function readException(scope) {
  const key = exceptionKey(scope);
  const val = (id) => document.getElementById(id)?.value.trim() ?? "";
  return {
    rootCause: val(`${key}-root`),
    otherReason: val(`${key}-other`),
    immediateCorrection: val(`${key}-immediate`),
    correctiveAction: val(`${key}-corrective`),
    foodDisposed: val(`${key}-disposed`),
    remarks: val(`${key}-remarks`),
    photos: [],
  };
}

function validateException(scope) {
  const key = exceptionKey(scope);
  const root = document.getElementById(`${key}-root`)?.value ?? "";
  const other = document.getElementById(`${key}-other`)?.value ?? "";
  const immediate = document.getElementById(`${key}-immediate`)?.value ?? "";
  const corrective = document.getElementById(`${key}-corrective`)?.value ?? "";
  if (root === "Find root cause") return "Root cause is required.";
  if (root === "Other" && !other.trim()) return "Other reason is required.";
  if (!immediate.trim()) return "Immediate correction is required.";
  if (!corrective.trim()) return "Corrective action is required.";
  return "";
}

function renderExceptionPanel(scope) {
  return `
    <div class="panel">
      <div class="panel-title" style="color:var(--danger)">Exception Required</div>
      ${exceptionFields(scope)}
    </div>`;
}

// ── Preset tab ──────────────────────────────────────────────────────
function presetLiveState(job) {
  const p = job.preset;
  if (p.status === "Submitted") {
    return { label: p.complianceResult === "Compliant" ? "Compliant" : "Non-Compliant", cls: p.complianceResult === "Compliant" ? "compliant" : "nc", el: null };
  }
  if (!p.startTime) return { label: "Not Started", cls: "not-started", el: null };
  const el = elapsedMin(p.startTime);
  const max = hmLimits(job).exposureMax;
  if (el > max) return { label: "Overtime", cls: "overtime", el };
  if (el >= max - CONFIG.warningThresholdMin) return { label: "Warning", cls: "warning", el };
  return { label: "In Progress", cls: "in-progress", el };
}

function fcLiveState(job) {
  const items = job.foodChecker?.items || [];
  if (items.length === 0) return { label: "No items", cls: "not-started", el: null };
  const started = items.filter((it) => it.startTime).length;
  const finished = items.filter((it) => it.finishTime || it.complianceResult).length;
  if (finished === items.length) {
    const allCompliant = items.every((it) => it.complianceResult === "Compliant");
    return { label: "Completed", cls: allCompliant ? "compliant" : "nc", el: null };
  }
  if (started > 0) return { label: `${started}/${items.length} started`, cls: "in-progress", el: null };
  return { label: "No items started", cls: "not-started", el: null };
}

function renderServicePanel(svc, index, submitted, limits, job) {
  const prefix = `p-s${index}`;
  const dis = submitted ? "disabled" : "";
  const elapsed = svc.startTime ? fmtElapsed(elapsedMin(svc.startTime)) : "00:00";
  const showStart = !submitted && !svc.startTime;
  const showFinish = !submitted && svc.startTime && !svc.finishTime;
  const canRemove = !svc.startTime && index > 0;
  
  return `
    <div class="service-panel">
      <div class="service-panel-header">
        <div>
          <span class="service-panel-title">${ordinal(index + 1)} service</span>
        </div>
        ${canRemove ? `<button type="button" class="remove-service-btn" onclick="removeService(${index})" title="Remove service">
          <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
        </button>` : ''}
      </div>

      <div class="service-panel-body">
        <div class="preset-grid">
          <div class="form-group"><label class="form-label">Start Time</label>
            <input type="time" class="form-input" id="${prefix}-startTime" value="${formatTime(svc.startTime)}" disabled /></div>
          <div class="form-group"><label class="form-label">Finish Time</label>
            <input type="time" class="form-input" id="${prefix}-finishTime" value="${formatTime(svc.finishTime)}" disabled /></div>
          <div class="timer-cell">
            <div class="timer-info">
              <div class="timer-label">Timer</div>
              <div class="timer-display" id="${prefix}-timer-display">${elapsed} <span>/ ${limits.exposureMax} min</span></div>
            </div>
            <div class="timer-controls">
              ${showStart ? `<button type="button" class="timer-btn" id="${prefix}-start" onclick="startService(${index})" ${dis}>
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                Start
              </button>` : ""}
              ${showFinish ? `<button type="button" class="timer-btn" id="${prefix}-finish" onclick="finishService(${index})" ${dis}>
                <svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
                Finish
              </button>` : ""}
            </div>
          </div>
          <div class="form-group field-hts"><label class="form-label required">Hors d'oeuvre Start (°C)</label>
            <input type="number" step="0.1" class="form-input" id="${prefix}-hts" value="${svc.startTempHorsDoeuvre ?? ""}" ${dis} /></div>
          <div class="form-group field-htf"><label class="form-label required">Hors d'oeuvre Finish (°C)</label>
            <input type="number" step="0.1" class="form-input" id="${prefix}-htf" value="${svc.finishTempHorsDoeuvre ?? ""}" ${dis} /></div>
          <div class="form-group field-trays"><label class="form-label">Trays Handled</label>
            <input type="number" class="form-input" id="${prefix}-trays" value="${svc.traysHandled ?? ""}" ${dis} /></div>
          <div class="form-group field-dts"><label class="form-label required">Dessert Start (°C)</label>
            <input type="number" step="0.1" class="form-input" id="${prefix}-dts" value="${svc.startTempDessert ?? ""}" ${dis} /></div>
          <div class="form-group field-dtf"><label class="form-label required">Dessert Finish (°C)</label>
            <input type="number" step="0.1" class="form-input" id="${prefix}-dtf" value="${svc.finishTempDessert ?? ""}" ${dis} /></div>
          <div class="form-group field-staff"><label class="form-label">Staff Count</label>
            <input type="number" class="form-input" id="${prefix}-staff" value="${svc.staffCount ?? ""}" ${dis} /></div>
        </div>

        <div class="metric-cards">
          <div class="metric-card ${svc.complianceResult === 'Compliant' ? 'compliant' : ''}">
            <div class="metric-label">Exposure</div>
            <div class="metric-value">${svc.exposureDurationMin ?? '—'} min</div>
            ${svc.exposureDurationMin != null ? `<div class="metric-status"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg> Within ${limits.exposureMax} min</div>` : ''}
          </div>
          <div class="metric-card ${svc.complianceResult === 'Compliant' ? 'compliant' : ''}">
            <div class="metric-label">Max Temperature</div>
            <div class="metric-value">${svc.maxSurfaceTemp ?? '—'} °C</div>
            ${svc.maxSurfaceTemp != null ? `<div class="metric-status"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg> Within ${limits.presetTempMax} °C</div>` : ''}
          </div>
          <div class="metric-card ${svc.complianceResult === 'Compliant' ? 'compliant' : ''} ${svc.complianceResult === 'NonCompliant' ? 'nc' : ''}">
            <div class="metric-label">SERVICE SET RESULT</div>
            <div class="metric-value">${svc.complianceResult ?? '—'}</div>
            ${svc.complianceResult === 'Compliant' ? `<div class="metric-status"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg> Meets the applied rule set</div>` : ''}
            ${svc.complianceResult === 'NonCompliant' ? `<div class="metric-status nc"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg> Does not meet the applied rule set</div>` : ''}
            ${svc.complianceResult == null ? `<div class="metric-hint">Calculated on finish</div>` : ''}
          </div>
          <div class="metric-card">
            <div class="metric-label">TPMH</div>
            <div class="metric-value">${calcTPMH(svc)}</div>
            <div class="metric-hint">Hours-worked basis — OQ-10</div>
          </div>
        </div>
        <div id="${prefix}-error" class="badge-error hidden" style="margin-top:12px"></div>
      </div>


    </div>
  `;
}

function renderPreset(body, job) {
  const p = job.preset;
  const submitted = p.status === "Submitted";
  const site = job.site || "SICC2";
  
  if (site === 'SICC1') {
    renderPresetSICC1(body, job, p, submitted);
  } else {
    renderPresetSICC2(body, job, p, submitted);
  }
}

function renderPresetSICC1(body, job, p, submitted) {
  if (!p.services) p.services = [{}];
  const services = p.services;
  const limits = hmLimits(job);
  
  body.innerHTML = `
    <div class="info-banner">
      <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
      <div><strong>SICC1 Preset is measured per service.</strong> Each service set has its own timer, Hors d'oeuvre and Dessert streams, and its own compliance result. One sign-off covers the whole stage, because every service on a flight is performed by the same person.</div>
    </div>

    <div class="preset-wrapper">
      <div class="service-panel-header">
        <div>
          <div class="service-panel-title">Preset recording — FAA</div>
          <div class="section-subtitle">Flight-level · service set · Annexure 5.1</div>
        </div>
        <div class="section-badge">${services.length} service set(s)</div>
      </div>

      <div class="preset-wrapper-content">
        ${services.map((svc, i) => renderServicePanel(svc, i, submitted, limits, job)).join("")}
      </div>
    </div>

    <button type="button" class="add-service-btn" onclick="addService()">+ Add service (${ordinal(services.length + 1)} service)</button>

    <div class="form-group" style="margin-top:16px">
      <label class="form-label">Remarks</label>
      <textarea class="form-input" id="preset-remarks" placeholder="Remarks" rows="3"></textarea>
    </div>

    ${submitted ? renderSubmittedPanel(job, "preset") : `<div style="display:flex;justify-content:space-between;align-items:center;margin-top:16px"><div class="service-panel-footer-text">Submit is enabled once every started service is finished and any exception is complete.</div><button type="button" class="btn-primary" onclick="submitStage('preset')" ${!services.every(s => s.finishTime) ? 'disabled' : ''}>Submit Preset</button></div>`}
  `;
}

function renderPresetSICC2(body, job, p, submitted) {
  const items = p.items || [];
  const notStartedCount = items.filter(it => !it.startTime).length;
  const activeCount = items.filter(it => it.startTime && !it.finishTime).length;
  
  body.innerHTML = `
    <div class="fc-header">
      <div>
        <h2 class="fc-header-title">Preset recording — FAA</h2>
        <div class="fc-header-subtitle">Item-level · Annexure 5.3 / 5.4</div>
      </div>
      <div class="fc-mandatory-badge">${activeCount} active · ${notStartedCount} not started</div>
    </div>

    <div class="table-wrap">
      <table class="fc-table">
        <thead><tr>
          <th style="width:40px">#</th>
          <th>CLASS</th>
          <th>ITEM DESCRIPTION</th>
          <th>SKU</th>
          <th>QTY</th>
          <th>START °C *</th>
          <th>ELAPSED</th>
          <th>ITEM STATUS</th>
          <th>ACTION</th>
        </tr></thead>
        <tbody>
          ${items.map((item, i) => renderPresetSICC2Row(item, i, submitted, job)).join("")}
        </tbody>
      </table>
    </div>

    <div class="fc-sicc1-footer" style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:20px;padding:16px;background:var(--bg-surface);border-radius:8px">
      <div class="form-group">
        <label class="form-label">Trays / meals handled</label>
        <input type="number" class="form-input" id="preset-trays" value="${p.traysHandled || ''}" ${submitted ? 'disabled' : ''} />
      </div>
      <div class="form-group">
        <label class="form-label">Staff count on line</label>
        <input type="number" class="form-input" id="preset-staff" value="${p.staffCount || ''}" ${submitted ? 'disabled' : ''} />
      </div>
      <div class="form-group">
        <label class="form-label">Note</label>
        <div class="form-input-static" style="padding:10px 12px;color:var(--text-secondary)">Productivity is recorded once for the stage, not per item</div>
      </div>
    </div>

    ${submitted ? renderSubmittedPanel(job, "preset") : `<div style="display:flex;justify-content:space-between;align-items:center;margin-top:16px"><div class="service-panel-footer-text">Submit is enabled once every started item is finished.</div><button type="button" class="btn-primary" onclick="submitStage('preset')" ${!items.every(it => it.finishTime) ? 'disabled' : ''}>Submit Preset</button></div>`}
  `;
}

function renderPresetSICC2Row(item, i, submitted, job) {
  const st = itemStatus(item, job);
  const isInProgress = st.cls === "in-progress";
  const isFinished = !!item.complianceResult;
  
  const statusBadge = isInProgress
    ? `<span class="fc-status-badge in-progress"><span class="fc-status-dot"></span>In Progress</span>`
    : isFinished
      ? `<span class="fc-status-badge ${item.complianceResult === 'Compliant' ? 'compliant' : 'non-compliant'}"><span class="fc-status-dot"></span>${item.complianceResult}</span>`
      : `<span class="fc-status-badge not-started"><span class="fc-status-dot"></span>Not started</span>`;

  const actionBtn = isFinished
    ? `<button type="button" class="btn-ghost" style="padding:6px 12px;font-size:12px" onclick="event.stopPropagation(); togglePresetSICC2Expand('${item.linkId}')">Close</button>`
    : `<button type="button" class="btn-ghost" style="padding:6px 12px;font-size:12px" onclick="event.stopPropagation(); togglePresetSICC2Expand('${item.linkId}')">View</button>`;

  let rowHtml = `
    <tr class="${state.presetSICC2Expanded === item.linkId ? 'selected' : ''}" onclick="togglePresetSICC2Expand('${item.linkId}')" style="cursor: pointer;">
      <td>${i + 1}</td>
      <td>${esc(item.class)}</td>
      <td>${esc(item.item_description)}</td>
      <td>${esc(item.sku)}</td>
      <td>${esc(item.quantity)}</td>
      <td>${item.startTemp != null ? item.startTemp + ' °C' : '—'}</td>
      <td><span id="preset-elapsed-${i}">${st.el != null ? fmtElapsed(st.el) : "—"}</span></td>
      <td>${statusBadge}</td>
      <td>${actionBtn}</td>
    </tr>
  `;

  if (state.presetSICC2Expanded === item.linkId) {
    rowHtml += `
      <tr>
        <td colspan="9">
          <div style="padding:16px;background:var(--bg-surface-hover);border-radius:8px;margin:8px 0">
            <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:16px">
              <div>
                <label class="form-label">Start time</label>
                <div class="form-input-static">${item.startTime ? new Date(item.startTime).toLocaleTimeString('en-GB', {hour: '2-digit', minute:'2-digit'}) : '—'}</div>
              </div>
              <div>
                <label class="form-label">Finish temp (°C)</label>
                <input type="number" step="0.1" class="form-input" id="preset-ft-temp-${item.linkId}" value="${item.finishTemp ?? ''}" ${submitted ? 'disabled' : ''} />
              </div>
              <div>
                <label class="form-label">Finish time</label>
                <div class="form-input-static">${item.finishTime ? new Date(item.finishTime).toLocaleTimeString('en-GB', {hour: '2-digit', minute:'2-digit'}) : '—'}</div>
              </div>
              <div>
                <label class="form-label">Duration</label>
                <div class="form-input-static">${item.durationMin != null ? item.durationMin + ' min' : '—'}</div>
              </div>
            </div>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px">
              <div class="fc-metric-card">
                <div class="fc-metric-label">ITEM EXPOSURE</div>
                <div class="fc-metric-value">${item.durationMin != null ? item.durationMin + ' min' : '—'}</div>
                <div class="fc-metric-sub">${item.durationMin <= 30 ? '✓ Within 30 min' : '✗ Exceeds 30 min'}</div>
              </div>
              <div class="fc-metric-card">
                <div class="fc-metric-label">MAX TEMPERATURE</div>
                <div class="fc-metric-value">${item.finishTemp != null ? item.finishTemp + ' °C' : '—'}</div>
                <div class="fc-metric-sub">${item.finishTemp <= 15 ? '✓ Within 15 °C' : '✗ Exceeds 15 °C'}</div>
              </div>
              <div class="fc-metric-card">
                <div class="fc-metric-label">ITEM RESULT</div>
                <div class="fc-metric-value">${item.complianceResult || '—'}</div>
                <div class="fc-metric-sub">${item.complianceResult === 'Compliant' ? '✓ Meets the rule set' : '✗ Does not meet'}</div>
              </div>
            </div>
          </div>
        </td>
      </tr>
    `;
  }

  return rowHtml;
}

function togglePresetSICC2Expand(linkId) {
  state.presetSICC2Expanded = state.presetSICC2Expanded === linkId ? null : linkId;
  renderDetail();
}
window.togglePresetSICC2Expand = togglePresetSICC2Expand;

function updatePresetGates() {
  const finish = document.getElementById("p-finish");
  const hts = num("p-hts");
  const dts = num("p-dts");
  const htf = num("p-htf");
  const dtf = num("p-dtf");
  if (finish) finish.disabled = !(hts != null && dts != null && htf != null && dtf != null);
}

function showErr(id, msg) {
  const e = document.getElementById(id);
  if (!e) return;
  e.textContent = msg;
  e.classList.toggle("hidden", !msg);
}

// ── Service helpers ──────────────────────────────────────────────────
function ordinal(n) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function addService() {
  const job = currentJob();
  const p = job.preset;
  if (!p.services) p.services = [{}];
  p.services.push({
    startTime: null,
    finishTime: null,
    startTempHorsDoeuvre: null,
    finishTempHorsDoeuvre: null,
    startTempDessert: null,
    finishTempDessert: null,
    traysHandled: null,
    staffCount: null,
    exposureDurationMin: null,
    maxSurfaceTemp: null,
    complianceResult: null,
  });
  renderDetail();
}

function removeService(index) {
  const job = currentJob();
  const services = job.preset.services || [{}];
  if (services[index].startTime || services.length <= 1) return;
  services.splice(index, 1);
  renderDetail();
}

function getServiceStatus(svc, job) {
  if (job.preset.status === "Submitted") {
    return { label: svc.complianceResult === "Compliant" ? "Compliant" : "Non-Compliant", cls: svc.complianceResult === "Compliant" ? "compliant" : "nc", el: null };
  }
  if (!svc.startTime) return { label: "Not Started", cls: "not-started", el: null };
  const el = elapsedMin(svc.startTime);
  const max = hmLimits(job).exposureMax;
  if (el > max) return { label: "Overtime", cls: "overtime", el };
  if (el >= max - CONFIG.warningThresholdMin) return { label: "Warning", cls: "warning", el };
  return { label: "In Progress", cls: "in-progress", el };
}

function startService(index) {
  const job = currentJob();
  const svc = job.preset.services[index];
  const prefix = `p-s${index}`;
  if (svc.startTime) return;
  const hts = num(`${prefix}-hts`);
  const dts = num(`${prefix}-dts`);
  if (hts == null || dts == null) {
    showErr(`${prefix}-error`, "Both start temperatures are required before starting the timer.");
    return;
  }
  svc.startTempHorsDoeuvre = hts;
  svc.startTempDessert = dts;
  svc.traysHandled = num(`${prefix}-trays`) ?? 0;
  svc.staffCount = num(`${prefix}-staff`) ?? 0;
  svc.startTime = new Date().toISOString();
  job.history = job.history || [];
  job.history.push({ at: svc.startTime, actor: "FAA", field: "preset", from: "NotStarted", to: "InProgress", stage: "preset", version: 1 });
  renderDetail();
}

function finishService(index) {
  const job = currentJob();
  const svc = job.preset.services[index];
  const prefix = `p-s${index}`;
  if (!svc.startTime || svc.finishTime) return;
  const htf = num(`${prefix}-htf`);
  const dtf = num(`${prefix}-dtf`);
  if (htf == null || dtf == null) {
    showErr(`${prefix}-error`, "Both finish temperatures are required before finishing.");
    return;
  }
  svc.finishTempHorsDoeuvre = htf;
  svc.finishTempDessert = dtf;
  svc.finishTime = new Date().toISOString();
  const limits = hmLimits(job);
  svc.exposureDurationMin = Math.round((new Date(svc.finishTime) - new Date(svc.startTime)) / 60000);
  const maxTemp = Math.max(svc.startTempHorsDoeuvre, svc.finishTempHorsDoeuvre, svc.startTempDessert, svc.finishTempDessert);
  svc.maxSurfaceTemp = maxTemp;
  svc.complianceResult =
    svc.exposureDurationMin > limits.exposureMax || maxTemp > limits.presetTempMax ? "Non-Compliant" : "Compliant";
  job.history.push({ at: svc.finishTime, actor: "FAA", field: "preset", from: "Started", to: svc.complianceResult, stage: "preset", version: 1 });
  renderDetail();
}

function startPreset() {
  const job = currentJob();
  const p = job.preset;
  if (p.startTime) return;
  const hts = num("p-hts");
  const dts = num("p-dts");
  if (hts == null || dts == null) {
    showErr("preset-error", "Both start temperatures are required before starting the timer.");
    return;
  }
  p.startTempHorsDoeuvre = hts;
  p.startTempDessert = dts;
  p.traysHandled = num("p-trays") ?? 0;
  p.staffCount = num("p-staff") ?? 0;
  p.startTime = new Date().toISOString();
  p.history = p.history || [];
  job.history.push({ at: p.startTime, actor: "FAA", field: "preset", from: "NotStarted", to: "InProgress", stage: "preset", version: 1 });
  renderDetail();
}

function finishPreset() {
  const job = currentJob();
  const p = job.preset;
  if (!p.startTime || p.finishTime) return;
  const htf = num("p-htf");
  const dtf = num("p-dtf");
  if (htf == null || dtf == null) {
    showErr("preset-error", "Both finish temperatures are required before finishing.");
    return;
  }
  p.finishTempHorsDoeuvre = htf;
  p.finishTempDessert = dtf;
  p.finishTime = new Date().toISOString();
  const limits = hmLimits(job);
  p.exposureDurationMin = Math.round((new Date(p.finishTime) - new Date(p.startTime)) / 60000);
  const maxTemp = Math.max(p.startTempHorsDoeuvre, p.finishTempHorsDoeuvre, p.startTempDessert, p.finishTempDessert);
  p.maxSurfaceTemp = maxTemp;
  p.complianceResult =
    p.exposureDurationMin > limits.exposureMax || maxTemp > limits.presetTempMax ? "Non-Compliant" : "Compliant";
  job.history.push({ at: p.finishTime, actor: "FAA", field: "preset", from: "Started", to: p.complianceResult, stage: "preset", version: 1 });
  renderDetail();
}

function renderPresetCompliance(job) {
  const p = job.preset;
  if (!p.finishTime && p.status !== "Submitted") return "";
  const limits = hmLimits(job);
  const maxTemp = p.maxSurfaceTemp ?? Math.max(p.startTempHorsDoeuvre ?? 0, p.finishTempHorsDoeuvre ?? 0, p.startTempDessert ?? 0, p.finishTempDessert ?? 0);
  const result = p.complianceResult || "Compliant";
  return `
    <div class="panel">
      <div class="panel-title">Compliance Summary</div>
      <div class="form-grid">
        <div><div class="jh-label">Exposure Duration</div><div class="jh-value">${p.exposureDurationMin ?? "—"} min (limit ≤ ${limits.exposureMax})</div></div>
        <div><div class="jh-label">Max Surface Temp</div><div class="jh-value">${maxTemp ?? "—"} °C (limit ≤ ${limits.presetTempMax})</div></div>
        <div><div class="jh-label">Preset Result</div><div>${pill(result, result === "Compliant" ? "compliant" : "nc")}</div></div>
      </div>
    </div>`;
}

// ── Food Checker tab ────────────────────────────────────────────────
function itemStatus(item, job) {
  const max = hmLimits(job).exposureMax;
  if (item.complianceResult) {
    const duration = item.finishTime && item.startTime 
      ? (new Date(item.finishTime) - new Date(item.startTime)) / 60000 
      : null;
    return { label: item.complianceResult === "Compliant" ? "Compliant" : "Non-Compliant", cls: item.complianceResult === "Compliant" ? "compliant" : "nc", el: duration };
  }
  if (!item.startTime) return { label: "Not Started", cls: "not-started", el: null };
  const el = elapsedMin(item.startTime);
  if (el > max) return { label: "Overtime", cls: "overtime", el };
  if (el >= max - CONFIG.warningThresholdMin) return { label: "Warning", cls: "warning", el };
  return { label: "In Progress", cls: "in-progress", el };
}

function renderFoodChecker(body, job) {
  const rec = job.foodChecker;
  const submitted = rec.status === "Submitted";
  const items = rec.items || [];
  const selectedCount = (state.fcSelected || []).length;
  const notCheckedCount = items.filter((it) => !it.complianceResult).length;
  const site = job.site || "SICC2"; // Fallback to SICC2 if undefined
  
  body.innerHTML = `
    <div class="fc-header">
      <div>
        <h2 class="fc-header-title">Food Checker</h2>
        <div class="fc-header-subtitle">Item-level · ${site === 'SICC1' ? 'Annexure 5.3 / 5.4' : 'Annexure 5.2'}</div>
      </div>
      <div class="fc-mandatory-badge">Mandatory for every job</div>
    </div>

    <div class="fc-meal-service">
      <label class="form-label required" for="fc-meal-service">Meal Service</label>
      <select class="form-input" id="fc-meal-service" ${submitted ? 'disabled' : ''}>
        <option value="Breakfast" ${job.meal_service === 'Breakfast' ? 'selected' : ''}>Breakfast</option>
        <option value="Lunch" ${job.meal_service === 'Lunch' ? 'selected' : ''}>Lunch</option>
        <option value="Dinner" ${job.meal_service === 'Dinner' ? 'selected' : ''}>Dinner</option>
      </select>
      <div class="fc-selection-note">C1: free text on paper, so a dropdown here</div>
    </div>

    ${site !== 'SICC1' && selectedCount > 0 ? `
      <div class="fc-selection-bar">
        <div class="fc-selection-count">${selectedCount} row(s) selected</div>
        <div class="fc-selection-actions">
          <button type="button" class="btn-secondary" onclick="fcStartSelected()" ${submitted ? 'disabled' : ''}>Start selected</button>
          <button type="button" class="btn-secondary" onclick="fcFinishSelected()" ${submitted ? 'disabled' : ''}>Finish selected</button>
          <button type="button" class="btn-ghost" onclick="fcClearSelection()">Clear</button>
        </div>
      </div>
      <div class="fc-selection-note">One timestamp for several rows, data still stored per item — as the paper form is filled</div>
    ` : ''}

    <div class="table-wrap">
      <table class="fc-table">
        <thead><tr>
          ${site === 'SICC1' ? `
            <th style="width:40px">#</th>
            <th>CLASS</th>
            <th>ITEM DESCRIPTION</th>
            <th>SKU</th>
            <th>QTY</th>
            <th>START °C *</th>
            <th>ELAPSED</th>
            <th>ITEM STATUS</th>
            <th>ACTION</th>
          ` : `
            <th style="width:40px">#</th>
            <th>CLASS</th>
            <th>ITEM DESCRIPTION</th>
            <th>SKU</th>
            <th>QTY</th>
            <th>START °C *</th>
            <th>FINISH °C</th>
            <th>ELAPSED</th>
            <th>ITEM STATUS</th>
            <th>ACTION</th>
          `}
        </tr></thead>
        <tbody>
          ${items.map((item, i) => renderFCRow(job, item, i, submitted)).join("")}
        </tbody>
      </table>
    </div>

    ${site === 'SICC1' ? `
      <div class="fc-sicc1-footer" style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:20px;padding:16px;background:var(--bg-surface);border-radius:8px">
        <div class="form-group">
          <label class="form-label">Trays / meals handled</label>
          <input type="number" class="form-input" id="fc-trays" value="${job.foodChecker.traysHandled || ''}" ${submitted ? 'disabled' : ''} />
        </div>
        <div class="form-group">
          <label class="form-label">Staff count on line</label>
          <input type="number" class="form-input" id="fc-staff" value="${job.foodChecker.staffCount || ''}" ${submitted ? 'disabled' : ''} />
        </div>
        <div class="form-group">
          <label class="form-label">Note</label>
          <div class="form-input-static" style="padding:10px 12px;color:var(--text-secondary)">Productivity is recorded once for the stage, not per item</div>
        </div>
      </div>
    ` : ''}

    <div class="fc-footer">
      <div class="fc-footer-text">${notCheckedCount} of ${items.length} items not yet checked (OQ-08).</div>
      ${submitted ? renderSubmittedPanel(job, "foodchecker") : `<button type="button" class="btn-primary" onclick="submitStage('foodchecker')" ${items.length === 0 || !items.every((it) => it.complianceResult) ? 'disabled' : ''}>Submit Food Checker</button>`}
    </div>
  `;
}

function renderFCRow(job, item, i, submitted) {
  const site = job.site || "SICC2";
  const st = itemStatus(item, job);
  const dis = submitted ? "disabled" : "";
  const isSelected = (state.fcSelected || []).includes(item.linkId);
  const isInProgress = st.cls === "in-progress";
  const isFinished = !!item.complianceResult;
  
  let actionBtn = '';
  if (site === 'SICC1') {
    actionBtn = `<button type="button" class="btn-ghost" style="padding:6px 12px;font-size:12px" onclick="event.stopPropagation(); toggleFCExpand('${item.linkId}')">View</button>`;
  } else if (!item.startTime && !submitted) {
    actionBtn = `<button type="button" class="btn-primary" style="padding:6px 12px;font-size:12px" onclick="event.stopPropagation(); startItem('${item.linkId}')">Start Timer</button>`;
  } else if (item.startTime && !item.finishTime && !submitted) {
    actionBtn = `<button type="button" class="btn-primary" style="padding:6px 12px;font-size:12px" onclick="event.stopPropagation(); finishItem('${item.linkId}')">Finish Timer</button>`;
  } else if (isFinished && item.complianceResult === "Non-Compliant") {
    actionBtn = `<button type="button" class="btn-ghost" style="padding:6px 12px;font-size:12px" onclick="event.stopPropagation(); document.getElementById('exc-fc-${item.linkId}-immediate')?.focus()">Exception</button>`;
  }

  const statusBadge = isInProgress
    ? `<span class="fc-status-badge in-progress"><span class="fc-status-dot"></span>In Progress</span>`
    : isFinished
      ? `<span class="fc-status-badge ${item.complianceResult === 'Compliant' ? 'compliant' : 'non-compliant'}"><span class="fc-status-dot"></span>${item.complianceResult}</span>`
      : `<span class="fc-status-badge not-started"><span class="fc-status-dot"></span>Not started</span>`;

  let rowHtml = `
    <tr class="${isSelected ? 'selected' : ''}" onclick="toggleFCExpand('${item.linkId}')" style="cursor: pointer;">
      ${site !== 'SICC1' ? `<td><input type="checkbox" class="fc-checkbox" ${isSelected ? 'checked' : ''} ${isFinished || submitted ? 'disabled' : ''} onclick="event.stopPropagation(); fcToggleSelect('${item.linkId}')" /></td>` : `<td>${i + 1}</td>`}
      <td>${esc(item.class)}</td>
      <td>${esc(item.item_description)}</td>
      <td>${esc(item.sku)}</td>
      <td>${esc(item.quantity)}</td>
      <td>${state.fcExpanded === item.linkId 
        ? `<div class="form-input-static">${item.startTemp != null ? item.startTemp + ' °C' : '—'}</div>` 
        : `<input type="number" step="0.1" class="form-input" style="width:90px" id="fc-st-temp-${item.linkId}" value="${item.startTemp ?? ''}" ${dis} onclick="event.stopPropagation()" oninput="updateItemField('${item.linkId}', 'startTemp'); updateItemGate('${item.linkId}')" />`
      }</td>
      ${site !== 'SICC1' ? `<td>${item.startTime 
        ? (state.fcExpanded === item.linkId 
          ? `<div class="form-input-static">${item.finishTemp != null ? item.finishTemp + ' °C' : '—'}</div>` 
          : `<input type="number" step="0.1" class="form-input" style="width:90px" id="fc-ft-temp-${item.linkId}" value="${item.finishTemp ?? ''}" ${dis} onclick="event.stopPropagation()" oninput="updateItemField('${item.linkId}', 'finishTemp')" />`)
        : '—'
      }</td>` : ''}
      <td><span id="fc-elapsed-${i}">${st.el != null ? fmtElapsed(st.el) : "—"}</span></td>
      <td>${statusBadge}</td>
      <td>${actionBtn}</td>
    </tr>
  `;

  // Add expanded panel when row is clicked
  if (state.fcExpanded === item.linkId) {
    rowHtml += renderFCExpandedPanel(job, item, submitted);
  }

  return rowHtml;
}

function renderFCExpandedPanel(job, item, submitted) {
  const st = itemStatus(item, job);
  const elapsed = st.el != null ? fmtElapsed(st.el) : "—";
  const maxTemp = item.finishTemp 
    ? Math.max(item.startTemp ?? 0, item.finishTemp) 
    : (item.startTemp ?? "—");
  
  return `
    <tr class="expanded-row">
      <td colspan="9">
        <div class="fc-expanded-panel">
          <div class="fc-expanded-grid">
            <div class="fc-expanded-field">
              <label class="required">Start temp (°C)</label>
              <input type="number" step="0.1" class="form-input" id="fc-st-temp-${item.linkId}" value="${item.startTemp ?? ''}" ${submitted ? 'disabled' : ''} oninput="updateItemField('${item.linkId}', 'startTemp'); updateItemGate('${item.linkId}')" />
            </div>
            <div class="fc-expanded-field">
              <label>Start time</label>
              <input type="time" class="form-input" value="${formatTime(item.startTime)}" disabled />
            </div>
            <div class="fc-expanded-field">
              <label class="required">Finish temp (°C)</label>
              <input type="number" step="0.1" class="form-input" id="fc-ft-temp-${item.linkId}" value="${item.finishTemp ?? ''}" ${submitted ? 'disabled' : ''} oninput="updateItemField('${item.linkId}', 'finishTemp'); updateItemGate('${item.linkId}')" />
            </div>
            <div class="fc-expanded-field">
              <label>Finish time</label>
              <input type="time" class="form-input" value="${formatTime(item.finishTime)}" disabled />
            </div>
          </div>

          <!-- Timer Control Bar -->
          <div class="fc-timer-bar">
            <div class="fc-timer-display">
              <div class="fc-timer-label">TIMER</div>
              <div class="fc-timer-value">${elapsed} <span>/ ${hmLimits(job).exposureMax} min</span></div>
            </div>
            <div class="fc-timer-buttons">
              ${!item.startTime && !submitted ? `<button type="button" class="btn-primary" onclick="event.stopPropagation(); startItem('${item.linkId}')">Start Timer</button>` : ''}
              ${item.startTime && !item.finishTime && !submitted ? `<button type="button" class="btn-primary" onclick="event.stopPropagation(); finishItem('${item.linkId}')">Finish Timer</button>` : ''}
            </div>
          </div>

          <div class="fc-metric-cards">
            <div class="fc-metric-card">
              <div class="fc-metric-label">MAX TEMPERATURE</div>
              <div class="fc-metric-value">${maxTemp} °C</div>
              <div class="fc-metric-hint">${item.finishTemp ? 'Final reading' : 'Awaiting finish temperature'}</div>
            </div>
            <div class="fc-metric-card ${item.complianceResult === 'Compliant' ? 'compliant' : item.complianceResult === 'Non-Compliant' ? 'nc' : ''}">
              <div class="fc-metric-label">ITEM RESULT</div>
              <div class="fc-metric-value">${item.complianceResult ?? '—'}</div>
              ${item.complianceResult === 'Compliant' ? `<div class="fc-metric-status"><svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg> Meets the applied rule set</div>` : ''}
              ${item.complianceResult === 'Non-Compliant' ? `<div class="fc-metric-status nc"><svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg> Does not meet the applied rule set</div>` : ''}
              ${!item.complianceResult ? `<div class="fc-metric-hint">Calculated on finish</div>` : ''}
            </div>
          </div>

          <div class="form-group" style="margin-top:16px">
            <label class="form-label">Remarks</label>
            <textarea class="form-input" id="fc-${item.linkId}-remarks" placeholder="Remarks" rows="3"></textarea>
          </div>

          ${item.complianceResult === 'Non-Compliant' ? `
          <div style="margin-top:20px;padding:16px;border:1px solid var(--border);border-radius:8px">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
              <div class="form-group">
                <label class="form-label required">Root cause</label>
                <select class="form-input" id="exc-fc-${item.linkId}-root">
                  <option value="">Select root cause...</option><option>Equipment</option><option>Process</option><option>Manpower</option><option>Other</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label required">Corrective action</label>
                <input type="text" class="form-input" id="exc-fc-${item.linkId}-corrective" placeholder="Corrective action taken" />
              </div>
              <div class="form-group">
                <label class="form-label required">Food disposed?</label>
                <div class="fc-segmented-control">
                  <button type="button" class="fc-segment-btn" id="exc-fc-${item.linkId}-disposed-yes" onclick="toggleDisposed('${item.linkId}','yes')">Yes</button>
                  <button type="button" class="fc-segment-btn active" id="exc-fc-${item.linkId}-disposed-no" onclick="toggleDisposed('${item.linkId}','no')">No</button>
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Photo evidence</label>
                <div>
                  <input type="file" accept="image/*" id="exc-fc-${item.linkId}-photo" style="display:none" onchange="handlePhotoUpload('${item.linkId}', this)" />
                  <button type="button" class="btn-photo" style="border:2px dashed var(--border);background:transparent;padding:16px 24px;border-radius:8px;color:var(--accent);cursor:pointer" onclick="document.getElementById('exc-fc-${item.linkId}-photo').click()">+ Photo</button>
                  <div id="exc-fc-${item.linkId}-photo-preview" style="margin-top:8px"></div>
                </div>
              </div>
            </div>
          </div>
          ` : ''}

          <div id="fc-error-${item.linkId}" class="badge-error hidden" style="margin-top:12px"></div>
        </div>
      </td>
    </tr>
  `;
}

let fcTimerInterval = null;

function startFCTimer() {
  if (fcTimerInterval) return;
  fcTimerInterval = setInterval(() => {
    const job = currentJob();
    if (!job) return;
    const items = job.foodChecker.items || [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.startTime && !item.finishTime) {
        const elapsed = elapsedMin(item.startTime);
        // Update elapsed in table row
        const rowEl = document.getElementById(`fc-elapsed-${i}`);
        if (rowEl) rowEl.textContent = fmtElapsed(elapsed);
        // Update expanded panel if this item is expanded
        if (state.fcExpanded === item.linkId) {
          const timerVal = document.querySelector('.fc-timer-value');
          if (timerVal) {
            const limits = hmLimits(job);
            timerVal.innerHTML = `${fmtElapsed(elapsed)} <span>/ ${limits.exposureMax} min</span>`;
          }
        }
      }
    }
    // Auto-stop if no running items
    const hasRunning = items.some(it => it.startTime && !it.finishTime);
    if (!hasRunning) stopFCTimer();
  }, 1000);
}

function stopFCTimer() {
  if (fcTimerInterval) {
    clearInterval(fcTimerInterval);
    fcTimerInterval = null;
  }
}

function checkAndStartFCTimer() {
  const job = currentJob();
  if (!job) return;
  const hasRunning = (job.foodChecker.items || []).some(it => it.startTime && !it.finishTime);
  if (hasRunning && !fcTimerInterval) startFCTimer();
}

function toggleFCExpand(linkId) {
  state.fcExpanded = state.fcExpanded === linkId ? null : linkId;
  renderDetail();
}

function fcToggleSelect(linkId) {
  if (!state.fcSelected) state.fcSelected = [];
  const idx = state.fcSelected.indexOf(linkId);
  if (idx >= 0) {
    state.fcSelected.splice(idx, 1);
  } else {
    state.fcSelected.push(linkId);
  }
  renderDetail();
}

function fcClearSelection() {
  state.fcSelected = [];
  renderDetail();
}

function fcStartSelected() {
  const job = currentJob();
  const items = job.foodChecker.items || [];
  const selected = (state.fcSelected || []).filter((id) => {
    const item = items.find((it) => it.linkId === id);
    return item && !item.startTime && !item.complianceResult;
  });
  
  if (selected.length === 0) {
    showErr("fc-error", "No selectable items in selection.");
    return;
  }
  
  const now = new Date().toISOString();
  for (const linkId of selected) {
    const item = items.find((it) => it.linkId === linkId);
    if (!item) continue;
    const st = document.getElementById(`fc-st-temp-${linkId}`)?.value;
    if (st === "" || st == null) {
      showErr("fc-error", `Start temperature required for ${item.item_description}.`);
      return;
    }
    item.startTemp = parseFloat(st);
    item.startTime = now;
    job.history.push({ at: now, actor: "Food Checker", field: "fc.item", from: "NotStarted", to: "InProgress", stage: "foodchecker", version: 1 });
  }
  
  state.fcSelected = [];
  renderDetail();
  checkAndStartFCTimer();
}

function fcFinishSelected() {
  const job = currentJob();
  const items = job.foodChecker.items || [];
  const selected = (state.fcSelected || []).filter((id) => {
    const item = items.find((it) => it.linkId === id);
    return item && item.startTime && !item.complianceResult;
  });
  
  if (selected.length === 0) {
    showErr("fc-error", "No finishable items in selection.");
    return;
  }
  
  const now = new Date().toISOString();
  for (const linkId of selected) {
    const item = items.find((it) => it.linkId === linkId);
    if (!item) continue;
    const ft = document.getElementById(`fc-ft-temp-${linkId}`)?.value;
    if (ft === "" || ft == null) {
      showErr("fc-error", `Finish temperature required for ${item.item_description}.`);
      return;
    }
    item.finishTemp = parseFloat(ft);
    item.finishTime = now;
    const limits = hmLimits(job);
    item.durationMin = Math.round((new Date(now) - new Date(item.startTime)) / 60000);
    const maxTemp = Math.max(item.startTemp, item.finishTemp);
    item.complianceResult = item.durationMin > limits.exposureMax || maxTemp > limits.presetTempMax ? "Non-Compliant" : "Compliant";
    job.history.push({ at: now, actor: "Food Checker", field: "fc.item", from: "InProgress", to: item.complianceResult, stage: "foodchecker", version: 1 });
  }
  
  state.fcSelected = [];
  state.fcExpanded = null;
  renderDetail();
  checkAndStartFCTimer();
}

// ── Attach FC functions to window ──────────────────────────────────
window.toggleFCExpand = toggleFCExpand;
window.fcToggleSelect = fcToggleSelect;
window.fcClearSelection = fcClearSelection;
window.fcStartSelected = fcStartSelected;
window.fcFinishSelected = fcFinishSelected;
window.filterBySICC = filterBySICC;

function renderItemRow(job, item, i, submitted) {
  const st = itemStatus(item, job);
  const dis = submitted ? "disabled" : "";
  const finished = !!item.complianceResult;
  const started = !!item.startTime && !finished;
  const action = finished
    ? item.complianceResult === "Non-Compliant"
      ? `<button type="button" class="btn-ghost" onclick="document.getElementById('exc-fc-${item.linkId}-immediate')?.focus()">Exception</button>`
      : `<span class="status-pill compliant">Compliant</span>`
    : started
      ? `<button type="button" class="btn-secondary" id="fc-fin-${item.linkId}" onclick="finishItem('${item.linkId}')" ${dis}>Finish</button>`
      : `<button type="button" class="btn-primary" id="fc-st-${item.linkId}" onclick="startItem('${item.linkId}')" ${dis}>Start Timer</button>`;
  return `
    <tr>
      <td>${esc(item.sku)}</td>
      <td>${esc(item.item_description)}</td>
      <td>${esc(item.class)}</td>
      <td>${esc(item.quantity)}</td>
      <td><input type="number" step="0.1" class="form-input" style="width:90px" id="fc-st-temp-${item.linkId}" value="${item.startTemp ?? ""}" ${dis} oninput="updateItemGate('${item.linkId}')" /></td>
      <td><span id="fc-elapsed-${i}">${st.el != null ? fmtElapsed(st.el) : "—"}</span></td>
      <td><input type="number" step="0.1" class="form-input" style="width:90px" id="fc-ft-temp-${item.linkId}" value="${item.finishTemp ?? ""}" ${dis} oninput="updateItemGate('${item.linkId}')" /></td>
      <td>${pill(st.label, st.cls, st.el)}</td>
      <td>${action}</td>
    </tr>`;
}

function updateItemGate(linkId) {
  const btn = document.getElementById("fc-st-" + linkId);
  if (!btn) return;
  const st = document.getElementById("fc-st-temp-" + linkId);
  btn.disabled = st && st.value === "";
}

function updateItemField(linkId, field) {
  const job = currentJob();
  const item = (job.foodChecker.items || []).find((it) => it.linkId === linkId);
  if (!item) return;
  
  const inputEl = document.getElementById(`fc-${field === 'startTemp' ? 'st' : 'ft'}-temp-${linkId}`);
  if (!inputEl) return;
  
  const value = inputEl.value;
  if (value !== "" && value != null) {
    item[field] = parseFloat(value);
  } else {
    item[field] = null;
  }
}

function updateStartTime(linkId) {
  const job = currentJob();
  const item = (job.foodChecker.items || []).find((it) => it.linkId === linkId);
  if (!item) return;
  
  const inputEl = document.getElementById(`fc-st-time-${linkId}`);
  if (!inputEl) return;
  
  const value = inputEl.value;
  if (value) {
    const [hours, minutes] = value.split(':').map(Number);
    const now = new Date();
    now.setHours(hours, minutes, 0, 0);
    item.startTime = now.toISOString();
    
    const expandedInput = document.querySelector(`#fc-expanded-${linkId} input[type="time"]:disabled`);
    if (expandedInput) {
      expandedInput.value = value;
    }
  } else {
    item.startTime = null;
  }
}

function startItem(linkId) {
  const job = currentJob();
  const item = (job.foodChecker.items || []).find((it) => it.linkId === linkId);
  if (!item) return;
  
  // Try to read from DOM input first
  const inputEl = document.getElementById("fc-st-temp-" + linkId);
  const st = inputEl?.value;
  
  // Fallback to item.startTemp if DOM input is empty
  const startTemp = (st !== "" && st != null) ? parseFloat(st) : item.startTemp;
  
  if (startTemp == null || isNaN(startTemp)) {
    showErr(`fc-error-${linkId}`, "Start temperature is required before starting this item's timer.");
    return;
  }
  
  item.startTemp = startTemp;
  item.startTime = new Date().toISOString();
  job.history.push({ at: item.startTime, actor: "Food Checker", field: "fc.item", from: "NotStarted", to: "InProgress", stage: "foodchecker", version: 1 });
  renderDetail();
  checkAndStartFCTimer();
}

function finishItem(linkId) {
  const job = currentJob();
  const item = (job.foodChecker.items || []).find((it) => it.linkId === linkId);
  if (!item) return;
  const ft = document.getElementById("fc-ft-temp-" + linkId)?.value;
  if (ft === "" || ft == null) {
    showErr(`fc-error-${linkId}`, "Finish temperature is required before completing this item.");
    return;
  }
  item.finishTemp = parseFloat(ft);
  item.finishTime = new Date().toISOString();
  const limits = hmLimits(job);
  item.durationMin = Math.round((new Date(item.finishTime) - new Date(item.startTime)) / 60000);
  const maxTemp = Math.max(item.startTemp, item.finishTemp);
  item.complianceResult =
    item.durationMin > limits.exposureMax || maxTemp > limits.presetTempMax ? "Non-Compliant" : "Compliant";
  job.history.push({ at: item.finishTime, actor: "Food Checker", field: "fc.item", from: "InProgress", to: item.complianceResult, stage: "foodchecker", version: 1 });
  renderDetail();
  checkAndStartFCTimer();
}

// ── Dispatch tab ────────────────────────────────────────────────────
function dispatchLive(job) {
  const d = job.dispatch;
  if (job.site !== "SICC2") return null;
  if (!d) return { label: "Locked", cls: "locked", el: null };
  if (d.status === "Submitted") {
    return { label: d.complianceResult === "Compliant" ? "Compliant" : "Non-Compliant", cls: d.complianceResult === "Compliant" ? "compliant" : "nc", el: null };
  }
  if (!d.coldSoakStart) return { label: "Locked", cls: "locked", el: null };
  const el = elapsedMin(d.coldSoakStart);
  const min = hmLimits(job).coldSoakMin;
  if (el >= min) return { label: "Eligible for dispatch", cls: "eligible", el };
  return { label: "Cold Soak", cls: "cold-soak", el };
}

function renderDispatch(body, job) {
  if (job.site !== "SICC2") {
    body.innerHTML = `<div class="empty-state">Dispatch is not available at ${esc(job.site)}.</div>`;
    return;
  }
  const d = job.dispatch;
  const submitted = d?.status === "Submitted";
  if (!d || job.preset.status !== "Submitted") {
    body.innerHTML = `<div class="empty-state">Locked — Preset must be submitted first.</div>`;
    return;
  }
  const live = dispatchLive(job);
  const min = hmLimits(job).coldSoakMin;
  const eligibleAt = d.coldSoakStart ? new Date(new Date(d.coldSoakStart).getTime() + min * 60000).toLocaleTimeString() : "—";
  const dis = submitted ? "disabled" : "";
  body.innerHTML = `
    <div class="panel">
      <div class="panel-title" style="display:flex;justify-content:space-between;align-items:center">
        <span>Cold Soak Progress</span>
        <span id="disp-pill">${pill(live.label, live.cls, live.el)}</span>
      </div>
      <p style="font-size:13px;margin-bottom:6px">Elapsed: <b id="disp-elapsed">${live.el != null ? fmtElapsed(live.el) : "—"}</b> · Minimum: ${min} min · Eligible at: <b>${esc(eligibleAt)}</b></p>
    </div>
    <div class="panel">
      <div class="panel-title">Before-Exit Capture</div>
      <div class="form-grid">
        <div class="form-group"><label class="form-label required">Time Before Exiting Holding Room</label>
          <input type="time" class="form-input" id="d-exit-time" value="${d.beforeExitTime ?? ""}" ${dis} /></div>
        <div class="form-group"><label class="form-label required">Surface Temp Before Exiting (°C)</label>
          <input type="number" step="0.1" class="form-input" id="d-exit-temp" value="${d.beforeExitTemp ?? ""}" ${dis} /></div>
      </div>
      <div id="dispatch-error" class="badge-error hidden" style="margin-top:12px"></div>
    </div>
    ${renderDispatchCompliance(job)}
    ${d.complianceResult === "Non-Compliant" ? renderExceptionPanel("dispatch") : ""}
    ${submitted ? renderSubmittedPanel(job, "dispatch") : submitButton("dispatch", "")}`;
}

function renderDispatchCompliance(job) {
  const d = job.dispatch;
  if (!d.beforeExitTime && d.status !== "Submitted") return "";
  const limits = hmLimits(job);
  const dur = d.coldSoakDurationMin;
  const result = d.complianceResult || "Compliant";
  return `
    <div class="panel">
      <div class="panel-title">Compliance Summary</div>
      <div class="form-grid">
        <div><div class="jh-label">Cold Soak Duration</div><div class="jh-value">${dur ?? "—"} min (min ${limits.coldSoakMin})</div></div>
        <div><div class="jh-label">Dispatch Temp</div><div class="jh-value">${d.beforeExitTemp ?? "—"} °C (max ≤ ${limits.dispatchTempMax})</div></div>
        <div><div class="jh-label">Dispatch Result</div><div>${pill(result, result === "Compliant" ? "compliant" : "nc")}</div></div>
      </div>
    </div>`;
}

// ── Submit stage ────────────────────────────────────────────────────
function submitStage(stage) {
  const job = currentJob();
  const errId = stage === "preset" ? "preset-error" : stage === "foodchecker" ? "fc-error" : "dispatch-error";

  if (stage === "preset") {
    const services = job.preset.services || [{}];
    if (!services.every(s => s.finishTime)) return showErr(errId, "All services must be finished before submitting.");
    const hasNonCompliant = services.some(s => s.complianceResult === "Non-Compliant");
    if (hasNonCompliant) {
      const exErr = validateException("preset");
      if (exErr) return showErr(errId, exErr);
    }
  }

  if (stage === "foodchecker") {
    const items = job.foodChecker.items || [];
    if (!items.length) return showErr(errId, "No linked items to check.");
    const unfinished = items.filter((it) => !it.complianceResult);
    if (unfinished.length) return showErr(errId, `${unfinished.length} item(s) still unfinished.`);
    for (const it of items) {
      if (it.complianceResult === "Non-Compliant") {
        const exErr = validateException(it.linkId);
        if (exErr) return showErr(errId, `${it.sku}: ${exErr}`);
      }
    }
  }

  if (stage === "dispatch") {
    const t = document.getElementById("d-exit-time")?.value;
    const temp = document.getElementById("d-exit-temp")?.value;
    if (!t || temp === "") return showErr(errId, "Before-exit time and temperature are required.");
    job.dispatch.beforeExitTime = t;
    job.dispatch.beforeExitTemp = parseFloat(temp);
    const exitHM = hmParse(t);
    const startHM = timeOfDayHM(job.preset.finishTime);
    let dur = exitHM - startHM;
    if (dur < 0) dur += 1440;
    job.dispatch.coldSoakDurationMin = dur;
    const limits = hmLimits(job);
    job.dispatch.complianceResult =
      dur < limits.coldSoakMin || job.dispatch.beforeExitTemp > limits.dispatchTempMax ? "Non-Compliant" : "Compliant";
    if (job.dispatch.complianceResult === "Non-Compliant") {
      const exErr = validateException("dispatch");
      if (exErr) return showErr(errId, exErr);
    }
    renderDetail();
  }

  openSignoff(stage);
}

function commitStage(stage, resolved, method) {
  const job = currentJob();
  if (!job) return;
  const now = new Date().toISOString();
  const signoff = {
    stage,
    staffId: resolved.staffId,
    staffName: resolved.staffName,
    role: resolved.role,
    captureMethod: method,
    submittedAt: now,
  };
  job.signoffs = job.signoffs || [];

  if (stage === "preset") {
    job.preset.status = "Submitted";
    if (job.preset.complianceResult === "Non-Compliant") {
      const ex = readException("preset");
      ex.exception_id = "EXC-" + job.job_id + "-preset";
      job.exceptions = job.exceptions || [];
      job.exceptions.push(ex);
      job.preset.exceptionId = ex.exception_id;
    }
    job.signoffs.push(signoff);
    job.history.push({ at: now, actor: resolved.staffId, field: "preset", from: "Started", to: "Submitted", stage: "preset", version: 1 });
    if (job.site === "SICC2") {
      job.dispatch = job.dispatch || { status: "ColdSoak" };
      job.dispatch.coldSoakStart = job.preset.finishTime;
    }
  }

  if (stage === "foodchecker") {
    job.foodChecker.status = "Submitted";
    for (const it of job.foodChecker.items || []) {
      if (it.complianceResult === "Non-Compliant") {
        const ex = readException(it.linkId);
        ex.exception_id = "EXC-" + job.job_id + "-" + it.sku;
        job.exceptions = job.exceptions || [];
        job.exceptions.push(ex);
        it.exceptionId = ex.exception_id;
      }
    }
    job.signoffs.push(signoff);
    job.history.push({ at: now, actor: resolved.staffId, field: "foodchecker", from: "InProgress", to: "Submitted", stage: "foodchecker", version: 1 });
  }

  if (stage === "dispatch") {
    job.dispatch.status = "Submitted";
    if (job.dispatch.complianceResult === "Non-Compliant") {
      const ex = readException("dispatch");
      ex.exception_id = "EXC-" + job.job_id + "-dispatch";
      job.exceptions = job.exceptions || [];
      job.exceptions.push(ex);
      job.dispatch.exceptionId = ex.exception_id;
    }
    job.signoffs.push(signoff);
    job.history.push({ at: now, actor: resolved.staffId, field: "dispatch", from: "ColdSoak", to: "Submitted", stage: "dispatch", version: 1 });
  }

  maybeCloseJob(job);
  persistJob(job);
}

// ── Live tick for detail ────────────────────────────────────────────
function tickDetailLive() {
  const job = currentJob();
  if (!job) return;
  const pillEl = document.getElementById("preset-pill");
  const timerEl = document.getElementById("p-timer-display");
  if (state.activeTab === "preset") {
    const st = presetLiveState(job);
    if (pillEl) pillEl.innerHTML = pill(st.label, st.cls, st.el);
    if (timerEl && job.preset.startTime) timerEl.textContent = fmtElapsed(elapsedMin(job.preset.startTime));
  }
  if (state.activeTab === "foodchecker") {
    (job.foodChecker.items || []).forEach((it, i) => {
      const el = document.getElementById("fc-elapsed-" + i);
      if (!el) return;
      const st = itemStatus(it, job);
      if (st.el != null) el.textContent = fmtElapsed(st.el);
    });
  }
  if (state.activeTab === "dispatch") {
    const dispEl = document.getElementById("disp-elapsed");
    const pillEl = document.getElementById("disp-pill");
    if (dispEl && pillEl) {
      const live = dispatchLive(job);
      dispEl.textContent = live.el != null ? fmtElapsed(live.el) : "—";
      pillEl.innerHTML = pill(live.label, live.cls, live.el);
    }
  }
}

// ── All CCP6 Jobs (S2) ─────────────────────────────────────────────
const ALL_COLUMNS = [
  "Job ID", "Flight", "Flight Date", "ETD", "Meal", "Group", "Airline", "Site",
  "Preset", "Food Checker", "Dispatch", "Overall", "Verification", "Status", "Closed At", "",
];

const allFilters = {
  site: "", meal: "", group: "", airline: "", status: "", compliance: "",
};
let allSearch = "";

function stageResultText(job, stage) {
  if (stage === "preset") {
    const p = job.preset;
    if (p.status === "Submitted") return p.complianceResult === "Compliant" ? "Compliant" : "Non-Compliant";
    if (p.startTime && !p.finishTime) return "In Progress";
    return "Not Started";
  }
  if (stage === "foodchecker") {
    const fc = job.foodChecker;
    const items = fc.items || [];
    if (fc.status === "Submitted") {
      const nc = items.filter((i) => i.complianceResult === "Non-Compliant").length;
      return nc ? "Non-Compliant" : "Compliant";
    }
    const started = items.filter((i) => i.startTime).length;
    if (started) return started + "/" + items.length + " started";
    return items.length ? "Not Started" : "No items";
  }
  if (stage === "dispatch") {
    const d = job.dispatch;
    if (job.site !== "SICC2") return "—";
    if (!d || d.status !== "Submitted") return d?.coldSoakStart ? "Cold Soak" : "Locked";
    return d.complianceResult === "Compliant" ? "Compliant" : "Non-Compliant";
  }
  return "";
}

function allStageSubmitted(job) {
  const done = [job.preset?.status === "Submitted", job.foodChecker?.status === "Submitted"];
  if (job.site === "SICC2") done.push(job.dispatch?.status === "Submitted");
  return done.every(Boolean);
}

function overallCompliance(job) {
  const stages = ["preset", "foodchecker"];
  if (job.site === "SICC2") stages.push("dispatch");
  const results = stages
    .map((s) => stageResultText(job, s))
    .filter((r) => r === "Compliant" || r === "Non-Compliant");
  if (results.includes("Non-Compliant")) return "Non-Compliant";
  if (results.length === stages.length) return "Compliant";
  return "In Progress";
}

function filteredJobs() {
  const q = allSearch.toLowerCase();
  return state.jobs.filter((j) => {
    if (allFilters.site && j.site !== allFilters.site) return false;
    if (allFilters.meal && j.meal_service !== allFilters.meal) return false;
    if (allFilters.group && j.ta_group !== allFilters.group) return false;
    if (allFilters.airline && j.airline !== allFilters.airline) return false;
    if (allFilters.status && (j.job_status || (j.closed ? "Closed" : "Open")) !== allFilters.status) return false;
    if (allFilters.compliance && overallCompliance(j) !== allFilters.compliance) return false;
    if (!q) return true;
    const hay = [j.job_id, j.flight_number, j.airline, j.ta_group, j.meal_service].join(" ").toLowerCase();
    return hay.includes(q);
  });
}

function buildAllFilters() {
  const wrap = document.getElementById("all-filter-panel");
  if (!wrap) return;
  const sel = (id, label, options) =>
    `<div class="form-group"><label class="form-label">${label}</label><select class="form-input" id="${id}"><option value="">All</option>${options
      .map((o) => `<option value="${esc(o)}"${allFilters[id.replace("f-", "")]
      ? o === allFilters[id.replace("f-", "")]
      ? " selected"
      : ""
      : ""}>${esc(o)}</option>`)
      .join("")}</select></div>`;
  const siteOpts = [...new Set(state.jobs.map((j) => j.site).filter(Boolean))];
  const mealOpts = CONFIG.mealServices;
  const groupOpts = CONFIG.taGroups;
  const airlineOpts = [...new Set(state.jobs.map((j) => j.airline).filter(Boolean))];
  const statusOpts = ["Open", "Closed", "Voided"];
  const complOpts = ["Compliant", "Non-Compliant", "In Progress"];
  wrap.innerHTML =
    sel("f-site", "Site", siteOpts) +
    sel("f-meal", "Meal Service", mealOpts) +
    sel("f-group", "Group", groupOpts) +
    sel("f-airline", "Airline", airlineOpts) +
    sel("f-status", "Status", statusOpts) +
    sel("f-compliance", "Overall", complOpts);
  for (const key of Object.keys(allFilters)) {
    const el = document.getElementById("f-" + key);
    if (el) el.value = allFilters[key];
  }
  wrap.querySelectorAll("select").forEach((s) => {
    s.addEventListener("change", () => {
      allFilters[s.id.replace("f-", "")] = s.value;
      renderAll();
    });
  });
}

function renderAll() {
  const thead = document.getElementById("all-thead");
  const tbody = document.getElementById("all-tbody");
  if (!thead || !tbody) return;
  thead.innerHTML = `<tr>${ALL_COLUMNS.map((c) => (c ? `<th>${esc(c)}</th>` : `<th></th>`)).join("")}</tr>`;
  const rows = filteredJobs();
  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="${ALL_COLUMNS.length}"><div class="empty-state">No jobs match the current filters.</div></td></tr>`;
    return;
  }
  tbody.innerHTML = rows
    .map((j) => {
      const overall = overallCompliance(j);
      const status = j.job_status || (j.closed ? "Closed" : "Open");
      const closedAt = j.closedAt ? new Date(j.closedAt).toLocaleString() : "—";
      return `<tr>
        <td>${esc(j.job_id)}</td>
        <td>${esc(j.flight_number)}</td>
        <td>${esc(j.flight_date)}</td>
        <td>${esc(j.etd)}</td>
        <td>${esc(j.meal_service)}</td>
        <td>${esc(j.ta_group)}</td>
        <td>${esc(j.airline)}</td>
        <td>${esc(j.site)}</td>
        <td>${esc(stageResultText(j, "preset"))}</td>
        <td>${esc(stageResultText(j, "foodchecker"))}</td>
        <td>${esc(stageResultText(j, "dispatch"))}</td>
        <td>${esc(overall)}</td>
        <td>—</td>
        <td>${esc(status)}</td>
        <td>${esc(closedAt)}</td>
        <td><button type="button" class="btn-secondary" style="padding:5px 10px" onclick="openJob('${esc(j.job_id)}')">Open</button> <button type="button" class="btn-secondary" style="padding:5px 10px" onclick="openReport('${esc(j.job_id)}')">Report</button></td>
      </tr>`;
    })
    .join("");
}

function filterAll() {
  allSearch = document.getElementById("all-search")?.value.trim() || "";
  renderAll();
}

function toggleAllFilters() {
  const panel = document.getElementById("all-filter-panel");
  panel.classList.toggle("hidden");
  if (!panel.classList.contains("hidden")) buildAllFilters();
}

function exportExcel() {
  const rows = filteredJobs();
  const lines = [ALL_COLUMNS.filter(Boolean).join(",")];
  for (const j of rows) {
    const status = j.job_status || (j.closed ? "Closed" : "Open");
    lines.push([
      j.job_id, j.flight_number, j.flight_date, j.etd, j.meal_service, j.ta_group, j.airline, j.site,
      stageResultText(j, "preset"), stageResultText(j, "foodchecker"), stageResultText(j, "dispatch"),
      overallCompliance(j), "—", status, j.closedAt ? new Date(j.closedAt).toLocaleString() : "",
    ].map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","));
  }
  downloadFile("ccp6-all-jobs.csv", lines.join("\n"), "text/csv");
}

function downloadFile(name, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Web Report (S5) ────────────────────────────────────────────────
function renderReport() {
  const job = currentJob();
  const body = document.getElementById("report-body");
  if (!job) {
    body.innerHTML = `<div class="empty-state">Job not found.</div>`;
    return;
  }
  document.getElementById("report-sub").textContent = `${job.flight_number} · ${job.meal_service} · Grp ${job.ta_group} · ${job.airline} · ${job.site}`;
  const tag = (label, v) => `<div class="form-group"><div class="jh-label">${esc(label)}</div><div class="jh-value">${esc(v)}</div></div>`;
  const fcItems = (job.foodChecker.items || []).map((it) => `<tr>
    <td>${esc(it.sku)}</td><td>${esc(it.item_description)}</td><td>${esc(it.class)}</td><td>${esc(it.quantity)}</td>
    <td>${it.startTemp ?? "—"}</td><td>${it.finishTemp ?? "—"}</td><td>${it.durationMin ?? "—"} min</td>
    <td>${esc(it.complianceResult || "Not Started")}</td></tr>`).join("");
  const signoffRows = (job.signoffs || []).map((s) => `<tr><td>${esc(s.stage)}</td><td>${esc(s.staffName)} (${esc(s.staffId)})</td><td>${esc(s.role)}</td><td>${esc(s.captureMethod)}</td><td>${esc(new Date(s.submittedAt).toLocaleString())}</td></tr>`).join("");
  const historyRows = (job.history || []).map((h) => `<tr><td>${esc(new Date(h.at).toLocaleString())}</td><td>${esc(h.actor)}</td><td>${esc(h.field)}</td><td>${esc(h.from)} → ${esc(h.to)}</td><td>${esc(h.stage)}</td></tr>`).join("");
  const overall = overallCompliance(job);
  body.innerHTML = `
    <div class="panel"><div class="panel-title">Job Context</div><div class="form-grid">
      ${tag("Job ID", job.job_id)}${tag("Flight", job.flight_number)}${tag("Flight Date", job.flight_date)}${tag("ETD", job.etd)}
      ${tag("Meal Service", job.meal_service)}${tag("Group", job.ta_group)}${tag("Airline", job.airline)}${tag("Site", job.site)}
      ${tag("Rule Set", job.rule_set)}${tag("Status", job.job_status || (job.closed ? "Closed" : "Open"))}${tag("Overall", overall)}
    </div></div>
    <div class="panel"><div class="panel-title">Linked CCP5 Items</div><div class="table-wrap"><table class="data-table">
      <thead><tr><th>SKU</th><th>Description</th><th>Class</th><th>Qty</th><th>Source</th></tr></thead>
      <tbody>${(job.linkedItems || []).map((l) => `<tr><td>${esc(l.sku)}</td><td>${esc(l.item_description)}</td><td>${esc(l.class)}</td><td>${esc(l.quantity)}</td><td>${esc(l.ccp5_record_id)}</td></tr>`).join("")}</tbody>
    </table></div></div>
    <div class="panel"><div class="panel-title">Preset</div><div class="form-grid">
      ${tag("Start", job.preset.startTime ? new Date(job.preset.startTime).toLocaleString() : "—")}
      ${tag("Finish", job.preset.finishTime ? new Date(job.preset.finishTime).toLocaleString() : "—")}
      ${tag("Exposure", (job.preset.exposureDurationMin ?? "—") + " min")}
      ${tag("HO Start/Finish", (job.preset.startTempHorsDoeuvre ?? "—") + " / " + (job.preset.finishTempHorsDoeuvre ?? "—") + " °C")}
      ${tag("Dessert Start/Finish", (job.preset.startTempDessert ?? "—") + " / " + (job.preset.finishTempDessert ?? "—") + " °C")}
      ${tag("Result", job.preset.complianceResult || "—")}
      ${tag("Trays/Staff", (job.preset.traysHandled ?? "—") + " / " + (job.preset.staffCount ?? "—"))}
    </div></div>
    <div class="panel"><div class="panel-title">Food Checker</div><div class="table-wrap"><table class="data-table">
      <thead><tr><th>SKU</th><th>Description</th><th>Class</th><th>Qty</th><th>Start</th><th>Finish</th><th>Duration</th><th>Result</th></tr></thead>
      <tbody>${fcItems || `<tr><td>No items</td></tr>`}</tbody></table></div></div>
    ${job.site === "SICC2" ? `<div class="panel"><div class="panel-title">Dispatch</div><div class="form-grid">
      ${tag("Cold Soak Start", job.dispatch?.coldSoakStart ? new Date(job.dispatch.coldSoakStart).toLocaleString() : "—")}
      ${tag("Before-Exit Time", job.dispatch?.beforeExitTime || "—")}
      ${tag("Dispatch Temp", (job.dispatch?.beforeExitTemp ?? "—") + " °C")}
      ${tag("Cold Soak Duration", (job.dispatch?.coldSoakDurationMin ?? "—") + " min")}
      ${tag("Result", job.dispatch?.complianceResult || "—")}
    </div></div>` : ""}
    <div class="panel"><div class="panel-title">Exceptions</div>
      ${(job.exceptions || []).length ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>ID</th><th>Root Cause</th><th>Correction</th><th>Disposed</th></tr></thead><tbody>${job.exceptions.map((e) => `<tr><td>${esc(e.exception_id)}</td><td>${esc(e.rootCause || e.root_cause)}</td><td>${esc(e.immediateCorrection || e.immediate_correction)}</td><td>${esc(e.foodDisposed != null ? (e.foodDisposed === true || e.foodDisposed === "Yes" ? "Yes" : "No") : e.food_disposed)}</td></tr>`).join("")}</tbody></table></div>` : `<div class="empty-state" style="padding:20px">No exceptions recorded.</div>`}
    </div>
    <div class="panel"><div class="panel-title">Sign-offs</div>
      ${signoffRows ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>Stage</th><th>Staff</th><th>Role</th><th>Method</th><th>Submitted</th></tr></thead><tbody>${signoffRows}</tbody></table></div>` : `<div class="empty-state" style="padding:20px">No sign-offs yet.</div>`}
    </div>
    <div class="panel"><div class="panel-title">Record History</div>
      ${historyRows ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>Time</th><th>Actor</th><th>Field</th><th>Change</th><th>Stage</th></tr></thead><tbody>${historyRows}</tbody></table></div>` : `<div class="empty-state" style="padding:20px">No history.</div>`}
    </div>`;
}

function exportJob(format) {
  const job = currentJob();
  if (!job) return;
  const lines = [`CCP6 Web Report — ${job.job_id}`];
  lines.push(`Job ID,${job.job_id}`);
  lines.push(`Flight,${job.flight_number}`);
  lines.push(`Flight Date,${job.flight_date}`);
  lines.push(`ETD,${job.etd}`);
  lines.push(`Meal Service,${job.meal_service}`);
  lines.push(`Group,${job.ta_group}`);
  lines.push(`Airline,${job.airline}`);
  lines.push(`Site,${job.site}`);
  lines.push(`Rule Set,${job.rule_set}`);
  lines.push(`Overall,${overallCompliance(job)}`);
  const csv = lines
    .map((l) => l.split(",").map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  downloadFile("ccp6-" + job.job_id + (format === "pdf" ? ".csv" : ".csv"), csv, "text/csv");
}

// ── Init ────────────────────────────────────────────────────────────
window.navigate = navigate;
window.openJob = openJob;
window.openReport = openReport;
window.exportExcel = exportExcel;
window.toggleAllFilters = toggleAllFilters;
window.filterAll = filterAll;
window.submitCreateJob = submitCreateJob;
window.exportJob = exportJob;
window.resolveIdentity = resolveIdentity;
window.confirmSignoff = confirmSignoff;
window.closeSignoff = closeSignoff;
window.switchTab = switchTab;
window.startPreset = startPreset;
window.finishPreset = finishPreset;
window.updatePresetGates = updatePresetGates;
window.addService = addService;
window.removeService = removeService;
window.startService = startService;
window.finishService = finishService;
window.startItem = startItem;
window.finishItem = finishItem;
window.updateItemGate = updateItemGate;
window.updateItemField = updateItemField;
window.updateStartTime = updateStartTime;

function toggleDisposed(linkId, value) {
  const yesBtn = document.getElementById(`exc-fc-${linkId}-disposed-yes`);
  const noBtn = document.getElementById(`exc-fc-${linkId}-disposed-no`);
  if (value === 'yes') {
    yesBtn.classList.add('active');
    noBtn.classList.remove('active');
  } else {
    noBtn.classList.add('active');
    yesBtn.classList.remove('active');
  }
}
window.toggleDisposed = toggleDisposed;

function handlePhotoUpload(linkId, input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    const preview = document.getElementById(`exc-fc-${linkId}-photo-preview`);
    if (preview) {
      preview.innerHTML = `<img src="${e.target.result}" style="max-width:100%;max-height:120px;border-radius:6px" />`;
    }
  };
  reader.readAsDataURL(file);
}
window.handlePhotoUpload = handlePhotoUpload;
window.submitStage = submitStage;
window.selectCreateFlight = selectCreateFlight;
window.renderAll = renderAll;
window.filterAll = filterAll;
window.toggleAllFilters = toggleAllFilters;
window.exportExcel = exportExcel;
window.renderReport = renderReport;
window.exportJob = exportJob;

document.addEventListener("DOMContentLoaded", async () => {
  window.__renderHooks = {
    create: renderCreate,
    current: renderCurrent,
    detail: renderDetail,
    all: renderAll,
    report: renderReport,
  };
  const view = preview.currentViewId();
  const initial =
    Object.entries(VIEWS).find(([, id]) => id === view)?.[0] ||
    (view ? "detail" : "current");

  // Determine the target job from the record param before data loads, so a
  // deep-linked detail/report view knows which job to show.
  const recordId = preview.recordId();
  if ((initial === "detail" || initial === "report") && recordId) {
    state.activeJobId = recordId;
  }

  // Seed synchronously so the first paint always shows jobs immediately,
  // even while the store is still loading over the network.
  if (!state.jobs.length) state.jobs = buildSeed();

  // Paint the shell immediately (never a blank screen).
  navigate(initial);

  // Load persisted jobs asynchronously (with a timeout inside store.records),
  // then resolve the record to a real job and re-render.
  await loadJobs();
  if (recordId && (initial === "detail" || initial === "report")) {
    const matched = findJobByRecord(recordId);
    if (matched) state.activeJobId = matched.job_id;
    else state.activeJobId = recordId;
    navigate(initial);
  } else {
    navigate(initial);
  }

  startTicker();
});
