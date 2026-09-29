const SLOT_POSITION = {
  GK: { x: 50, y: 90 },
  LB: { x: 16, y: 72 },
  CB1: { x: 37, y: 78 },
  CB2: { x: 63, y: 78 },
  RB: { x: 84, y: 72 },
  DM: { x: 50, y: 58 },
  CM: { x: 28, y: 44 },
  AM: { x: 72, y: 44 },
  LW: { x: 14, y: 20 },
  ST: { x: 50, y: 10 },
  RW: { x: 86, y: 20 },
};

const SLOT_LABEL = {
  GK: "GK", LB: "LB", CB1: "CB", CB2: "CB", RB: "RB",
  DM: "DM", CM: "CM", AM: "AM", LW: "LW", ST: "ST", RW: "RW",
};

let XI_DATA = null;

function xiFmtMoney(v) {
  return "€" + (v / 1e6).toFixed(1) + "M";
}

function buildDots() {
  const container = document.getElementById("xi-dots");
  container.innerHTML = "";
  for (const slot of Object.keys(SLOT_POSITION)) {
    const pos = SLOT_POSITION[slot];
    const dot = document.createElement("div");
    dot.className = "player-dot empty";
    dot.id = `dot-${slot}`;
    dot.style.left = `${pos.x}%`;
    dot.style.top = `${pos.y}%`;
    dot.innerHTML = `<span class="dot-circle"></span><span class="dot-label">${SLOT_LABEL[slot]}</span>`;
    container.appendChild(dot);
  }
}

function positionTooltip(tooltip, dot) {
  const pitchRect = document.getElementById("xi-pitch").getBoundingClientRect();
  const dotRect = dot.getBoundingClientRect();
  let left = dotRect.left - pitchRect.left + dotRect.width / 2;
  let top = dotRect.top - pitchRect.top;
  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
}

function renderXI() {
  const age = document.getElementById("xi-age").value;
  const club = document.getElementById("xi-club").value;
  document.getElementById("xi-age-value").textContent = age;

  const source = club ? XI_DATA.byClub[club] : XI_DATA.all;
  const xi = (source && source[age]) || {};

  let total = 0;
  let highest = null;

  for (const slot of Object.keys(SLOT_POSITION)) {
    const dot = document.getElementById(`dot-${slot}`);
    const entry = xi[slot];
    const circle = dot.querySelector(".dot-circle");
    if (entry) {
      dot.classList.remove("empty");
      circle.style.background = "transparent";
      circle.innerHTML = playerAvatarSVG(entry.club_name, 34, false);
      dot.dataset.tooltip = `${entry.player_name} — age ${age}\n${entry.club_name}\n${xiFmtMoney(entry.value)}`;
      total += entry.value;
      if (!highest || entry.value > highest.value) highest = entry;
    } else {
      dot.classList.add("empty");
      circle.style.background = "";
      circle.textContent = "?";
      dot.dataset.tooltip = "No data for this position at this age";
    }
  }

  document.getElementById("xi-total-value").textContent = total > 0 ? xiFmtMoney(total) : "—";
  if (highest) {
    document.getElementById("xi-highest-name").textContent = highest.player_name;
    document.getElementById("xi-highest-detail").textContent = `${highest.club_name} (${xiFmtMoney(highest.value)})`;
  } else {
    document.getElementById("xi-highest-name").textContent = "—";
    document.getElementById("xi-highest-detail").textContent = "—";
  }
}

function setupTooltip() {
  const tooltip = document.getElementById("xi-tooltip");
  const container = document.getElementById("xi-dots");
  container.addEventListener("mouseover", (e) => {
    const dot = e.target.closest(".player-dot");
    if (!dot) return;
    tooltip.textContent = dot.dataset.tooltip || "";
    tooltip.hidden = false;
    positionTooltip(tooltip, dot);
  });
  container.addEventListener("mouseout", (e) => {
    if (e.target.closest(".player-dot")) tooltip.hidden = true;
  });
}

async function initSquadXI() {
  const res = await fetch("data/squad_xi.json");
  XI_DATA = await res.json();

  const clubSelect = document.getElementById("xi-club");
  const clubs = Object.keys(XI_DATA.byClub).sort();
  clubSelect.innerHTML =
    `<option value="">Premier League (all clubs)</option>` +
    clubs.map((c) => `<option value="${c}">${c}</option>`).join("");

  buildDots();
  setupTooltip();

  document.getElementById("xi-age").addEventListener("input", renderXI);
  document.getElementById("xi-club").addEventListener("change", renderXI);

  renderXI();
}

initSquadXI();
