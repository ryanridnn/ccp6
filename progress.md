# CCP6 Form — Implementation Progress

Status of the CCP6 Operational Service preview developed from `index.md` (v14),
following `AGENTS.md` conventions.

## Files

| File | Purpose |
|---|---|
| `index.html` | Single uploaded view. Hosts all 5 screens + the sign-off modal. |
| `style.css` | Flat dark theme on the provided palette; component + classes. |
| `script.js` | `_SVC` / `store` / `preview` boilerplate, routing, data load, all screen logic. |
| `sample-data.js` | Seeded mock jobs, staff list, and flight list. |
| `index.md` | Spec (source of truth). |
| `AGENTS.md` | Platform working conventions. |

## What works

### Scaffold & conventions
- Boilerplate (`_SVC`, `store`, `preview`) at top of `script.js`; `window.preview` set.
- `style.css` + `script.js` split out per AGENTS.md.
- Default palette in `:root` (`--bg-page #0f193c`, `--accent #6366f1`, etc.).
- `VIEWS` id map + `SCREEN_IDS` for routing; every inline handler exposed on `window`.

### Configuration (`CONFIG`)
- Meal Service: **Breakfast / Lunch / Dinner**
- Group: **A / B / C / D**
- Airlines → rule sets: Qantas (QF), United (UA), Standard/OAL
- Rule limits (§8.1):
  - STANDARD: 45 min / 15 °C / cold soak 120 min / 5 °C
  - UA: 30 min / 15 °C / 120 min / 4 °C
  - QF: 45 min / 15 °C / 180 min / 5 °C
- Warning threshold default 5 min.

### S1 — Current CCP6 Jobs
- Card view of active jobs (closed/voided excluded).
- One card per parent job: flight header, Preset pill + live elapsed, Food Checker
  counts / most critical timer, Dispatch Cold Soak / Eligible (SICC2 only), linked
  source count, **Open Job**.
- 1s ticker recomputes live elapsed from **stored timestamps**.
- 6 seeded jobs across lifecycle states (In Progress, Warning, Overtime, Cold Soak,
  SICC1, SICC2, closed compliant, closed non-compliant).

### S4 — Job Detail (the core form)
- **Shared persistent header**: Job ID, flight, date, ETD, meal, group, airline,
  site, rule set, exposure limit, cold-soak/dispatch limits (SICC2).
- **Tabs**: Preset / Food Checker / Dispatch (Dispatch only for SICC2).
- **Preset**: Hors d'oeuvre + Dessert start/finish temps, trays, staff, Start Timer
  (gated on both start temps), Finish (gated on both finish temps), compliance
  summary (exposure duration, max surface temp, result), conditional exception
  panel, Submit.
- **Food Checker**: per-item rows (SKU/desc/class/qty), per-row start/elapsed/
  finish/status/Start/Finish, independent per-row timers, per-row exception
  panels for non-compliant items, stage summary + Submit.
- **Dispatch (SICC2)**: locked until Preset submitted; cold-soak progress against
  minimum + eligible-at time; before-exit time + temperature (only 2 keyed
  fields); compliance summary; exception; Submit.
- Compliance + job roll-up all system-calculated per §8.2.rules.

### Sign-off modal (v14 pattern)
- Opens via `submitStage()` only after per-stage + exception validation (order of
  operations per §5.6).
- Staff ID / NFC method chips; identity resolved against seeded staff list.
- Unresolved ID → blocked with reason; confirmed identity → Commit.
- Commit stores actor, role, capture method, timestamp; appends `signoffs`,
  `exceptions`, and `history`; marks stage submitted; auto-closes job once all
  applicable stages (incl. SICC2 Dispatch) are submitted.

### Data / seeding
- `loadJobs()` reads `ccp6_jobs` from `store`; seeds from `sample-data.js` on
  first run; falls back to in-memory seed when the API is unavailable (so the
  static demo works).
- `persistJob()` saves each change with a silent catch (no unhandled rejections).

## Verified in-browser (static server)
- Current cards render with ticking timers and correct pills.
- Open Job → detail renders header + tabs correctly.
- Submit before finishing → blocked, modal not opened.
- Preset start → finish → compliance → submit → sign-off (faa11) → **Submitted**.
- Unknown Staff ID → blocked with error.
- Food Checker (3 rows) + Dispatch (cold-soak, eligible-at, exit fields) render.

## Implemented in this pass

### S3 — Create CCP6 Job (was a no-op)
- Flight searchable dropdown populated from `seedFlights()` with free-text
  filter (flight number / airline) and click-to-select.
- Live rule-set preview updates on airline change; linked-item + derived
  flight-date / site preview shown once a flight is selected.
- `submitCreateJob` now builds the job: derives `site` + `flight_date` from the
  flight, resolves `rule_set` from airline, generates the next `job_id`
  (`CCP6-YYMMDD-NN`), links CCP5 items, seeds the empty Preset/Food Checker
  stages, persists, and navigates to the Job Detail (Preset tab). No timer
  starts. Verified end-to-end: QF12 → detail screen with 11-field header.
- Added `site` to the flight seed data (derived, not keyed).

### S2 — All CCP6 Jobs (was empty/stubs)
- Full data table with all §5.2 columns, including closed/voided jobs.
- Free-text search; filter panel (site, meal, group, airline, status, overall)
  toggled via Filters; overall compliance roll-up helper.
- Actions per row: Open job / Web Report.
- `exportExcel()` downloads a CSV of the filtered set.

### S5 — Web Report (was empty/stub)
- Full single-job report: context, linked CCP5 items, Preset, Food Checker
  rows, Dispatch (SICC2), exceptions, sign-off actors, record history.
- `exportJob()` downloads the report as CSV.

### Bug fixes
- Food Checker Start/Finish button ids now keyed by `linkId` (were index), so
  `updateItemGate` correctly enables/disables Start on temperature entry.
- Direct-loading the report view now sets `activeJobId` from the record param
  (previously only handled the detail view).

### Initial-render robustness (job not showing on load)
- Jobs are seeded **synchronously** before the first paint, so the current list
  (and a freshly-created job's detail) render immediately instead of waiting on
  the network.
- `store.*` calls now go through a `fetchJson` helper with a 3s abort timeout
  and fail-fast on non-2xx, so `loadJobs()` can never hang on a missing/slow
  `/api/public/preview-store` route (e.g. on a plain Bun/static dev server).
- `loadJobs` resolves persisted records robustly (nested `data`/`record`/`job`
  shapes) and falls back to the seed when nothing is stored.
- Added `findJobByRecord()`: a landing `record`/`id` param now resolves to a
  job by `job_id`, `slotKey`, platform `id`/`data.id`, or a linked CCP5
  record id — so deep links still open the right job on the detail/report views.

## Not yet implemented (next steps)
- Exception: photo evidence capture not wired to final HTML submission.
- A11y: table inputs lack labels (42 warnings).
- PDF export (currently CSV for both PDF/Excel buttons).
- View IDs in the `VIEWS` map are placeholders pending real platform ids.

## Run locally
```
python3 -m http.server 8812
# open http://localhost:8812/index.html
```
Rather note: the `/api/public/preview-store` endpoints are absent on a plain
static server, so the store calls 404/501 and code auto-seeds in memory.