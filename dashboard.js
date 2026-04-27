// =============================================================
// UAT Progress Dashboard — Shared Logic
// =============================================================

const Dashboard = (() => {
  const STATUS = ["pass", "fail", "in-progress", "not-started"];
  const STATUS_LABEL = {
    "pass": "Passed",
    "fail": "Failed",
    "in-progress": "In Progress",
    "not-started": "Not Started",
    "blocked": "Blocked",
  };
  const STATUS_COLOR = {
    "pass": "#16A34A",
    "fail": "#DC2626",
    "in-progress": "#F59E0B",
    "not-started": "#D5DAE0",
    "blocked": "#6B7280",
  };

  // Storage keys (per-region) — use localStorage so progress persists in the user's browser
  const SK = (region) => `uat_dashboard_${region}_v1`;

  function loadActuals(region) {
    try {
      const raw = localStorage.getItem(SK(region));
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      console.warn("Failed to load actuals", e);
      return {};
    }
  }
  function saveActuals(region, data) {
    localStorage.setItem(SK(region), JSON.stringify(data));
  }
  function clearActuals(region) {
    localStorage.removeItem(SK(region));
  }

  // ---- Date helpers ----
  function todayISO() {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  }
  // Format an ISO date as "27 Apr"
  function fmtShort(iso) {
    const d = new Date(iso + "T00:00:00");
    const m = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${d.getUTCDate()} ${m[d.getUTCMonth()]}`;
  }
  function fmtFull(iso) {
    const d = new Date(iso + "T00:00:00");
    const m = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    const dn = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    return `${dn[d.getUTCDay()]}, ${d.getUTCDate()} ${m[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  }

  // ---- Planned schedule computation ----
  // For a module: each module has scenarios + testingDays.
  // We compute cumulative planned per day by spreading the module's scenarios
  // evenly across its testing days. Day 1 of testing module = scenarios/N pass cumulative,
  // Day N = full scenarios cumulative. After last testing day, scenarios remain at full for the rest.
  function computePlannedPerDay(data) {
    // Returns: { "2026-04-27": { perModule: {leads: 7, ...}, total: 88 }, ... }
    const result = {};
    data.workingDays.forEach(day => {
      result[day] = { perModule: {}, total: 0 };
    });

    data.modules.forEach(mod => {
      const tdays = mod.testingDays;
      const N = tdays.length;
      const perDay = mod.scenarios / N;

      data.workingDays.forEach((day, di) => {
        let cumulative = 0;
        // Count how many of the module's testing days are <= current day
        let testedDays = 0;
        for (const td of tdays) {
          if (td <= day) testedDays++;
        }
        cumulative = Math.min(testedDays * perDay, mod.scenarios);
        // Round to nearest int so we don't get fractional planned numbers
        result[day].perModule[mod.id] = Math.round(cumulative);
        result[day].total += Math.round(cumulative);
      });
    });

    return result;
  }

  // Given the actuals object (populated per day per module), return the latest cumulative state
  // actuals shape:
  // {
  //   "2026-04-27": { "leads": { pass: 12, fail: 1, inProgress: 2 }, "contacts": {...}, ... },
  //   "2026-04-28": {...}
  // }
  // For each module, the LATEST entry (max date <= today and non-empty) is the current state.
  function computeCurrentActuals(data, actuals) {
    const result = { perModule: {}, total: { pass: 0, fail: 0, inProgress: 0, notStarted: 0 } };
    const today = todayISO();
    data.modules.forEach(mod => {
      // Find the most recent entry <= today
      let latest = null;
      let latestDate = null;
      Object.keys(actuals).forEach(day => {
        if (day > today) return;
        const entry = actuals[day]?.[mod.id];
        if (!entry) return;
        if (!latestDate || day > latestDate) {
          latest = entry;
          latestDate = day;
        }
      });
      const pass = latest?.pass || 0;
      const fail = latest?.fail || 0;
      const ip = latest?.inProgress || 0;
      const ns = Math.max(0, mod.scenarios - pass - fail - ip);
      result.perModule[mod.id] = { pass, fail, inProgress: ip, notStarted: ns, total: mod.scenarios };
      result.total.pass += pass;
      result.total.fail += fail;
      result.total.inProgress += ip;
      result.total.notStarted += ns;
    });
    return result;
  }

  // Cumulative actual progress per day (used for planned-vs-actual line chart)
  function computeActualPerDay(data, actuals) {
    // Per day cumulative = pass + fail + in-progress (i.e. "started")
    const result = {};
    data.workingDays.forEach(day => {
      result[day] = { perModule: {}, totalDone: 0, totalPass: 0, totalFail: 0 };
    });
    data.modules.forEach(mod => {
      let lastDone = 0, lastPass = 0, lastFail = 0;
      data.workingDays.forEach(day => {
        const entry = actuals[day]?.[mod.id];
        if (entry) {
          lastDone = (entry.pass || 0) + (entry.fail || 0) + (entry.inProgress || 0);
          lastPass = entry.pass || 0;
          lastFail = entry.fail || 0;
        }
        result[day].perModule[mod.id] = lastDone;
        result[day].totalDone += lastDone;
        result[day].totalPass += lastPass;
        result[day].totalFail += lastFail;
      });
    });
    return result;
  }

  // ---- Renderers ----
  function renderProgressBar(el, scenarioCount, actuals, plannedCount) {
    const total = scenarioCount;
    const pass = actuals.pass || 0;
    const fail = actuals.fail || 0;
    const ip = actuals.inProgress || 0;
    const passPct = total ? (pass / total) * 100 : 0;
    const failPct = total ? (fail / total) * 100 : 0;
    const ipPct = total ? (ip / total) * 100 : 0;
    const plannedPct = total ? Math.min((plannedCount || 0) / total, 1) * 100 : 0;
    el.innerHTML = `
      ${pass > 0 ? `<div class="seg pass" style="left:0; width:${passPct}%"></div>` : ""}
      ${fail > 0 ? `<div class="seg fail" style="left:${passPct}%; width:${failPct}%"></div>` : ""}
      ${ip > 0   ? `<div class="seg in-progress" style="left:${passPct + failPct}%; width:${ipPct}%"></div>` : ""}
      ${plannedCount > 0 ? `<div class="planned-marker" style="left:${plannedPct}%" title="Planned: ${plannedCount}"></div>` : ""}
    `;
  }

  function renderTopbar(activeRegion) {
    const navLinks = [
      { href: "index.html", label: "Overview", key: "overview" },
      { href: "apac.html", label: "APAC", key: "apac" },
      { href: "americas.html", label: "Americas", key: "americas" },
      { href: "emea.html", label: "EMEA", key: "emea" },
    ];
    const today = new Date();
    const dn = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    const m = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const todayStr = `${dn[today.getDay()]}, ${today.getDate()} ${m[today.getMonth()]} ${today.getFullYear()}`;
    return `
      <div class="topbar">
        <div class="topbar-inner">
          <div class="brand">
            <span class="brand-dot"></span>
            <span class="brand-name">TATE &amp; LYLE</span>
            <span class="brand-sep">|</span>
            <span class="brand-app">UAT Progress</span>
          </div>
          <nav>
            ${navLinks.map(n => `<a href="${n.href}" class="${activeRegion === n.key ? "active" : ""}">${n.label}</a>`).join("")}
          </nav>
          <div class="spacer"></div>
          <div class="meta">
            <span class="date">📅 ${todayStr}</span>
          </div>
        </div>
      </div>
    `;
  }

  function showToast(msg, type = "success") {
    let t = document.getElementById("toast");
    if (!t) {
      t = document.createElement("div");
      t.id = "toast";
      t.className = "toast";
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.className = `toast ${type} show`;
    clearTimeout(t._tt);
    t._tt = setTimeout(() => t.classList.remove("show"), 1800);
  }

  // ---- Public API ----
  return {
    STATUS, STATUS_LABEL, STATUS_COLOR,
    loadActuals, saveActuals, clearActuals,
    todayISO, fmtShort, fmtFull,
    computePlannedPerDay, computeCurrentActuals, computeActualPerDay,
    renderProgressBar, renderTopbar, showToast,
  };
})();
