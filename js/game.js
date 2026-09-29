const GAME_POSITIONS = [
  { value: "Goalkeeper", label: "Goalkeeper" },
  { value: "Defender", label: "Defender" },
  { value: "Midfield", label: "Midfielder" },
  { value: "Attack", label: "Forward" },
  { value: "", label: "Surprise me (any position)" },
];

const GAME_AGES = [
  { value: "young", label: "Young prospect (peaked under 23)" },
  { value: "prime", label: "Prime years (23–29)" },
  { value: "veteran", label: "Experienced veteran (30+)" },
  { value: "", label: "Doesn't matter" },
];

const TRAITS_OUTFIELD = [
  { key: "finishing", label: "Finishing", metric: "goals_per90" },
  { key: "creativity", label: "Creativity", metric: "assists_per90" },
  { key: "defense", label: "Defensive solidity", metric: "def_actions_per90" },
  { key: "aerial", label: "Aerial & physical presence", metric: "aerial_duel_win_pct" },
  { key: "reliability", label: "Reliability (minutes played)", metric: "career_minutes" },
  { key: "discipline", label: "Discipline (cool head)", metric: "cards_per90", invert: true },
];

const TRAITS_GK = [
  { key: "shotstopping", label: "Shot-stopping", metric: "gk_save_pct" },
  { key: "reliability", label: "Reliability (minutes played)", metric: "career_minutes" },
  { key: "discipline", label: "Discipline (cool head)", metric: "cards_per90", invert: true },
];

let GAME_PROFILES = [];
let gamePosition = "";
let gameAge = "";
let gameTraits = [];
let lastPool = [];
let lastUsed = new Set();

function ageBand(age) {
  if (age == null) return null;
  if (age < 23) return "young";
  if (age <= 29) return "prime";
  return "veteran";
}

function currentTraitList() {
  return gamePosition === "Goalkeeper" ? TRAITS_GK : TRAITS_OUTFIELD;
}

function renderButtonGroup(containerId, options, selectedValue, onPick) {
  const el = document.getElementById(containerId);
  el.innerHTML = "";
  for (const opt of options) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = opt.label;
    btn.dataset.value = opt.value;
    if (opt.value === selectedValue) btn.classList.add("selected");
    btn.addEventListener("click", () => onPick(opt.value));
    el.appendChild(btn);
  }
}

function renderTraitButtons() {
  const el = document.getElementById("game-traits");
  el.innerHTML = "";
  for (const t of currentTraitList()) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = t.label;
    btn.dataset.key = t.key;
    if (gameTraits.includes(t.key)) btn.classList.add("selected");
    btn.addEventListener("click", () => {
      if (gameTraits.includes(t.key)) {
        gameTraits = gameTraits.filter((k) => k !== t.key);
      } else if (gameTraits.length < 2) {
        gameTraits.push(t.key);
      }
      renderTraitButtons();
    });
    el.appendChild(btn);
  }
}

function renderPositionButtons() {
  renderButtonGroup("game-position", GAME_POSITIONS, gamePosition, (v) => {
    gamePosition = v;
    gameTraits = [];
    renderPositionButtons();
    renderTraitButtons();
  });
}

function renderAgeButtons() {
  renderButtonGroup("game-age", GAME_AGES, gameAge, (v) => {
    gameAge = v;
    renderAgeButtons();
  });
}

function gameNormalize(pool, metric) {
  const values = pool.map((p) => p[metric]).filter((v) => v != null && !isNaN(v));
  const min = Math.min(...values);
  const max = Math.max(...values);
  return { min, max };
}

function computeMatches() {
  let pool = GAME_PROFILES;
  if (gamePosition) pool = pool.filter((p) => p.position === gamePosition);
  if (pool.length === 0) pool = GAME_PROFILES;

  const traitList = currentTraitList();
  const ranges = {};
  for (const t of traitList) ranges[t.key] = gameNormalize(pool, t.metric);

  const scored = pool.map((p) => {
    let score = 0;
    for (const t of traitList) {
      const v = p[t.metric];
      const { min, max } = ranges[t.key];
      let norm = v == null || isNaN(v) || max === min ? 0 : (v - min) / (max - min);
      if (t.invert) norm = 1 - norm;
      const weight = gameTraits.includes(t.key) ? 1 : 0.15;
      score += weight * norm;
    }
    if (gameAge && ageBand(p.typical_age) === gameAge) score += 0.5;
    return { profile: p, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 15).map((s) => s.profile);
}

function gameFmtMoney(v) {
  if (v == null) return "—";
  return "€" + (v / 1e6).toFixed(1) + "M";
}

function gameFmtStat(v, suffix) {
  if (v == null || isNaN(v)) return "—";
  return v + suffix;
}

function revealPlayer() {
  const available = lastPool.filter((p) => !lastUsed.has(p.player_id));
  const pool = available.length > 0 ? available : lastPool;
  const pick = pool[Math.floor(Math.random() * pool.length)];
  lastUsed.add(pick.player_id);

  const crestEl = document.getElementById("result-crest");
  const crestSlug = CLUB_CRESTS[pick.primary_club];
  const badgeHtml = crestSlug
    ? `<span class="result-crest-badge"><img src="assets/crests/${crestSlug}.png" alt="${pick.primary_club}" /></span>`
    : "";
  crestEl.innerHTML = playerAvatarSVG(pick.primary_club, 104) + badgeHtml;

  document.getElementById("result-name").textContent = pick.player_name;
  document.getElementById("result-meta").textContent =
    `${pick.position} · ${pick.nationality || "Unknown nationality"} · typical age ${pick.typical_age ?? "—"} · ${pick.primary_club}`;

  const stats = [
    ["Goals per 90", gameFmtStat(pick.goals_per90, "")],
    ["Assists per 90", gameFmtStat(pick.assists_per90, "")],
    ["Defensive actions per 90", gameFmtStat(pick.def_actions_per90, "")],
    ["Aerial duels won", gameFmtStat(pick.aerial_duel_win_pct, "%")],
    ["GK save %", gameFmtStat(pick.gk_save_pct, "%")],
    ["Cards per 90", gameFmtStat(pick.cards_per90, "")],
    ["Career minutes", pick.career_minutes.toLocaleString()],
    ["Peak market value", gameFmtMoney(pick.peak_market_value_eur)],
  ];
  document.getElementById("result-stats").innerHTML = stats
    .map(([label, value]) => `<li><strong>${value}</strong> ${label}</li>`)
    .join("");

  document.getElementById("game-card").hidden = true;
  document.getElementById("game-result").hidden = false;
}

async function initGame() {
  const res = await fetch("data/player_profiles.json");
  GAME_PROFILES = await res.json();

  renderPositionButtons();
  renderAgeButtons();
  renderTraitButtons();

  document.getElementById("game-submit").addEventListener("click", () => {
    lastPool = computeMatches();
    lastUsed = new Set();
    revealPlayer();
  });

  document.getElementById("game-again").addEventListener("click", revealPlayer);

  document.getElementById("game-restart").addEventListener("click", () => {
    gamePosition = "";
    gameAge = "";
    gameTraits = [];
    renderPositionButtons();
    renderAgeButtons();
    renderTraitButtons();
    document.getElementById("game-card").hidden = false;
    document.getElementById("game-result").hidden = true;
  });
}

initGame();
