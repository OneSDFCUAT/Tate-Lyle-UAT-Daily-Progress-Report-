# UAT Progress Dashboard — Tate & Lyle

A static HTML dashboard for tracking Salesforce UAT progress across **APAC**, **Americas**, and **EMEA** regions, modelled after the Azure DevOps look-and-feel.

**Live URLs (after publishing to GitHub Pages):**
- Overview: `index.html`
- APAC: `apac.html`
- Americas: `americas.html`
- EMEA: `emea.html`

## What's in the box

```
/index.html          ← Overview: 3 regions side-by-side, combined KPIs and charts
/apac.html           ← APAC dashboard (full region detail)
/americas.html       ← Americas dashboard (full region detail)
/emea.html           ← EMEA dashboard (full region detail)
/assets/style.css    ← Shared styles
/assets/dashboard.js ← Shared logic (planned vs actual computation, charts, persistence)
/data/*.json         ← Source data per region (used at build time)
```

## Features

- **KPI tiles** — total scenarios, planned-by-today, pass, fail, in-progress, delta vs plan
- **Planned vs Actual line chart** — cumulative completions across all working days
- **Status donut** — pass / fail / in-progress / not-started distribution
- **Module breakdown** with progress bars and a planned-marker tick on each bar
- **Filters** — by status (Pass / Fail / In Progress / Not Started)
- **Daily entry form** — pick any day, enter cumulative pass/fail/in-progress per module
- **Module configuration** — adjust scenario counts per module (default 143 per region)
- **Calendar heatmap** — visual at-a-glance of working days and progress per day
- **Overview page** — combined view of all 3 regions with comparison bars and rollup table

## Working dates

| Region   | Start  | End    | Working days | 01 May |
|----------|--------|--------|--------------|--------|
| APAC     | 27 Apr | 22 May | 19 days      | Public holiday (CN, ID, MY, SG) |
| Americas | 27 Apr | 22 May | 20 days      | Regional non-working day in some states |
| EMEA     | 29 Apr | 22 May | 17 days      | Bank holiday (BE, FR, DE) |

## Data persistence

Daily actuals and module-size overrides are saved to your **browser's localStorage**. Each region keeps its own data:

- `uat_dashboard_apac_v1` — daily actuals
- `uat_dashboard_apac_config_v1` — scenario count overrides
- (same pattern for `americas` and `emea`)

> ⚠️ Because data is stored in the browser, **each user sees their own numbers**. For a single source of truth across the team, either (a) have one nominated person update from a shared machine, (b) export and share screenshots for status calls, or (c) wire it up to a backend later.

## Publishing to GitHub Pages

1. Create a new repository on GitHub (e.g. `uat-progress-dashboard`).
2. Copy these files into the repo root.
3. Push to GitHub.
4. In repo settings → **Pages**, set source to **Deploy from branch** → `main` (root).
5. After ~30 seconds your dashboard is live at `https://<user>.github.io/<repo>/`.

```bash
git init
git add .
git commit -m "UAT progress dashboard"
git branch -M main
git remote add origin https://github.com/<user>/<repo>.git
git push -u origin main
```

## Updating data after the build

Two ways to update:

**Option A — through the UI (recommended day-to-day):**
1. Open `apac.html` (or whichever region).
2. Use the **"Update Daily Progress"** form — pick a date, enter pass/fail/in-progress per module.
3. Click **Save changes**. The numbers persist in your browser.

**Option B — through JSON (for scenario counts / testing days):**
1. Edit the relevant `data/*.json` file.
2. Run `node build-pages.js` to regenerate the HTML files with the new data baked in.
3. Commit and push.

## Customising

- **Change total scenarios per region** — open the region page → scroll to the **"Module Configuration"** card → edit per-module counts. Total updates live and saves to your browser.
- **Recalibrate planned schedule** — edit `data/*.json` to change a module's `testingDays` array, then re-run `node build-pages.js`.

## How the planned curve is calculated

For each module, scenarios are spread evenly across the module's `testingDays`. So a 30-scenario module tested over 4 days plans to complete 7.5 → 15 → 22.5 → 30 scenarios cumulatively. The total planned per day = sum of all module-level cumulative planned values.

Adjust testing days or scenario counts to reshape the curve.

## Browser compatibility

Tested against modern Chrome, Edge, Safari, Firefox. Uses Chart.js 4.x via CDN — no build tooling required to view.

## Tech notes

- Pure static HTML — no server, no framework
- Chart.js 4.4.1 from cdnjs
- Data inlined into each HTML file at build time, so it works equally on `file://`, GitHub Pages, or any static host
- No external API calls — fully offline-capable after first load
