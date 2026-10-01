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

function lightenHex(hex, amt) {
  const c = hex.replace("#", "");
  if (c.length !== 6) return hex;
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  const mix = (ch) => Math.round(ch + (255 - ch) * amt);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

function glossyBarGradient(context, hex) {
  const { chart } = context;
  const { ctx, chartArea } = chart;
  if (!chartArea) return hex;
  const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
  gradient.addColorStop(0, lightenHex(hex, 0.6));
  gradient.addColorStop(0.55, hex);
  gradient.addColorStop(1, hex);
  return gradient;
}

function verticalAreaGradient(context, hex) {
  const { chart } = context;
  const { ctx, chartArea } = chart;
  if (!chartArea) return hexToRgba(hex, 0.1);
  const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
  gradient.addColorStop(0, hexToRgba(hex, 0.5));
  gradient.addColorStop(1, hexToRgba(hex, 0));
  return gradient;
}

function radialArcGradient(context, hex) {
  const { chart, element } = context;
  if (!element || typeof element.x !== "number") return hexToRgba(hex, 0.78);
  const outer = element.outerRadius || 100;
  const gradient = chart.ctx.createRadialGradient(element.x, element.y, 0, element.x, element.y, outer);
  gradient.addColorStop(0, lightenHex(hex, 0.55));
  gradient.addColorStop(0.65, hex);
  gradient.addColorStop(1, hexToRgba(hex, 0.88));
  return gradient;
}

function tooltipStyle(extra) {
  return Object.assign(
    {
      backgroundColor: cssVar("--surface"),
      titleColor: cssVar("--text-primary"),
      bodyColor: cssVar("--text-secondary"),
      borderColor: cssVar("--border"),
      borderWidth: 1,
    },
    extra || {}
  );
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
      tooltip: tooltipStyle(),
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

function categoryScales(yLabel) {
  const muted = cssVar("--text-muted");
  const grid = cssVar("--gridline");
  return {
    x: {
      title: { display: true, text: "Age", color: muted },
      grid: { display: false },
      ticks: { color: muted },
    },
    y: {
      title: { display: true, text: yLabel, color: muted },
      grid: { color: grid },
      ticks: { color: muted },
      beginAtZero: true,
    },
  };
}

function bucketByAge(rows, bucketSize) {
  const size = bucketSize || 3;
  const buckets = {};
  for (const r of rows) {
    const start = Math.floor(r.age / size) * size;
    if (!buckets[start]) buckets[start] = { sum: 0, n: 0 };
    buckets[start].sum += r.value * r.n;
    buckets[start].n += r.n;
  }
  return Object.keys(buckets)
    .map(Number)
    .sort((a, b) => a - b)
    .map((start) => ({
      label: `${start}\u2013${start + size - 1}`,
      value: buckets[start].sum / buckets[start].n,
      n: buckets[start].n,
    }));
}

function lineDataset(rows, color, label, fillAlpha) {
  return {
    label,
    data: rows.map((r) => ({ x: r.age, y: r.value })),
    borderColor: color,
    backgroundColor: fillAlpha != null ? (context) => verticalAreaGradient(context, color) : color,
    fill: fillAlpha != null,
    borderWidth: 2.5,
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
          backgroundColor: (context) => glossyBarGradient(context, cssVar("--pl-gradient-end")),
          borderRadius: 4,
        },
      ],
    },
    options: baseOptions(yLabel),
  });
}

function renderBarBucketed(canvasId, rows, yLabel, bucketSize) {
  const buckets = bucketByAge(rows, bucketSize);
  const ctx = document.getElementById(canvasId);
  new Chart(ctx, {
    type: "bar",
    data: {
      labels: buckets.map((b) => b.label),
      datasets: [
        {
          label: yLabel,
          data: buckets.map((b) => Math.round(b.value * 1000) / 1000),
          backgroundColor: (context) => glossyBarGradient(context, cssVar("--pl-gradient-end")),
          borderRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: tooltipStyle() },
      scales: categoryScales(yLabel),
    },
  });
}

function renderGroupedBarBucketed(canvasId, seriesByGroup, yLabel, bucketSize) {
  const ctx = document.getElementById(canvasId);
  const allLabels = new Set();
  const bucketedByGroup = {};
  for (const [group, rows] of Object.entries(seriesByGroup)) {
    const b = bucketByAge(rows, bucketSize);
    bucketedByGroup[group] = b;
    b.forEach((x) => allLabels.add(x.label));
  }
  const labels = Array.from(allLabels).sort((a, b) => parseInt(a) - parseInt(b));
  const datasets = Object.entries(bucketedByGroup).map(([group, buckets]) => {
    const map = Object.fromEntries(buckets.map((b) => [b.label, b.value]));
    const hex = cssVar(POSITION_COLOR[group] || "--pl-gradient-end");
    return {
      label: group,
      data: labels.map((l) => (map[l] != null ? Math.round(map[l] * 1000) / 1000 : null)),
      backgroundColor: (context) => glossyBarGradient(context, hex),
      borderRadius: 4,
    };
  });
  new Chart(ctx, {
    type: "bar",
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: tooltipStyle() },
      scales: categoryScales(yLabel),
    },
  });
}

function renderHorizontalBar(canvasId, rows, yLabel, bucketSize, oldestFirst) {
  const buckets = bucketByAge(rows, bucketSize);
  if (oldestFirst) buckets.reverse();
  const ctx = document.getElementById(canvasId);
  const muted = cssVar("--text-muted");
  new Chart(ctx, {
    type: "bar",
    data: {
      labels: buckets.map((b) => `Age ${b.label}`),
      datasets: [
        {
          label: yLabel,
          data: buckets.map((b) => Math.round(b.value * 1000) / 1000),
          backgroundColor: (context) => glossyBarGradient(context, cssVar("--pl-gradient-end")),
          borderRadius: 4,
        },
      ],
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: tooltipStyle() },
      scales: {
        x: {
          title: { display: true, text: yLabel, color: muted },
          grid: { color: cssVar("--gridline") },
          ticks: { color: muted },
          beginAtZero: true,
        },
        y: { grid: { display: false }, ticks: { color: muted, autoSkip: false } },
      },
    },
  });
}

function renderPolarArea(canvasId, rows, yLabel, bucketSize) {
  const buckets = bucketByAge(rows, bucketSize);
  const ctx = document.getElementById(canvasId);
  const colorVars = ["--pos-gk", "--pos-df", "--pos-mf", "--pos-fw", "--pl-purple", "--pl-gradient-end"];
  new Chart(ctx, {
    type: "polarArea",
    data: {
      labels: buckets.map((b) => `Age ${b.label}`),
      datasets: [
        {
          data: buckets.map((b) => Math.round(b.value * 10) / 10),
          backgroundColor: (context) =>
            radialArcGradient(context, cssVar(colorVars[context.dataIndex % colorVars.length])),
          borderColor: cssVar("--surface"),
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "right",
          labels: { color: cssVar("--text-secondary"), boxWidth: 12, font: { size: 11 } },
        },
        tooltip: tooltipStyle({
          callbacks: { label: (item) => `${yLabel}: ${item.formattedValue}` },
        }),
      },
      scales: {
        r: {
          ticks: { display: false },
          grid: { color: cssVar("--gridline") },
          angleLines: { color: cssVar("--gridline") },
        },
      },
    },
  });
}

function renderSparkline(canvasId, rows) {
  const ctx = document.getElementById(canvasId);
  new Chart(ctx, {
    type: "line",
    data: {
      datasets: [
        {
          data: rows.map((r) => ({ x: r.age, y: r.value, n: r.n })),
          borderColor: (context) => plLineGradient(context),
          backgroundColor: (context) => verticalAreaGradient(context, cssVar("--pl-gradient-end")),
          fill: true,
          borderWidth: 2.5,
          pointRadius: 0,
          pointHitRadius: 10,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: cssVar("--pl-gradient-end"),
          pointHoverBorderColor: cssVar("--surface"),
          pointHoverBorderWidth: 2,
          tension: 0.3,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: tooltipStyle({
          callbacks: {
            title: (items) => `Age ${items[0].parsed.x}`,
            label: (item) =>
              `€${(item.parsed.y / 1e6).toFixed(1)}M average market value (n=${item.raw.n})`,
          },
        }),
      },
      scales: {
        x: { type: "linear", display: false },
        y: { display: false },
      },
    },
  });
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
  renderBarBucketed("chart-passing", findings.passing_by_age, "Pass completion %", 3);
  renderGroupedBarBucketed(
    "chart-defensive",
    groupByField(findings.defensive_by_age, "group"),
    "Tackles won + interceptions per 90",
    3
  );
  renderHorizontalBar("chart-aerial", findings.aerial_by_age, "Aerial duels won %", 3, true);
  renderPolarArea("chart-gk-save", findings.gk_save_by_age, "Save %", 3);

  document.getElementById("callout-value-number").textContent = summary.peak_market_value_age.age;
  renderSparkline("chart-market-value", findings.market_value_by_age);

  renderHorizontalBar("chart-cards", findings.cards_by_age, "Yellow + red cards per 90", 3);
  renderBar("chart-minutes-share", findings.minutes_share_by_age, "% of all Premier League minutes");
}

main();
