let VALUE_CARDS_DATA = null;
let VALUE_CHART = null;

function valueLabCssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function valueLabFmtMoney(v) {
  if (v >= 1e6) return "€" + (v / 1e6).toFixed(1) + "M";
  return "€" + Math.round(v / 1000) + "K";
}

function buildChartDatasets(players) {
  const top6 = players.filter((p) => p.is_top6);
  const rest = players.filter((p) => !p.is_top6);
  return [
    {
      label: "Top 6",
      data: top6.map((p) => ({ x: p.overall, y: p.market_value, _player: p })),
      backgroundColor: valueLabCssVar("--pl-purple"),
      pointRadius: 4,
      pointHoverRadius: 6,
    },
    {
      label: "Rest of the league",
      data: rest.map((p) => ({ x: p.overall, y: p.market_value, _player: p })),
      backgroundColor: valueLabCssVar("--pl-gradient-end"),
      pointRadius: 4,
      pointHoverRadius: 6,
    },
  ];
}

function buildRegressionLine(players, regression) {
  const ages = players.map((p) => p.age).filter((a) => a != null);
  const meanAge = ages.reduce((a, b) => a + b, 0) / ages.length;
  const points = [];
  for (let ovr = 60; ovr <= 95; ovr += 2) {
    const predicted = Math.exp(regression.overall_coef * ovr + regression.age_coef * meanAge + regression.intercept);
    points.push({ x: ovr, y: predicted });
  }
  return {
    type: "line",
    label: `Expected value (age ${meanAge.toFixed(0)})`,
    data: points,
    borderColor: valueLabCssVar("--text-muted"),
    borderDash: [6, 4],
    borderWidth: 1.5,
    pointRadius: 0,
    fill: false,
    order: 0,
  };
}

function renderScatter(players) {
  const ctx = document.getElementById("chart-value-scatter");
  const datasets = buildChartDatasets(players);
  datasets.push(buildRegressionLine(VALUE_CARDS_DATA.players, VALUE_CARDS_DATA.regression));

  if (VALUE_CHART) VALUE_CHART.destroy();
  VALUE_CHART = new Chart(ctx, {
    type: "scatter",
    data: { datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "point", intersect: true },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (item) => {
              const p = item.raw._player;
              if (!p) return `Expected: ${valueLabFmtMoney(item.raw.y)}`;
              return `${p.player_name} — OVR ${p.overall}, ${valueLabFmtMoney(p.market_value)}`;
            },
          },
        },
      },
      scales: {
        x: {
          title: { display: true, text: "FIFA overall rating", color: valueLabCssVar("--text-muted") },
          ticks: { color: valueLabCssVar("--text-muted") },
          grid: { color: valueLabCssVar("--gridline") },
        },
        y: {
          type: "logarithmic",
          title: { display: true, text: "Market value (€)", color: valueLabCssVar("--text-muted") },
          ticks: {
            color: valueLabCssVar("--text-muted"),
            callback: (v) => {
              const s = v.toString();
              if (s[0] === "1" || s[0] === "5") return valueLabFmtMoney(v);
              return null;
            },
          },
          grid: { color: valueLabCssVar("--gridline") },
        },
      },
      onClick: (evt, elements) => {
        if (!elements.length) return;
        const el = elements[0];
        const ds = VALUE_CHART.data.datasets[el.datasetIndex];
        const point = ds.data[el.index];
        if (point && point._player) renderPlayerCard(point._player);
      },
    },
  });
}

function renderPlayerCard(p) {
  const slot = document.getElementById("player-card-slot");
  const crestSlug = CLUB_CRESTS[p.club];
  const crestHtml = crestSlug
    ? `<img class="player-card-crest" src="assets/crests/${crestSlug}.png" alt="${p.club}" />`
    : "";
  const gapClass = p.value_gap_pct < 0 ? "under" : "over";
  const gapText = p.value_gap_pct < 0
    ? `${Math.abs(p.value_gap_pct).toFixed(0)}% below expected`
    : `${p.value_gap_pct.toFixed(0)}% above expected`;

  const attrs = [
    ["PAC", p.pace], ["SHO", p.shooting], ["PAS", p.passing],
    ["DRI", p.dribbling], ["DEF", p.defending], ["PHY", p.physic],
  ];
  const attrsHtml = attrs
    .map(([label, val]) => `<div class="attr-row"><span>${label}</span><span class="attr-val">${val ?? "—"}</span></div>`)
    .join("");

  slot.innerHTML = `
    <div class="player-card">
      ${p.is_top6 ? '<div class="player-card-top6-badge">Top 6</div>' : ""}
      <div class="player-card-top">
        <div>
          <div class="player-card-ovr">${p.overall}</div>
          <div class="player-card-pos">${p.position || ""}</div>
        </div>
        <div class="player-card-badges">
          <span class="player-card-flag">${p.flag}</span>
          ${crestHtml}
        </div>
      </div>
      <div class="player-card-name">${p.player_name}</div>
      <div class="player-card-club">${p.club} · age ${p.age ?? "—"}</div>
      <div class="player-card-attrs">${attrsHtml}</div>
      <div class="player-card-value">
        <span>${valueLabFmtMoney(p.market_value)}</span>
        <span class="player-card-gap ${gapClass}">${gapText}</span>
      </div>
    </div>
  `;
}

function renderLeaderboard(containerId, ids, byId) {
  const el = document.getElementById(containerId);
  el.innerHTML = ids
    .map((id) => {
      const p = byId[id];
      const sign = p.value_gap_pct < 0 ? "" : "+";
      return `<li><button data-id="${id}"><strong>${p.player_name}</strong><span>${sign}${p.value_gap_pct.toFixed(0)}%</span></button></li>`;
    })
    .join("");
  el.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => renderPlayerCard(byId[btn.dataset.id]));
  });
}

async function initValueLab() {
  const res = await fetch("data/value_cards.json");
  VALUE_CARDS_DATA = await res.json();
  const byId = {};
  VALUE_CARDS_DATA.players.forEach((p) => (byId[p.player_id] = p));

  const positions = [...new Set(VALUE_CARDS_DATA.players.map((p) => p.position).filter(Boolean))].sort();
  const posSelect = document.getElementById("value-position-filter");
  posSelect.innerHTML =
    `<option value="">All positions</option>` + positions.map((p) => `<option value="${p}">${p}</option>`).join("");
  posSelect.addEventListener("change", () => {
    const filtered = posSelect.value
      ? VALUE_CARDS_DATA.players.filter((p) => p.position === posSelect.value)
      : VALUE_CARDS_DATA.players;
    renderScatter(filtered);
  });

  renderScatter(VALUE_CARDS_DATA.players);
  renderLeaderboard("leaderboard-undervalued", VALUE_CARDS_DATA.leaderboard.undervalued, byId);
  renderLeaderboard("leaderboard-overvalued", VALUE_CARDS_DATA.leaderboard.overvalued, byId);
}

initValueLab();
