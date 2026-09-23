import json
import duckdb
import numpy as np
import pandas as pd

DATA = r"C:\Users\Steven Prusak\prem-peak-age\data"
RAW = r"C:\Users\Steven Prusak\Downloads\prem_peak_age_analysis"

ss = pd.read_csv(f"{DATA}/player_season_summary.csv")
pm = pd.read_csv(f"{DATA}/player_match.csv")

MIN_MINUTES = 450
core = ss[ss["minutes"] >= MIN_MINUTES].copy()
core["age_int"] = core["age"].round().astype(int)
core = core[(core["age_int"] >= 17) & (core["age_int"] <= 38)]

findings = {}

def age_curve(df, value_col, weight_col="minutes", group_col=None, min_n=20, smooth=True):
    rows = []
    keys = df[group_col].dropna().unique() if group_col else [None]
    for key in keys:
        sub = df[df[group_col] == key] if group_col else df
        g = sub.groupby("age_int").apply(
            lambda x: np.average(x[value_col], weights=x[weight_col]) if x[weight_col].sum() > 0 else np.nan
        )
        n = sub.groupby("age_int").size()
        g = g[n >= min_n].sort_index()
        raw = g.copy()
        if smooth:
            g = g.rolling(window=3, center=True, min_periods=1).mean()
        for age, val in g.items():
            rows.append({
                "group": key, "age": int(age), "value": round(float(val), 4),
                "raw": round(float(raw[age]), 4), "n": int(n[age]),
            })
    return rows

# 1. Goal involvements per 90 by age, split by position
findings["gi_by_age_position"] = age_curve(core, "gi_per90", "minutes", "position", min_n=20)

# 2. Overall goal involvements per 90 by age (all positions)
findings["gi_by_age_all"] = age_curve(core, "gi_per90", "minutes", None, min_n=30)

# 3. Passing accuracy by age
pass_df = core[core["pass_completion_pct"].notna()]
findings["passing_by_age"] = age_curve(pass_df, "pass_completion_pct", "minutes", None, min_n=30)

# 4. Defensive actions (tackles won + interceptions) per 90 by age, DF + MF only
core["def_actions"] = core["tackles_won"].fillna(0) + core["interceptions"].fillna(0)
def_df = core[core["position"].isin(["Defender", "Midfield"]) & (core["tackles_won"].notna())]
def_df = def_df.assign(def_actions_per90=def_df["def_actions"] / def_df["minutes"] * 90)
findings["defensive_by_age"] = age_curve(def_df, "def_actions_per90", "minutes", "position", min_n=15)

# 5. Aerial duel win% by age
aerial_df = core[core["aerial_duel_win_pct"].notna()]
findings["aerial_by_age"] = age_curve(aerial_df, "aerial_duel_win_pct", "minutes", None, min_n=20)

# 6. GK save% by age
gk_df = core[(core["position"] == "Goalkeeper") & (core["gk_save_pct"].notna())]
findings["gk_save_by_age"] = age_curve(gk_df, "gk_save_pct", "minutes", None, min_n=5)

# 7. Market value by age (using player_valuations directly, all valuation points, not just season summary)
con = duckdb.connect()
players = con.execute(f"SELECT player_id, date_of_birth FROM read_csv_auto('{RAW}/players.csv')").fetchdf()
val = con.execute(f"SELECT player_id, date, market_value_in_eur FROM read_csv_auto('{RAW}/player_valuations.csv')").fetchdf()
val = val.merge(players, on="player_id", how="inner")
val["date"] = pd.to_datetime(val["date"])
val["date_of_birth"] = pd.to_datetime(val["date_of_birth"])
val = val.dropna(subset=["date_of_birth"])
val["age_int"] = ((val["date"] - val["date_of_birth"]).dt.days / 365.25).round().astype(int)
val = val[(val["age_int"] >= 17) & (val["age_int"] <= 38)]
val_pl_ids = set(ss["player_id"].unique())
val = val[val["player_id"].isin(val_pl_ids)]
mv = val.groupby("age_int")["market_value_in_eur"].agg(["mean", "count"]).reset_index()
mv = mv[mv["count"] >= 30]
findings["market_value_by_age"] = [
    {"age": int(r.age_int), "value": round(float(r.mean), 0), "n": int(r.count)} for r in mv.itertuples()
]

# 8. Cards per 90 by age
core["cards_per90"] = (core["yellow_cards"] + core["red_cards"]) / core["minutes"] * 90
findings["cards_by_age"] = age_curve(core, "cards_per90", "minutes", None, min_n=30)

# 9. Minutes share by age (playing-time usage curve)
minutes_by_age = core.groupby("age_int")["minutes"].sum()
minutes_by_age = minutes_by_age / minutes_by_age.sum() * 100
findings["minutes_share_by_age"] = [
    {"age": int(a), "value": round(float(v), 2)} for a, v in minutes_by_age.items()
]

def peak_age(rows):
    if not rows:
        return None
    return max(rows, key=lambda r: r["value"])

summary_stats = {
    "total_player_matches": len(pm),
    "total_player_seasons": len(ss),
    "unique_players": int(ss["player_id"].nunique()),
    "seasons_covered": sorted(ss["season"].unique().tolist()),
    "peak_gi_all": peak_age(findings["gi_by_age_all"]),
    "peak_gi_by_position": {
        pos: peak_age([r for r in findings["gi_by_age_position"] if r["group"] == pos])
        for pos in core["position"].unique()
    },
    "peak_passing_age": peak_age(findings["passing_by_age"]),
    "peak_defensive_by_position": {
        pos: peak_age([r for r in findings["defensive_by_age"] if r["group"] == pos])
        for pos in ["Defender", "Midfield"]
    },
    "peak_aerial_age": peak_age(findings["aerial_by_age"]),
    "peak_gk_save_age": peak_age(findings["gk_save_by_age"]),
    "peak_market_value_age": peak_age(findings["market_value_by_age"]),
    "lowest_cards_age": min(findings["cards_by_age"], key=lambda r: r["value"]) if findings["cards_by_age"] else None,
    "highest_cards_age": peak_age(findings["cards_by_age"]),
    "peak_minutes_share_age": peak_age(findings["minutes_share_by_age"]),
    "fbref_match_rate": round(pass_df["player_id"].nunique() / core["player_id"].nunique(), 3),
}

with open(f"{DATA}/report_findings.json", "w") as f:
    json.dump({"findings": findings, "summary": summary_stats}, f, indent=2, default=str)

print(json.dumps(summary_stats, indent=2, default=str))
