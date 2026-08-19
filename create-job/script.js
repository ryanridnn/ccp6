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

// ── SKU master list ───────────────────────────────────────────────
const SKU_LIST = [
	{ sku: "100001", desc: "Chicken Tikka Masala" },
	{ sku: "100002", desc: "Vegetable Korma" },
	{ sku: "100003", desc: "Garlic Naan" },
	{ sku: "100004", desc: "Mango Lassi" },
	{ sku: "100005", desc: "Beef Rendang with Jasmine Rice" },
	{ sku: "100006", desc: "Pan Seared Salmon" },
	{ sku: "100007", desc: "Tiramisu Cup" },
	{ sku: "100008", desc: "Grilled Sea Bass Fillet" },
	{ sku: "100009", desc: "Chocolate Opera Cake" },
	{ sku: "100010", desc: "Roasted Chicken Supreme" },
	{ sku: "100011", desc: "Egg White Omelette" },
	{ sku: "100012", desc: "Buttermilk Pancake Stack" },
	{ sku: "100013", desc: "Fresh Fruit Bowl" },
	{ sku: "100014", desc: "Smoked Salmon Bagel" },
	{ sku: "100015", desc: "Kaya Toast Set" },
	{ sku: "100016", desc: "Dim Sum Platter" },
	{ sku: "100017", desc: "Nasi Lemak" },
	{ sku: "100018", desc: "Rendang Beef" },
	{ sku: "100019", desc: "Bibimbap" },
	{ sku: "100020", desc: "Bulgogi" },
];

// ── State ───────────────────────────────────────────────────────────
const state = {
	jobs: [],
	activeJobId: null,
	activeTab: "preset",
	currentScreen: "current",
	siccFilter: "SICC1",
	presetMethod: null,
	createMode: "scheduled",
	createItems: [{ index: 0, sku: "", item_description: "", class: "", quantity: "", destination: "foodchecker" }],
	createServices: [{ serviceType: "", itemType: "" }],
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

let selectedCreateFlight = null;
let createInitDone = false;

function renderCreate() {
	// Initialize segmented buttons for Mode and Group
	initCreateModeButtons();
	initGroupButtons();
	initCreateFlightDropdown();
	initETDInput();
	updateCreateModeUI();
	updateMealServiceVisibility();
	updateServicesVisibility();
	renderCreateItems();
}

function initETDInput() {
	const etdInput = document.getElementById("create-etd");
	if (!etdInput || etdInput.dataset.init) return;
	etdInput.dataset.init = "1";
	etdInput.addEventListener("input", (e) => {
		let v = e.target.value.replace(/\D/g, "");
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
		if (v.length >= 3) {
			e.target.value = v.slice(0, 2) + ":" + v.slice(2);
		} else if (v.length >= 2) {
			e.target.value = v.slice(0, 2);
		} else {
			e.target.value = v;
		}
	});
}

function updateMealServiceVisibility() {
	const mealServiceGroup = document.querySelector(".create-meal-service-group");
	if (mealServiceGroup) {
		// Always show meal service field by default
		mealServiceGroup.classList.remove("hidden");
	}
}

function updateLoungeVisibility() {
	const loungeRow = document.getElementById("create-lounge-row");
	if (!loungeRow) return;

	const isSICC2 = state.siccFilter === "SICC2";
	const flight = selectedCreateFlight;
	let isOAL = false;

	if (flight) {
		const airline = flight.airline || "";
		isOAL = airline.includes("Standard / Other Airline") ||
			airline.includes("Other") ||
			airline.includes("OAL");
	}

	if (isSICC2 && isOAL) {
		loungeRow.classList.remove("hidden");
	} else {
		loungeRow.classList.add("hidden");
	}
}

function updateServicesVisibility() {
	const servicesSection = document.getElementById("create-services-section");
	if (!servicesSection) return;
	servicesSection.classList.remove("hidden");
	renderServicesTable();
}

function addServiceRow() {
	state.createServices.push({
		serviceType: "",
		itemType: "",
	});
	renderServicesTable();
}

function removeServiceRow(index) {
	state.createServices.splice(index, 1);
	renderServicesTable();
}

function updateServiceField(index, field, value) {
	state.createServices[index][field] = value;
}

function setServiceDropdown(idx, field, value) {
	state.createServices[idx][field] = value;
}
window.setServiceDropdown = setServiceDropdown;

function syncServicesFromDOM() {
	const selects = document.querySelectorAll("#create-services-list .svc-select");
	selects.forEach((sel) => {
		const idx = parseInt(sel.dataset.idx, 10);
		const field = sel.dataset.field;
		if (!isNaN(idx) && field && state.createServices[idx]) {
			state.createServices[idx][field] = sel.value;
		}
	});
}

function renderServicesTable() {
	const list = document.getElementById("create-services-list");
	if (!list) return;

	let html = `
		<table class="services-table">
			<thead>
				<tr>
					<th>Service Type</th>
					<th>Item Type</th>
					<th style="width: 60px;"></th>
				</tr>
			</thead>
			<tbody>
	`;

	state.createServices.forEach((service, idx) => {
		const serviceTypeOpts = ["1st service", "2nd service"];
		const itemTypeOpts = ["Hors d'oeuvre", "Dessert"];
		const opt = (o, val) =>
			'<option value="' + o + '"' + (val === o ? ' selected' : '') + '>' + o + '</option>';
		const select = (field, opts, val, i) =>
			`<select class="svc-select" data-idx="${i}" data-field="${field}" onchange="setServiceDropdown(${i}, '${field}', this.value)">${opts.map((o) => opt(o, val)).join('')}</select>`;
		html += `
			<tr>
				<td>${select("serviceType", serviceTypeOpts, service.serviceType, idx)}</td>
				<td>${select("itemType", itemTypeOpts, service.itemType, idx)}</td>
				<td>
					<button type="button" class="btn-ghost" onclick="removeServiceRow(${idx})" style="padding: 4px 8px;">✕</button>
				</td>
			</tr>
		`;
	});

	html += `</tbody></table>`;
	list.innerHTML = html;
}

function initCreateModeButtons() {
	const container = document.getElementById("create-mode-buttons");
	const hiddenInput = document.getElementById("create-mode");
	if (!container || !hiddenInput) return;

	// Only set default mode if state.createMode hasn't been explicitly set yet
	const currentMode = state.createMode;
	if (!currentMode) {
		state.createMode = "manual";
	}

	// Sync hidden input + button active state with current state.createMode
	hiddenInput.value = state.createMode;
	container
		.querySelectorAll(".segment-btn")
		.forEach((b) => b.classList.remove("active"));
	const activeBtn = container.querySelector(
		".segment-btn[data-value='" + state.createMode + "']",
	);
	if (activeBtn) activeBtn.classList.add("active");

	// Add click handlers (dedupe-safe, adding to already-listening element is a no-op)
	container.querySelectorAll(".segment-btn").forEach((btn) => {
		btn.addEventListener("click", () => {
			if (state.createMode === btn.dataset.value) return;
			container
				.querySelectorAll(".segment-btn")
				.forEach((b) => b.classList.remove("active"));
			btn.classList.add("active");
			hiddenInput.value = btn.dataset.value;
			state.createMode = btn.dataset.value;
			clearCreateFlight();
			updateCreateModeUI();
		});
	});
}

function updateCreateModeUI() {
	// Always show all input fields regardless of mode
	const etdGroup = document.querySelector(".create-etd-group");
	const groupGroup = document.querySelector(".create-group-group");
	const mealServiceGroup = document.querySelector(".create-meal-service-group");

	// Always show field groups
	etdGroup?.classList.remove("hidden");
	groupGroup?.classList.remove("hidden");
	mealServiceGroup?.classList.remove("hidden");

	// Flight number: dropdown in scheduled, text input in manual
	const flightWrap = document.getElementById("create-flight-wrap");
	const flightManual = document.getElementById("create-flight-manual");
	if (flightWrap && flightManual) {
		const isManual = state.createMode === "manual";
		flightWrap.classList.toggle("hidden", isManual);
		flightManual.classList.toggle("hidden", !isManual);
	}

	// ETD: disabled in scheduled mode (auto-populated from flight), enabled in manual
	const etdInput = document.getElementById("create-etd");
	const etdReadonly = document.getElementById("create-etd-readonly");
	if (etdInput && etdReadonly) {
		etdInput.classList.remove("hidden");
		etdReadonly.classList.add("hidden");
		etdInput.disabled = state.createMode === "scheduled";
	}

	const groupButtons = document.getElementById("create-group-buttons");
	const groupReadonly = document.getElementById("create-group-readonly");
	if (groupButtons && groupReadonly) {
		groupButtons.classList.remove("hidden");
		groupReadonly.classList.add("hidden");
	}

	const mealServiceSelect = document.getElementById("create-meal-service");
	const mealServiceReadonly = document.getElementById(
		"create-meal-service-readonly",
	);
	if (mealServiceSelect && mealServiceReadonly) {
		mealServiceSelect.classList.remove("hidden");
		mealServiceReadonly.classList.add("hidden");
	}

	const loungeInput = document.getElementById("create-lounge");
	const loungeReadonly = document.getElementById("create-lounge-readonly");
	if (loungeInput && loungeReadonly) {
		loungeInput.classList.remove("hidden");
		loungeReadonly.classList.add("hidden");
	}

	// Re-render linked items so destination cells reflect the active mode
	renderCreateItems();

	// Ad hoc section: always show
	const adHocToggle = document.getElementById("ad-hoc-toggle");
	if (adHocToggle) {
		adHocToggle.classList.remove("hidden");
	}
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
	container.querySelectorAll(".segment-btn").forEach((btn) => {
		btn.addEventListener("click", () => {
			container
				.querySelectorAll(".segment-btn")
				.forEach((b) => b.classList.remove("active"));
			btn.classList.add("active");
			hiddenInput.value = btn.dataset.value;
		});
	});
}

function initCreateFlightDropdown() {
	const input = document.getElementById("create-flight");
	const list = document.getElementById("create-flight-list");
	if (!input || !list) return;
	const getFilteredFlights = () =>
		seedFlights().filter((f) => {
			if (f.site !== state.siccFilter) return false;
			if (f.airline === "Standard / Other Airline") return false;
			if (state.siccFilter === "SICC1")
				return f.airline === "Singapore Airlines (SQ)" && f.flight_number.toUpperCase().startsWith("SQ");
			return true;
		});
	const render = (showAll = false) => {
		const q = (showAll ? "" : input.value.trim()).toLowerCase();
		const matches = getFilteredFlights().filter(
			(f) =>
				!q ||
				f.flight_number.toLowerCase().includes(q) ||
				f.airline.toLowerCase().includes(q),
		);
		list.innerHTML = matches.length
			? matches
					.map(
						(f) =>
							`<div class="dropdown-item" data-flight="${esc(f.flight_number)}">${esc(f.flight_number)} <span class="dropdown-meta">${esc((f.airline || "").replace(/\s*\([^)]*\)/, ""))} · ETD ${esc(f.etd)}</span></div>`,
					)
					.join("")
			: `<div class="dropdown-empty">No matching flights</div>`;
		list.classList.toggle("hidden", matches.length === 0);
	};
	render.all = () => render(true);
	if (!createInitDone) {
		createInitDone = true;
		input.addEventListener("input", () => {
			selectedCreateFlight = null;
			document.getElementById("create-flight-clear").classList.add("hidden");
			render();
		});
		input.addEventListener("focus", () => render(true));
		input.addEventListener("blur", () => {
			setTimeout(() => list.classList.add("hidden"), 150);
		});
		// Prevent input blur when clicking inside the dropdown
		list.addEventListener("mousedown", (e) => e.preventDefault());
		list.addEventListener("click", (e) => {
			const item = e.target.closest(".dropdown-item");
			if (!item) return;
			selectCreateFlight(
				getFilteredFlights().find(
					(f) => f.flight_number === item.dataset.flight,
				),
			);
			list.classList.add("hidden");
		});
	} else {
		input.value = "";
		selectedCreateFlight = null;
		document.getElementById("create-flight-clear").classList.add("hidden");
		state.createItems = [{ index: 0, sku: "", item_description: "", class: "", quantity: "", destination: "foodchecker" }];
		document.getElementById("create-items-container").classList.add("hidden");
		list.classList.add("hidden");
	}
}

function selectCreateFlight(f) {
	if (!f) return;
	selectedCreateFlight = f;
	const label = `${f.flight_number} ${(f.airline || "").replace(/\s*\([^)]*\)/, "")} · ETD ${f.etd || ""}`;
	document.getElementById("create-flight").value = label;
	document.getElementById("create-flight-clear").classList.remove("hidden");

	// Only auto-populate from flight data in Scheduled mode;
	// in Manual mode the user fills these in themselves
	if (state.createMode === "scheduled") {
		if (f.etd) document.getElementById("create-etd").value = f.etd;
		if (f.ta_group) {
			document.getElementById("create-group").value = f.ta_group;
			document
				.querySelectorAll("#create-group-buttons .segment-btn")
				.forEach((b) =>
					b.classList.toggle("active", b.dataset.value === f.ta_group),
				);
		}
		if (f.meal_service)
			document.getElementById("create-meal-service").value = f.meal_service;
		// Lounge: pre-fill from flight data in Scheduled mode
		const loungeInput = document.getElementById("create-lounge");
		if (loungeInput) loungeInput.value = f.lounge || "";
	}

	// For SICC1, initialize services with one empty row
	if (f.site === "SICC1") {
		state.createServices = [{ serviceType: "", itemType: "" }];
		renderServicesTable();
	}

	// Initialize linked items with one empty row
	state.createItems = [{ index: 0, sku: "", item_description: "", class: "", quantity: "", destination: "foodchecker" }];

	// Meal Service: populate in both modes; show in SICC1 only
	if (f.site === "SICC1") {
		if (f.meal_service)
			document.getElementById("create-meal-service").value = f.meal_service;
		updateMealServiceVisibility();
	}

	// Update read-only text displays in Scheduled mode
	updateCreateModeUI();
	// Show/hide services section based on flight + site
	updateServicesVisibility();
	// Show/hide lounge field based on SICC2 + OAL
	updateLoungeVisibility();

	renderCreateItems();
}

function clearCreateFlight() {
	selectedCreateFlight = null;
	document.getElementById("create-flight").value = "";
	const flightManual = document.getElementById("create-flight-manual");
	if (flightManual) flightManual.value = "";
	document.getElementById("create-etd").value = "";
	document.getElementById("create-flight-clear").classList.add("hidden");
	// Group
	document.getElementById("create-group").value = "";
	document
		.querySelectorAll("#create-group-buttons .segment-btn")
		.forEach((b) => b.classList.remove("active"));
	// Meal Service
	document.getElementById("create-meal-service").value = "";
	// Lounge
	document.getElementById("create-lounge").value = "";
	const loungeReadonly = document.getElementById("create-lounge-readonly");
	if (loungeReadonly) loungeReadonly.querySelector(".cr-value").textContent = "";
	updateLoungeVisibility();
	// Linked items + ad hoc
	state.createItems = [{ index: 0, sku: "", item_description: "", class: "", quantity: "", destination: "foodchecker" }];
	state.adHocEnabled = false;
	state.adHocItems = [];
	const adHocCheckbox = document.getElementById("ad-hoc-checkbox");
	if (adHocCheckbox) adHocCheckbox.checked = false;
	document.getElementById("ad-hoc-toggle").classList.add("hidden");
	document.getElementById("ad-hoc-container").classList.add("hidden");
	document.getElementById("create-items-container").classList.add("hidden");
	// Services
	state.createServices = [{ serviceType: "", itemType: "" }];
	updateServicesVisibility();
}

window.clearCreateFlight = clearCreateFlight;

function renderCreateItems() {
	const flight = selectedCreateFlight;
	const site = flight?.site || "SICC1";
	const container = document.getElementById("create-items-container");
	const list = document.getElementById("create-items-list");
	// Always show items container
	container.classList.remove("hidden");
	const isScheduledMode = state.createMode === "scheduled";
	document.getElementById("ad-hoc-toggle").classList.remove("hidden");
	document.getElementById("ad-hoc-container").classList.toggle("hidden", isScheduledMode || !state.adHocEnabled);

	if (!flight && state.createItems.length === 0) {
		// No flight selected AND no items, show empty state
		list.innerHTML = '<div class="empty-state">No items selected</div>';
		return;
	}
	// Always show items if there are any in state.createItems (even without flight selection)

	const classes = ["Economy", "Premium Economy", "Business"];
	const n = flight?.count || 1;
	const isScheduled = state.createMode === "scheduled";
	let items;

	// Only auto-generate if state.createItems is empty
	if (state.createItems.length === 0) {
		items = [];
		for (let i = 0; i < n; i++) {
			const destination = isScheduled
				? i < Math.ceil(n / 2)
					? "preset"
					: "foodchecker"
				: "foodchecker";
			items.push({
				index: i,
				sku: String(100000 + i),
				item_description: "CCP5 linked item " + (i + 1),
				class: classes[i % classes.length],
				quantity: 24 + i * 12,
				destination: destination,
			});
		}
		state.createItems = items;
	} else {
		items = state.createItems;
	}
	container.classList.remove("hidden");

	const isSICC2 = site === "SICC2";
	let html = `
    <table class="create-items-table">
      <thead>
        <tr>
          <th>ITEM</th>
          <th>Class</th>
          <th>Qty</th>
          <th>Destination</th>
          <th style="width: 60px;"></th>
        </tr>
      </thead>
      <tbody>
  `;

	items.forEach((item, idx) => {
		const destinationCell = `<div class="create-item-destination">
            <button type="button" class="create-dest-btn ${item.destination === "preset" ? "active" : ""}" onclick="setCreateItemDestination(${idx}, 'preset')">Preset</button>
            <button type="button" class="create-dest-btn ${item.destination === "foodchecker" ? "active" : ""}" onclick="setCreateItemDestination(${idx}, 'foodchecker')">Food Check</button>
          </div>`;
		const classOpts = ["Economy", "Premium Economy", "Business"];
		const classOptions = classOpts.map(c => `<option value="${c}"${item.class === c ? ' selected' : ''}>${c}</option>`).join('');
		const itemLabel = item.sku ? `${item.sku} — ${item.item_description}` : "";
		html += `
      <tr>
        <td>
          <div class="searchable-dropdown item-sku-dropdown" data-idx="${idx}">
            <input type="text" class="form-input item-input item-sku-input" value="${esc(itemLabel)}" placeholder="Search SKU…" autocomplete="off">
            <div class="dropdown-arrow">▾</div>
            <div class="dropdown-list hidden"></div>
          </div>
        </td>
        <td><select class="form-input item-input" onchange="updateCreateItemField(${idx}, 'class', this.value)">${classOptions}</select></td>
        <td><input type="number" class="form-input item-input" value="${item.quantity}" oninput="updateCreateItemField(${idx}, 'quantity', this.value)" placeholder="Qty" min="0"></td>
        <td>${destinationCell}</td>
        <td>
          <button type="button" class="btn-ghost" onclick="removeCreateItem(${idx})" style="padding: 4px 8px;">✕</button>
        </td>
      </tr>
    `;
	});

	html += `</tbody></table>`;
	list.innerHTML = html;
	initItemSKUDropdowns();
}

function setCreateItemDestination(index, destination) {
	state.createItems[index].destination = destination;
	renderCreateItems();
}

function updateCreateItemField(index, field, value) {
	if (!state.createItems[index]) return;
	state.createItems[index][field] = value;
}

function updateCreateItemSKU(index, sku) {
	if (!state.createItems[index]) return;
	const found = SKU_LIST.find(o => o.sku === sku);
	state.createItems[index].sku = sku;
	state.createItems[index].item_description = found ? found.desc : "";
}

function initItemSKUDropdowns() {
	document.querySelectorAll(".item-sku-dropdown").forEach((dd) => {
		const idx = parseInt(dd.dataset.idx, 10);
		const input = dd.querySelector(".item-sku-input");
		const list = dd.querySelector(".dropdown-list");
		if (!input || !list) return;

		const render = (showAll = false) => {
			const q = (showAll ? "" : input.value.trim()).toLowerCase();
			const matches = SKU_LIST.filter(
				(o) => !q || o.sku.toLowerCase().includes(q) || o.desc.toLowerCase().includes(q),
			);
			list.innerHTML = matches.length
				? matches.map((o) => `<div class="dropdown-item" data-sku="${o.sku}">${o.sku} <span class="dropdown-meta">${o.desc}</span></div>`).join("")
				: `<div class="dropdown-empty">No matching SKU</div>`;
			list.classList.toggle("hidden", false);
		};

		input.addEventListener("input", () => render(false));
		input.addEventListener("focus", () => render(true));
		input.addEventListener("blur", () => {
			setTimeout(() => list.classList.add("hidden"), 150);
			// Restore label if sku already set
			const item = state.createItems[idx];
			if (item && item.sku) {
				input.value = `${item.sku} — ${item.item_description}`;
			}
		});
		list.addEventListener("mousedown", (e) => e.preventDefault());
		list.addEventListener("click", (e) => {
			const itemEl = e.target.closest(".dropdown-item");
			if (!itemEl) return;
			updateCreateItemSKU(idx, itemEl.dataset.sku);
			input.value = `${itemEl.dataset.sku} — ${state.createItems[idx].item_description}`;
			list.classList.add("hidden");
		});
	});
}

function addCreateItem() {
	const nextIndex = state.createItems.length > 0
		? Math.max(...state.createItems.map(i => i.index)) + 1
		: 0;
	state.createItems.push({
		index: nextIndex,
		sku: "",
		item_description: "",
		class: "Economy",
		quantity: "",
		destination: "foodchecker",
	});
	renderCreateItems();
}

function removeCreateItem(index) {
	state.createItems.splice(index, 1);
	renderCreateItems();
}

window.addCreateItem = addCreateItem;
window.removeCreateItem = removeCreateItem;
window.setCreateItemDestination = setCreateItemDestination;
window.updateCreateItemField = updateCreateItemField;

function toggleAdHocMode() {
	state.adHocEnabled = document.getElementById("ad-hoc-checkbox").checked;
	const container = document.getElementById("ad-hoc-container");
	if (state.adHocEnabled) {
		container.classList.remove("hidden");
		if (state.adHocItems.length === 0) {
			state.adHocItems.push({
				description: "",
				class: "Economy",
				quantity: 1,
				destination: "foodchecker",
			});
		}
		renderAdHocItems();
	} else {
		container.classList.add("hidden");
		state.adHocItems = [];
	}
}

function renderAdHocItems() {
	const flight = selectedCreateFlight;
	const site = flight?.site || "SICC1";
	const isSICC2 = site === "SICC2";
	const list = document.getElementById("ad-hoc-list");

	let html = `
    <table class="create-items-table">
      <thead>
        <tr>
          <th>Description</th>
          <th>Class</th>
          <th style="width: 80px;">Qty</th>
          <th>Destination</th>
          <th style="width: 60px;"></th>
        </tr>
      </thead>
      <tbody>
  `;

	state.adHocItems.forEach((item, idx) => {
		html += `
      <tr>
        <td><input type="text" class="form-input" value="${esc(item.description)}" oninput="updateAdHocItem(${idx}, 'description', this.value)" placeholder="Item description" /></td>
        <td>
          <select class="form-input" onchange="updateAdHocItem(${idx}, 'class', this.value)">
            <option value="Economy" ${item.class === "Economy" ? "selected" : ""}>Economy</option>
            <option value="Premium Economy" ${item.class === "Premium Economy" ? "selected" : ""}>Premium Economy</option>
            <option value="Business" ${item.class === "Business" ? "selected" : ""}>Business</option>
          </select>
        </td>
        <td><input type="number" class="form-input" value="${item.quantity}" oninput="updateAdHocItem(${idx}, 'quantity', parseInt(this.value) || 0)" min="1" /></td>
        <td>
          <div class="create-item-destination">
            <button type="button" class="create-dest-btn ${item.destination === "preset" ? "active" : ""}" onclick="updateAdHocItem(${idx}, 'destination', 'preset')">Preset</button>
            <button type="button" class="create-dest-btn ${item.destination === "foodchecker" ? "active" : ""}" onclick="updateAdHocItem(${idx}, 'destination', 'foodchecker')">Food Check</button>
          </div>
        </td>
        <td><button type="button" class="btn-ghost" onclick="removeAdHocItem(${idx})" style="padding: 4px 8px;">✕</button></td>
      </tr>
    `;
	});

	html += `</tbody></table>`;
	list.innerHTML = html;
}

function addAdHocItem() {
	state.adHocItems.push({
		description: "",
		class: "Economy",
		quantity: 1,
		destination: "foodchecker",
	});
	renderAdHocItems();
}

function removeAdHocItem(index) {
	state.adHocItems.splice(index, 1);
	renderAdHocItems();
}

function updateAdHocItem(index, field, value) {
	state.adHocItems[index][field] = value;
	if (field === "destination") {
		renderAdHocItems();
	}
}

window.toggleAdHocMode = toggleAdHocMode;
window.renderAdHocItems = renderAdHocItems;
window.addAdHocItem = addAdHocItem;
window.removeAdHocItem = removeAdHocItem;
window.updateAdHocItem = updateAdHocItem;

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

function validateCreateForm() {
	const errors = [];

	// Check flight number
	if (state.createMode === "manual") {
		const manualFlight = document.getElementById("create-flight-manual")?.value?.trim();
		if (!manualFlight) {
			errors.push({
				fieldId: "create-flight-manual",
				message: "Please enter a flight number",
			});
		}
	} else {
		if (!selectedCreateFlight) {
			errors.push({
				fieldId: "create-flight",
				message: "Please select a flight number",
			});
		}
	}

	// Check ETD
	const etd = document.getElementById("create-etd")?.value;
	if (!etd) {
		errors.push({ fieldId: "create-etd", message: "Please select an ETD" });
	}

	// Check Group
	const group = document.getElementById("create-group")?.value;
	if (!group) {
		errors.push({
			fieldId: "create-group-buttons",
			message: "Please select a group",
		});
	}

	// Check services table for SICC1
	if (state.siccFilter === "SICC1") {
		if (state.createServices.length === 0) {
			errors.push({
				fieldId: "create-services-section",
				message: "Please add at least one service",
			});
		} else {
			const invalidServices = state.createServices.filter(
				(s) => !s.serviceType || !s.itemType,
			);
			if (invalidServices.length > 0) {
				errors.push({
					fieldId: "create-services-list",
					message:
						"Please select both Service Type and Item Type for all services",
				});
			}
		}
	}

	// Check linked items - must have at least one with a SKU
	const validItems = state.createItems.filter((item) => item.sku && item.sku.trim());
	if (validItems.length === 0) {
		errors.push({
			fieldId: "create-items-container",
			message: "Please select at least one item with a SKU",
		});
	} else if (validItems.length < state.createItems.length) {
		errors.push({
			fieldId: "create-items-container",
			message: "Please select a SKU for all items",
		});
	}

	return errors;
}

function showErrors(errors) {
	// Clear previous errors
	clearErrors();

	if (errors.length === 0) return;

	const errorList = document.getElementById("error-list");
	errorList.classList.remove("hidden");

	// Add has-error class to invalid fields
	errors.forEach((error) => {
		const field = document.getElementById(error.fieldId);
		if (field) {
			const formGroup = field.closest(".form-group");
			if (formGroup) {
				formGroup.classList.add("has-error");
			}
		}
	});

	// Create error badges
	errorList.innerHTML = errors
		.map(
			(error) => `
		<div class="error-badge" onclick="focusField('${error.fieldId}')">
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<circle cx="12" cy="12" r="10"/>
				<line x1="12" y1="8" x2="12" y2="12"/>
				<line x1="12" y1="16" x2="12.01" y2="16"/>
			</svg>
			<span>${error.message}</span>
		</div>
	`,
		)
		.join("");
}

function clearErrors() {
	const errorList = document.getElementById("error-list");
	errorList.classList.add("hidden");
	errorList.innerHTML = "";

	// Remove has-error class from all fields
	document.querySelectorAll(".form-group.has-error").forEach((el) => {
		el.classList.remove("has-error");
	});
}

function focusField(fieldId) {
	const field = document.getElementById(fieldId);
	if (field) {
		field.scrollIntoView({ behavior: "smooth", block: "center" });
		if (
			field.tagName === "INPUT" ||
			field.tagName === "SELECT" ||
			field.tagName === "TEXTAREA"
		) {
			field.focus();
		} else if (field.classList.contains("segmented-buttons")) {
			// For segmented buttons, focus the first button
			const firstBtn = field.querySelector(".segment-btn");
			if (firstBtn) firstBtn.focus();
		}
	}
}

function submitCreateJob(event) {
	event.preventDefault();

	syncServicesFromDOM();
	const errors = validateCreateForm();
	if (errors.length > 0) {
		showErrors(errors);
		return;
	}

	clearErrors();

	const flight = state.createMode === "manual"
		? {
			flight_number: document.getElementById("create-flight-manual")?.value?.trim() || "",
			flight_date: new Date().toISOString().split("T")[0],
			site: state.siccFilter || "SICC2",
			airline: "Standard / Other Airline",
		  }
		: selectedCreateFlight;
	const etd = document.getElementById("create-etd")?.value;
	const group = document.getElementById("create-group")?.value;
	// SICC1 uses STANDARD rule set
	const ruleSet = "STANDARD";
	const site = flight.site || "SICC2";
	const flightDate = flight.flight_date;
	const jobId = nextJobId(flightDate);
	const now = new Date().toISOString();
	const isManual = state.createMode === "manual";
	const defaultTrays = isManual ? null : 0;
	const defaultStaff = isManual ? null : 0;

	// Build linked items from items that have a SKU selected
	const selectedItems = state.createItems.filter((item) => item.sku && item.sku.trim());
	const linkedItems = selectedItems.map((item, i) => ({
		link_id: "LINK-" + jobId + "-" + (i + 1),
		ccp5_record_id: "CP5-" + flight.flight_number + "-" + (item.index + 1),
		sku: item.sku,
		item_description: item.item_description,
		class: item.class,
		quantity: item.quantity,
	}));

	// Build preset and foodChecker items based on destination
	const presetItems = [];
	const foodCheckerItems = [];

	selectedItems.forEach((item) => {
		const fcItem = {
			linkId: "LINK-" + item.sku,
			sku: item.sku,
			item_description: item.item_description,
			class: item.class,
			quantity: item.quantity,
			startTemp: null,
			finishTemp: null,
			startTime: null,
			finishTime: null,
			durationMin: null,
			status: "NotStarted",
			complianceResult: null,
			exceptionId: null,
		};

		if (item.destination === "preset") {
			presetItems.push(fcItem);
		} else {
			foodCheckerItems.push(fcItem);
		}
	});

	// Add ad hoc items
	if (state.adHocEnabled && state.adHocItems.length > 0) {
		state.adHocItems.forEach((item, i) => {
			const adHocItem = {
				link_id: "LINK-" + jobId + "-adhoc-" + (i + 1),
				ccp5_record_id: "ADHOC-" + jobId + "-" + (i + 1),
				sku: "AD HOC",
				item_description: item.description || "Ad Hoc Item",
				class: item.class,
				quantity: item.quantity,
			};
			linkedItems.push(adHocItem);

			const fcItem = {
				linkId: "LINK-ADHOC-" + jobId + "-" + (i + 1),
				sku: "AD HOC",
				item_description: item.description || "Ad Hoc Item",
				class: item.class,
				quantity: item.quantity,
				startTemp: null,
				finishTemp: null,
				startTime: null,
				finishTime: null,
				durationMin: null,
				status: "NotStarted",
				complianceResult: null,
				exceptionId: null,
			};

			if (item.destination === "preset") {
				presetItems.push(fcItem);
			} else {
				foodCheckerItems.push(fcItem);
			}
		});
	}

	const lounge = document.getElementById("create-lounge")?.value || "";

	const job = {
		job_id: jobId,
		flight_number: flight.flight_number,
		flight_date: flightDate,
		etd,
		ta_group: group,
		rule_set: ruleSet,
		site,
		airline: flight.airline || "",
		meal_service: flight.meal_service || "",
		lounge,
		job_status: "Open",
		closed: false,
		createdAt: now,
		linkedItems,
		preset:
			site === "SICC2"
				? {
						status: "NotStarted",
						items: presetItems,
						traysHandled: defaultTrays,
						staffCount: defaultStaff,
						services: state.createServices.map((s) => ({
							serviceType: s.serviceType,
							itemType: s.itemType,
							startTime: null,
							finishTime: null,
							startTemp: null,
							finishTemp: null,
							traysHandled: defaultTrays,
							staffCount: defaultStaff,
							exposureDurationMin: null,
							maxSurfaceTemp: null,
							complianceResult: null,
						})),
						note: "",
					}
				: {
						status: "NotStarted",
						startTime: null,
						finishTime: null,
						startTempHorsDoeuvre: null,
						finishTempHorsDoeuvre: null,
						startTempDessert: null,
						finishTempDessert: null,
						traysHandled: defaultTrays,
						staffCount: defaultStaff,
						exposureDurationMin: null,
						complianceResult: null,
						services: state.createServices.map((s) => ({
							serviceType: s.serviceType,
							itemType: s.itemType,
							startTime: null,
							finishTime: null,
							startTemp: null,
							finishTemp: null,
							traysHandled: defaultTrays,
							staffCount: defaultStaff,
							exposureDurationMin: null,
							maxSurfaceTemp: null,
							complianceResult: null,
						})),
						items: presetItems,
						note: "",
					},
		foodChecker: { status: "NotStarted", items: foodCheckerItems },
		dispatchPreset:
			site === "SICC2"
				? {
						status: "NotStarted",
						coldSoakStart: null,
						beforeExitTime: null,
						beforeExitTemps: {},
						coldSoakDurationMin: null,
						complianceResult: null,
					}
				: null,
		dispatchFC:
			site === "SICC2"
				? {
						status: "NotStarted",
						coldSoakStart: null,
						beforeExitTime: null,
						beforeExitTemps: {},
						coldSoakDurationMin: null,
						complianceResult: null,
					}
				: null,
		signoffs: [],
		exceptions: [],
		history: [
			{
				at: now,
				actor: "FAA",
				field: "job",
				from: "",
				to: "created",
				stage: "header",
				version: 1,
			},
		],
	};
	state.jobs.unshift(job);
	persistJob(job);
	navigate("detail", { jobId });
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
window.state = state;
window.submitCreateJob = submitCreateJob;
window.selectCreateFlight = selectCreateFlight;
window.clearCreateFlight = clearCreateFlight;
window.setCreateItemDestination = setCreateItemDestination;
window.updateCreateItemField = updateCreateItemField;
window.updateCreateItemSKU = updateCreateItemSKU;
window.toggleAdHocMode = toggleAdHocMode;
window.renderAdHocItems = renderAdHocItems;
window.addAdHocItem = addAdHocItem;
window.removeAdHocItem = removeAdHocItem;
window.updateAdHocItem = updateAdHocItem;
window.initCreateModeButtons = initCreateModeButtons;
window.updateCreateModeUI = updateCreateModeUI;
window.addServiceRow = addServiceRow;
window.removeServiceRow = removeServiceRow;
window.updateServiceField = updateServiceField;
window.validateCreateForm = validateCreateForm;
window.showErrors = showErrors;
window.clearErrors = clearErrors;
window.focusField = focusField;
window.navigate = (s, opts) => {
	if (s === "current") return preview.go(VIEWS.current);
	if (s === "detail")
		return preview.openRecord(
			VIEWS.detail,
			opts && opts.jobId ? opts.jobId : "",
		);
	if (s === "all") return preview.go(VIEWS.all);
};

window.showLoader = showLoader;
window.hideLoader = hideLoader;

function switchCreateSICC(site) {
	state.siccFilter = site;
	document.querySelectorAll("#create-sicc-selector .sicc-btn").forEach((btn) => {
		btn.classList.toggle("active", btn.dataset.sicc === site);
	});
	const label = document.getElementById("create-sicc-label");
	if (label) label.textContent = site;
	// Reset form state when switching sites
	clearCreateFlight();
	renderCreate();
}
window.switchCreateSICC = switchCreateSICC;

document.addEventListener("DOMContentLoaded", async () => {
	showLoader();
	state.jobs = buildSeed();
	await loadJobs();
	// Extract site from d2path, fallback to sicc param
	const d2path = preview.params.get("d2path");
	let siteFromD2Path = null;
	if (d2path) {
		if (d2path.includes("sats-bd4uhr")) {
			siteFromD2Path = "SICC1";
		} else if (d2path.includes("ccp-5-dishing-4q3aak")) {
			siteFromD2Path = "SICC2";
		}
	}
	// Use d2path if available, otherwise fallback to sicc param
	if (siteFromD2Path) {
		state.siccFilter = siteFromD2Path;
	} else {
		const siccParam = preview.params.get("sicc");
		if (siccParam === "SICC1" || siccParam === "SICC2") {
			state.siccFilter = siccParam;
		}
	}
	// Show/hide SICC toggler based on d2path presence
	const siccSelector = document.getElementById("create-sicc-selector");
	if (siccSelector) {
		if (d2path) {
			siccSelector.classList.add("hidden");
		} else {
			siccSelector.classList.remove("hidden");
			// Set active button based on current state
			document.querySelectorAll("#create-sicc-selector .sicc-btn").forEach((btn) => {
				btn.classList.toggle("active", btn.dataset.sicc === state.siccFilter);
			});
		}
	}
	const label = document.getElementById("create-sicc-label");
	if (label) label.textContent = state.siccFilter || "SICC1";
	renderCreate();
	hideLoader();
});
