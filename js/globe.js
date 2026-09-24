const GLOBE_MEASURE_LABEL = {
  player_count: "Players",
  total_transfer_spend: "Total transfer spend (into PL clubs)",
  avg_peak_market_value: "Average peak market value",
  avg_fifa_overall: "Average FIFA overall rating",
};

function globeCssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function globeHexToRgb(hex) {
  const c = hex.replace("#", "");
  return [parseInt(c.substring(0, 2), 16), parseInt(c.substring(2, 4), 16), parseInt(c.substring(4, 6), 16)];
}

function globeColorScale(t, startHex, endHex) {
  const [r1, g1, b1] = globeHexToRgb(startHex);
  const [r2, g2, b2] = globeHexToRgb(endHex);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

function globeFmtMoney(v) {
  if (v >= 1e9) return "€" + (v / 1e9).toFixed(2) + "B";
  return "€" + (v / 1e6).toFixed(1) + "M";
}

async function initGlobe() {
  const [statsRes, geoRes] = await Promise.all([
    fetch("data/nationality_stats.json"),
    fetch("data/world-countries.geojson"),
  ]);
  const stats = (await statsRes.json()).countries;
  const geo = await geoRes.json();

  const countries = geo.features.filter((f) => stats[f.properties.ADMIN]);

  document.getElementById("globe-stat-countries").textContent = Object.keys(stats).length;
  const totalSpend = Object.values(stats).reduce((s, c) => s + c.total_transfer_spend, 0);
  document.getElementById("globe-stat-spend").textContent = globeFmtMoney(totalSpend);
  const topByCount = Object.entries(stats).sort((a, b) => b[1].player_count - a[1].player_count)[0];
  document.getElementById("globe-stat-top-country").textContent = `${topByCount[0]} (${topByCount[1].player_count})`;
  const topByValue = Object.entries(stats)
    .filter(([, c]) => c.player_count >= 15 && c.avg_peak_market_value)
    .sort((a, b) => b[1].avg_peak_market_value - a[1].avg_peak_market_value)[0];
  document.getElementById("globe-stat-top-value").textContent = `${topByValue[0]} (${globeFmtMoney(topByValue[1].avg_peak_market_value)})`;

  const tooltip = document.getElementById("globe-tooltip");
  const card = document.querySelector(".globe-card");
  card.addEventListener("mousemove", (e) => {
    if (tooltip.hidden) return;
    const rect = card.getBoundingClientRect();
    tooltip.style.left = `${e.clientX - rect.left}px`;
    tooltip.style.top = `${e.clientY - rect.top}px`;
  });

  const measureSelect = document.getElementById("globe-measure");

  function colorFor(feat, measure) {
    const c = stats[feat.properties.ADMIN];
    if (!c || c[measure] == null) return "rgba(150, 150, 150, 0.35)";
    const values = countries.map((f) => stats[f.properties.ADMIN][measure]).filter((v) => v != null);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const t = max > min ? (c[measure] - min) / (max - min) : 0.5;
    return globeColorScale(t, globeCssVar("--pl-gradient-start"), globeCssVar("--pl-gradient-end"));
  }

  const globeEl = document.getElementById("globe-viz");
  const world = Globe()(globeEl)
    .width(globeEl.clientWidth)
    .height(globeEl.clientHeight)
    .backgroundColor("rgba(0,0,0,0)")
    .globeImageUrl("https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-dark.jpg")
    .showAtmosphere(true)
    .atmosphereColor(globeCssVar("--pl-gradient-end"))
    .polygonsData(geo.features)
    .polygonAltitude(0.01)
    .polygonCapColor((feat) => colorFor(feat, measureSelect.value))
    .polygonSideColor(() => "rgba(60, 40, 80, 0.15)")
    .polygonStrokeColor(() => "rgba(255, 255, 255, 0.4)")
    .polygonLabel(() => "")
    .onPolygonHover((feat) => {
      if (!feat || !stats[feat.properties.ADMIN]) {
        tooltip.hidden = true;
        return;
      }
      const c = stats[feat.properties.ADMIN];
      tooltip.hidden = false;
      tooltip.textContent =
        `${feat.properties.ADMIN}\n` +
        `${c.player_count} player${c.player_count === 1 ? "" : "s"}\n` +
        `Spend: ${globeFmtMoney(c.total_transfer_spend)}\n` +
        (c.avg_peak_market_value ? `Avg value: ${globeFmtMoney(c.avg_peak_market_value)}\n` : "") +
        (c.avg_fifa_overall ? `Avg FIFA: ${c.avg_fifa_overall}` : "");
    });

  world.pointOfView({ lat: 20, lng: -10, altitude: 2.2 }, 0);
  world.controls().autoRotate = false;

  measureSelect.addEventListener("change", () => {
    world.polygonCapColor((feat) => colorFor(feat, measureSelect.value));
  });

  window.addEventListener("resize", () => {
    const el = document.getElementById("globe-viz");
    world.width(el.clientWidth).height(el.clientHeight);
  });
}

initGlobe();
