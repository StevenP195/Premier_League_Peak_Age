import json
import duckdb
import pandas as pd

RAW = r"C:\Users\Steven Prusak\Downloads\prem_peak_age_analysis"
OUT = r"C:\Users\Steven Prusak\prem-peak-age\data"

KNOWN_CLUBS = [
    "AFC Bournemouth", "Arsenal FC", "Aston Villa", "Brentford FC", "Brighton & Hove Albion",
    "Burnley FC", "Cardiff City", "Chelsea FC", "Crystal Palace", "Everton FC", "Fulham FC",
    "Huddersfield Town", "Hull City", "Ipswich Town", "Leeds United", "Leicester City",
    "Liverpool FC", "Luton Town", "Manchester City", "Manchester United", "Middlesbrough FC",
    "Newcastle United", "Norwich City", "Nottingham Forest", "Queens Park Rangers", "Reading FC",
    "Sheffield United", "Southampton FC", "Stoke City", "Sunderland AFC", "Swansea City",
    "Tottenham Hotspur", "Watford FC", "West Bromwich Albion", "West Ham United",
    "Wigan Athletic", "Wolverhampton Wanderers",
]

SLOT_SUBPOSITION = {
    "GK": "Goalkeeper",
    "LB": "Left-Back",
    "CB1": "Centre-Back",
    "CB2": "Centre-Back",
    "RB": "Right-Back",
    "DM": "Defensive Midfield",
    "CM": "Central Midfield",
    "AM": "Attacking Midfield",
    "LW": "Left Winger",
    "ST": "Centre-Forward",
    "RW": "Right Winger",
}
SLOTS = list(SLOT_SUBPOSITION.keys())

con = duckdb.connect()
clubs_sql = ",".join(f"'{c}'" for c in KNOWN_CLUBS)
val = con.execute(f"""
    SELECT player_id, date, market_value_in_eur, current_club_name
    FROM read_csv_auto('{RAW}/player_valuations.csv')
    WHERE player_club_domestic_competition_id = 'GB1'
      AND current_club_name IN ({clubs_sql})
""").fetchdf()

players = con.execute(f"""
    SELECT player_id, date_of_birth, sub_position, name AS player_name
    FROM read_csv_auto('{RAW}/players.csv')
""").fetchdf()

df = val.merge(players, on="player_id", how="inner")
df = df.dropna(subset=["date_of_birth", "sub_position"])
df["date"] = pd.to_datetime(df["date"])
df["date_of_birth"] = pd.to_datetime(df["date_of_birth"])
df["age_int"] = ((df["date"] - df["date_of_birth"]).dt.days / 365.25).round().astype(int)
df = df[(df["age_int"] >= 16) & (df["age_int"] <= 40)]

df = df.sort_values("market_value_in_eur", ascending=False)
df = df.drop_duplicates(subset=["player_id", "age_int"], keep="first")


def row_to_entry(row):
    return {
        "player_name": row["player_name"],
        "value": round(float(row["market_value_in_eur"]), 0),
        "club_name": row["current_club_name"],
        "date": row["date"].strftime("%Y-%m-%d"),
        "sub_position": row["sub_position"],
    }


def build_xi(sub_df):
    ages = {}
    for age, age_df in sub_df.groupby("age_int"):
        slots = {}
        for slot, subpos in SLOT_SUBPOSITION.items():
            cands = age_df[age_df["sub_position"] == subpos].sort_values("market_value_in_eur", ascending=False)
            rank = 1 if slot == "CB2" else 0
            if len(cands) > rank:
                slots[slot] = row_to_entry(cands.iloc[rank])
        if slots:
            ages[str(int(age))] = slots
    return ages


print("Building league-wide XI...")
all_xi = build_xi(df)

print("Building per-club XIs...")
by_club = {}
for club, club_df in df.groupby("current_club_name"):
    xi = build_xi(club_df)
    if xi:
        by_club[club] = xi

out = {
    "slots": SLOTS,
    "slotSubPosition": SLOT_SUBPOSITION,
    "all": all_xi,
    "byClub": by_club,
}
with open(f"{OUT}/squad_xi.json", "w", encoding="utf-8") as f:
    json.dump(out, f, default=str)

print("ages in 'all':", len(all_xi))
print("clubs in 'byClub':", len(by_club))
