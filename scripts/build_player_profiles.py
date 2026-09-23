import json
import duckdb
import numpy as np
import pandas as pd

RAW = r"C:\Users\Steven Prusak\Downloads\prem_peak_age_analysis"
OUT = r"C:\Users\Steven Prusak\prem-peak-age\data"

ss = pd.read_csv(f"{OUT}/player_season_summary.csv")

MIN_CAREER_MINUTES = 900
totals = ss.groupby("player_id").agg(
    player_name=("player_name", "first"),
    position=("position", lambda s: s.mode().iat[0]),
    career_minutes=("minutes", "sum"),
    career_matches=("matches", "sum"),
    seasons_played=("season", "nunique"),
    total_goals=("goals", "sum"),
    total_assists=("assists", "sum"),
    total_gi=("goal_involvements", "sum"),
    total_yellow=("yellow_cards", "sum"),
    total_red=("red_cards", "sum"),
    peak_market_value_eur=("peak_market_value_eur", "max"),
    primary_club=("club_name", lambda s: s.mode().iat[0] if not s.mode().empty else None),
).reset_index()
totals = totals[totals["career_minutes"] >= MIN_CAREER_MINUTES]

def minutes_weighted(df, col):
    sub = df.dropna(subset=[col])
    if sub["minutes"].sum() == 0 or len(sub) == 0:
        return np.nan
    return np.average(sub[col], weights=sub["minutes"])

rate_rows = []
for pid, g in ss.groupby("player_id"):
    rate_rows.append({
        "player_id": pid,
        "typical_age": minutes_weighted(g, "age"),
        "pass_completion_pct": minutes_weighted(g, "pass_completion_pct"),
        "aerial_duel_win_pct": minutes_weighted(g, "aerial_duel_win_pct"),
        "tackles_won": g["tackles_won"].sum(skipna=True),
        "interceptions": g["interceptions"].sum(skipna=True),
        "gk_save_pct": minutes_weighted(g, "gk_save_pct"),
        "fifa_overall": g["fifa_overall"].max(),
    })
rates = pd.DataFrame(rate_rows)

profiles = totals.merge(rates, on="player_id", how="left")
profiles["goals_per90"] = profiles["total_goals"] / profiles["career_minutes"] * 90
profiles["assists_per90"] = profiles["total_assists"] / profiles["career_minutes"] * 90
profiles["def_actions_per90"] = (
    (profiles["tackles_won"].fillna(0) + profiles["interceptions"].fillna(0)) / profiles["career_minutes"] * 90
)
profiles["cards_per90"] = (
    (profiles["total_yellow"] + profiles["total_red"]) / profiles["career_minutes"] * 90
)

con = duckdb.connect()
players = con.execute(f"""
    SELECT player_id, country_of_citizenship AS nationality
    FROM read_csv_auto('{RAW}/players.csv')
""").fetchdf()
profiles = profiles.merge(players, on="player_id", how="left")

profiles = profiles.replace({np.nan: None})

records = []
for _, r in profiles.iterrows():
    records.append({
        "player_id": int(r["player_id"]),
        "player_name": r["player_name"],
        "position": r["position"],
        "nationality": r["nationality"],
        "primary_club": r["primary_club"],
        "career_minutes": int(r["career_minutes"]),
        "seasons_played": int(r["seasons_played"]),
        "typical_age": round(r["typical_age"], 1) if r["typical_age"] is not None else None,
        "goals_per90": round(r["goals_per90"], 3),
        "assists_per90": round(r["assists_per90"], 3),
        "def_actions_per90": round(r["def_actions_per90"], 3),
        "aerial_duel_win_pct": round(r["aerial_duel_win_pct"], 1) if r["aerial_duel_win_pct"] is not None else None,
        "gk_save_pct": round(r["gk_save_pct"], 1) if r["gk_save_pct"] is not None else None,
        "cards_per90": round(r["cards_per90"], 3),
        "peak_market_value_eur": r["peak_market_value_eur"],
        "fifa_overall": r["fifa_overall"],
    })

print(f"Player profiles: {len(records)}")
print(pd.Series([r["position"] for r in records]).value_counts())

with open(f"{OUT}/player_profiles.json", "w", encoding="utf-8") as f:
    json.dump(records, f, default=str)
