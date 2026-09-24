import json
import re
import numpy as np
import pandas as pd
from unidecode import unidecode

RAW = r"C:\Users\Steven Prusak\Downloads\prem_peak_age_analysis"
OUT = r"C:\Users\Steven Prusak\prem-peak-age\data"

TOP6 = {"Manchester City", "Manchester United", "Liverpool FC", "Chelsea FC", "Arsenal FC", "Tottenham Hotspur"}

CLUB_ALIAS = {
    "Liverpool": "Liverpool FC",
    "Arsenal": "Arsenal FC",
    "Chelsea": "Chelsea FC",
    "Tottenham Hotspur": "Tottenham Hotspur",
    "Manchester United": "Manchester United",
    "Manchester City": "Manchester City",
    "Newcastle United": "Newcastle United",
    "Wolverhampton Wanderers": "Wolverhampton Wanderers",
    "Everton": "Everton FC",
    "Brighton & Hove Albion": "Brighton & Hove Albion",
    "West Ham United": "West Ham United",
    "Crystal Palace": "Crystal Palace",
    "Aston Villa": "Aston Villa",
    "Fulham": "Fulham FC",
    "Brentford": "Brentford FC",
    "Nottingham Forest": "Nottingham Forest",
    "AFC Bournemouth": "AFC Bournemouth",
    "Bournemouth": "AFC Bournemouth",
    "Leicester City": "Leicester City",
    "Southampton": "Southampton FC",
    "Burnley": "Burnley FC",
    "Sheffield United": "Sheffield United",
    "Luton Town": "Luton Town",
    "Watford": "Watford FC",
    "Norwich City": "Norwich City",
    "Leeds United": "Leeds United",
    "West Bromwich Albion": "West Bromwich Albion",
    "Stoke City": "Stoke City",
    "Swansea City": "Swansea City",
    "Huddersfield Town": "Huddersfield Town",
    "Hull City": "Hull City",
    "Middlesbrough": "Middlesbrough FC",
    "Sunderland": "Sunderland AFC",
    "Cardiff City": "Cardiff City",
    "Wigan Athletic": "Wigan Athletic",
    "Queens Park Rangers": "Queens Park Rangers",
    "Reading": "Reading FC",
    "Ipswich Town": "Ipswich Town",
}

FLAGS = {
    "England": "\U0001F3F4\U000E0067\U000E0062\U000E0065\U000E006E\U000E0067\U000E007F",
    "Scotland": "\U0001F3F4\U000E0067\U000E0062\U000E0073\U000E0063\U000E0074\U000E007F",
    "Wales": "\U0001F3F4\U000E0067\U000E0062\U000E0077\U000E006C\U000E0073\U000E007F",
}

def flag_emoji(name):
    if name in FLAGS:
        return FLAGS[name]
    iso = COUNTRY_ISO2.get(name)
    if not iso:
        return ""
    return "".join(chr(ord(c) + 127397) for c in iso.upper())

COUNTRY_ISO2 = {
    "Northern Ireland": "GB", "Republic of Ireland": "IE", "Ireland": "IE",
    "Brazil": "BR", "Spain": "ES", "France": "FR", "Argentina": "AR",
    "Portugal": "PT", "Netherlands": "NL", "Germany": "DE", "Belgium": "BE",
    "Italy": "IT", "Uruguay": "UY", "Colombia": "CO", "Senegal": "SN",
    "Nigeria": "NG", "Ghana": "GH", "Ivory Coast": "CI", "Cote d'Ivoire": "CI",
    "Morocco": "MA", "Algeria": "DZ", "Egypt": "EG", "Cameroon": "CM",
    "Mali": "ML", "DR Congo": "CD", "Congo DR": "CD", "Sweden": "SE",
    "Norway": "NO", "Denmark": "DK", "Switzerland": "CH", "Austria": "AT",
    "Poland": "PL", "Czech Republic": "CZ", "Croatia": "HR", "Serbia": "RS",
    "Ukraine": "UA", "Russia": "RU", "Turkey": "TR", "T\u00fcrkiye": "TR",
    "Greece": "GR", "Japan": "JP", "Korea Republic": "KR", "South Korea": "KR",
    "United States": "US", "Mexico": "MX", "Canada": "CA", "Chile": "CL",
    "Ecuador": "EC", "Peru": "PE", "Paraguay": "PY", "Venezuela": "VE",
    "Jamaica": "JM", "Australia": "AU", "New Zealand": "NZ", "Iceland": "IS",
    "Finland": "FI", "Romania": "RO", "Hungary": "HU", "Slovakia": "SK",
    "Slovenia": "SI", "Bosnia and Herzegovina": "BA", "Albania": "AL",
    "North Macedonia": "MK", "Montenegro": "ME", "Kosovo": "XK",
    "Israel": "IL", "Saudi Arabia": "SA", "Iran": "IR", "China PR": "CN",
    "Tunisia": "TN", "Zambia": "ZM", "Zimbabwe": "ZW", "Gabon": "GA",
    "Guinea": "GN", "Burkina Faso": "BF", "Cape Verde Islands": "CV",
    "Curacao": "CW", "Trinidad & Tobago": "TT", "Costa Rica": "CR",
    "Panama": "PA", "Honduras": "HN", "Gambia": "GM",
}


def norm_name(name):
    if pd.isna(name):
        return None
    name = unidecode(str(name)).lower()
    name = re.sub(r"[^a-z ]", " ", name)
    return re.sub(r"\s+", " ", name).strip()


print("Loading Premier League player list...")
pl_players = pd.read_csv(f"{OUT}/player_season_summary.csv", usecols=["player_id", "player_name"]).drop_duplicates("player_id")
pl_players["norm_name"] = pl_players["player_name"].apply(norm_name)
pl_norm_to_id = dict(zip(pl_players["norm_name"], pl_players["player_id"]))

print("Loading FIFA ratings (this is a big file)...")
fifa_cols = [
    "long_name", "club_name", "nationality_name", "overall", "potential", "value_eur",
    "pace", "shooting", "passing", "dribbling", "defending", "physic", "age", "player_positions",
]
fifa = pd.read_csv(f"{RAW}/fifa_ratings_premier_league.csv", usecols=fifa_cols)
fifa["norm_name"] = fifa["long_name"].apply(norm_name)
fifa = fifa[fifa["norm_name"].isin(pl_norm_to_id)]
fifa["pl_player_id"] = fifa["norm_name"].map(pl_norm_to_id)
fifa["pl_player_name"] = fifa["norm_name"].map(dict(zip(pl_players["norm_name"], pl_players["player_name"])))

print(f"Matched FIFA rows: {len(fifa)}, unique players: {fifa['pl_player_id'].nunique()}")

fifa["canonical_club"] = fifa["club_name"].map(CLUB_ALIAS)
before_pl_filter = fifa["pl_player_id"].nunique()
fifa = fifa[fifa["canonical_club"].notna()]
print(f"Players with at least one season at a known PL club: {fifa['pl_player_id'].nunique()} of {before_pl_filter}")

fifa = fifa.dropna(subset=["overall", "value_eur"])
fifa = fifa.sort_values("overall", ascending=False)
best = fifa.drop_duplicates(subset=["pl_player_id"], keep="first").copy()
print(f"Player cards (peak FIFA rating while at a PL club): {len(best)}")
best["is_top6"] = best["canonical_club"].isin(TOP6)
best["flag"] = best["nationality_name"].apply(flag_emoji)

overall = best["overall"].values.astype(float)
age = best["age"].values.astype(float)
y = np.log(best["value_eur"].values.astype(float))
X = np.column_stack([overall, age, np.ones_like(overall)])
coeffs, *_ = np.linalg.lstsq(X, y, rcond=None)
slope, age_coef, intercept = coeffs
best["expected_value"] = np.exp(slope * overall + age_coef * age + intercept)
best["value_gap_pct"] = (best["value_eur"] - best["expected_value"]) / best["expected_value"] * 100

print("Regression: log(value) =", slope, "* overall +", age_coef, "* age +", intercept)

missing_club = best[best["canonical_club"].isna()]["club_name"].value_counts()
if len(missing_club):
    print("Unmapped clubs:\n", missing_club)

records = []
for _, r in best.iterrows():
    records.append({
        "player_id": int(r["pl_player_id"]),
        "player_name": r["pl_player_name"],
        "position": r["player_positions"].split(",")[0].strip() if pd.notna(r["player_positions"]) else None,
        "club": r["canonical_club"] if pd.notna(r["canonical_club"]) else r["club_name"],
        "is_top6": bool(r["is_top6"]),
        "nationality": r["nationality_name"],
        "flag": r["flag"],
        "age": int(r["age"]) if pd.notna(r["age"]) else None,
        "overall": int(r["overall"]),
        "potential": int(r["potential"]) if pd.notna(r["potential"]) else None,
        "pace": int(r["pace"]) if pd.notna(r["pace"]) else None,
        "shooting": int(r["shooting"]) if pd.notna(r["shooting"]) else None,
        "passing": int(r["passing"]) if pd.notna(r["passing"]) else None,
        "dribbling": int(r["dribbling"]) if pd.notna(r["dribbling"]) else None,
        "defending": int(r["defending"]) if pd.notna(r["defending"]) else None,
        "physic": int(r["physic"]) if pd.notna(r["physic"]) else None,
        "market_value": round(float(r["value_eur"]), 0),
        "expected_value": round(float(r["expected_value"]), 0),
        "value_gap_pct": round(float(r["value_gap_pct"]), 1),
    })

MIN_VALUE_FOR_LEADERBOARD = 3_000_000
leaderboard_pool = [r for r in records if r["market_value"] >= MIN_VALUE_FOR_LEADERBOARD]
most_under = sorted(leaderboard_pool, key=lambda r: r["value_gap_pct"])[:5]
most_over = sorted(leaderboard_pool, key=lambda r: -r["value_gap_pct"])[:5]

with open(f"{OUT}/value_cards.json", "w", encoding="utf-8") as f:
    json.dump(
        {
            "regression": {"overall_coef": slope, "age_coef": age_coef, "intercept": intercept},
            "players": records,
            "leaderboard": {
                "undervalued": [r["player_id"] for r in most_under],
                "overvalued": [r["player_id"] for r in most_over],
            },
        },
        f,
        default=str,
    )

print("Wrote", len(records), "player cards")
print("Top6 count:", sum(r["is_top6"] for r in records))
print("Most undervalued (>=3M):", [(r["player_name"], r["value_gap_pct"]) for r in most_under])
print("Most overvalued (>=3M):", [(r["player_name"], r["value_gap_pct"]) for r in most_over])
