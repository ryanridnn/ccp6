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
    fetchJson(`/api/public/preview-store/${_SVC}?collection=${collection}`, {
      cache: "no-store",
    }).catch(() => []),
  records: (collection) =>
    fetchJson(
      `/api/public/preview-store/${_SVC}?collection=${collection}&mode=all`,
      { cache: "no-store" },
    ).catch(() => []),
  get: (collection, key) =>
    fetchJson(
      `/api/public/preview-store/${_SVC}?collection=${collection}&key=${encodeURIComponent(key)}`,
      { cache: "no-store" },
    )
      .then((r) => (r && r.record ? r.record : r))
      .catch(() => null),
  set: (collection, key, data) =>
    fetchJson(`/api/public/preview-store/${_SVC}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ collection, key, data }),
    }).catch(() => ({ ok: false })),
  del: (id) =>
    fetch(`/api/public/preview-store/${_SVC}?id=${id}`, {
      method: "DELETE",
    }).catch(() => {}),
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
    // Preserve d2path parameter if it exists
    const d2path = this.params.get("d2path");
    if (d2path) {
      next.set("d2path", d2path);
    }
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
    var run = async () => {
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
        svcId = this.serviceId;
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
        customElements.define = (name, ctor, opts) => {
          if (!captured && typeof name === "string" && name.indexOf("-") !== -1)
            captured = name;
          return origDefine(name, ctor, opts);
        };
        try {
          script = document.createElement("script");
          script.type = "module";
          script.src = src;
          script.dataset.embed = embedKey;
          await new Promise((res, rej) => {
            script.onload = () => {
              res();
            };
            script.onerror = () => {
              rej(new Error("failed to load " + src));
            };
            document.head.appendChild(script);
          });
          for (
            var i = 0;
            i < 40 && !captured && !window.__previewElementName;
            i++
          ) {
            await new Promise((r) => {
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
        if (!Object.hasOwn(props, k)) continue;
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
    this._embedQueue = next.catch(() => {});
    return next;
  },
};

if (!window.preview) window.preview = preview;

const VIEWS = {
  current: "pv-ccp6-current",
  all: "pv-kfb8yh",
  create: "pv-ji169l",
  detail: "pv-0gnlo8",
  report: "pv-rnop2z",
};

const SCREEN_IDS = { current: "screen-current" };

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
    STANDARD: {
      exposureMax: 45,
      presetTempMax: 15,
      coldSoakMin: 120,
      dispatchTempMax: 15,
    },
    UA: {
      exposureMax: 30,
      presetTempMax: 15,
      coldSoakMin: 120,
      dispatchTempMax: 4,
    },
    QF: {
      exposureMax: 45,
      presetTempMax: 15,
      coldSoakMin: 180,
      dispatchTempMax: 5,
    },
  },
  airlineRule: { QF: "QF", UA: "UA", OAL: "STANDARD" },
  warningThresholdMin: 5,
};

// ── Airline Logos ───────────────────────────────────────────────────
const airlineLogos = {
  AK: "https://1000logos.net/wp-content/uploads/2020/04/AirAsia-Logo-tumb.png",
  NZ: "https://1000logos.net/wp-content/uploads/2019/11/0015_Air-New-Zealand-Logo-500x281-1.jpg",
  "5J": "https://1000logos.net/wp-content/uploads/2020/10/Cebu-Pacific-Logo-tumb.jpg",
  CI: "https://1000logos.net/wp-content/uploads/2020/09/China-Airlines-logo-tumb.jpg",
  EK: "https://1000logos.net/wp-content/uploads/2019/12/Emirates-Logowww.jpg",
  BR: "https://1000logos.net/wp-content/uploads/2023/10/EVA-Air-Logo-tumb.png",
  JQ: "https://1000logos.net/wp-content/uploads/2021/07/Jetstar-Logo-tumb.png",
  KE: "https://1000logos.net/wp-content/uploads/2020/03/Korean-Air-Logo-thumb.png",
  MH: "https://1000logos.net/wp-content/uploads/2020/04/Malaysia-Airlines-Logo-thumb.png",
  PR: "https://1000logos.net/wp-content/uploads/2019/12/0022_Philippine-Airlines-Logo.jpg",
  QF: "https://1000logos.net/wp-content/uploads/2016/10/eeeeeeee-копия.jpg",
  QR: "https://1000logos.net/wp-content/uploads/2019/12/0021_Qatar-Airways-Logo.jpg",
  MI: "https://1000logos.net/wp-content/uploads/2023/05/SilkAir-Logo-tumb.png",
  SQ: "https://1000logos.net/wp-content/uploads/2019/11/0012_Singapore-Airlines-Logo-500x281-1.jpg",
  TG: "https://1000logos.net/wp-content/uploads/2019/12/0010_Thai-Airways-International-Logo.jpg",
  TT: "https://1000logos.net/wp-content/uploads/2023/05/Tigerair-Logo-thumb.png",
  UA: "https://1000logos.net/wp-content/uploads/2017/06/United-logo-tumb.jpg",
  VA: "https://1000logos.net/wp-content/uploads/2023/05/Virgin-Australia-Logo-tumb.png",
  OAL: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='45' fill='%236B7280'/%3E%3Ctext x='50' y='58' font-family='Arial' font-size='28' font-weight='bold' fill='white' text-anchor='middle'%3EOAL%3C/text%3E%3C/svg%3E",
  FD: "https://1000logos.net/wp-content/uploads/2020/04/AirAsia-Logo-tumb.png",
};

function getIATACode(airlineStr) {
  if (!airlineStr) return null;
  const match = airlineStr.match(/\(([A-Z0-9]{2,3})\)/);
  return match
    ? match[1]
    : airlineStr.includes("Other") || airlineStr.includes("OAL")
      ? "OAL"
      : null;
}

function getAirlineLogo(airlineStr) {
  const code = getIATACode(airlineStr);
  return code && airlineLogos[code] ? airlineLogos[code] : null;
}

// ── State ───────────────────────────────────────────────────────────
const state = {
  jobs: [],
  activeJobId: null,
  activeTab: "preset",
  currentScreen: "current",
  siccFilter: "SICC1",
  presetMethod: null,
  createItems: [],
  serviceExpanded: null,
  adHocEnabled: false,
  adHocItems: [],
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
      (j.linkedItems || []).some(
        (l) => l.link_id === recordId || l.ccp5_record_id === recordId,
      ),
    ) ||
    null
  );
}

// ── Localhost detection ─────────────────────────────────────────────
function isLocalhost() {
  const host = window.location.hostname;
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    !host.includes(".")
  );
}

async function loadJobs() {
  // On localhost, skip API calls and use seed data directly
  if (isLocalhost()) {
    state.jobs = buildSeed();
    return;
  }

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
  return String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
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
  min = Math.max(0, min);
  const totalSeconds = Math.floor(min * 60);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return (
    String(h).padStart(2, "0") +
    ":" +
    String(m).padStart(2, "0") +
    ":" +
    String(s).padStart(2, "0")
  );
}

function fmtElapsedShort(min) {
  if (min == null) return "—";
  min = Math.max(0, min);
  const totalSeconds = Math.floor(min * 60);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  return String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0");
}

function formatTime(timestamp) {
  if (!timestamp) return "";
  const d = new Date(timestamp);
  return d.toTimeString().slice(0, 5);
}

function livePresetStatus(job) {
  const p = job.preset || {};
  if (p.status === "Submitted")
    return {
      label: p.complianceResult === "Compliant" ? "Compliant" : "Non-Compliant",
      cls: p.complianceResult === "Compliant" ? "compliant" : "nc",
    };
  if (!p.startTime)
    return { label: "Not Started", cls: "not-started", el: null };
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
    const finished =
      it.finishTime ||
      it.status === "Compliant" ||
      it.status === "NonCompliant";
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
    return {
      label: d.complianceResult === "Compliant" ? "Compliant" : "Non-Compliant",
      cls: d.complianceResult === "Compliant" ? "compliant" : "nc",
    };
  }
  if (job.preset.status !== "Submitted" || !job.preset.finishTime) {
    return { label: "Locked", cls: "locked" };
  }
  const el = elapsedMin(job.preset.finishTime);
  const min = ruleFor(job).coldSoakMin;
  if (el >= min) return { label: "Eligible for dispatch", cls: "eligible", el };
  return { label: "Cold Soak", cls: "cold-soak", el };
}

function pill(label, cls, el) {
  const time =
    el != null ? `<span class="pill-elapsed">${fmtElapsed(el)}</span>` : "";
  return `<span class="status-pill ${cls}">${label}${time}</span>`;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function jobCard(job) {
  const preset = livePresetStatus(job);
  const fc = fcSummary(job);
  const disp = dispatchSummary(job);
  const totalQty = (job.linkedItems || []).reduce(
    (s, it) => s + (it.quantity || 0),
    0,
  );
  const logoUrl = getAirlineLogo(job.airline);
  const cardId = "card-" + esc(job.job_id);
  return `
    <div class="job-card" data-job="${esc(job.job_id)}" id="${cardId}">
      <div class="job-card-head">
        ${logoUrl ? `<div class="job-card-logo"><img src="${logoUrl}" alt="${esc(job.airline)}" loading="lazy"></div>` : ""}
        <div class="job-card-info">
          <div class="job-card-flight">${esc(job.flight_number)} · ${formatDate(job.flight_date)}</div>
          <div class="job-card-meta">ETD ${esc(job.etd)} · Group ${esc(job.ta_group)} · ${esc(job.meal_service)}</div>
          <span class="job-id">${esc(job.job_id)}</span>
        </div>
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
  document.querySelectorAll(".sicc-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.sicc === site);
  });
  renderCurrent();
}
window.filterBySICC = filterBySICC;

function renderCurrent() {
  const grid = document.getElementById("current-grid");
  const jobs = state.jobs.filter(
    (j) =>
      j.closed !== true &&
      j.job_status !== "Voided" &&
      !j.completed &&
      j.site === state.siccFilter,
  );

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
      fcEl.textContent =
        fc.done +
        "/" +
        fc.total +
        " done" +
        (fc.inProg ? " · " + fmtElapsed(fc.maxEl) : "");
    }
    const dispEl = card.querySelector("[data-dispatch]");
    if (dispEl) {
      const d = dispatchSummary(job);
      dispEl.innerHTML = pill(d.label, d.cls, d.el);
    }
  }
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

// ── Routing ─────────────────────────────────────────────────────────
function navigate(screen, opts) {
  if (screen === "all") return preview.go(VIEWS.all);
  if (screen === "create")
    return preview.go(VIEWS.create, { sicc: state.siccFilter });
  if (screen === "detail") {
    const jobId = (opts && opts.jobId) || state.activeJobId || "";
    return preview.go(VIEWS.detail, { id: jobId });
  }
  if (screen === "report") {
    const jobId = (opts && opts.jobId) || state.activeJobId || "";
    return preview.go(VIEWS.report, { id: jobId });
  }
  for (const key of Object.keys(SCREEN_IDS)) {
    document
      .getElementById(SCREEN_IDS[key])
      .classList.toggle("hidden", key !== screen);
  }
  state.currentScreen = screen;
  updateTopbarNav();
  if (window.__renderHooks?.[screen]) window.__renderHooks[screen]();
  window.scrollTo({ top: 0 });
}

function updateTopbarNav() {
  document.querySelectorAll(".topbar-nav .nav-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.screen === state.currentScreen);
  });
}

function openJob(jobId) {
  navigate("detail", { jobId });
}
function openReport(jobId) {
  navigate("report", { jobId });
}

function startTicker() {
  setInterval(() => {
    if (state.currentScreen === "current") tickCurrent();
  }, 1000);
}

// ── Loader ─────────────────────────────────────────────────────────
function showLoader() {
  const loader = document.getElementById("loader-overlay");
  if (loader) loader.classList.remove("hidden");
}

function hideLoader() {
  const loader = document.getElementById("loader-overlay");
  if (loader) loader.classList.add("hidden");
}

// ── Init ────────────────────────────────────────────────────────────
window.preview = preview;
window.navigate = navigate;
window.openJob = openJob;
window.openReport = openReport;
window.filterBySICC = filterBySICC;
window.updateTopbarNav = updateTopbarNav;

document.addEventListener("DOMContentLoaded", async () => {
  showLoader();
  window.__renderHooks = { current: renderCurrent };
  state.jobs = buildSeed();
  // Extract site from d2path
  const d2path = preview.params.get("d2path");
  if (d2path) {
    if (d2path.includes("sats-bd4uhr")) {
      state.siccFilter = "SICC1";
    } else if (d2path.includes("ccp-5-dishing-4q3aak")) {
      state.siccFilter = "SICC2";
    }
    // Hide SICC toggler when d2path is present
    const siccSelector = document.getElementById("sicc-selector");
    if (siccSelector) {
      siccSelector.classList.add("hidden");
    }
  }
  navigate("current");
  await loadJobs();
  navigate("current");
  startTicker();
  hideLoader();
});
