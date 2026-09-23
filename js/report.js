const POSITION_COLOR = {
  Goalkeeper: "--pos-gk",
  Defender: "--pos-df",
  Midfield: "--pos-mf",
  Attack: "--pos-fw",
};

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function hexToRgba(hex, alpha) {
  const c = hex.replace("#", "");
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function plLineGradient(context, alpha) {
  const { chart } = context;
  const { ctx, chartArea } = chart;
  if (!chartArea) return null;
  const start = cssVar("--pl-gradient-start");
  const end = cssVar("--pl-gradient-end");
  const gradient = ctx.createLinearGradient(chartArea.left, 0, chartArea.right, 0);
  gradient.addColorStop(0, alpha != null ? hexToRgba(start, alpha) : start);
  gradient.addColorStop(1, alpha != null ? hexToRgba(end, alpha) : end);
  return gradient;
}

function plBarGradient(context) {
  const { chart } = context;
  const { ctx, chartArea } = chart;
  if (!chartArea) return null;
  const gradient = ctx.createLinearGradient(chartArea.left, 0, chartArea.right, 0);
  gradient.addColorStop(0, cssVar("--pl-gradient-start"));
  gradient.addColorStop(1, cssVar("--pl-gradient-end"));
  return gradient;
}

function baseOptions(yLabel) {
  const muted = cssVar("--text-muted");
  const grid = cssVar("--gridline");
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: cssVar("--surface"),
        titleColor: cssVar("--text-primary"),
        bodyColor: cssVar("--text-secondary"),
        borderColor: cssVar("--border"),
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        type: "linear",
        title: { display: true, text: "Age", color: muted },
        grid: { color: grid },
        ticks: { color: muted },
      },
      y: {
        title: { display: true, text: yLabel, color: muted },
        grid: { color: grid },
        ticks: { color: muted },
        beginAtZero: true,
      },
    },
  };
}

function lineDataset(rows, color, label, fillAlpha) {
  return {
    label,
    data: rows.map((r) => ({ x: r.age, y: r.value })),
    borderColor: color,
    backgroundColor: fillAlpha != null ? hexToRgba(color, fillAlpha) : color,
    fill: fillAlpha != null,
    borderWidth: 2,
    pointRadius: 2,
    tension: 0.25,
  };
}

function renderMultiLine(canvasId, seriesByGroup, yLabel) {
  const ctx = document.getElementById(canvasId);
  const datasets = Object.entries(seriesByGroup).map(([group, rows]) =>
    lineDataset(rows, cssVar(POSITION_COLOR[group] || "--pl-gradient-end"), group, 0.08)
  );
  new Chart(ctx, {
    type: "line",
    data: { datasets },
    options: baseOptions(yLabel),
  });
}

function renderSingleLine(canvasId, rows, yLabel) {
  const ctx = document.getElementById(canvasId);
  new Chart(ctx, {
    type: "line",
    data: {
      datasets: [
        {
          label: yLabel,
          data: rows.map((r) => ({ x: r.age, y: r.value })),
          borderColor: (context) => plLineGradient(context),
          backgroundColor: (context) => plLineGradient(context, 0.18),
          fill: true,
          borderWidth: 2.5,
          pointRadius: 2,
          tension: 0.25,
        },
      ],
    },
    options: baseOptions(yLabel),
  });
}

function renderBar(canvasId, rows, yLabel) {
  const ctx = document.getElementById(canvasId);
  new Chart(ctx, {
    type: "bar",
    data: {
      labels: rows.map((r) => r.age),
      datasets: [
        {
          label: yLabel,
          data: rows.map((r) => r.value),
          backgroundColor: (context) => plBarGradient(context),
          borderRadius: 4,
        },
      ],
    },
    options: baseOptions(yLabel),
  });
}

function fmtMoney(v) {
  return "€" + (v / 1e6).toFixed(2) + "M";
}

function groupByField(rows, field) {
  const out = {};
  for (const r of rows) {
    const key = r[field];
    if (!out[key]) out[key] = [];
    out[key].push(r);
  }
  return out;
}

function renderTopValueChart(canvasId, rows) {
  const ctx = document.getElementById(canvasId);
  new Chart(ctx, {
    type: "bar",
    data: {
      labels: rows.map((r) => r.age),
      datasets: [
        {
          label: "Market value while at a Premier League club",
          data: rows.map((r) => r.value),
          backgroundColor: (context) => plBarGradient(context),
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
          backgroundColor: cssVar("--surface"),
          titleColor: cssVar("--text-primary"),
          bodyColor: cssVar("--text-secondary"),
          borderColor: cssVar("--border"),
          borderWidth: 1,
          callbacks: {
            title: (items) => `Age ${items[0].label}`,
            label: (item) => {
              const r = rows[item.dataIndex];
              return [`${r.player_name} — ${fmtMoney(r.value)}`, `${r.club_name}, ${r.date}`];
            },
          },
        },
      },
      scales: {
        x: {
          title: { display: true, text: "Age", color: cssVar("--text-muted") },
          grid: { display: false },
          ticks: { color: cssVar("--text-muted") },
        },
        y: {
          title: { display: true, text: "Market value (€)", color: cssVar("--text-muted") },
          beginAtZero: true,
          grid: { color: cssVar("--gridline") },
          ticks: { color: cssVar("--text-muted") },
        },
      },
    },
  });
}

function renderTopValueTable(rows) {
  const tbody = document.getElementById("top-value-table-body");
  tbody.innerHTML = rows
    .map(
      (r) =>
        `<tr><td>${r.age}</td><td>${r.player_name}</td><td>${fmtMoney(r.value)}</td><td>${r.club_name}</td><td>${r.date}</td></tr>`
    )
    .join("");
}

async function main() {
  const res = await fetch("data/report_findings.json");
  const { findings, summary } = await res.json();

  document.getElementById("stat-matches").textContent = summary.total_player_matches.toLocaleString();
  document.getElementById("stat-seasons").textContent = summary.total_player_seasons.toLocaleString();
  document.getElementById("stat-players").textContent = summary.unique_players.toLocaleString();
  document.getElementById("stat-peak-age").textContent = summary.peak_market_value_age.age;

  renderMultiLine(
    "chart-gi-position",
    groupByField(findings.gi_by_age_position, "group"),
    "Goal involvements per 90"
  );
  renderSingleLine("chart-passing", findings.passing_by_age, "Pass completion %");
  renderMultiLine(
    "chart-defensive",
    groupByField(findings.defensive_by_age, "group"),
    "Tackles won + interceptions per 90"
  );
  renderSingleLine("chart-aerial", findings.aerial_by_age, "Aerial duels won %");
  renderSingleLine("chart-gk-save", findings.gk_save_by_age, "Save %");
  renderSingleLine("chart-market-value", findings.market_value_by_age, "Average market value (€)");
  renderSingleLine("chart-cards", findings.cards_by_age, "Yellow + red cards per 90");
  renderBar("chart-minutes-share", findings.minutes_share_by_age, "% of all Premier League minutes");
  renderTopValueChart("chart-top-value", findings.top_value_by_age);
  renderTopValueTable(findings.top_value_by_age);
}

main();
