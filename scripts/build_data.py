import re
import duckdb
import pandas as pd
from unidecode import unidecode

RAW = r"C:\Users\Steven Prusak\Downloads\prem_peak_age_analysis"
OUT = r"C:\Users\Steven Prusak\prem-peak-age\data"

POSITION_ORDER = ["Goalkeeper", "Defender", "Midfield", "Attack"]


def norm_name(name):
    if pd.isna(name):
        return None
    name = unidecode(str(name)).lower()
    name = re.sub(r"[^a-z ]", " ", name)
    name = re.sub(r"\s+", " ", name).strip()
    return name


def season_label(season_start_year):
    return f"{season_start_year}/{str(season_start_year + 1)[-2:]}"


con = duckdb.connect()

print("Loading Transfermarkt player-match data (Premier League only)...")
match_df = con.execute(f"""
    SELECT
        a.player_id,
        a.player_name,
        a.date,
        g.season AS season_start_year,
        c.name AS club_name,
        a.minutes_played,
        a.goals,
        a.assists,
        a.yellow_cards,
        a.red_cards
    FROM read_csv_auto('{RAW}/appearances.csv') a
    JOIN read_csv_auto('{RAW}/games.csv') g ON a.game_id = g.game_id
    LEFT JOIN read_csv_auto('{RAW}/clubs.csv') c ON a.player_club_id = c.club_id
    WHERE a.competition_id = 'GB1' AND g.date <= CURRENT_DATE
""").fetchdf()

players = con.execute(f"""
    SELECT player_id, date_of_birth, position, sub_position, name AS players_name
    FROM read_csv_auto('{RAW}/players.csv')
""").fetchdf()

match_df = match_df.merge(players, on="player_id", how="left")
match_df = match_df[match_df["position"].notna() & (match_df["position"] != "Missing")]
match_df = match_df[match_df["date_of_birth"].notna()]

match_df["date"] = pd.to_datetime(match_df["date"])
match_df["date_of_birth"] = pd.to_datetime(match_df["date_of_birth"])
match_df["age"] = (match_df["date"] - match_df["date_of_birth"]).dt.days / 365.25
match_df["age"] = match_df["age"].round(1)
match_df["season"] = match_df["season_start_year"].apply(season_label)
match_df["goal_involvements"] = match_df["goals"] + match_df["assists"]

player_match = match_df[[
    "season", "date", "player_id", "player_name", "club_name",
    "position", "sub_position", "age",
    "minutes_played", "goals", "assists", "goal_involvements",
    "yellow_cards", "red_cards",
]].sort_values(["season", "date", "club_name"])

player_match.to_csv(f"{OUT}/player_match.csv", index=False)
print(f"player_match.csv: {len(player_match):,} rows")

print("Building player-season summary...")
season_summary = (
    match_df.groupby(["season", "season_start_year", "player_id", "player_name", "position", "sub_position"])
    .agg(
        matches=("date", "count"),
        minutes=("minutes_played", "sum"),
        goals=("goals", "sum"),
        assists=("assists", "sum"),
        yellow_cards=("yellow_cards", "sum"),
        red_cards=("red_cards", "sum"),
        age=("age", "mean"),
        club_name=("club_name", lambda s: s.mode().iat[0] if not s.mode().empty else None),
    )
    .reset_index()
)
season_summary["age"] = season_summary["age"].round(1)
season_summary["goal_involvements"] = season_summary["goals"] + season_summary["assists"]
season_summary["goals_per90"] = (season_summary["goals"] / season_summary["minutes"] * 90).round(3)
season_summary["assists_per90"] = (season_summary["assists"] / season_summary["minutes"] * 90).round(3)
season_summary["gi_per90"] = (season_summary["goal_involvements"] / season_summary["minutes"] * 90).round(3)

print("Loading market valuations...")
valuations = con.execute(f"""
    SELECT player_id, date, market_value_in_eur
    FROM read_csv_auto('{RAW}/player_valuations.csv')
""").fetchdf()
valuations["date"] = pd.to_datetime(valuations["date"])
valuations["season_start_year"] = valuations["date"].dt.year - (valuations["date"].dt.month < 7).astype(int)
season_value = (
    valuations.groupby(["player_id", "season_start_year"])["market_value_in_eur"]
    .max()
    .reset_index()
    .rename(columns={"market_value_in_eur": "peak_market_value_eur"})
)
season_summary = season_summary.merge(season_value, on=["player_id", "season_start_year"], how="left")

print("Loading FBref advanced stats (2017-2024)...")
fbref_old = pd.read_csv(f"{RAW}/fbref_advanced_stats_2017_2024.csv")
fbref_old["norm_name"] = fbref_old["player"].apply(norm_name)
fbref_old["season_start_year"] = fbref_old["season"].str.slice(0, 4).astype(int)
fbref_old_cols = {
    "Pass completion %": "pass_completion_pct",
    "% Successful take-ons": "take_on_success_pct",
    "% Aerial Duels won": "aerial_duel_win_pct",
    "Tackles Won": "tackles_won",
    "Interceptions": "interceptions",
    "Clearances": "clearances",
    "Saves %": "gk_save_pct",
    "% Clean sheets": "gk_clean_sheet_pct",
}
fbref_old_slim = fbref_old[["norm_name", "season_start_year"] + list(fbref_old_cols.keys())].rename(columns=fbref_old_cols)

print("Loading FBref advanced stats (2024-2025)...")
fbref_new = pd.read_csv(f"{RAW}/fbref_advanced_stats_2024_2025.csv")
fbref_new["norm_name"] = fbref_new["Player"].apply(norm_name)
fbref_new["season_start_year"] = 2024
fbref_new_cols = {
    "Cmp%": "pass_completion_pct",
    "Succ%": "take_on_success_pct",
    "Won%": "aerial_duel_win_pct",
    "TklW": "tackles_won",
    "Int": "interceptions",
    "Clr": "clearances",
    "Save%": "gk_save_pct",
    "CS%": "gk_clean_sheet_pct",
}
available_new_cols = {k: v for k, v in fbref_new_cols.items() if k in fbref_new.columns}
fbref_new_slim = fbref_new[["norm_name", "season_start_year"] + list(available_new_cols.keys())].rename(columns=available_new_cols)

fbref_all = pd.concat([fbref_old_slim, fbref_new_slim], ignore_index=True)
fbref_all = fbref_all.groupby(["norm_name", "season_start_year"], as_index=False).mean(numeric_only=True)

season_summary["norm_name"] = season_summary["player_name"].apply(norm_name)
before = len(season_summary)
season_summary = season_summary.merge(fbref_all, on=["norm_name", "season_start_year"], how="left")
matched = season_summary["pass_completion_pct"].notna().sum()
print(f"FBref match rate: {matched:,} / {before:,} player-seasons ({matched/before:.1%})")

print("Loading FIFA ratings...")
fifa = pd.read_csv(
    f"{RAW}/fifa_ratings_premier_league.csv",
    usecols=["short_name", "long_name", "fifa_version", "overall", "potential", "pace", "value_eur", "age"],
)
fifa["season_start_year"] = fifa["fifa_version"] + 1999
fifa["norm_name"] = fifa["long_name"].apply(norm_name)
fifa_season = (
    fifa.groupby(["norm_name", "season_start_year"], as_index=False)
    .agg(fifa_overall=("overall", "max"), fifa_potential=("potential", "max"), fifa_pace=("pace", "max"))
)
season_summary = season_summary.merge(fifa_season, on=["norm_name", "season_start_year"], how="left")
matched_fifa = season_summary["fifa_overall"].notna().sum()
print(f"FIFA match rate: {matched_fifa:,} / {before:,} player-seasons ({matched_fifa/before:.1%})")

season_summary = season_summary.drop(columns=["norm_name"])
season_summary = season_summary.sort_values(["season_start_year", "player_name"])
season_summary.to_csv(f"{OUT}/player_season_summary.csv", index=False)
print(f"player_season_summary.csv: {len(season_summary):,} rows")
