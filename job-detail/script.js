import { buildSeed, seedStaff, seedFlights } from "../sample-data.js";

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
	current: "pv-5czmym",
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
	presetSelection: [],
	foodCheckerSelection: [],
	presetItemsSelection: [],
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
	if (
		svc.traysHandled == null ||
		svc.staffCount == null ||
		svc.startTime == null ||
		svc.finishTime == null
	)
		return "—";
	const hours =
		(new Date(svc.finishTime) - new Date(svc.startTime)) / (60 * 60 * 1000);
	if (hours <= 0 || svc.staffCount <= 0) return "—";
	const tpmh = svc.traysHandled / (svc.staffCount * hours);
	return tpmh.toFixed(1);
}

function title(stage) {
	return stage === "preset"
		? "Preset"
		: stage === "foodchecker"
			? "Food Checker"
			: "Dispatch";
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
		job.history.push({
			at: job.closedAt,
			actor: "system",
			field: "job",
			from: "Open",
			to: "Closed",
			stage: "job",
			version: 1,
		});
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

function openSignoff(stage) {
	state.signoff = {
		open: true,
		stage,
		jobId: state.activeJobId,
		method: "staffid",
		resolved: null,
	};
	document.getElementById("signoff-stage").textContent =
		stage === "preset"
			? "Preset"
			: stage === "foodchecker"
				? "Food Checker"
				: "Dispatch";
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
	document.getElementById("signoff-name").textContent =
		`${staff.staffName} (${staff.staffId})`;
	document.getElementById("signoff-role").textContent =
		`Role: ${staff.role} · Capture: ${state.signoff.method.toUpperCase()}`;
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
	commitStage(
		state.signoff.stage,
		state.signoff.resolved,
		state.signoff.method,
	);
	closeSignoff();
	renderDetail();
}

// ── Data load / seed ─────────────────────────────────────────────────

function renderDetail() {
	const job = currentJob();
	if (!job) {
		document.getElementById("detail-body").innerHTML =
			`<div class="empty-state">Job not found.</div>`;
		return;
	}
	document.getElementById("detail-title").textContent =
		`CCP6 Job · ${job.flight_number}`;
	document.getElementById("detail-flight-sub").classList.add("hidden");
	
	// Auto-expand non-compliant rows
	if (job.preset?.services) {
		job.preset.services.forEach((svc, i) => {
			if (svc.complianceResult === "Non-Compliant" || svc.complianceResult === "NonCompliant") {
				state.serviceExpanded = i;
			}
		});
	}
	if (job.preset?.items) {
		job.preset.items.forEach((item) => {
			if (item.complianceResult === "Non-Compliant") {
				state.presetSICC2Expanded = item.linkId;
			}
		});
	}
	if (job.foodChecker?.items) {
		job.foodChecker.items.forEach((item) => {
			if (item.complianceResult === "Non-Compliant") {
				state.fcExpanded = item.linkId;
			}
		});
	}
	
	renderHeader(job);
	renderTabs(job);
	const body = document.getElementById("detail-body");
	if (state.activeTab === "preset") {
		renderPreset(body, job);
		stopDispatchTimerUpdates("preset");
		stopDispatchTimerUpdates("fc");
	} else if (state.activeTab === "foodchecker") {
		renderFoodChecker(body, job);
		stopDispatchTimerUpdates("preset");
		stopDispatchTimerUpdates("fc");
	} else if (state.activeTab === "dispatch") renderDispatch(body, job);
}

// Reusable per-field wrapper for the read-only detail header.
function headerField(label, value) {
	return `<div class="jh-field">
    <div class="jh-label">${esc(label)}</div>
    <div class="jh-value">${esc(value ?? "—")}</div>
  </div>`;
}

// Active-instance detail header → read-only text grid.
function renderHeader(job) {
	const fields = [
		["Flight Number", job.flight_number],
		["ETD (24h)", job.etd],
		["Group", job.ta_group],
		["Meal Service", job.meal_service],
	];
	
	// Add lounge field for SICC2 OAL flights
	if (job.site === "SICC2" && job.lounge) {
		fields.push(["Lounge", job.lounge]);
	}
	
	// Airline logo
	const iataCode = getIATACode(job.airline);
	const logoUrl = iataCode ? airlineLogos[iataCode] : null;
	const logoHtml = logoUrl
		? `<img src="${logoUrl}" alt="${esc(job.airline || "")}" class="jh-airline-logo" />`
		: "";
	
	document.getElementById("detail-header").innerHTML = `
		<div class="jh-airline">${logoHtml}</div>
		${fields.map(([l, v]) => `
			<div class="jh-field">
				<div class="jh-label">${esc(l)}</div>
				<div class="jh-value">${esc(v ?? "—")}</div>
			</div>
		`).join("")}
	`;
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

	// Only add dispatch tab for SICC2 jobs
	if (job.site === "SICC2") {
		tabs.push({
			id: "dispatch",
			title: "Dispatch",
			subtitle: "CTS · timer toward a minimum",
			status: dispatchLiveState(job),
		});
	}

	el.innerHTML = tabs
		.map(
			(t) => `
        <div class="tab-card${state.activeTab === t.id ? " active" : ""}" onclick="switchTab('${t.id}')">
          <div class="tab-header">
            <span class="tab-title">${t.title}</span>
            <span class="status-pill ${t.status.cls}" id="${t.id}-tab-badge">${t.status.label}</span>
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
		so
			? ` <span style="margin-left:8px">by ${esc(so.staffName)} (${esc(so.staffId)}) · ${esc(new Date(so.submittedAt).toLocaleString())}</span>`
			: ""
	}</div>`;
}

function submitButton(stage, disabled) {
	return `<button type="button" class="btn-primary" onclick="submitStage('${stage}')" ${disabled ? "disabled" : ""}>Submit ${title(stage)}</button>`;
}

// ── Exception fields ────────────────────────────────────────────────
function exceptionKey(scope) {
	return scope === "preset" || scope === "dispatch"
		? "exc-" + scope
		: "exc-fc-" + scope;
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
	const items =
		job.site === "SICC2" ? p.items || [] : p.services || [];
	
	// Check if all items are finished
	const allFinished = items.length > 0 && items.every((s) => s.finishTime);
	if (p.status === "Submitted" || allFinished)
		return { label: "Completed", cls: "compliant", el: null };
	
	const started = items.some((s) => s.startTime);
	if (started) return { label: "In Progress", cls: "in-progress", el: null };
	return { label: "Not Started", cls: "not-started", el: null };
}

function fcLiveState(job) {
	const items = job.foodChecker?.items || [];
	if (items.length === 0)
		return { label: "Not Started", cls: "not-started", el: null };
	const allFinished = items.every((it) => it.finishTime);
	if (job.foodChecker.status === "Submitted" || allFinished)
		return { label: "Completed", cls: "compliant", el: null };
	const started = items.some((it) => it.startTime);
	if (started)
		return { label: "In Progress", cls: "in-progress", el: null };
	return { label: "Not Started", cls: "not-started", el: null };
}

function dispatchLiveState(job) {
	const live = dispatchLive(job);
	if (!live) return { label: "Not Started", cls: "not-started", el: null };
	if (live.cls === "compliant" || live.cls === "nc")
		return { label: "Completed", cls: "compliant", el: null };
	if (live.cls === "cold-soak" || live.cls === "eligible")
		return { label: "In Progress", cls: "in-progress", el: null };
	return { label: "Not Started", cls: "not-started", el: null };
}

function updatePresetTabBadge() {
	const job = currentJob();
	if (!job) return;
	const badge = document.getElementById("preset-tab-badge");
	if (badge) {
		const st = presetLiveState(job);
		badge.className = `status-pill ${st.cls}`;
		badge.textContent = st.label;
	}
}

function updateFcTabBadge() {
	const job = currentJob();
	if (!job) return;
	const badge = document.getElementById("foodchecker-tab-badge");
	if (badge) {
		const st = fcLiveState(job);
		badge.className = `status-pill ${st.cls}`;
		badge.textContent = st.label;
	}
}

function updateDispatchTabBadge() {
	const job = currentJob();
	if (!job) return;
	const badge = document.getElementById("dispatch-tab-badge");
	if (badge) {
		const st = dispatchLiveState(job);
		badge.className = `status-pill ${st.cls}`;
		badge.textContent = st.label;
	}
}

function renderServiceRow(svc, index, submitted, limits, job) {
	const prefix = `p-s${index}`;
	const isExpanded = state.serviceExpanded === index;
	const elapsed = svc.finishTime
		? fmtElapsed((new Date(svc.finishTime) - new Date(svc.startTime)) / 60000)
		: svc.startTime
			? fmtElapsed(elapsedMin(svc.startTime))
			: "00:00";
	const showStart = !submitted && !svc.startTime;
	const showFinish = !submitted && svc.startTime && !svc.finishTime;

	// Temperature fields: input when collapsed, read-only when expanded
	const startTempField = isExpanded
		? `<div class="form-input-static">${svc.startTemp != null ? svc.startTemp + " °C" : "—"}</div>`
		: `<input type="number" step="0.1" class="form-input" style="width:90px" id="${prefix}-startTemp" value="${svc.startTemp ?? ""}" ${submitted ? "disabled" : ""} onclick="event.stopPropagation()" oninput="updateServiceField(${index}, 'startTemp', this.value)" />`;

	const finishTempField = isExpanded
		? `<div class="form-input-static">${svc.finishTemp != null ? svc.finishTemp + " °C" : "—"}</div>`
		: `<input type="number" step="0.1" class="form-input" style="width:90px" id="${prefix}-finishTemp" value="${svc.finishTemp ?? ""}" ${submitted ? "disabled" : ""} onclick="event.stopPropagation()" oninput="updateServiceField(${index}, 'finishTemp', this.value)" />`;

	// Action button: Start/Finish/Remove/View toggle
	let actionBtn;
	if (showStart) {
		actionBtn = `<button type="button" class="btn-primary" style="padding:6px 12px;font-size:12px;margin-left:12px" onclick="event.stopPropagation(); startService(${index})">Start</button>`;
	} else if (showFinish) {
		actionBtn = `<button type="button" class="btn-primary" style="padding:6px 12px;font-size:12px;margin-left:12px" onclick="event.stopPropagation(); finishService(${index})">Finish</button>`;
	} else {
		actionBtn = `<button type="button" class="btn-ghost" style="padding:6px 12px;font-size:12px;margin-left:12px" onclick="event.stopPropagation(); toggleServiceExpand(${index})">${isExpanded ? "Close" : "View"}</button>`;
	}

	const svcStatus = !svc.startTime
    ? { label: "Not started", cls: "not-started" }
    : !svc.finishTime
      ? { label: "In Progress", cls: "in-progress" }
      : svc.complianceResult === "Compliant"
        ? { label: "Compliant", cls: "compliant" }
        : { label: "Non-Compliant", cls: "non-compliant" };

  let rowHtml = `
    <tr class="${isExpanded ? "selected" : ""}" onclick="toggleServiceExpand(${index})" style="cursor: pointer;">
      <td><input type="checkbox" class="item-checkbox" data-table="preset" data-id="service-${index}" onclick="event.stopPropagation(); toggleItemSelection('preset', 'service-${index}')" /></td>
      <td>${index + 1}</td>
      <td>
        <div style="font-weight:600;color:var(--text-primary)">${esc(svc.serviceType ?? "")}</div>
        <div style="font-size:12px;color:var(--text-secondary);margin-top:2px">${esc(svc.itemType ?? "")}</div>
      </td>
      <td>${startTempField}</td>
      <td>${finishTempField}</td>
      <td>
        <span class="fc-status-badge ${svcStatus.cls}">
          <span class="fc-status-dot"></span>${svcStatus.label}
        </span>
      </td>
      <td>
        <div class="timer-counter">
          <span class="timer-value" id="${prefix}-timer-display">${elapsed}</span>
          <span class="timer-max">/ ${limits.exposureMax} min</span>
        </div>
        ${actionBtn}
      </td>
    </tr>
  `;

	// Expanded row with all fields and metric cards
	if (isExpanded) {
		rowHtml += `
      <tr class="expanded-row">
        <td colspan="7">
          <div class="fc-expanded-panel">
            <div class="preset-grid" style="margin-bottom: 16px;">
              <div class="form-group"><label class="form-label">Start Time</label>
                <input type="text" class="form-input" id="${prefix}-startTime-expanded" value="${formatTime(svc.startTime)}" readonly onclick="event.stopPropagation()" /></div>
              <div class="form-group"><label class="form-label">Finish Time</label>
                <input type="text" class="form-input" id="${prefix}-finishTime-expanded" value="${formatTime(svc.finishTime)}" readonly onclick="event.stopPropagation()" /></div>
              <div class="metric-card">
                <div class="metric-label">Timer</div>
                <div class="timer-counter">
                  <span class="timer-value" id="${prefix}-timer-display-expanded">${elapsed}</span>
                  <span class="timer-max">/ ${limits.exposureMax} min</span>
                </div>
                <div class="fc-timer-buttons" style="margin-top:8px">
                  ${showStart ? `<button type="button" class="btn-primary" style="padding:6px 12px;font-size:12px" onclick="event.stopPropagation(); startService(${index})">Start Timer</button>` : ""}
                  ${showFinish ? `<button type="button" class="btn-primary" style="padding:6px 12px;font-size:12px" onclick="event.stopPropagation(); finishService(${index})">Finish Timer</button>` : ""}
                </div>
              </div>
              <div class="form-group field-hts"><label class="form-label required">Start Temperature (°C)</label>
                <input type="number" step="0.1" class="form-input" id="${prefix}-startTemp-expanded" value="${svc.startTemp ?? ""}" ${submitted ? "disabled" : ""} onclick="event.stopPropagation()" oninput="updateServiceField(${index}, 'startTemp', this.value)" /></div>
              <div class="form-group field-htf"><label class="form-label required">Finish Temperature (°C)</label>
                <input type="number" step="0.1" class="form-input" id="${prefix}-finishTemp-expanded" value="${svc.finishTemp ?? ""}" ${submitted ? "disabled" : ""} onclick="event.stopPropagation()" oninput="updateServiceField(${index}, 'finishTemp', this.value)" /></div>
            </div>

            <div class="metric-cards">
              <div class="metric-card ${svc.complianceResult === "Compliant" ? "compliant" : ""}">
                <div class="metric-label">Exposure</div>
                <div class="metric-value">${svc.exposureDurationMin ?? "—"} min</div>
                ${svc.exposureDurationMin != null ? `<div class="metric-status"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg> Within ${limits.exposureMax} min</div>` : ""}
              </div>
              <div class="metric-card ${svc.complianceResult === "Compliant" ? "compliant" : ""}">
                <div class="metric-label">Max Temperature</div>
                <div class="metric-value">${svc.maxSurfaceTemp ?? "—"} °C</div>
                ${svc.maxSurfaceTemp != null ? `<div class="metric-status"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg> Within ${limits.presetTempMax} °C</div>` : ""}
              </div>
              <div class="metric-card ${svc.complianceResult === "Compliant" ? "compliant" : ""} ${svc.complianceResult === "NonCompliant" ? "nc" : ""}">
                <div class="metric-label">SERVICE SET RESULT</div>
                <div class="metric-value">${svc.complianceResult ?? "—"}</div>
                ${svc.complianceResult === "Compliant" ? `<div class="metric-status"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg> Meets the applied rule set</div>` : ""}
                ${svc.complianceResult === "NonCompliant" ? `<div class="metric-status nc"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg> Does not meet the applied rule set</div>` : ""}
                ${svc.complianceResult == null ? `<div class="metric-hint">Calculated on finish</div>` : ""}
              </div>
            </div>
            <div class="form-group" style="margin-top:16px">
              <label class="form-label">Remarks</label>
              <textarea class="form-input" id="${prefix}-remarks-expanded" placeholder="Remarks" rows="3" ${submitted ? "disabled" : ""} onclick="event.stopPropagation()" oninput="updateServiceField(${index}, 'remarks', this.value)">${svc.remarks || ""}</textarea>
            </div>
            <div id="${prefix}-error" class="badge-error hidden" style="margin-top:12px"></div>
          </div>
        </td>
      </tr>
    `;
	}

	return rowHtml;
}

function toggleServiceExpand(index) {
	state.serviceExpanded = state.serviceExpanded === index ? null : index;
	renderPreset(document.getElementById("detail-body"), currentJob());
}

function updateServiceField(index, field, value) {
	const job = currentJob();
	if (job && job.preset.services[index]) {
		job.preset.services[index][field] = value === "" ? null : parseFloat(value);
		persistJob(job);
	}
}

function updatePresetField(field, value) {
	const job = currentJob();
	job.preset[field] = value ? parseInt(value) : 0;
	persistJob(job);
}
window.updatePresetField = updatePresetField;

function updateServiceTimeField(index, field, value) {
	const job = currentJob();
	if (job && job.preset.services[index]) {
		if (value) {
			const [h, m] = value.split(":").map(Number);
			const d = new Date();
			d.setHours(h, m, 0, 0);
			job.preset.services[index][field] = d.getTime();
		} else {
			job.preset.services[index][field] = null;
		}
		persistJob(job);
	}
}

window.toggleServiceExpand = toggleServiceExpand;
window.updateServiceField = updateServiceField;
window.updateServiceTimeField = updateServiceTimeField;

function getServiceField(prefix, field) {
	const expandedValue = num(`${prefix}-${field}-expanded`);
	if (expandedValue != null) return expandedValue;
	return num(`${prefix}-${field}`);
}

window.getServiceField = getServiceField;

function updatePresetRemarks(value) {
	const job = currentJob();
	if (job) {
		job.preset.remarks = value;
		persistJob(job);
	}
}

window.updatePresetRemarks = updatePresetRemarks;

let serviceTimerInterval = null;


// ── Timer warning helper ───────────────────────────────────────
function isTimerWarning(elapsed, exposureMax) {
	const remaining = exposureMax - elapsed;
	return remaining <= 10 && remaining > 0;
}

function startServiceTimerUpdates() {
	if (serviceTimerInterval) return;
	serviceTimerInterval = setInterval(() => {
		const job = currentJob();
		if (!job) return;
		
		// Update preset services (Sampled Item tab)
		if (job.preset?.services) {
			job.preset.services.forEach((svc, i) => {
				if (svc.startTime && !svc.finishTime) {
					const elapsed = elapsedMin(svc.startTime);
					const prefix = `p-s${i}`;
					const limits = hmLimits(job);
					const timerEl = document.getElementById(`${prefix}-timer-display`);
					const timerElExpanded = document.getElementById(
						`${prefix}-timer-display-expanded`,
					);
					const warning = isTimerWarning(elapsed, limits.exposureMax);
					if (timerEl) {
						timerEl.textContent = fmtElapsed(elapsed);
						timerEl.classList.toggle('timer-warning', warning);
					}
					if (timerElExpanded) {
						timerElExpanded.textContent = fmtElapsed(elapsed) + ` / ${limits.exposureMax} min`;
						timerElExpanded.classList.toggle('timer-warning', warning);
					}
				}
			});
		}
		
		// Update preset items (Multiple Items tab)
		if (job.preset?.items) {
			job.preset.items.forEach((item) => {
				if (item.startTime && !item.finishTime) {
					const elapsed = elapsedMin(item.startTime);
					const limits = hmLimits(job);
					const elapsedEl = document.getElementById(`preset-elapsed-${item.linkId}`);
					const timerEl = document.getElementById(`preset-timer-${item.linkId}`);
					const warning = isTimerWarning(elapsed, limits.exposureMax);
					if (elapsedEl) {
						elapsedEl.textContent = fmtElapsed(elapsed);
						elapsedEl.classList.toggle('timer-warning', warning);
					}
					if (timerEl) {
						timerEl.textContent = fmtElapsed(elapsed) + ` / ${limits.exposureMax} min`;
						timerEl.classList.toggle('timer-warning', warning);
					}
				}
			});
		}
		
		// Update food checker items
		if (job.foodChecker?.items) {
			job.foodChecker.items.forEach((item, i) => {
				if (item.startTime && !item.finishTime) {
					const elapsed = elapsedMin(item.startTime);
					const limits = hmLimits(job);
					const elapsedEl = document.getElementById(`fc-timer-${i}`);
					const warning = isTimerWarning(elapsed, limits.exposureMax);
					if (elapsedEl) {
						elapsedEl.textContent = fmtElapsed(elapsed);
						elapsedEl.classList.toggle('timer-warning', warning);
					}
				}
			});
		}
	}, 1000);
}

function stopServiceTimerUpdates() {
	if (serviceTimerInterval) {
		clearInterval(serviceTimerInterval);
		serviceTimerInterval = null;
	}
}

window.startServiceTimerUpdates = startServiceTimerUpdates;
window.stopServiceTimerUpdates = stopServiceTimerUpdates;

function renderPresetTabs(activeMethod) {
	return `
    <div class="preset-tabs">
      <button type="button" class="preset-tab ${activeMethod === "services" ? "active" : ""}" onclick="togglePresetMethod('services')">Sampled Item</button>
      <button type="button" class="preset-tab ${activeMethod === "items" ? "active" : ""}" onclick="togglePresetMethod('items')">Multiple Items</button>
    </div>
  `;
}

function togglePresetMethod(method) {
	state.presetMethod = method;
	const job = currentJob();
	if (method === "items") {
		console.log("[preset items tab] items:", job.preset?.items);
	}
	renderPreset(document.getElementById("detail-body"), job);
}
window.togglePresetMethod = togglePresetMethod;

function renderPreset(body, job) {
	const p = job.preset;
	const submitted = p.status === "Submitted";
	const site = job.site || "SICC2";

	if (site === "SICC2") {
		state.presetMethod = "items";
		renderPresetItems(body, job, p, submitted, "");
	} else {
		state.presetMethod = state.presetMethod || "services";
		const tabs = renderPresetTabs(state.presetMethod);
		if (state.presetMethod === "services") {
			renderPresetServices(body, job, p, submitted, tabs);
		} else {
			renderPresetItems(body, job, p, submitted, tabs);
		}
	}
}

function renderPresetServices(body, job, p, submitted, tabs) {
	if (!p.services) p.services = [{}];
	const services = p.services;
	const limits = hmLimits(job);

	body.innerHTML = `
    ${tabs}

    <div class="fc-sicc1-footer" style="display:grid;grid-template-columns:repeat(2,1fr);gap:16px;margin-bottom:20px;padding:16px;background:var(--bg-surface);border-radius:8px">
      <div class="jh-field">
        <div class="jh-label">Trays / meals handled</div>
        <input type="number" class="form-input" id="preset-trays" value="${job.preset.traysHandled ?? ""}" placeholder="Enter count" onchange="updatePresetField('traysHandled', this.value)" ${submitted ? "readonly" : ""} />
      </div>
      <div class="jh-field">
        <div class="jh-label">No of Staff</div>
        <input type="number" class="form-input" id="preset-staff" value="${job.preset.staffCount ?? ""}" placeholder="Enter count" onchange="updatePresetField('staffCount', this.value)" ${submitted ? "readonly" : ""} />
      </div>
    </div>

    <div class="selection-bar" id="preset-selection-actions">
        <button type="button" class="btn-secondary" onclick="startSelectedItems('preset')">Start All</button>
        <button type="button" class="btn-secondary" onclick="finishSelectedItems('preset')">Finish All</button>
      </div>

    <div class="table-wrap">
      <table class="fc-table">
        <thead><tr>
          <th style="width:40px"><input type="checkbox" onchange="toggleSelectAll('preset')" /></th>
          <th style="width:40px">#</th>
          <th>SERVICE & TYPE</th>
          <th>START TEMPERATURE °C *</th>
          <th>FINISH TEMPERATURE °C</th>
          <th>ITEM STATUS</th>
          <th>ACTION</th>
        </tr></thead>
        <tbody>
          ${services.map((svc, i) => renderServiceRow(svc, i, submitted, limits, job)).join("")}
        </tbody>
      </table>
    </div>

    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:16px">
      <div class="service-panel-footer-text">
        ${submitted ? '<span style="color:var(--accent)">Already submitted</span> · ' : ""}Submit is enabled once at least one service is started and every started service is finished.
      </div>
      <button type="button" class="btn-primary" onclick="submitStage('preset')" ${services.length > 0 && services.some((s) => s.startTime) && services.every((s) => !s.startTime || s.finishTime) ? "" : "disabled"}>Submit</button>
    </div>
  `;
}


// ── Selection helpers ──────────────────────────────────────────────
function toggleSelectAll(tableType) {
	const stateKey = tableType + "Selection";
	const checkboxes = document.querySelectorAll(".item-checkbox[data-table='" + tableType + "']");
	const allSelected = state[stateKey]?.length === checkboxes.length && checkboxes.length > 0;
	
	if (allSelected) {
		state[stateKey] = [];
		checkboxes.forEach(cb => cb.checked = false);
	} else {
		state[stateKey] = Array.from(checkboxes).map(cb => cb.dataset.id);
		checkboxes.forEach(cb => cb.checked = true);
	}
	updateSelectionUI(tableType);
}

function toggleItemSelection(tableType, itemId) {
	const stateKey = tableType + "Selection";
	if (!state[stateKey]) state[stateKey] = [];
	const idx = state[stateKey].indexOf(itemId);
	if (idx > -1) {
		state[stateKey].splice(idx, 1);
	} else {
		state[stateKey].push(itemId);
	}
	const cb = document.querySelector(".item-checkbox[data-table='" + tableType + "'][data-id='" + itemId + "']");
	if (cb) cb.checked = state[stateKey].includes(itemId);
	updateSelectionUI(tableType);
}

function updateSelectionUI(tableType) {
	const stateKey = tableType + "Selection";
	const container = document.getElementById(tableType + "-selection-actions");
	if (!container) return;
	
	const hasSelection = state[stateKey] && state[stateKey].length > 0;
	const btns = container.querySelectorAll("button");
	
	btns.forEach(btn => {
		const isStartBtn = btn.textContent.includes("Start");
		if (hasSelection) {
			btn.textContent = isStartBtn ? "Start Selected" : "Finish Selected";
		} else {
			btn.textContent = isStartBtn ? "Start All" : "Finish All";
		}
	});
}

function getItemsForTable(tableType, job) {
	if (tableType === "preset") return job.preset?.services || [];
	if (tableType === "presetItems") return job.preset?.items || [];
	if (tableType === "foodchecker") return job.foodChecker?.items || [];
	return [];
}

function startSelectedItems(tableType) {
	const job = currentJob();
	if (!job) return;
	
	const stateKey = tableType + "Selection";
	const items = getItemsForTable(tableType, job);
	const now = Date.now();
	
	let targetItems;
	if (state[stateKey] && state[stateKey].length > 0) {
		// Handle both service-* and linkId identifiers
		if (tableType === "preset") {
			targetItems = items.filter((item, idx) => {
				const serviceId = "service-" + idx;
				return state[stateKey].includes(serviceId) && !item.startTime;
			});
		} else if (tableType === "presetItems") {
			targetItems = items.filter(item => state[stateKey].includes(item.linkId) && !item.startTime);
		} else {
			targetItems = items.filter(item => state[stateKey].includes(item.linkId) && !item.startTime);
		}
	} else {
		targetItems = items.filter(item => !item.startTime);
	}
	
	if (targetItems.length === 0) {
		const msg = state[stateKey]?.length > 0 
			? "Selected items are already started." 
			: "No items available to start.";
		showToast(msg, "warning");
		return;
	}
	
	// Validation: Check if start temperature is required and filled
	// For preset (services), check startTemp; for foodchecker and dispatch, check startTemp
	const missingTemps = targetItems.filter(item => {
		const temp = item.startTemp ?? item.startTempC;
		return temp === undefined || temp === null || temp === "";
	});
	
	if (missingTemps.length > 0) {
		showToast("Please enter the START temperature before starting the timer.", "warning");
		return;
	}
	
	targetItems.forEach(item => {
		item.startTime = now;
		item.status = "InProgress";
	});
	
	if (state[stateKey]) state[stateKey] = [];
	
	persistJob(job);
	renderCurrentJob();
	
	// Start timer updates for preset services or items
	if (tableType === "preset" || tableType === "presetItems") {
		startServiceTimerUpdates();
	}
	
	showToast(`Started ${targetItems.length} item(s)`, "success");
}

function finishSelectedItems(tableType) {
	const job = currentJob();
	if (!job) return;
	
	const stateKey = tableType + "Selection";
	const items = getItemsForTable(tableType, job);
	const now = Date.now();
	
	let targetItems;
	if (state[stateKey] && state[stateKey].length > 0) {
		// Handle both service-* and linkId identifiers
		if (tableType === "preset") {
			targetItems = items.filter((item, idx) => {
				const serviceId = "service-" + idx;
				return state[stateKey].includes(serviceId) && item.startTime && !item.finishTime;
			});
		} else if (tableType === "presetItems") {
			targetItems = items.filter(item => state[stateKey].includes(item.linkId) && item.startTime && !item.finishTime);
		} else {
			targetItems = items.filter(item => state[stateKey].includes(item.linkId) && item.startTime && !item.finishTime);
		}
	} else {
		targetItems = items.filter(item => item.startTime && !item.finishTime);
	}
	
	if (targetItems.length === 0) {
		const msg = state[stateKey]?.length > 0 
			? "Selected items are already finished or not started." 
			: "No items available to finish.";
		showToast(msg, "warning");
		return;
	}
	
	// Validation: Check if finish temperature is required and filled
	const missingTemps = targetItems.filter(item => {
		const temp = item.finishTemp ?? item.finishTempC;
		return temp === undefined || temp === null || temp === "";
	});
	
	if (missingTemps.length > 0) {
		showToast("Please enter the FINISH temperature before finishing.", "warning");
		return;
	}
	
	targetItems.forEach(item => {
		item.finishTime = now;
		item.status = "Finished";
		
		// Calculate compliance result like finishItem does
		const limits = hmLimits(job);
		const maxTemp = Math.max(item.startTemp || 0, item.finishTemp || 0);
		item.durationMin = Math.round((now - new Date(item.startTime).getTime()) / 60000);
		item.complianceResult = item.durationMin > limits.exposureMax || maxTemp > limits.presetTempMax ? "Non-Compliant" : "Compliant";
	});
	
	if (state[stateKey]) state[stateKey] = [];
	
	persistJob(job);
	renderCurrentJob();
	showToast(`Finished ${targetItems.length} item(s)`, "success");
}

// Toast notification helper
function showToast(message, type = "info") {
	const existing = document.querySelector(".toast-notification");
	if (existing) existing.remove();
	
	const toast = document.createElement("div");
	toast.className = "toast-notification toast-" + type;
	toast.style.cssText = `
		position: fixed;
		bottom: 24px;
		right: 24px;
		padding: 12px 20px;
		background: var(--bg-surface);
		border: 1px solid var(--${type === "success" ? "success" : type === "warning" ? "warning" : "accent"});
		border-radius: 8px;
		color: var(--text-primary);
		font-size: 14px;
		z-index: 9999;
		box-shadow: 0 4px 12px rgba(0,0,0,0.3);
		animation: toastIn 0.3s ease;
	`;
	toast.textContent = message;
	
	if (!document.getElementById("toast-styles")) {
		const style = document.createElement("style");
		style.id = "toast-styles";
		style.textContent = "@keyframes toastIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }";
		document.head.appendChild(style);
	}
	
	document.body.appendChild(toast);
	setTimeout(() => {
		toast.style.opacity = "0";
		toast.style.transition = "opacity 0.3s";
		setTimeout(() => toast.remove(), 300);
	}, 3000);
}

window.toggleSelectAll = toggleSelectAll;
window.toggleItemSelection = toggleItemSelection;
window.startSelectedItems = startSelectedItems;
window.finishSelectedItems = finishSelectedItems;
window.showToast = showToast;

function renderPresetItems(body, job, p, submitted, tabs) {
	const items = p.items || [];
	const notStartedCount = items.filter((it) => !it.startTime).length;
	const activeCount = items.filter(
		(it) => it.startTime && !it.finishTime,
	).length;

	body.innerHTML = `
    ${tabs}

    <div class="fc-sicc1-footer" style="display:grid;grid-template-columns:repeat(2,1fr);gap:16px;margin-bottom:20px;padding:16px;background:var(--bg-surface);border-radius:8px">
      <div class="jh-field">
        <div class="jh-label">Trays / meals handled</div>
        <input type="number" class="form-input" id="preset-trays" value="${p.traysHandled ?? ""}" placeholder="Enter count" onchange="updatePresetField('traysHandled', this.value)" ${submitted ? "readonly" : ""} />
      </div>
      <div class="jh-field">
        <div class="jh-label">No of Staff</div>
        <input type="number" class="form-input" id="preset-staff" value="${p.staffCount ?? ""}" placeholder="Enter count" onchange="updatePresetField('staffCount', this.value)" ${submitted ? "readonly" : ""} />
      </div>
    </div>

    <div class="fc-header">
      <div>
        <h2 class="fc-header-title">Preset recording — FAA</h2>
        <div class="fc-header-subtitle">Item-level · Annexure 5.3 / 5.4</div>
      </div>
      <div class="fc-mandatory-badge">${activeCount} active · ${notStartedCount} not started</div>
    </div>

    <div class="selection-bar" id="presetItems-selection-actions">
      <button type="button" class="btn-secondary" onclick="startSelectedItems('presetItems')">Start All</button>
      <button type="button" class="btn-secondary" onclick="finishSelectedItems('presetItems')">Finish All</button>
    </div>

    <div class="table-wrap">
      <table class="fc-table">
        <thead><tr>
          <th style="width:40px"><input type="checkbox" onchange="toggleSelectAll('presetItems')" /></th>
          <th style="width:40px">#</th>
          <th>ITEM</th>
          <th>START TEMPERATURE °C *</th>
          <th>FINISH TEMPERATURE °C</th>
          <th>ITEM STATUS</th>
          <th>ACTION</th>
        </tr></thead>
        <tbody>
          ${items.map((item, i) => renderPresetSICC2Row(item, i, submitted, job)).join("")}
        </tbody>
      </table>
    </div>

    ${submitted ? renderSubmittedPanel(job, "preset") : `<div style="display:flex;justify-content:space-between;align-items:center;margin-top:16px"><div class="service-panel-footer-text">Submit is enabled once at least one item is started and every started item is finished.</div><button type="button" class="btn-primary" onclick="submitStage('preset')" ${items.length > 0 && items.some((it) => it.startTime) && items.every((it) => !it.startTime || it.finishTime) ? "" : "disabled"}>Submit</button></div>`}
  `;
}

function renderPresetSICC2Row(item, i, submitted, job) {
	const st = itemStatus(item, job);
	const limits = hmLimits(job);
	const isInProgress = st.cls === "in-progress";
	const isFinished = !!item.complianceResult;
	const isExpanded = state.presetSICC2Expanded === item.linkId;

	const statusBadge = isInProgress
		? `<span class="fc-status-badge in-progress"><span class="fc-status-dot"></span>In Progress</span>`
		: isFinished
			? `<span class="fc-status-badge ${item.complianceResult === "Compliant" ? "compliant" : "non-compliant"}"><span class="fc-status-dot"></span>${item.complianceResult}</span>`
			: `<span class="fc-status-badge not-started"><span class="fc-status-dot"></span>Not started</span>`;

	// START °C field: input when collapsed, read-only when expanded (same as FC table)
	const startTempField = isExpanded
		? `<div class="form-input-static">${item.startTemp != null ? item.startTemp + " °C" : "—"}</div>`
		: `<input type="number" step="0.1" class="form-input" style="width:90px" id="preset-st-temp-${item.linkId}" value="${item.startTemp ?? ""}" ${submitted ? "disabled" : ""} onclick="event.stopPropagation()" oninput="updatePresetItemField('${item.linkId}', 'startTemp')" />`;

	// FINISH °C field: input when collapsed, read-only when expanded (same as FC table)
	const finishTempField = item.startTime
		? isExpanded
			? `<div class="form-input-static">${item.finishTemp != null ? item.finishTemp + " °C" : "—"}</div>`
			: `<input type="number" step="0.1" class="form-input" style="width:90px" id="preset-ft-temp-${item.linkId}" value="${item.finishTemp ?? ""}" ${submitted ? "disabled" : ""} onclick="event.stopPropagation()" oninput="updatePresetItemField('${item.linkId}', 'finishTemp')" />`
		: "—";

	// ACTION button: toggle between Start Timer / Finish Timer (same as FC table)
	let actionBtn;
	if (isFinished) {
		actionBtn = `<button type="button" class="btn-ghost" style="padding:6px 12px;font-size:12px;margin-left:12px" onclick="event.stopPropagation(); togglePresetSICC2Expand('${item.linkId}')">Close</button>`;
	} else if (!item.startTime && !submitted) {
		actionBtn = `<button type="button" class="btn-primary" style="padding:6px 12px;font-size:12px;margin-left:12px" onclick="event.stopPropagation(); startItem('${item.linkId}')">Start Timer</button>`;
	} else if (item.startTime && !item.finishTime && !submitted) {
		actionBtn = `<button type="button" class="btn-primary" style="padding:6px 12px;font-size:12px;margin-left:12px" onclick="event.stopPropagation(); finishItem('${item.linkId}')">Finish Timer</button>`;
	} else {
		actionBtn = `<button type="button" class="btn-ghost" style="padding:6px 12px;font-size:12px;margin-left:12px" onclick="event.stopPropagation(); togglePresetSICC2Expand('${item.linkId}')">View</button>`;
	}

	let isItemSelected = (state.presetItemsSelection || []).includes(item.linkId);
	let rowHtml = `
    <tr class="${isExpanded ? "selected" : ""}" onclick="togglePresetSICC2Expand('${item.linkId}')" style="cursor: pointer;">
      <td><input type="checkbox" class="item-checkbox" data-table="presetItems" data-id="${item.linkId}" onclick="event.stopPropagation(); toggleItemSelection('presetItems', '${item.linkId}')" ${isItemSelected ? 'checked' : ''} /></td>
      <td>${i + 1}</td>
      <td>
        <div style="font-weight:600;color:var(--text-primary)">${esc(item.item_description)}</div>
        <div style="font-size:12px;color:var(--text-secondary);margin-top:2px">${esc(item.class)} · ${esc(item.sku)} · Qty: ${esc(item.quantity)}</div>
      </td>
      <td>${startTempField}</td>
      <td>${finishTempField}</td>
      <td>${statusBadge}</td>
      <td>
        <div class="timer-counter">
          <span class="timer-value" id="preset-timer-${item.linkId}">${st.el != null ? fmtElapsed(st.el) : "—"}</span>
          <span class="timer-max">/ ${limits.exposureMax} min</span>
        </div>
        ${actionBtn}
      </td>
    </tr>
  `;

	if (isExpanded) {
		const limits = hmLimits(job);
		rowHtml += `
      <tr class="expanded-row">
        <td colspan="7">
          <div class="fc-expanded-panel">
            <div class="preset-grid" style="margin-bottom: 16px;">
              <div class="form-group"><label class="form-label">Start Time</label>
                <input type="text" class="form-input" readonly value="${formatTime(item.startTime)}" /></div>
              <div class="form-group"><label class="form-label">Finish Time</label>
                <input type="text" class="form-input" readonly value="${formatTime(item.finishTime)}" /></div>
              <div class="metric-card">
                <div class="metric-label">Timer</div>
                <div class="timer-counter">
                  <span class="timer-value" id="preset-timer-${item.linkId}">${st.el != null ? fmtElapsed(st.el) : "—"}</span>
                  <span class="timer-max">/ ${limits.exposureMax} min</span>
                </div>
                <div class="fc-timer-buttons" style="margin-top:8px">
                  ${!item.startTime && !submitted ? `<button type="button" class="btn-primary" style="padding:6px 12px;font-size:12px" onclick="event.stopPropagation(); startItem('${item.linkId}')">Start Timer</button>` : ""}
                  ${item.startTime && !item.finishTime && !submitted ? `<button type="button" class="btn-primary" style="padding:6px 12px;font-size:12px" onclick="event.stopPropagation(); finishItem('${item.linkId}')">Finish Timer</button>` : ""}
                </div>
              </div>
              <div class="form-group"><label class="form-label required">Start Temperature (°C)</label>
                <input type="number" step="0.1" class="form-input" id="preset-st-temp-${item.linkId}" value="${item.startTemp ?? ""}" ${submitted ? "disabled" : ""} oninput="updatePresetItemField('${item.linkId}', 'startTemp', this.value)" /></div>
              <div class="form-group"><label class="form-label required">Finish Temperature (°C)</label>
                <input type="number" step="0.1" class="form-input" id="preset-ft-temp-${item.linkId}" value="${item.finishTemp ?? ""}" ${submitted ? "disabled" : ""} oninput="updatePresetItemField('${item.linkId}', 'finishTemp', this.value)" /></div>
            </div>

            <div class="metric-cards">
              <div class="metric-card">
                <div class="metric-label">Max Temperature</div>
                <div class="metric-value">${item.finishTemp != null ? item.finishTemp + " °C" : "—"}</div>
                ${item.finishTemp != null ? `<div class="metric-status">${item.finishTemp <= 15 ? "✓ Within 15 °C" : "✗ Exceeds 15 °C"}</div>` : ""}
              </div>
              <div class="metric-card ${item.complianceResult === "Compliant" ? "compliant" : ""} ${item.complianceResult === "Non-Compliant" ? "nc" : ""}">
                <div class="metric-label">Item Result</div>
                <div class="metric-value">${item.complianceResult || "—"}</div>
                ${item.complianceResult === "Compliant" ? `<div class="metric-status"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg> Meets the applied rule set</div>` : ""}
                ${item.complianceResult === "Non-Compliant" ? `<div class="metric-status nc"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg> Does not meet the applied rule set</div>` : ""}
                ${!item.complianceResult ? `<div class="metric-hint">Calculated on finish</div>` : ""}
              </div>
            </div>
            <div class="form-group" style="margin-top:16px">
              <label class="form-label">Remarks</label>
              <textarea class="form-input" id="preset-remarks-${item.linkId}" placeholder="Remarks" rows="3" ${submitted ? "disabled" : ""} onclick="event.stopPropagation()" oninput="updatePresetItemField('${item.linkId}', 'remarks', this.value)">${item.remarks || ""}</textarea>
            </div>
          </div>
        </td>
      </tr>
    `;
	}

	return rowHtml;
}

function togglePresetSICC2Expand(linkId) {
	state.presetSICC2Expanded =
		state.presetSICC2Expanded === linkId ? null : linkId;
	// Toggle row selection visually
	document.querySelectorAll("tr.expanded-row").forEach((r) => r.remove());
	document
		.querySelectorAll("tr.selected")
		.forEach((r) => r.classList.remove("selected"));
	if (state.presetSICC2Expanded) {
		const row = document.querySelector(`tr[onclick*="${linkId}"]`);
		if (row) {
			row.classList.add("selected");
			const job = currentJob();
			const item = (job.preset.items || []).find((it) => it.linkId === linkId);
			if (item) {
				const limits = hmLimits(job);
				const st = itemStatus(item, job);
				const expandedHtml = `
          <tr class="expanded-row">
            <td colspan="7">
              <div class="fc-expanded-panel">
                <div class="preset-grid" style="margin-bottom: 16px;">
                  <div class="form-group"><label class="form-label">Start Time</label>
                    <input type="text" class="form-input" readonly value="${formatTime(item.startTime)}" /></div>
                  <div class="form-group"><label class="form-label">Finish Time</label>
                    <input type="text" class="form-input" readonly value="${formatTime(item.finishTime)}" /></div>
                  <div class="metric-card">
                    <div class="metric-label">Timer</div>
                    <div class="timer-counter">
                      <span class="timer-value" id="preset-timer-${item.linkId}">${st.el != null ? fmtElapsed(st.el) : "—"}</span>
                      <span class="timer-max">/ ${limits.exposureMax} min</span>
                    </div>
                    <div class="fc-timer-buttons" style="margin-top:8px">
                      ${!item.startTime ? `<button type="button" class="btn-primary" style="padding:6px 12px;font-size:12px" onclick="event.stopPropagation(); startItem('${item.linkId}')">Start Timer</button>` : ""}
                      ${item.startTime && !item.finishTime ? `<button type="button" class="btn-primary" style="padding:6px 12px;font-size:12px" onclick="event.stopPropagation(); finishItem('${item.linkId}')">Finish Timer</button>` : ""}
                    </div>
                  </div>
                  <div class="form-group"><label class="form-label required">Start Temperature (°C)</label>
                    <input type="number" step="0.1" class="form-input" id="preset-st-temp-${item.linkId}" value="${item.startTemp ?? ""}" oninput="updatePresetItemField('${item.linkId}', 'startTemp', this.value)" /></div>
                  <div class="form-group"><label class="form-label required">Finish Temperature (°C)</label>
                    <input type="number" step="0.1" class="form-input" id="preset-ft-temp-${item.linkId}" value="${item.finishTemp ?? ""}" oninput="updatePresetItemField('${item.linkId}', 'finishTemp', this.value)" /></div>
                </div>
                <div class="metric-cards">
                  <div class="metric-card">
                    <div class="metric-label">Max Temperature</div>
                    <div class="metric-value">${item.finishTemp != null ? item.finishTemp + " °C" : "—"}</div>
                    ${item.finishTemp != null ? `<div class="metric-status">${item.finishTemp <= 15 ? "✓ Within 15 °C" : "✗ Exceeds 15 °C"}</div>` : ""}
                  </div>
                  <div class="metric-card ${item.complianceResult === "Compliant" ? "compliant" : ""} ${item.complianceResult === "Non-Compliant" ? "nc" : ""}">
                    <div class="metric-label">Item Result</div>
                    <div class="metric-value">${item.complianceResult || "—"}</div>
                  </div>
                </div>
              </div>
            </td>
          </tr>`;
				row.insertAdjacentHTML("afterend", expandedHtml);
			}
		}
	}
}
window.togglePresetSICC2Expand = togglePresetSICC2Expand;

function updatePresetGates() {
	const finish = document.getElementById("p-finish");
	const hts = num("p-hts");
	const dts = num("p-dts");
	const htf = num("p-htf");
	const dtf = num("p-dtf");
	if (finish)
		finish.disabled = !(
			hts != null &&
			dts != null &&
			htf != null &&
			dtf != null
		);
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
		return {
			label:
				svc.complianceResult === "Compliant" ? "Compliant" : "Non-Compliant",
			cls: svc.complianceResult === "Compliant" ? "compliant" : "nc",
			el: null,
		};
	}
	if (!svc.startTime)
		return { label: "Not Started", cls: "not-started", el: null };
	const el = elapsedMin(svc.startTime);
	const max = hmLimits(job).exposureMax;
	if (el > max) return { label: "Overtime", cls: "overtime", el };
	if (el >= max - CONFIG.warningThresholdMin)
		return { label: "Warning", cls: "warning", el };
	return { label: "In Progress", cls: "in-progress", el };
}

function startService(index) {
	const job = currentJob();
	const svc = job.preset.services[index];
	const prefix = `p-s${index}`;
	if (svc.startTime) return;
	const startTemp = getServiceField(prefix, "startTemp");
	if (startTemp == null) {
		showErr(
			`${prefix}-error`,
			"Item start temperature is required before starting the timer.",
		);
		return;
	}
	svc.startTemp = startTemp;
	svc.traysHandled = getServiceField(prefix, "trays") ?? 0;
	svc.staffCount = getServiceField(prefix, "staff") ?? 0;
	svc.startTime = new Date().toISOString();
	job.history = job.history || [];
	job.history.push({
		at: svc.startTime,
		actor: "FAA",
		field: "preset",
		from: "NotStarted",
		to: "InProgress",
		stage: "preset",
		version: 1,
	});
	renderDetail();
	updatePresetTabBadge();
	startServiceTimerUpdates();
}

function finishService(index) {
	const job = currentJob();
	const svc = job.preset.services[index];
	const prefix = `p-s${index}`;
	if (!svc.startTime || svc.finishTime) return;
	const finishTemp = getServiceField(prefix, "finishTemp");
	if (finishTemp == null) {
		showErr(
			`${prefix}-error`,
			"Item finish temperature is required to finish the timer.",
		);
		return;
	}
	svc.finishTemp = finishTemp;
	svc.finishTime = new Date().toISOString();
	const limits = hmLimits(job);
	svc.exposureDurationMin = Math.round(
		(new Date(svc.finishTime) - new Date(svc.startTime)) / 60000,
	);
	const maxTemp = Math.max(svc.startTemp, svc.finishTemp);
	svc.maxSurfaceTemp = maxTemp;
	svc.complianceResult =
		svc.exposureDurationMin > limits.exposureMax ||
		maxTemp > limits.presetTempMax
			? "Non-Compliant"
			: "Compliant";
	job.history.push({
		at: svc.finishTime,
		actor: "FAA",
		field: "preset",
		from: "Started",
		to: svc.complianceResult,
		stage: "preset",
		version: 1,
	});
	renderDetail();
	updatePresetTabBadge();
	const stillRunning = job.preset.services.some(
		(s) => s.startTime && !s.finishTime,
	);
	if (!stillRunning) stopServiceTimerUpdates();
}

window.startService = startService;
window.finishService = finishService;

function startPreset() {
	const job = currentJob();
	const p = job.preset;
	if (p.startTime) return;
	const startTemp = num("p-startTemp");
	if (startTemp == null) {
		showErr(
			"preset-error",
			"Item start temperature is required before starting the timer.",
		);
		return;
	}
	p.startTemp = startTemp;
	p.traysHandled = num("p-trays") ?? 0;
	p.staffCount = num("p-staff") ?? 0;
	p.startTime = new Date().toISOString();
	p.history = p.history || [];
	job.history.push({
		at: p.startTime,
		actor: "FAA",
		field: "preset",
		from: "NotStarted",
		to: "InProgress",
		stage: "preset",
		version: 1,
	});
	renderDetail();
}

function finishPreset() {
	const job = currentJob();
	const p = job.preset;
	if (!p.startTime || p.finishTime) return;
	const finishTemp = num("p-finishTemp");
	if (finishTemp == null) {
		showErr(
			"preset-error",
			"Item finish temperature is required before finishing.",
		);
		return;
	}
	p.finishTemp = finishTemp;
	p.finishTime = new Date().toISOString();
	const limits = hmLimits(job);
	p.exposureDurationMin = Math.round(
		(new Date(p.finishTime) - new Date(p.startTime)) / 60000,
	);
	const maxTemp = Math.max(p.startTemp, p.finishTemp);
	p.maxSurfaceTemp = maxTemp;
	p.complianceResult =
		p.exposureDurationMin > limits.exposureMax || maxTemp > limits.presetTempMax
			? "Non-Compliant"
			: "Compliant";
	job.history.push({
		at: p.finishTime,
		actor: "FAA",
		field: "preset",
		from: "Started",
		to: p.complianceResult,
		stage: "preset",
		version: 1,
	});
	renderDetail();
}

function renderPresetCompliance(job) {
	const p = job.preset;
	if (!p.finishTime && p.status !== "Submitted") return "";
	const limits = hmLimits(job);
	const maxTemp =
		p.maxSurfaceTemp ?? Math.max(p.startTemp ?? 0, p.finishTemp ?? 0);
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
		const duration =
			item.finishTime && item.startTime
				? (new Date(item.finishTime) - new Date(item.startTime)) / 60000
				: null;
		return {
			label:
				item.complianceResult === "Compliant" ? "Compliant" : "Non-Compliant",
			cls: item.complianceResult === "Compliant" ? "compliant" : "nc",
			el: duration,
		};
	}
	if (!item.startTime)
		return { label: "Not Started", cls: "not-started", el: null };
	const el = elapsedMin(item.startTime);
	if (el > max) return { label: "Overtime", cls: "overtime", el };
	if (el >= max - CONFIG.warningThresholdMin)
		return { label: "Warning", cls: "warning", el };
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
        <div class="fc-header-subtitle">Item-level · ${site === "SICC1" ? "Annexure 5.3 / 5.4" : "Annexure 5.2"}</div>
      </div>
      <div class="fc-mandatory-badge">Mandatory for every job</div>
    </div>

    <div class="fc-meal-service">
      <div class="jh-field">
        <div class="jh-label">Meal Service</div>
        <div class="jh-value">${esc(job.meal_service ?? "—")}</div>
      </div>
    </div>

    <div class="selection-bar" id="foodchecker-selection-actions">
        <button type="button" class="btn-secondary" onclick="startSelectedItems('foodchecker')" ${submitted ? "disabled" : ""}>Start All</button>
        <button type="button" class="btn-secondary" onclick="finishSelectedItems('foodchecker')" ${submitted ? "disabled" : ""}>Finish All</button>
      </div>

    <div class="table-wrap">
      <table class="fc-table">
        <thead><tr>
          ${
						site === "SICC1"
							? `
            <th style="width:40px"><input type="checkbox" onchange="toggleSelectAll('foodchecker')" /></th>
            <th style="width:40px">#</th>
            <th>ITEM</th>
            <th>START TEMPERATURE °C *</th>
            <th>FINISH TEMPERATURE °C</th>
            <th>ITEM STATUS</th>
            <th>ACTION</th>
          `
							: `
            <th style="width:40px"><input type="checkbox" onchange="toggleSelectAll('foodchecker')" /></th>
            <th style="width:40px">#</th>
            <th>ITEM</th>
            <th>START TEMPERATURE °C *</th>
            <th>FINISH TEMPERATURE °C</th>
            <th>ITEM STATUS</th>
            <th>ACTION</th>
          `
					}
        </tr></thead>
        <tbody>
          ${items.map((item, i) => renderFCRow(job, item, i, submitted)).join("")}
        </tbody>
      </table>
    </div>



    <div class="fc-footer">
      <div class="fc-footer-text">${notCheckedCount} of ${items.length} items not yet checked (OQ-08).</div>
      ${submitted ? renderSubmittedPanel(job, "foodchecker") : `<button type="button" class="btn-primary" onclick="submitStage('foodchecker')" ${items.length === 0 || !items.every((it) => it.complianceResult) ? "disabled" : ""}>Submit</button>`}
    </div>
  `;
}

function renderFCRow(job, item, i, submitted) {
	const site = job.site || "SICC2";
	const st = itemStatus(item, job);
	const limits = hmLimits(job);
	const dis = submitted ? "disabled" : "";
	const isSelected = (state.foodCheckerSelection || []).includes(item.linkId);
	const isInProgress = st.cls === "in-progress";
	const isFinished = !!item.complianceResult;

	let actionBtn = "";
	if (site === "SICC1") {
		if (!item.startTime && !submitted) {
			actionBtn = `<button type="button" class="btn-primary" style="padding:6px 12px;font-size:12px;margin-left:12px" onclick="event.stopPropagation(); startItem('${item.linkId}')">Start Timer</button>`;
		} else if (item.startTime && !item.finishTime && !submitted) {
			actionBtn = `<button type="button" class="btn-primary" style="padding:6px 12px;font-size:12px;margin-left:12px" onclick="event.stopPropagation(); finishItem('${item.linkId}')">Finish Timer</button>`;
		} else if (isFinished && item.complianceResult === "Non-Compliant") {
			actionBtn = `<button type="button" class="btn-ghost" style="padding:6px 12px;font-size:12px;margin-left:12px" onclick="event.stopPropagation(); document.getElementById('exc-fc-${item.linkId}-immediate')?.focus()">Exception</button>`;
		}
	} else if (!item.startTime && !submitted) {
		actionBtn = `<button type="button" class="btn-primary" style="padding:6px 12px;font-size:12px;margin-left:12px" onclick="event.stopPropagation(); startItem('${item.linkId}')">Start Timer</button>`;
	} else if (item.startTime && !item.finishTime && !submitted) {
		actionBtn = `<button type="button" class="btn-primary" style="padding:6px 12px;font-size:12px;margin-left:12px" onclick="event.stopPropagation(); finishItem('${item.linkId}')">Finish Timer</button>`;
	} else if (isFinished && item.complianceResult === "Non-Compliant") {
		actionBtn = `<button type="button" class="btn-ghost" style="padding:6px 12px;font-size:12px;margin-left:12px" onclick="event.stopPropagation(); document.getElementById('exc-fc-${item.linkId}-immediate')?.focus()">Exception</button>`;
	}

	const statusBadge = isInProgress
		? `<span class="fc-status-badge in-progress"><span class="fc-status-dot"></span>In Progress</span>`
		: isFinished
			? `<span class="fc-status-badge ${item.complianceResult === "Compliant" ? "compliant" : "non-compliant"}"><span class="fc-status-dot"></span>${item.complianceResult}</span>`
			: `<span class="fc-status-badge not-started"><span class="fc-status-dot"></span>Not started</span>`;

	let rowHtml = `
    <tr class="${isSelected ? "selected" : ""}" onclick="toggleFCExpand('${item.linkId}')" style="cursor: pointer;">
      <td><input type="checkbox" class="item-checkbox" data-table="foodchecker" data-id="${item.linkId}" ${isSelected ? "checked" : ""} ${isFinished || submitted ? "disabled" : ""} onclick="event.stopPropagation(); toggleItemSelection('foodchecker', '${item.linkId}')" /></td>
      <td>${i + 1}</td>
      <td>
        <div style="font-weight:600;color:var(--text-primary)">${esc(item.item_description)}</div>
        <div style="font-size:12px;color:var(--text-secondary);margin-top:2px">${esc(item.class)} · ${esc(item.sku)} · Qty: ${esc(item.quantity)}</div>
      </td>
      <td>${
				state.fcExpanded === item.linkId
					? `<div class="form-input-static">${item.startTemp != null ? item.startTemp + " °C" : "—"}</div>`
					: `<input type="number" step="0.1" class="form-input" style="width:90px" id="fc-st-temp-${item.linkId}" value="${item.startTemp ?? ""}" ${dis} onclick="event.stopPropagation()" oninput="updateItemField('${item.linkId}', 'startTemp'); updateItemGate('${item.linkId}')" />`
			}</td>
      <td>${
				item.startTime
					? state.fcExpanded === item.linkId
						? `<div class="form-input-static">${item.finishTemp != null ? item.finishTemp + " °C" : "—"}</div>`
						: `<input type="number" step="0.1" class="form-input" style="width:90px" id="fc-ft-temp-${item.linkId}" value="${item.finishTemp ?? ""}" ${dis} onclick="event.stopPropagation()" oninput="updateItemField('${item.linkId}', 'finishTemp'); updateItemGate('${item.linkId}')" />`
					: "—"
			}</td>
      <td>${statusBadge}</td>
      <td>
        <div class="timer-counter">
          <span class="timer-value" id="fc-timer-${i}">${st.el != null ? fmtElapsed(st.el) : "—"}</span>
          <span class="timer-max">/ ${limits.exposureMax} min</span>
        </div>
        ${actionBtn}
      </td>
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
      <td colspan="7">
        <div class="fc-expanded-panel">
          <div class="preset-grid" style="margin-bottom: 16px;">
            <div class="form-group"><label class="form-label">Start Time</label>
              <input type="text" class="form-input" value="${formatTime(item.startTime)}" readonly /></div>
            <div class="form-group"><label class="form-label">Finish Time</label>
              <input type="text" class="form-input" value="${formatTime(item.finishTime)}" readonly /></div>
            <div class="metric-card">
              <div class="metric-label">Timer</div>
              <div class="timer-counter">
                <span class="timer-value">${elapsed}</span>
                <span class="timer-max">/ ${hmLimits(job).exposureMax} min</span>
              </div>
              <div class="fc-timer-buttons" style="margin-top:8px">
                ${!item.startTime && !submitted ? `<button type="button" class="btn-primary" style="padding:6px 12px;font-size:12px" onclick="event.stopPropagation(); startItem('${item.linkId}')">Start Timer</button>` : ""}
                ${item.startTime && !item.finishTime && !submitted ? `<button type="button" class="btn-primary" style="padding:6px 12px;font-size:12px" onclick="event.stopPropagation(); finishItem('${item.linkId}')">Finish Timer</button>` : ""}
              </div>
            </div>
            <div class="form-group"><label class="form-label required">Start Temperature (°C)</label>
              <input type="number" step="0.1" class="form-input" id="fc-st-temp-${item.linkId}" value="${item.startTemp ?? ""}" ${submitted ? "disabled" : ""} oninput="updateItemField('${item.linkId}', 'startTemp'); updateItemGate('${item.linkId}')" /></div>
            <div class="form-group"><label class="form-label required">Finish Temperature (°C)</label>
              <input type="number" step="0.1" class="form-input" id="fc-ft-temp-${item.linkId}" value="${item.finishTemp ?? ""}" ${submitted ? "disabled" : ""} oninput="updateItemField('${item.linkId}', 'finishTemp'); updateItemGate('${item.linkId}')" /></div>
          </div>

          <div class="metric-cards">
            <div class="metric-card">
              <div class="metric-label">Max Temperature</div>
              <div class="metric-value">${maxTemp} °C</div>
              <div class="metric-hint">${item.finishTemp ? "Final reading" : "Awaiting finish temperature"}</div>
            </div>
            <div class="metric-card ${item.complianceResult === "Compliant" ? "compliant" : ""} ${item.complianceResult === "Non-Compliant" ? "nc" : ""}">
              <div class="metric-label">Item Result</div>
              <div class="metric-value">${item.complianceResult ?? "—"}</div>
              ${item.complianceResult === "Compliant" ? `<div class="metric-status"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg> Meets the applied rule set</div>` : ""}
              ${item.complianceResult === "Non-Compliant" ? `<div class="metric-status nc"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg> Does not meet the applied rule set</div>` : ""}
              ${!item.complianceResult ? `<div class="metric-hint">Calculated on finish</div>` : ""}
            </div>
          </div>

          <div class="form-group" style="margin-top:16px">
            <label class="form-label">Remarks</label>
            <textarea class="form-input" id="fc-${item.linkId}-remarks" placeholder="Remarks" rows="3"></textarea>
          </div>

          ${
						item.complianceResult === "Non-Compliant"
							? `
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
          `
							: ""
					}

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
				const rowEl = document.getElementById(`fc-timer-${i}`);
				if (rowEl) rowEl.textContent = fmtElapsed(elapsed);
				// Update expanded panel if this item is expanded
				if (state.fcExpanded === item.linkId) {
					const timerVal = document.querySelector(".timer-value");
					const timerMax = document.querySelector(".timer-max");
					if (timerVal) {
						const limits = hmLimits(job);
						timerVal.textContent = fmtElapsed(elapsed);
						if (timerMax) timerMax.textContent = `/ ${limits.exposureMax} min`;
					}
				}
			}
		}
		// Auto-stop if no running items
		const hasRunning = items.some((it) => it.startTime && !it.finishTime);
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
	const hasRunning = (job.foodChecker.items || []).some(
		(it) => it.startTime && !it.finishTime,
	);
	if (hasRunning && !fcTimerInterval) startFCTimer();
}

function toggleFCExpand(linkId) {
	state.fcExpanded = state.fcExpanded === linkId ? null : linkId;
	renderDetail();
}






// ── Attach FC functions to window ──────────────────────────────────
window.toggleFCExpand = toggleFCExpand;


function renderItemRow(job, item, i, submitted) {
	const st = itemStatus(item, job);
	const limits = hmLimits(job);
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
      <td>
        <div style="font-weight:600;color:var(--text-primary)">${esc(item.item_description)}</div>
        <div style="font-size:12px;color:var(--text-secondary);margin-top:2px">${esc(item.class)} · ${esc(item.sku)} · Qty: ${esc(item.quantity)}</div>
      </td>
      <td><input type="number" step="0.1" class="form-input" style="width:90px" id="fc-st-temp-${item.linkId}" value="${item.startTemp ?? ""}" ${dis} oninput="updateItemGate('${item.linkId}')" /></td>
      <td><input type="number" step="0.1" class="form-input" style="width:90px" id="fc-ft-temp-${item.linkId}" value="${item.finishTemp ?? ""}" ${dis} oninput="updateItemGate('${item.linkId}')" /></td>
      <td>${pill(st.label, st.cls, st.el)}</td>
      <td>
        <div class="timer-counter">
          <span class="timer-value" id="fc-timer-${i}">${st.el != null ? fmtElapsed(st.el) : "—"}</span>
          <span class="timer-max">/ ${limits.exposureMax} min</span>
        </div>
        ${action}
      </td>
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

	const inputEl = document.getElementById(
		`fc-${field === "startTemp" ? "st" : "ft"}-temp-${linkId}`,
	);
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
		const [hours, minutes] = value.split(":").map(Number);
		const now = new Date();
		now.setHours(hours, minutes, 0, 0);
		item.startTime = now.toISOString();

		const expandedInput = document.querySelector(
			`#fc-expanded-${linkId} input[type="time"]:disabled`,
		);
		if (expandedInput) {
			expandedInput.value = value;
		}
	} else {
		item.startTime = null;
	}
}

function startItem(linkId) {
	const job = currentJob();
	// Search in both food checker and preset items
	const item =
		(job.foodChecker.items || []).find((it) => it.linkId === linkId) ||
		(job.preset.items || []).find((it) => it.linkId === linkId);
	if (!item) return;

	const isPresetItem = (job.preset.items || []).includes(item);

	// Try to read from DOM input first (check both fc- and preset- prefixes)
	const inputEl =
		document.getElementById("fc-st-temp-" + linkId) ||
		document.getElementById("preset-st-temp-" + linkId);
	const st = inputEl?.value;

	// Fallback to item.startTemp if DOM input is empty
	const startTemp = st !== "" && st != null ? parseFloat(st) : item.startTemp;

	if (startTemp == null || isNaN(startTemp)) {
		showErr(
			`fc-error-${linkId}`,
			"Start temperature is required before starting this item's timer.",
		);
		return;
	}

	item.startTemp = startTemp;
	item.startTime = new Date().toISOString();
	job.history.push({
		at: item.startTime,
		actor: isPresetItem ? "FAA" : "Food Checker",
		field: isPresetItem ? "preset.item" : "fc.item",
		from: "NotStarted",
		to: "InProgress",
		stage: isPresetItem ? "preset" : "foodchecker",
		version: 1,
	});
	renderDetail();
	if (isPresetItem) updatePresetTabBadge();
	else updateFcTabBadge();
	if (isPresetItem) startPresetTimer();
	else checkAndStartFCTimer();
}

function finishItem(linkId) {
	const job = currentJob();
	// Search in both food checker and preset items
	const item =
		(job.foodChecker.items || []).find((it) => it.linkId === linkId) ||
		(job.preset.items || []).find((it) => it.linkId === linkId);
	if (!item) return;

	const isPresetItem = (job.preset.items || []).includes(item);

	const ft =
		document.getElementById("fc-ft-temp-" + linkId)?.value ||
		document.getElementById("preset-ft-temp-" + linkId)?.value;
	if (ft === "" || ft == null) {
		showErr(
			`fc-error-${linkId}`,
			"Finish temperature is required before completing this item.",
		);
		return;
	}
	item.finishTemp = parseFloat(ft);
	item.finishTime = new Date().toISOString();
	const limits = hmLimits(job);
	item.durationMin = Math.round(
		(new Date(item.finishTime) - new Date(item.startTime)) / 60000,
	);
	const maxTemp = Math.max(item.startTemp, item.finishTemp);
	item.complianceResult =
		item.durationMin > limits.exposureMax || maxTemp > limits.presetTempMax
			? "Non-Compliant"
			: "Compliant";
	job.history.push({
		at: item.finishTime,
		actor: isPresetItem ? "FAA" : "Food Checker",
		field: isPresetItem ? "preset.item" : "fc.item",
		from: "InProgress",
		to: item.complianceResult,
		stage: isPresetItem ? "preset" : "foodchecker",
		version: 1,
	});
	renderDetail();
	if (isPresetItem) updatePresetTabBadge();
	else updateFcTabBadge();
	if (isPresetItem) checkPresetTimerStop();
	else checkAndStartFCTimer();
}

// ── Preset Timer (SICC2) ───────────────────────────────────────────
let presetTimerInterval = null;

function startPresetTimer() {
	if (presetTimerInterval) return;
	presetTimerInterval = setInterval(() => {
		const job = currentJob();
		if (!job) return;
		const items = job.preset.items || [];
		for (let i = 0; i < items.length; i++) {
			const item = items[i];
			if (item.startTime && !item.finishTime) {
				const elapsed = elapsedMin(item.startTime);
				// Update elapsed in table row
				const rowEl = document.getElementById(`preset-elapsed-${item.linkId}`);
				if (rowEl) rowEl.textContent = fmtElapsed(elapsed);
				// Update expanded panel timer if this item is expanded
				if (state.presetSICC2Expanded === item.linkId) {
					const timerVal = document.getElementById(
						`preset-timer-${item.linkId}`,
					);
					if (timerVal) {
						const limits = hmLimits(job);
						timerVal.innerHTML = `${fmtElapsed(elapsed)} <span>/ ${limits.exposureMax} min</span>`;
					}
				}
			}
		}
		// Auto-stop if no running items
		const hasRunning = items.some((it) => it.startTime && !it.finishTime);
		if (!hasRunning) stopPresetTimer();
	}, 1000);
}

function stopPresetTimer() {
	if (presetTimerInterval) {
		clearInterval(presetTimerInterval);
		presetTimerInterval = null;
	}
}

function checkPresetTimerStop() {
	const job = currentJob();
	if (!job) return;
	const items = job.preset.items || [];
	const hasRunning = items.some((it) => it.startTime && !it.finishTime);
	if (!hasRunning) stopPresetTimer();
}

function updatePresetItemField(linkId, field, value) {
	const job = currentJob();
	const item = (job.preset.items || []).find((it) => it.linkId === linkId);
	if (!item) return;

	// If value not provided, read from DOM (same as updateItemField)
	if (value === undefined) {
		const inputEl = document.getElementById(
			`preset-${field === "startTemp" ? "st" : "ft"}-temp-${linkId}`,
		);
		if (!inputEl) return;
		value = inputEl.value;
	}

	item[field] = value === "" || value == null ? null : parseFloat(value);
}
window.updatePresetItemField = updatePresetItemField;

function fmtDuration(min) {
	if (min == null) return "—";
	const h = Math.floor(min / 60);
	const m = Math.round(min % 60);
	return h > 0 ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}m`;
}

function formatTimeInput(el) {
	let v = el.value.replace(/\D/g, "");
	v = v.slice(0, 4);
	if (v.length >= 2) {
		let hh = parseInt(v.slice(0, 2), 10);
		if (hh > 23) hh = 23;
		v = String(hh).padStart(2, "0") + v.slice(2);
	}
	if (v.length >= 4) {
		let mm = parseInt(v.slice(2, 4), 10);
		if (mm > 59) mm = 59;
		v = v.slice(0, 2) + String(mm).padStart(2, "0");
	}
	el.value = v.length >= 3 ? v.slice(0, 2) + ":" + v.slice(2) : v;
}
window.formatTimeInput = formatTimeInput;

function setDispatchNow(type) {
	const now = new Date();
	const timeStr = now.toTimeString().slice(0, 5);
	const el = document.getElementById(`d-${type}-exit-time`);
	if (el) el.value = timeStr;
	updateDispatchBeforeExitTime(type, timeStr);
}
window.setDispatchNow = setDispatchNow;

function updateDispatchItemTemp(type, linkId, value) {
	const job = currentJob();
	const dispatch = type === "preset" ? job.dispatchPreset : job.dispatchFC;
	if (!dispatch) return;
	if (!dispatch.beforeExitTemps) dispatch.beforeExitTemps = {};
	dispatch.beforeExitTemps[linkId] =
		value === "" || value == null ? null : parseFloat(value);
	persistJob(job);

	// Targeted update: only update the specific row's result
	const limits = hmLimits(job);
	const itemTemp = dispatch.beforeExitTemps[linkId];
	const itemResult =
		itemTemp != null
			? itemTemp <= limits.dispatchTempMax
				? "Compliant"
				: "Non-Compliant"
			: null;

	// Find the row containing this input and update its result cell
	const inputEl = document.querySelector(
		`input[onchange*="updateDispatchItemTemp('${type}', '${linkId}'"]`,
	);
	if (inputEl) {
		const row = inputEl.closest("tr");
		const resultCell = row?.querySelector("td:last-child");
		if (resultCell) {
			resultCell.innerHTML = itemResult
				? `<span class="status-pill ${itemResult === "Compliant" ? "compliant" : "nc"}">${itemResult}</span>`
				: '<span class="status-pill not-started">Awaiting</span>';
		}
	}

	// Check if all temps are now entered → enable/disable before-exit time field
	const items = type === "preset" ? job.preset.items : job.foodChecker.items;
	const allTempsEntered =
		items.length > 0 &&
		items.every((item) => dispatch.beforeExitTemps?.[item.linkId] != null);
	const exitTimeInput = document.getElementById(`d-${type}-exit-time`);
	const nowBtn = exitTimeInput?.nextElementSibling;
	if (exitTimeInput) {
		if (allTempsEntered) {
			exitTimeInput.removeAttribute("disabled");
			exitTimeInput.placeholder = "";
		} else {
			exitTimeInput.setAttribute("disabled", "");
			exitTimeInput.placeholder = "Enter all temps first";
		}
	}
	if (nowBtn && nowBtn.tagName === "BUTTON") {
		nowBtn.style.display = allTempsEntered ? "" : "none";
	}
}
window.updateDispatchItemTemp = updateDispatchItemTemp;

function updateDispatchBeforeExitTime(type, value) {
	const job = currentJob();
	const dispatch = type === "preset" ? job.dispatchPreset : job.dispatchFC;
	if (!dispatch) return;
	dispatch.beforeExitTime = value || null;

	if (dispatch.coldSoakStart && value) {
		const [h, m] = value.split(":").map(Number);
		const exitTimeMinutes = h * 60 + m;
		const startDate = new Date(dispatch.coldSoakStart);
		const startMinutes = startDate.getHours() * 60 + startDate.getMinutes();
		let durationMin = exitTimeMinutes - startMinutes;
		if (durationMin < 0) durationMin += 24 * 60;
		dispatch.coldSoakDurationMin = durationMin;
	}

	persistJob(job);

	// Targeted update: stop timer, update timer display to short format
	stopDispatchTimerUpdates(type);

	const coldSoakStart = dispatch.coldSoakStart;
	if (coldSoakStart) {
		const el = dispatch.coldSoakDurationMin;
		const valueEl = document.getElementById(`dispatch-timer-value-${type}`);
		if (valueEl) valueEl.textContent = fmtElapsedShort(el);
	}

	// Hide Now button since time is now set (keep input enabled for editing)
	const exitTimeInput = document.getElementById(`d-${type}-exit-time`);
	const nowBtn = exitTimeInput?.nextElementSibling;
	if (nowBtn && nowBtn.tagName === "BUTTON") nowBtn.style.display = "none";
	updateDispatchTabBadge();
}
window.updateDispatchBeforeExitTime = updateDispatchBeforeExitTime;

function submitDispatch(type) {
	const job = currentJob();
	const dispatch = type === "preset" ? job.dispatchPreset : job.dispatchFC;
	if (!dispatch) return;

	const items =
		type === "preset" ? job.preset.items || [] : job.foodChecker.items || [];

	const temps = Object.values(dispatch.beforeExitTemps || {}).filter(
		(v) => v != null && v !== "",
	);
	if (temps.length < items.length) {
		alert("Please enter temperatures for all items before submitting.");
		return;
	}

	dispatch.status = "Submitted";
	dispatch.submittedAt = new Date().toISOString();

	const limits = hmLimits(job);
	const maxTemp = temps.length > 0 ? Math.max(...temps) : null;
	dispatch.complianceResult =
		maxTemp != null && maxTemp <= limits.dispatchTempMax
			? "Compliant"
			: "Non-Compliant";

	persistJob(job);
	renderDispatch(document.getElementById("detail-body"), job);
	updateDispatchTabBadge();
}
window.submitDispatch = submitDispatch;

// ── Dispatch tab ────────────────────────────────────────────────────
function dispatchLive(job) {
	if (job.site !== "SICC2") return null;

	const presetDispatch = job.dispatchPreset;
	const fcDispatch = job.dispatchFC;

	// Check if either dispatch exists
	if (!presetDispatch && !fcDispatch) {
		return { label: "Locked", cls: "locked", el: null };
	}

	// Check if both are submitted
	if (
		presetDispatch?.status === "Submitted" &&
		fcDispatch?.status === "Submitted"
	) {
		const presetCompliant = presetDispatch.complianceResult === "Compliant";
		const fcCompliant = fcDispatch.complianceResult === "Compliant";
		const overallCompliant = presetCompliant && fcCompliant;
		return {
			label: overallCompliant ? "Compliant" : "Non-Compliant",
			cls: overallCompliant ? "compliant" : "nc",
			el: null,
		};
	}

	// Check if either has cold soak started
	const presetColdSoakStart = presetDispatch?.coldSoakStart;
	const fcColdSoakStart = fcDispatch?.coldSoakStart;

	if (presetColdSoakStart || fcColdSoakStart) {
		// Use the earliest cold soak start
		const coldSoakStart =
			presetColdSoakStart && fcColdSoakStart
				? Math.min(presetColdSoakStart, fcColdSoakStart)
				: presetColdSoakStart || fcColdSoakStart;

		const el = elapsedMin(coldSoakStart);
		const min = hmLimits(job).coldSoakMin;

		if (el >= min)
			return { label: "Eligible for dispatch", cls: "eligible", el };
		return { label: "Cold Soak", cls: "cold-soak", el };
	}

	return { label: "Locked", cls: "locked", el: null };
}

function renderDispatchPanel(dispatch, items, type, prereqFinished = true) {
	const submitted = dispatch?.status === "Submitted";
	const limits = hmLimits(currentJob());
	const min = limits.coldSoakMin;
	// Fallback: if coldSoakStart is null but status is ColdSoak, use current time
	const coldSoakStart =
		dispatch?.coldSoakStart ||
		(dispatch?.status === "ColdSoak" ? Date.now() : null);
	// Calculate duration: before-exit time minus preset finish time
	const el =
		dispatch?.coldSoakDurationMin ??
		(coldSoakStart ? elapsedMin(coldSoakStart) : null);
	const progress = el != null ? Math.min((el / min) * 100, 100) : 0;
	const isEligible = el != null && el >= min;
	const coldSoakStartStr = coldSoakStart
		? new Date(coldSoakStart).toLocaleTimeString("en-GB", {
				hour: "2-digit",
				minute: "2-digit",
			})
		: "—";
	const dis = submitted || !prereqFinished ? "disabled" : "";
	const canEdit = !submitted && prereqFinished;
	const hasExitTime = !!dispatch?.beforeExitTime;
	const allTempsEntered =
		items.length > 0 &&
		items.every((item) => dispatch?.beforeExitTemps?.[item.linkId] != null);
	const tempDisabled = dis;
	const exitTimeDisabled = dis || (!allTempsEntered ? "disabled" : "");

	return `
    ${!prereqFinished ? `<div class="empty-state" style="margin-bottom:12px">Waiting for ${type === 'preset' ? 'preset' : 'food checker'} to finish \u2014 all timers must be complete before dispatch.</div>` : ''}
    <div class="fc-timer-bar" style="margin-bottom:16px">
      <div class="fc-timer-display">
        <div class="fc-timer-value" id="dispatch-timer-value-${type}" style="font-size:48px;font-weight:700">${el != null ? (dispatch?.beforeExitTime ? fmtElapsedShort(el) : fmtElapsed(el)) : "—"}</div>
        <div style="margin-top:8px">
          <div style="height:6px;background:var(--border);border-radius:3px;overflow:hidden">
            <div id="dispatch-timer-progress-${type}" style="height:100%;width:${progress}%;background:var(--success);transition:width 1s"></div>
          </div>
        </div>
      </div>
      <div style="flex:1;padding:0 24px">
        <div style="font-size:14px;color:var(--text-secondary)">Cold soak minimum <b>${fmtDuration(min)}</b> · from ${coldSoakStartStr}</div>
        <div style="font-size:14px;font-weight:600;margin-top:4px">${isEligible ? "Minimum already met — eligible for dispatch" : "Cold soak in progress..."}</div>
      </div>
    </div>
    
    <div class="form-grid" style="margin-top:16px">
      <div class="form-group">
        <label class="form-label">Cold soak start</label>
        <input type="text" class="form-input" readonly value="${coldSoakStartStr}" style="background:var(--bg-surface)" />
      </div>
      <div class="form-group">
        <label class="form-label required">Before-exit time (24h)</label>
        <div style="display:flex;gap:8px">
          <input type="text" class="form-input" id="d-${type}-exit-time" value="${dispatch?.beforeExitTime ?? ""}" ${exitTimeDisabled} style="flex:1" oninput="formatTimeInput(this)" onchange="updateDispatchBeforeExitTime('${type}', this.value)" placeholder="${!allTempsEntered ? "Enter all temps first" : "HH:MM"}" maxlength="5" />
          ${canEdit ? `<button type="button" class="btn-primary" onclick="setDispatchNow('${type}')" style="padding:8px 16px; display: ${allTempsEntered ? "" : "none"}">Now</button>` : ""}
        </div>
      </div>
    </div>
    
<div class="table-wrap" style="margin-top:20px">
      <table class="fc-table">
        <thead>
          <tr>
            <th style="width:40px">#</th>
            <th>ITEM</th>
            <th style="width:140px">BEFORE-EXIT TEMP °C *</th>
            <th style="width:120px">ITEM RESULT</th>
          </tr>
        </thead>
        <tbody>
          ${items
						.map((item, i) => {
							const itemTemp = dispatch?.beforeExitTemps?.[item.linkId] ?? "";
							const itemResult =
								itemTemp !== "" && itemTemp != null
									? parseFloat(itemTemp) <= limits.dispatchTempMax
										? "Compliant"
										: "Non-Compliant"
									: null;
							return `<tr data-linkid="${item.linkId}">
              <td>${i + 1}</td>
              <td>
                <div style="font-weight:600;color:var(--text-primary)">${esc(item.item_description)}</div>
                <div style="font-size:12px;color:var(--text-secondary);margin-top:2px">${esc(item.class)} · ${esc(item.sku)}</div>
              </td>
              <td><input type="number" step="0.1" class="form-input" value="${itemTemp}" ${tempDisabled} onchange="updateDispatchItemTemp('${type}', '${item.linkId}', this.value)" onclick="event.stopPropagation()" style="width:100px" /></td>
              <td>${itemResult ? `<span class="status-pill ${itemResult === "Compliant" ? "compliant" : "nc"}">${itemResult}</span>` : '<span class="status-pill not-started">Awaiting</span>'}</td>
            </tr>`;
						})
						.join("")}
        </tbody>
      </table>
    </div>
    
    ${canEdit ? `<div style="display:flex;justify-content:flex-end;margin-top:16px"><button type="button" class="btn-primary" onclick="submitDispatch('${type}')">Submit Dispatch</button></div>` : !prereqFinished ? '<div class="empty-state" style="margin-top:16px">Waiting for ' + (type === 'preset' ? 'preset' : 'food checker') + ' to finish (all timers complete).</div>' : '<div class="status-pill submitted" style="margin-top:16px">Submitted</div>'}
  `;
}

// ── Dispatch timer updates (lightweight, only updates timer elements) ──
const dispatchTimerIntervals = {};

function startDispatchTimerUpdates(type) {
	stopDispatchTimerUpdates(type);
	dispatchTimerIntervals[type] = setInterval(() => {
		const job = currentJob();
		if (!job) return;
		const dispatch = type === "preset" ? job.dispatchPreset : job.dispatchFC;
		if (!dispatch || !dispatch.coldSoakStart) return;

		// Always show elapsed time (ticking)
		const el = elapsedMin(dispatch.coldSoakStart);
		const min = hmLimits(job).coldSoakMin;
		const progress = Math.min((el / min) * 100, 100);

		const valueEl = document.getElementById(`dispatch-timer-value-${type}`);
		const progressEl = document.getElementById(
			`dispatch-timer-progress-${type}`,
		);

		const displayValue = dispatch.beforeExitTime
			? fmtElapsedShort(el)
			: fmtElapsed(el);
		if (valueEl) valueEl.textContent = displayValue;
		if (progressEl) progressEl.style.width = `${progress}%`;

		// Stop ticking when before-exit time is entered
		if (dispatch.beforeExitTime) {
			stopDispatchTimerUpdates(type);
		}
	}, 1000);
}

function stopDispatchTimerUpdates(type) {
	if (dispatchTimerIntervals[type]) {
		clearInterval(dispatchTimerIntervals[type]);
		delete dispatchTimerIntervals[type];
	}
}

function renderDispatch(body, job) {
	if (job.site !== "SICC2") {
		body.innerHTML = `<div class="empty-state">Dispatch is not available at ${esc(job.site)}.</div>`;
		return;
	}

	const presetItems = job.preset.items || [];
	const fcItems = job.foodChecker.items || [];

	const presetFinished =
		job.preset?.status === "Submitted" &&
		presetItems.every((it) => !it.startTime || it.finishTime);
	const fcFinished =
		job.foodChecker?.status === "Submitted" &&
		fcItems.every((it) => !it.startTime || it.finishTime);

	body.innerHTML = `
    <div class="dispatch-panels">
      <div class="dispatch-panel">
        <h3 class="panel-title">Preset Dispatch</h3>
        ${renderDispatchPanel(job.dispatchPreset, presetItems, "preset", presetFinished)}
      </div>
      <div class="dispatch-panel">
        <h3 class="panel-title">Food Checker Dispatch</h3>
        ${renderDispatchPanel(job.dispatchFC, fcItems, "fc", fcFinished)}
      </div>
    </div>
  `;

	// Start timer updates for each dispatch type if before-exit time is not entered
	const presetDispatch = job.dispatchPreset;
	const fcDispatch = job.dispatchFC;

	if (
		presetDispatch &&
		presetDispatch.coldSoakStart &&
		presetDispatch.status !== "Submitted"
	) {
		if (!presetDispatch.beforeExitTime) {
			startDispatchTimerUpdates("preset");
		} else {
			stopDispatchTimerUpdates("preset");
		}
	} else {
		stopDispatchTimerUpdates("preset");
	}

	if (
		fcDispatch &&
		fcDispatch.coldSoakStart &&
		fcDispatch.status !== "Submitted"
	) {
		if (!fcDispatch.beforeExitTime) {
			startDispatchTimerUpdates("fc");
		} else {
			stopDispatchTimerUpdates("fc");
		}
	} else {
		stopDispatchTimerUpdates("fc");
	}
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
	const errId =
		stage === "preset"
			? "preset-error"
			: stage === "foodchecker"
				? "fc-error"
				: "dispatch-error";

	if (stage === "preset") {
		const presetMethod =
			job.site === "SICC2" ? "items" : state.presetMethod || "services";
		const itemsToCheck =
			presetMethod === "items"
				? job.preset.items || []
				: job.preset.services || [{}];
		if (itemsToCheck.length === 0)
			return showErr(
				errId,
				presetMethod === "items"
					? "No preset items to submit."
					: "No preset services to submit.",
			);

		const startedItems = itemsToCheck.filter((s) => s.startTime);
		if (startedItems.length === 0)
			return showErr(
				errId,
				presetMethod === "items"
					? "At least one preset item must be started."
					: "At least one preset service must be started.",
			);
		if (!startedItems.every((s) => s.finishTime))
			return showErr(
				errId,
				presetMethod === "items"
					? "All started items must be finished before submitting."
					: "All started services must be finished before submitting.",
			);

		const finishedItems = startedItems.filter((s) => s.finishTime);
		// Calculate overall preset compliance based on individual results
		const allCompliant = finishedItems.every(
			(s) => s.complianceResult === "Compliant",
		);
		job.preset.complianceResult = allCompliant ? "Compliant" : "Non-Compliant";

		// Set aggregate values for display
		const maxExposure = Math.max(
			...finishedItems.map((s) => s.exposureDurationMin || 0),
		);
		const maxTemp = Math.max(
			...finishedItems.map((s) => s.maxSurfaceTemp || 0),
		);
		job.preset.exposureDurationMin = maxExposure;
		job.preset.maxSurfaceTemp = maxTemp;

		const hasNonCompliant = finishedItems.some(
			(s) => s.complianceResult === "Non-Compliant",
		);
		if (hasNonCompliant) {
			const exErr = validateException("preset");
			if (exErr) return showErr(errId, exErr);
		}
	}

	if (stage === "foodchecker") {
		const items = job.foodChecker.items || [];
		if (!items.length) return showErr(errId, "No linked items to check.");
		const unfinished = items.filter((it) => !it.complianceResult);
		if (unfinished.length)
			return showErr(errId, `${unfinished.length} item(s) still unfinished.`);
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
		if (!t || temp === "")
			return showErr(errId, "Before-exit time and temperature are required.");
		job.dispatch.beforeExitTime = t;
		job.dispatch.beforeExitTemp = parseFloat(temp);
		const exitHM = hmParse(t);
		const startHM = timeOfDayHM(job.preset.finishTime);
		let dur = exitHM - startHM;
		if (dur < 0) dur += 1440;
		job.dispatch.coldSoakDurationMin = dur;
		const limits = hmLimits(job);
		job.dispatch.complianceResult =
			dur < limits.coldSoakMin ||
			job.dispatch.beforeExitTemp > limits.dispatchTempMax
				? "Non-Compliant"
				: "Compliant";
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
		job.history.push({
			at: now,
			actor: resolved.staffId,
			field: "preset",
			from: "Started",
			to: "Submitted",
			stage: "preset",
			version: 1,
		});
		if (job.site === "SICC2") {
			// Set preset dispatch cold soak start
			const presetItems = job.preset?.items || [];
			const lastPresetFinish = presetItems
				.filter((i) => i.finishTime)
				.reduce((max, i) => Math.max(max, new Date(i.finishTime).getTime()), 0);
			if (!job.dispatchPreset) job.dispatchPreset = {};
			job.dispatchPreset.status = "ColdSoak";
			job.dispatchPreset.coldSoakStart =
				lastPresetFinish || job.preset?.finishTime || Date.now();
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
		job.history.push({
			at: now,
			actor: resolved.staffId,
			field: "foodchecker",
			from: "InProgress",
			to: "Submitted",
			stage: "foodchecker",
			version: 1,
		});
		if (job.site === "SICC2") {
			// Set FC dispatch cold soak start
			const fcItems = job.foodChecker?.items || [];
			const lastFCFinish = fcItems
				.filter((i) => i.finishTime)
				.reduce((max, i) => Math.max(max, new Date(i.finishTime).getTime()), 0);
			if (!job.dispatchFC) job.dispatchFC = {};
			job.dispatchFC.status = "ColdSoak";
			job.dispatchFC.coldSoakStart = lastFCFinish || Date.now();
		}
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
		job.history.push({
			at: now,
			actor: resolved.staffId,
			field: "dispatch",
			from: "ColdSoak",
			to: "Submitted",
			stage: "dispatch",
			version: 1,
		});
	}

	// Check if all stages are completed
	if (
		job.preset?.status === "Submitted" &&
		job.foodChecker?.status === "Submitted" &&
		job.dispatch?.status === "Submitted"
	) {
		job.completed = new Date().toISOString();
	}

	maybeCloseJob(job);
	persistJob(job);

	// Re-render dispatch panel if on dispatch tab
	if (state.activeTab === "dispatch") {
		renderDispatch(document.getElementById("detail-body"), job);
	}

	// Update tab badges after stage commit
	renderDetail();
	updatePresetTabBadge();
	updateFcTabBadge();
	updateDispatchTabBadge();
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
		if (timerEl && job.preset.startTime)
			timerEl.textContent = fmtElapsed(elapsedMin(job.preset.startTime));
	}
	if (state.activeTab === "foodchecker") {
		(job.foodChecker.items || []).forEach((it, i) => {
			const el = document.getElementById("fc-timer-" + i);
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

function startTicker() {
	setInterval(() => {
		if (state.currentScreen === "detail") tickDetailLive();
	}, 1000);
}

// ── Helpers (shared with report) ────────────────────────────────
function stageResultText(job, stage) {
	if (stage === "preset") {
		const p = job.preset;
		if (p.status === "Submitted")
			return p.complianceResult === "Compliant" ? "Compliant" : "Non-Compliant";
		if (p.startTime && !p.finishTime) return "In Progress";
		return "Not Started";
	}
	if (stage === "foodchecker") {
		const fc = job.foodChecker;
		const items = fc.items || [];
		if (fc.status === "Submitted") {
			const nc = items.filter(
				(i) => i.complianceResult === "Non-Compliant",
			).length;
			return nc ? "Non-Compliant" : "Compliant";
		}
		const started = items.filter((i) => i.startTime).length;
		if (started) return started + "/" + items.length + " started";
		return items.length ? "Not Started" : "No items";
	}
	if (stage === "dispatch") {
		const d = job.dispatch;
		if (job.site !== "SICC2") return "—";
		if (!d || d.status !== "Submitted")
			return d?.coldSoakStart ? "Cold Soak" : "Locked";
		return d.complianceResult === "Compliant" ? "Compliant" : "Non-Compliant";
	}
	return "";
}

// ── Init ────────────────────────────────────────────────────────────
window.preview = preview;
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
	if (value === "yes") {
		yesBtn.classList.add("active");
		noBtn.classList.remove("active");
	} else {
		noBtn.classList.add("active");
		yesBtn.classList.remove("active");
	}
}

function handlePhotoUpload(linkId, input) {
	const file = input.files[0];
	if (!file) return;
	const reader = new FileReader();
	reader.onload = (e) => {
		const preview = document.getElementById(`exc-fc-${linkId}-photo-preview`);
		if (preview) {
			preview.innerHTML = `<img src="${e.target.result}" style="max-width:100%;max-height:120px;border-radius:6px" />`;
		}
	};
	reader.readAsDataURL(file);
}

window.toggleDisposed = toggleDisposed;
window.handlePhotoUpload = handlePhotoUpload;
window.submitStage = submitStage;
window.resolveIdentity = resolveIdentity;
window.confirmSignoff = confirmSignoff;
window.closeSignoff = closeSignoff;

// Selection helper functions
window.toggleSelectAll = toggleSelectAll;
window.toggleItemSelection = toggleItemSelection;
window.startSelectedItems = startSelectedItems;
window.finishSelectedItems = finishSelectedItems;
window.showToast = showToast;
window.getItemsForTable = getItemsForTable;
// Wrapper for backward compatibility
window.renderCurrentJob = function() { renderDetail(); };
window.currentJob = currentJob;
window.persistJob = persistJob;

window.navigate = (s) => {
	if (s === "current") preview.go(VIEWS.current);
	if (s === "report") {
		const j = currentJob();
		preview.openRecord(
			VIEWS.report,
			(j && j.job_id) || state.activeJobId || "",
		);
	}
};

// ── Web Report popover ───────────────────────────────────────────────
function toggleWebReportPopover(e) {
	const pop = document.getElementById("web-report-popover");
	if (!pop) return;
	const willOpen = pop.classList.contains("hidden");
	if (willOpen) {
		const btn =
			(e && e.currentTarget) ||
			document.querySelector('[onclick*="toggleWebReportPopover"]');
		if (btn) {
			const r = btn.getBoundingClientRect();
			pop.style.right = document.documentElement.clientWidth - r.right + "px";
			pop.style.top = r.bottom + window.scrollY + 8 + "px";
		}
	}
	pop.classList.toggle("hidden", !willOpen);
}
window.toggleWebReportPopover = toggleWebReportPopover;

function goToWebReport() {
	const j = currentJob();
	preview.openRecord(
		VIEWS.report,
		(j && j.job_id) || state.activeJobId || "",
	);
}
window.goToWebReport = goToWebReport;

const IS_LOCAL = ["localhost", "127.0.0.1", ""].includes(location.hostname);

document.addEventListener("DOMContentLoaded", async () => {
	const recordId = preview.recordId();
	if (IS_LOCAL) {
		// No preview-store on a plain dev server — seed in memory only.
		state.jobs = buildSeed();
	} else {
		if (!state.jobs.length) state.jobs = buildSeed();
		await loadJobs();
	}
	if (recordId) {
		const m = findJobByRecord(recordId);
		if (m) state.activeJobId = m.job_id;
		else state.activeJobId = recordId;
	}
	state.currentScreen = "detail";
	renderDetail();
	startTicker();

	// Close web-report popover when clicking outside it or its trigger button
	document.addEventListener("click", (ev) => {
		const pop = document.getElementById("web-report-popover");
		if (!pop || pop.classList.contains("hidden")) return;
		const trigger = ev.target.closest('[onclick*="toggleWebReportPopover"]');
		if (trigger && pop.contains(trigger)) return;
		if (!pop.contains(ev.target) && !trigger) {
			pop.classList.add("hidden");
		}
	});
});
