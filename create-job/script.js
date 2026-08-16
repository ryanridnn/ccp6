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
	createMode: "manual",
	createItems: [],
	createServices: [],
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
	updateMealServiceVisibility();
	updateServicesVisibility();
}

function updateMealServiceVisibility() {
	const mealServiceGroup = document.querySelector(".create-meal-service-group");
	if (mealServiceGroup) {
		if (state.siccFilter === "SICC1") {
			mealServiceGroup.classList.remove("hidden");
		} else {
			mealServiceGroup.classList.add("hidden");
		}
	}
}

function updateServicesVisibility() {
	const servicesSection = document.getElementById("create-services-section");
	if (!servicesSection) return;
	const isSICC1 = state.siccFilter === "SICC1";
	const hasFlight = !!selectedCreateFlight;
	if (isSICC1 && hasFlight) {
		servicesSection.classList.remove("hidden");
		renderServicesTable();
	} else {
		servicesSection.classList.add("hidden");
	}
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

function renderServicesTable() {
	const list = document.getElementById("create-services-list");
	if (!list) return;
	const isScheduled = state.createMode === "scheduled";

	// Hide "+ Add Service" button in Scheduled mode
	const addBtn = document.querySelector(
		"#create-services-section .btn-secondary",
	);
	if (addBtn) addBtn.classList.toggle("hidden", isScheduled);

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
		if (isScheduled) {
			html += `
				<tr>
					<td><span class="svc-text">${esc(service.serviceType || "—")}</span></td>
					<td><span class="svc-text">${esc(service.itemType || "—")}</span></td>
					<td></td>
				</tr>
			`;
		} else {
			html += `
				<tr>
					<td>
						<select class="form-input" onchange="updateServiceField(${idx}, 'serviceType', this.value)">
							<option value="">Select...</option>
							<option value="Breakfast" ${service.serviceType === "Breakfast" ? "selected" : ""}>Breakfast</option>
							<option value="Lunch" ${service.serviceType === "Lunch" ? "selected" : ""}>Lunch</option>
							<option value="Dinner" ${service.serviceType === "Dinner" ? "selected" : ""}>Dinner</option>
						</select>
					</td>
					<td>
						<select class="form-input" onchange="updateServiceField(${idx}, 'itemType', this.value)">
							<option value="">Select...</option>
							<option value="Hors d'oeuvre" ${service.itemType === "Hors d'oeuvre" ? "selected" : ""}>Hors d'oeuvre</option>
							<option value="Dessert" ${service.itemType === "Dessert" ? "selected" : ""}>Dessert</option>
						</select>
					</td>
					<td>
						<button type="button" class="btn-ghost" onclick="removeServiceRow(${idx})" style="padding: 4px 8px;">✕</button>
					</td>
				</tr>
			`;
		}
	});

	html += `</tbody></table>`;
	list.innerHTML = html;
}

function initCreateModeButtons() {
	const container = document.getElementById("create-mode-buttons");
	const hiddenInput = document.getElementById("create-mode");
	if (!container || !hiddenInput) return;

	// Set default to manual
	hiddenInput.value = "manual";
	const firstBtn = container.querySelector(".segment-btn[data-value='manual']");
	if (firstBtn) firstBtn.classList.add("active");

	// Add click handlers
	container.querySelectorAll(".segment-btn").forEach((btn) => {
		btn.addEventListener("click", () => {
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
	const mode = state.createMode;
	const isScheduled = mode === "scheduled";

	// ETD
	const etdInput = document.getElementById("create-etd");
	const etdReadonly = document.getElementById("create-etd-readonly");
	if (etdInput && etdReadonly) {
		if (isScheduled) {
			etdInput.classList.add("hidden");
			etdReadonly.classList.remove("hidden");
			etdReadonly.querySelector(".cr-value").textContent =
				etdInput.value || "—";
		} else {
			etdInput.classList.remove("hidden");
			etdReadonly.classList.add("hidden");
		}
	}

	// Group
	const groupButtons = document.getElementById("create-group-buttons");
	const groupReadonly = document.getElementById("create-group-readonly");
	if (groupButtons && groupReadonly) {
		if (isScheduled) {
			groupButtons.classList.add("hidden");
			groupReadonly.classList.remove("hidden");
			groupReadonly.querySelector(".cr-value").textContent =
				document.getElementById("create-group")?.value || "—";
		} else {
			groupButtons.classList.remove("hidden");
			groupReadonly.classList.add("hidden");
		}
	}

	// Trays
	const traysInput = document.getElementById("create-trays");
	const traysReadonly = document.getElementById("create-trays-readonly");
	if (traysInput && traysReadonly) {
		if (isScheduled) {
			traysInput.classList.add("hidden");
			traysReadonly.classList.remove("hidden");
			traysReadonly.querySelector(".cr-value").textContent =
				traysInput.value || "0";
		} else {
			traysInput.classList.remove("hidden");
			traysReadonly.classList.add("hidden");
		}
	}

	// Staff
	const staffInput = document.getElementById("create-staff");
	const staffReadonly = document.getElementById("create-staff-readonly");
	if (staffInput && staffReadonly) {
		if (isScheduled) {
			staffInput.classList.add("hidden");
			staffReadonly.classList.remove("hidden");
			staffReadonly.querySelector(".cr-value").textContent =
				staffInput.value || "0";
		} else {
			staffInput.classList.remove("hidden");
			staffReadonly.classList.add("hidden");
		}
	}

	// Meal Service
	const mealServiceSelect = document.getElementById("create-meal-service");
	const mealServiceReadonly = document.getElementById(
		"create-meal-service-readonly",
	);
	if (mealServiceSelect && mealServiceReadonly) {
		if (isScheduled) {
			mealServiceSelect.classList.add("hidden");
			mealServiceReadonly.classList.remove("hidden");
			mealServiceReadonly.querySelector(".cr-value").textContent =
				mealServiceSelect.value || "—";
		} else {
			mealServiceSelect.classList.remove("hidden");
			mealServiceReadonly.classList.add("hidden");
		}
	}

	// Re-render linked items so destination cells reflect the active mode
	if (selectedCreateFlight) {
		renderCreateItems();
	}

	// Ad hoc section: hidden in Scheduled mode, shown in Manual (when a flight is selected)
	const adHocToggle = document.getElementById("ad-hoc-toggle");
	const adHocContainer = document.getElementById("ad-hoc-container");
	if (isScheduled) {
		adHocToggle?.classList.add("hidden");
		adHocContainer?.classList.add("hidden");
		state.adHocEnabled = false;
		state.adHocItems = [];
		const adHocCheckbox = document.getElementById("ad-hoc-checkbox");
		if (adHocCheckbox) adHocCheckbox.checked = false;
	} else if (selectedCreateFlight) {
		adHocToggle?.classList.remove("hidden");
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
		seedFlights().filter((f) => f.site === state.siccFilter);
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
							`<div class="dropdown-item" data-flight="${esc(f.flight_number)}">${esc(f.flight_number)} <span class="dropdown-meta">${esc(f.airline)} · ${esc(f.meal_service)} · ETD ${esc(f.etd)} · ${esc(f.site)}</span></div>`,
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
		state.createItems = [];
		document.getElementById("create-items-container").classList.add("hidden");
		list.classList.add("hidden");
	}
}

function selectCreateFlight(f) {
	if (!f) return;
	selectedCreateFlight = f;
	const label = `${f.flight_number} ${f.airline || ""} · ${f.meal_service || ""} · ETD ${f.etd || ""} · ${f.site || ""}`;
	document.getElementById("create-flight").value = label;
	document.getElementById("create-flight-clear").classList.remove("hidden");

	// Rule Set is always read-only, so auto-populate in both modes
	const airline = f.airline || "Standard / Other Airline";
	const airlineCode = airline.includes("Qantas")
		? "QF"
		: airline.includes("United")
			? "UA"
			: "OAL";
	const ruleSet = CONFIG.airlineRule[airlineCode] || "STANDARD";
	document.getElementById("create-ruleset").value = ruleSet;

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
		if (f.trays != null)
			document.getElementById("create-trays").value = f.trays;
		if (f.staff != null)
			document.getElementById("create-staff").value = f.staff;
		if (f.meal_service)
			document.getElementById("create-meal-service").value = f.meal_service;
	}

	// For SICC1, populate services based on mode
	if (f.site === "SICC1") {
		if (state.createMode === "scheduled" && f.meal_service) {
			// Scheduled: pre-fill 2-10 rows
			const rows = Math.min(Math.max(f.count * 2, 2), 10);
			state.createServices = [];
			for (let i = 0; i < rows; i++) {
				state.createServices.push({
					serviceType: f.meal_service,
					itemType: i % 2 === 0 ? "Hors d'oeuvre" : "Dessert",
				});
			}
		} else {
			// Manual: start with one empty row
			state.createServices = [{ serviceType: "", itemType: "" }];
		}
		renderServicesTable();
	}

	// Update read-only text displays in Scheduled mode
	updateCreateModeUI();
	// Show/hide services section based on flight + site
	updateServicesVisibility();

	renderCreateItems();
}

function clearCreateFlight() {
	selectedCreateFlight = null;
	document.getElementById("create-flight").value = "";
	document.getElementById("create-etd").value = "";
	document.getElementById("create-ruleset").value = "";
	document.getElementById("create-flight-clear").classList.add("hidden");
	// Group
	document.getElementById("create-group").value = "";
	document
		.querySelectorAll("#create-group-buttons .segment-btn")
		.forEach((b) => b.classList.remove("active"));
	// Trays / Staff / Meal Service
	document.getElementById("create-trays").value = "";
	document.getElementById("create-staff").value = "";
	document.getElementById("create-meal-service").value = "";
	// Linked items + ad hoc
	state.createItems = [];
	state.adHocEnabled = false;
	state.adHocItems = [];
	const adHocCheckbox = document.getElementById("ad-hoc-checkbox");
	if (adHocCheckbox) adHocCheckbox.checked = false;
	document.getElementById("ad-hoc-toggle").classList.add("hidden");
	document.getElementById("ad-hoc-container").classList.add("hidden");
	document.getElementById("create-items-container").classList.add("hidden");
	// Services
	state.createServices = [];
	updateServicesVisibility();
}

window.clearCreateFlight = clearCreateFlight;

function renderCreateItems() {
	const flight = selectedCreateFlight;
	const site = flight?.site || "SICC1";
	const container = document.getElementById("create-items-container");
	const list = document.getElementById("create-items-list");
	const countEl = document.getElementById("create-items-count");

	if (!flight) {
		container.classList.add("hidden");
		document.getElementById("ad-hoc-toggle").classList.add("hidden");
		document.getElementById("ad-hoc-container").classList.add("hidden");
		return;
	}

	// Show ad hoc section in Manual mode only when a flight is selected
	document
		.getElementById("ad-hoc-toggle")
		.classList.toggle("hidden", state.createMode === "scheduled");

	const classes = ["Economy", "Premium Economy", "Business"];
	const n = flight.count || 1;
	const existingItems = state.createItems;
	const isScheduled = state.createMode === "scheduled";
	const items = [];
	for (let i = 0; i < n; i++) {
		const existing = existingItems.find((item) => item.index === i);
		// Scheduled mode: always auto-set destination (first half preset, second half food check)
		// Manual mode: preserve existing destination, default to foodchecker
		const destination = isScheduled
			? i < Math.ceil(n / 2)
				? "preset"
				: "foodchecker"
			: existing
				? existing.destination
				: "foodchecker";
		items.push({
			index: i,
			sku: String(100000 + i),
			item_description: "CCP5 linked item " + (i + 1),
			class: classes[i % classes.length],
			quantity: 24 + i * 12,
			checked: existing ? existing.checked : true,
			destination: destination,
		});
	}
	state.createItems = items;
	container.classList.remove("hidden");

	const isSICC2 = site === "SICC2";
	let html = `
    <table class="create-items-table">
      <thead>
        <tr>
          <th>SKU</th>
          <th>Description</th>
          <th>Class</th>
          <th>Qty</th>
          <th>Destination</th>
        </tr>
      </thead>
      <tbody>
  `;

	items.forEach((item, idx) => {
		const destinationCell = isScheduled
			? `<span class="dest-text">${item.destination === "preset" ? "Preset" : "Food Check"}</span>`
			: `<div class="create-item-destination">
            <button type="button" class="create-dest-btn ${item.destination === "preset" ? "active" : ""}"
              onclick="setCreateItemDestination(${idx}, 'preset')">Preset</button>
            <button type="button" class="create-dest-btn ${item.destination === "foodchecker" ? "active" : ""}"
              onclick="setCreateItemDestination(${idx}, 'foodchecker')">Food Check</button>
          </div>`;
		html += `
      <tr>
        <td>${esc(item.sku)}</td>
        <td>${esc(item.item_description)}</td>
        <td>${esc(item.class)}</td>
        <td>${item.quantity}</td>
        <td>${destinationCell}</td>
      </tr>
    `;
	});

	html += `</tbody></table>`;
	list.innerHTML = html;

	const itemCount = items.length;
	countEl.textContent = `${itemCount} item${itemCount !== 1 ? "s" : ""}`;
}

function setCreateItemDestination(index, destination) {
	state.createItems[index].destination = destination;
	renderCreateItems();
}

window.setCreateItemDestination = setCreateItemDestination;

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

	// Check flight selection
	if (!selectedCreateFlight) {
		errors.push({
			fieldId: "create-flight",
			message: "Please select a flight number",
		});
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

	// Check linked items
	if (state.createItems.length === 0) {
		errors.push({
			fieldId: "create-items-container",
			message: "Please select at least one linked item",
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

	const errors = validateCreateForm();
	if (errors.length > 0) {
		showErrors(errors);
		return;
	}

	clearErrors();

	const flight = selectedCreateFlight;
	const etd = document.getElementById("create-etd")?.value;
	const group = document.getElementById("create-group")?.value;
	// SICC1 uses STANDARD rule set
	const ruleSet = "STANDARD";
	const site = flight.site || "SICC2";
	const flightDate = flight.flight_date;
	const jobId = nextJobId(flightDate);
	const now = new Date().toISOString();

	// Build linked items from all items
	const selectedItems = state.createItems;
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
		linkedItems,
		preset:
			site === "SICC2"
				? {
						status: "NotStarted",
						items: presetItems,
						traysHandled: 0,
						staffCount: 0,
						services: [{}],
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
						traysHandled: 0,
						staffCount: 0,
						exposureDurationMin: null,
						complianceResult: null,
						services: [{}],
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

// ── Init ────────────────────────────────────────────────────────────
window.preview = preview;
window.submitCreateJob = submitCreateJob;
window.selectCreateFlight = selectCreateFlight;
window.clearCreateFlight = clearCreateFlight;
window.setCreateItemDestination = setCreateItemDestination;
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

document.addEventListener("DOMContentLoaded", async () => {
	if (!state.jobs.length) state.jobs = buildSeed();
	await loadJobs();
	const siccParam = preview.params.get("sicc");
	if (siccParam === "SICC1" || siccParam === "SICC2")
		state.siccFilter = siccParam;
	const label = document.getElementById("create-sicc-label");
	if (label) label.textContent = state.siccFilter || "SICC1";
	renderCreate();
});
