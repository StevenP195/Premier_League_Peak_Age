const CLUB_COLORS = {
  "AFC Bournemouth": ["#DA291C", "#000000"],
  "Arsenal FC": ["#EF0107", "#063672"],
  "Aston Villa": ["#670E36", "#95BFE5"],
  "Brentford FC": ["#E30613", "#FFB81C"],
  "Brighton & Hove Albion": ["#0057B8", "#FFCD00"],
  "Burnley FC": ["#6C1D45", "#99D6EA"],
  "Cardiff City": ["#0070B5", "#D11524"],
  "Chelsea FC": ["#034694", "#FFFFFF"],
  "Crystal Palace": ["#1B458F", "#C4122E"],
  "Everton FC": ["#003399", "#FFFFFF"],
  "Fulham FC": ["#000000", "#CC0000"],
  "Huddersfield Town": ["#0E63AD", "#FFFFFF"],
  "Hull City": ["#F18A00", "#000000"],
  "Ipswich Town": ["#0044A9", "#FFFFFF"],
  "Leeds United": ["#1D428A", "#FFCD00"],
  "Leicester City": ["#003090", "#FDBE11"],
  "Liverpool FC": ["#C8102E", "#00B2A9"],
  "Luton Town": ["#F78F1E", "#002D62"],
  "Manchester City": ["#6CABDD", "#1C2C5B"],
  "Manchester United": ["#DA291C", "#FBE122"],
  "Middlesbrough FC": ["#E01A22", "#FFFFFF"],
  "Newcastle United": ["#241F20", "#FFFFFF"],
  "Norwich City": ["#00A650", "#FFF200"],
  "Nottingham Forest": ["#DD0000", "#FFFFFF"],
  "Queens Park Rangers": ["#1D5BA4", "#FFFFFF"],
  "Reading FC": ["#004494", "#FFFFFF"],
  "Sheffield United": ["#EE2737", "#FFFFFF"],
  "Southampton FC": ["#D71920", "#FFFFFF"],
  "Stoke City": ["#E03A3E", "#1B449C"],
  "Sunderland AFC": ["#EB172B", "#FFFFFF"],
  "Swansea City": ["#000000", "#FFFFFF"],
  "Tottenham Hotspur": ["#132257", "#FFFFFF"],
  "Watford FC": ["#FBEE23", "#ED2127"],
  "West Bromwich Albion": ["#122F67", "#FFFFFF"],
  "West Ham United": ["#7A263A", "#1BB1E7"],
  "Wigan Athletic": ["#1D59AF", "#FFFFFF"],
  "Wolverhampton Wanderers": ["#FDB913", "#231F20"],
};

const CLUB_CRESTS = {
  "AFC Bournemouth": "afc-bournemouth",
  "Arsenal FC": "arsenal-fc",
  "Aston Villa": "aston-villa",
  "Brentford FC": "brentford-fc",
  "Brighton & Hove Albion": "brighton",
  "Burnley FC": "burnley-fc",
  "Cardiff City": "cardiff-city",
  "Chelsea FC": "chelsea-fc",
  "Crystal Palace": "crystal-palace",
  "Everton FC": "everton-fc",
  "Fulham FC": "fulham-fc",
  "Huddersfield Town": "huddersfield-town",
  "Hull City": "hull-city",
  "Ipswich Town": "ipswich-town",
  "Leeds United": "leeds-united",
  "Leicester City": "leicester-city",
  "Liverpool FC": "liverpool-fc",
  "Luton Town": "luton-town",
  "Manchester City": "manchester-city",
  "Manchester United": "manchester-united",
  "Middlesbrough FC": "middlesbrough-fc",
  "Newcastle United": "newcastle-united",
  "Norwich City": "norwich-city",
  "Nottingham Forest": "nottingham-forest",
  "Queens Park Rangers": "queens-park-rangers",
  "Reading FC": "reading-fc",
  "Sheffield United": "sheffield-united",
  "Southampton FC": "southampton-fc",
  "Stoke City": "stoke-city",
  "Sunderland AFC": "sunderland-afc",
  "Swansea City": "swansea-city",
  "Tottenham Hotspur": "tottenham-hotspur",
  "Watford FC": "watford-fc",
  "West Bromwich Albion": "west-bromwich-albion",
  "West Ham United": "west-ham-united",
  "Wigan Athletic": "wigan-athletic",
  "Wolverhampton Wanderers": "wolverhampton-wanderers",
};

function readableTextColor(hex) {
  const c = hex.replace("#", "");
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#0b0b0b" : "#ffffff";
}

let playerAvatarSeed = 0;

function playerAvatarSVG(clubName, size, withRing) {
  const colors = CLUB_COLORS[clubName];
  const primary = colors ? colors[0] : "#3d195b";
  const id = `pa${playerAvatarSeed++}`;
  const ring = withRing === false ? "" : `<circle cx="50" cy="50" r="47.5" fill="none" stroke="${primary}" stroke-width="3" />`;
  return `<svg width="${size}" height="${size}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Player silhouette">
    <defs><clipPath id="${id}"><circle cx="50" cy="50" r="49" /></clipPath></defs>
    <circle cx="50" cy="50" r="49" fill="#eef3f6" />
    <g clip-path="url(#${id})">
      <path d="M8 106 C8 68 26 52 50 52 C74 52 92 68 92 106 Z" fill="${primary}" />
      <circle cx="50" cy="37" r="19" fill="#e8c39e" />
    </g>
    ${ring}
  </svg>`;
}
