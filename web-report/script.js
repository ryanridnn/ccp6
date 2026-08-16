import { buildSeed, seedStaff, seedFlights } from "../sample-data.js";

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

function fmtDuration(min) {
	if (min == null) return "—";
	const h = Math.floor(min / 60);
	const m = Math.round(min % 60);
	return h > 0 ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}m`;
}

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

function renderReport() {
	const job = currentJob();
	const body = document.getElementById("report-body");
	if (!job) {
		body.innerHTML = `<div class="empty-state">Job not found.</div>`;
		return;
	}
	document.getElementById("report-sub").textContent =
		`${job.flight_number} · ${job.meal_service} · Grp ${job.ta_group} · ${job.airline} · ${job.site}`;
	const tag = (label, v) =>
		`<div class="form-group"><div class="jh-label">${esc(label)}</div><div class="jh-value">${esc(v)}</div></div>`;
	const fcItems = (job.foodChecker.items || [])
		.map(
			(it) => `<tr>
    <td>${esc(it.sku)}</td><td>${esc(it.item_description)}</td><td>${esc(it.class)}</td><td>${esc(it.quantity)}</td>
    <td>${it.startTemp ?? "—"}</td><td>${it.finishTemp ?? "—"}</td><td>${it.durationMin ?? "—"} min</td>
    <td>${esc(it.complianceResult || "Not Started")}</td></tr>`,
		)
		.join("");
	const signoffRows = (job.signoffs || [])
		.map(
			(s) =>
				`<tr><td>${esc(s.stage)}</td><td>${esc(s.staffName)} (${esc(s.staffId)})</td><td>${esc(s.role)}</td><td>${esc(s.captureMethod)}</td><td>${esc(new Date(s.submittedAt).toLocaleString())}</td></tr>`,
		)
		.join("");
	const historyRows = (job.history || [])
		.map(
			(h) =>
				`<tr><td>${esc(new Date(h.at).toLocaleString())}</td><td>${esc(h.actor)}</td><td>${esc(h.field)}</td><td>${esc(h.from)} → ${esc(h.to)}</td><td>${esc(h.stage)}</td></tr>`,
		)
		.join("");
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
    ${
			job.site === "SICC2"
				? `<div class="panel"><div class="panel-title">Dispatch</div><div class="form-grid">
      ${tag("Cold Soak Start", job.dispatch?.coldSoakStart ? new Date(job.dispatch.coldSoakStart).toLocaleString() : "—")}
      ${tag("Before-Exit Time", job.dispatch?.beforeExitTime || "—")}
      ${tag("Dispatch Temp", (job.dispatch?.beforeExitTemp ?? "—") + " °C")}
      ${tag("Cold Soak Duration", (job.dispatch?.coldSoakDurationMin ?? "—") + " min")}
      ${tag("Result", job.dispatch?.complianceResult || "—")}
    </div></div>`
				: ""
		}
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
		.map((l) =>
			l
				.split(",")
				.map((c) => `"${String(c).replace(/"/g, '""')}"`)
				.join(","),
		)
		.join("\n");
	downloadFile(
		"ccp6-" + job.job_id + (format === "pdf" ? ".csv" : ".csv"),
		csv,
		"text/csv",
	);
}

// ── Init ────────────────────────────────────────────────────────────
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
window.toggleDisposed = toggleDisposed;

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

// ── Init ────────────────────────────────────────────────────────────
window.preview = preview;
window.exportJob = exportJob;
window.renderReport = renderReport;
window.navigate = (s) => {
	if (s === "current") preview.go(VIEWS.current);
};

document.addEventListener("DOMContentLoaded", async () => {
	if (!state.jobs.length) state.jobs = buildSeed();
	const recordId = preview.recordId();
	if (recordId) state.activeJobId = recordId;
	await loadJobs();
	if (recordId) {
		const m = findJobByRecord(recordId);
		if (m) state.activeJobId = m.job_id;
		else state.activeJobId = recordId;
	}
	renderReport();
});
