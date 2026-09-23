const POSITION_COLOR = {
  Goalkeeper: "--pos-gk",
  Defender: "--pos-df",
  Midfield: "--pos-mf",
  Attack: "--pos-fw",
};

const AGE_BUCKETS = [
  { label: "Under 21", min: -Infinity, max: 20.999 },
  { label: "21-23", min: 21, max: 23.999 },
  { label: "24-26", min: 24, max: 26.999 },
  { label: "27-29", min: 27, max: 29.999 },
  { label: "30-32", min: 30, max: 32.999 },
  { label: "33 and over", min: 33, max: Infinity },
];

function ageBucket(age) {
  const b = AGE_BUCKETS.find((b) => age >= b.min && age <= b.max);
  return b ? b.label : "Unknown";
}


function applyClubTheme(clubName) {
  const root = document.documentElement;
  const badge = document.getElementById("club-badge");
  const badgeName = document.getElementById("club-badge-name");
  const badgeCrest = document.getElementById("club-badge-crest");
  if (clubName && CLUB_COLORS[clubName]) {
    const [primary, secondary] = CLUB_COLORS[clubName];
    root.style.setProperty("--accent-primary", primary);
    root.style.setProperty("--accent-secondary", secondary);
    root.style.setProperty("--accent-text-on-primary", readableTextColor(primary));
    badge.hidden = false;
    badgeName.textContent = clubName;
    const crestSlug = CLUB_CRESTS[clubName];
    if (crestSlug) {
      badgeCrest.src = `assets/crests/${crestSlug}.png`;
      badgeCrest.alt = `${clubName} crest`;
      badge.classList.add("has-crest");
    } else {
      badgeCrest.removeAttribute("src");
      badge.classList.remove("has-crest");
    }
  } else {
    root.style.removeProperty("--accent-primary");
    root.style.removeProperty("--accent-secondary");
    root.style.removeProperty("--accent-text-on-primary");
    badge.hidden = true;
    badge.classList.remove("has-crest");
  }
}

let ALL_ROWS = [];
let charts = {};

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function populateSelect(id, values, allLabel) {
  const el = document.getElementById(id);
  el.innerHTML = "";
  const optAll = document.createElement("option");
  optAll.value = "";
  optAll.textContent = allLabel;
  el.appendChild(optAll);
  for (const v of values) {
    const opt = document.createElement("option");
    opt.value = v;
    opt.textContent = v;
    el.appendChild(opt);
  }
}

function currentFilters() {
  return {
    season: document.getElementById("f-season").value,
    club: document.getElementById("f-club").value,
    position: document.getElementById("f-position").value,
    ageBucket: document.getElementById("f-age").value,
  };
}

function applyFilters(rows, f) {
  return rows.filter((r) => {
    if (f.season && r.season !== f.season) return false;
    if (f.club && r.club_name !== f.club) return false;
    if (f.position && r.position !== f.position) return false;
    if (f.ageBucket && ageBucket(r.age) !== f.ageBucket) return false;
    return true;
  });
}

function median(nums) {
  if (!nums.length) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

const MEASURES = {
  count: { label: "Count of appearances", compute: (rows) => rows.length },
  total_gi: { label: "Total goal involvements", compute: (rows) => sum(rows, "goal_involvements") },
  total_minutes: { label: "Total minutes", compute: (rows) => sum(rows, "minutes_played") },
  median_age: { label: "Median age", compute: (rows) => round1(median(rows.map((r) => r.age))) },
  gi_per90: {
    label: "Goal involvements per 90 (rate)",
    compute: (rows) => {
      const mins = sum(rows, "minutes_played");
      return mins > 0 ? round(sum(rows, "goal_involvements") / mins * 90, 3) : 0;
    },
  },
  cards_per90: {
    label: "Cards per 90 (rate)",
    compute: (rows) => {
      const mins = sum(rows, "minutes_played");
      const cards = sum(rows, "yellow_cards") + sum(rows, "red_cards");
      return mins > 0 ? round(cards / mins * 90, 3) : 0;
    },
  },
};

const BREAKDOWNS = {
  position: { label: "Position", key: (r) => r.position },
  season: { label: "Season", key: (r) => r.season },
  club: { label: "Club", key: (r) => r.club_name },
  age_bucket: { label: "Age group", key: (r) => ageBucket(r.age) },
  player: { label: "Player (top 20)", key: (r) => r.player_name },
};

function sum(rows, field) {
  let t = 0;
  for (const r of rows) t += r[field] || 0;
  return t;
}
function round(n, d) {
  const p = Math.pow(10, d);
  return Math.round(n * p) / p;
}
function round1(n) {
  return round(n, 1);
}

function aggregate(rows, breakdownKey, measureKey) {
  const groups = {};
  for (const r of rows) {
    const k = BREAKDOWNS[breakdownKey].key(r);
    if (!groups[k]) groups[k] = [];
    groups[k].push(r);
  }
  const entries = Object.entries(groups).map(([k, grows]) => ({
    category: k,
    value: MEASURES[measureKey].compute(grows),
    n: grows.length,
  }));
  if (breakdownKey === "season") {
    entries.sort((a, b) => (a.category > b.category ? 1 : -1));
  } else if (breakdownKey === "age_bucket") {
    const order = AGE_BUCKETS.map((b) => b.label);
    entries.sort((a, b) => order.indexOf(a.category) - order.indexOf(b.category));
  } else {
    entries.sort((a, b) => b.value - a.value);
  }
  return entries;
}

function updateSummary(rows) {
  const players = new Set(rows.map((r) => r.player_id)).size;
  document.getElementById("s-appearances").textContent = rows.length.toLocaleString();
  document.getElementById("s-players").textContent = players.toLocaleString();
  document.getElementById("s-goals").textContent = sum(rows, "goals").toLocaleString();
  const mins = sum(rows, "minutes_played");
  const gi90 = mins > 0 ? round(sum(rows, "goal_involvements") / mins * 90, 3) : 0;
  document.getElementById("s-gi90").textContent = gi90;
}

function renderPanel(panelId, rows) {
  const breakdownSel = document.getElementById(`${panelId}-breakdown`);
  const measureSel = document.getElementById(`${panelId}-measure`);
  const entries = aggregate(rows, breakdownSel.value, measureSel.value).slice(0, 20);

  const ctx = document.getElementById(`${panelId}-canvas`);
  const colors =
    breakdownSel.value === "position"
      ? entries.map((e) => cssVar(POSITION_COLOR[e.category] || "--accent-primary"))
      : entries.map((e) => cssVar("--accent-primary"));

  if (charts[panelId]) charts[panelId].destroy();
  charts[panelId] = new Chart(ctx, {
    type: "bar",
    data: {
      labels: entries.map((e) => e.category),
      datasets: [
        {
          label: MEASURES[measureSel.value].label,
          data: entries.map((e) => e.value),
          backgroundColor: colors,
          borderRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (item) => `${MEASURES[measureSel.value].label}: ${item.formattedValue}`,
          },
        },
      },
      scales: {
        x: { ticks: { color: cssVar("--text-muted") }, grid: { display: false } },
        y: {
          beginAtZero: true,
          title: { display: true, text: MEASURES[measureSel.value].label, color: cssVar("--text-muted") },
          ticks: { color: cssVar("--text-muted") },
          grid: { color: cssVar("--gridline") },
        },
      },
    },
  });

  if (panelId === "panel1") renderTable(entries, breakdownSel.value, measureSel.value);
}

function renderTable(entries, breakdownKey, measureKey) {
  const thead = document.getElementById("table-head");
  const tbody = document.getElementById("table-body");
  thead.innerHTML = `<tr><th>${BREAKDOWNS[breakdownKey].label}</th><th>Appearances</th><th>${MEASURES[measureKey].label}</th></tr>`;
  tbody.innerHTML = entries
    .map((e) => `<tr><td>${e.category}</td><td>${e.n.toLocaleString()}</td><td>${e.value.toLocaleString()}</td></tr>`)
    .join("");
}

function renderAll() {
  const f = currentFilters();
  const rows = applyFilters(ALL_ROWS, f);
  applyClubTheme(f.club);
  updateSummary(rows);
  for (const panelId of ["panel1", "panel2", "panel3", "panel4"]) {
    renderPanel(panelId, rows);
  }
}

function resetFilters() {
  document.getElementById("f-season").value = "";
  document.getElementById("f-club").value = "";
  document.getElementById("f-position").value = "";
  document.getElementById("f-age").value = "";
  renderAll();
}

function setupPanelDefaults() {
  const defaults = {
    panel1: { breakdown: "position", measure: "gi_per90" },
    panel2: { breakdown: "age_bucket", measure: "count" },
    panel3: { breakdown: "player", measure: "total_gi" },
    panel4: { breakdown: "club", measure: "median_age" },
  };
  for (const [panelId, d] of Object.entries(defaults)) {
    document.getElementById(`${panelId}-breakdown`).value = d.breakdown;
    document.getElementById(`${panelId}-measure`).value = d.measure;
  }
}

function populateControlOptions() {
  for (const id of ["panel1", "panel2", "panel3", "panel4"]) {
    const bSel = document.getElementById(`${id}-breakdown`);
    const mSel = document.getElementById(`${id}-measure`);
    bSel.innerHTML = Object.entries(BREAKDOWNS)
      .map(([k, v]) => `<option value="${k}">${v.label}</option>`)
      .join("");
    mSel.innerHTML = Object.entries(MEASURES)
      .map(([k, v]) => `<option value="${k}">${v.label}</option>`)
      .join("");
    bSel.addEventListener("change", renderAll);
    mSel.addEventListener("change", renderAll);
  }
}

async function main() {
  const res = await fetch("data/player_match.csv");
  const text = await res.text();
  const parsed = Papa.parse(text, { header: true, dynamicTyping: true, skipEmptyLines: true });
  ALL_ROWS = parsed.data;

  const seasons = [...new Set(ALL_ROWS.map((r) => r.season))].sort();
  const clubs = [...new Set(ALL_ROWS.map((r) => r.club_name))].filter(Boolean).sort();
  const positions = [...new Set(ALL_ROWS.map((r) => r.position))].filter(Boolean).sort();

  populateSelect("f-season", seasons, "All seasons");
  populateSelect("f-club", clubs, "All clubs");
  populateSelect("f-position", positions, "All positions");
  populateSelect(
    "f-age",
    AGE_BUCKETS.map((b) => b.label),
    "All ages"
  );

  populateControlOptions();
  setupPanelDefaults();

  for (const id of ["f-season", "f-club", "f-position", "f-age"]) {
    document.getElementById(id).addEventListener("change", renderAll);
  }
  document.getElementById("reset-btn").addEventListener("click", resetFilters);

  document.getElementById("loading").style.display = "none";
  document.getElementById("dashboard-body").style.display = "block";

  renderAll();
}

main();
