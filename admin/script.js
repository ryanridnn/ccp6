const _SVC = (() => {
  const p = location.pathname.split("/");
  return p[1] === "services-preview" ? p[2] : "";
})();

// ── Data store ──────────────────────────────────────────────────────
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
    ).catch(() => ({ records: [] })),
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
};

if (!window.preview) window.preview = preview;

const VIEWS = {
  current: "pv-5czmym",
  all: "pv-kfb8yh",
  create: "pv-ji169l",
  detail: "pv-0gnlo8",
  report: "pv-rnop2z",
  admin: "pv-admin-dummy", // placeholder → replace with real platform view id
};

const IS_LOCAL = ["localhost", "127.0.0.1", ""].includes(location.hostname);

// ── Admin: remove all / selected CCP6 instances ─────────────────────
let instanceList = [];
let selectedIds = new Set();
let pendingAction = null; // "all" | "selected"

async function countInstances() {
  const jobs = await store.records("ccp6_jobs");
  const subs = await store.records("submissions");
  const jobArr = jobs?.records || [];
  const subArr = subs?.records || [];
  return { jobs: jobArr, subs: subArr };
}

function openConfirm(countText, subText, titleText) {
  document.getElementById("confirm-count").textContent = countText;
  document.getElementById("confirm-sub").textContent = subText;
  document.getElementById("confirm-title").textContent = titleText || "Confirm Removal";
  document.getElementById("confirm-overlay").classList.remove("hidden");
}

async function confirmRemoveAll() {
  const status = document.getElementById("admin-status");
  status.innerHTML = `<span class="status-info">Counting records…</span>`;
  try {
    const { jobs, subs } = await countInstances();
    pendingAction = "all";
    status.innerHTML = "";
    openConfirm(
      `${jobs.length} job(s) · ${subs.length} submission(s) will be removed.`,
      "Are you sure you want to delete ALL CCP6 jobs and submissions?",
      "Confirm Remove All",
    );
  } catch (e) {
    status.innerHTML = `<span class="status-error">Failed to read store: ${esc(e.message)}</span>`;
  }
}
window.confirmRemoveAll = confirmRemoveAll;

function confirmDeleteSelected() {
  const status = document.getElementById("admin-status");
  if (!selectedIds.size) {
    status.innerHTML = `<span class="status-info">Select at least one instance to delete.</span>`;
    return;
  }
  status.innerHTML = "";
  pendingAction = "selected";
  openConfirm(
    `${selectedIds.size} instance(s) will be removed.`,
    "Are you sure you want to delete the selected CCP6 instances?",
    "Confirm Delete Selected",
  );
}
window.confirmDeleteSelected = confirmDeleteSelected;

function closeConfirm() {
  document.getElementById("confirm-overlay").classList.add("hidden");
}
window.closeConfirm = closeConfirm;

async function executeRemoval() {
  closeConfirm();
  const status = document.getElementById("admin-status");
  status.innerHTML = `<span class="status-info">Removing…</span>`;
  try {
    let targets = [];
    if (pendingAction === "all") {
      const { jobs, subs } = await countInstances();
      targets = [...jobs, ...subs];
    } else if (pendingAction === "selected") {
      targets = instanceList.filter((r) => {
        const id = r.id || r.slotKey || (r.data?.job_id);
        return selectedIds.has(id);
      });
    }
    let deleted = 0;
    for (const r of targets) {
      const id = r.id || r.slotKey || r.data?.id;
      if (id) {
        await store.del(id);
        deleted++;
      }
    }
    status.innerHTML = `<span class="status-success">✓ Removed ${deleted} instance(s).</span>`;
    selectedIds = new Set();
    pendingAction = null;
    await loadInstances();
  } catch (e) {
    status.innerHTML = `<span class="status-error">Failed to remove: ${esc(e.message)}</span>`;
  }
}
window.executeRemoval = executeRemoval;

// ── Instances table ─────────────────────────────────────────────────
async function loadInstances() {
  const tbody = document.getElementById("instances-body");
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="3" class="admin-empty">Loading…</td></tr>`;
  const { jobs } = await countInstances();
  instanceList = jobs;
  selectedIds = new Set();
  const selectAll = document.getElementById("select-all");
  if (selectAll) selectAll.checked = false;
  if (!jobs.length) {
    tbody.innerHTML = `<tr><td colspan="3" class="admin-empty">No instances found.</td></tr>`;
    updateSelectedStatus();
    return;
  }
  tbody.innerHTML = jobs
    .map((r) => {
      const j = r && r.data && r.data.job_id ? r.data : r;
      const id = r.id || r.slotKey || j.job_id || "";
      const sicc = j.site || "—";
      const details = `${esc(j.job_id || "—")} · ${esc(j.flight_number || "—")} · ${esc(j.airline || "—")} · ${esc(j.job_status || (j.closed ? "Closed" : "Open"))}`;
      return `<tr data-id="${esc(id)}">
        <td><input type="checkbox" class="inst-checkbox" data-id="${esc(id)}" onchange="toggleSelect('${esc(id)}', this.checked)" /></td>
        <td><span class="sicc-badge sicc-${esc(String(sicc).toLowerCase())}">${esc(sicc)}</span></td>
        <td class="inst-details">${details}</td>
      </tr>`;
    })
    .join("");
  updateSelectedStatus();
}
window.loadInstances = loadInstances;

function toggleSelect(id, checked) {
  if (checked) selectedIds.add(id);
  else selectedIds.delete(id);
  updateSelectedStatus();
}
window.toggleSelect = toggleSelect;

function toggleSelectAll(el) {
  const checked = el.checked;
  document.querySelectorAll(".inst-checkbox").forEach((cb) => {
    cb.checked = checked;
    if (checked) selectedIds.add(cb.dataset.id);
    else selectedIds.delete(cb.dataset.id);
  });
  updateSelectedStatus();
}
window.toggleSelectAll = toggleSelectAll;

function updateSelectedStatus() {
  const el = document.getElementById("selected-status");
  if (el) el.textContent = `${selectedIds.size} selected`;
}

window.navigate = (s) => {
  if (s === "current") preview.go(VIEWS.current);
};

function esc(v) {
  return String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
}

document.addEventListener("DOMContentLoaded", () => {
  if (IS_LOCAL) {
    document.getElementById("admin-status").innerHTML =
      `<span class="status-info">Local dev — no platform store to clear. The button will run against the live store when deployed.</span>`;
  }
  loadInstances();
});
