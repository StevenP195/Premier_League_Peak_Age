import json
import duckdb
import pandas as pd

RAW = r"C:\Users\Steven Prusak\Downloads\prem_peak_age_analysis"
OUT = r"C:\Users\Steven Prusak\prem-peak-age\data"
FDA = r"C:\Users\Steven Prusak\fda-python"

NATIONALITY_TO_GEOJSON = {
    "England": "United Kingdom",
    "Scotland": "United Kingdom",
    "Wales": "United Kingdom",
    "Northern Ireland": "United Kingdom",
    "Cote d'Ivoire": "Ivory Coast",
    "DR Congo": "Democratic Republic of the Congo",
    "Congo": "Republic of the Congo",
    "T\u00fcrkiye": "Turkey",
    "T\ufffdrkiye": "Turkey",
    "United States": "United States of America",
    "Korea, South": "South Korea",
    "Korea, North": "North Korea",
    "Czech Republic": "Czechia",
    "Serbia": "Republic of Serbia",
    "North Macedonia": "Macedonia",
    "Bosnia-Herzegovina": "Bosnia and Herzegovina",
    "Eswatini": "Swaziland",
    "Curacao": None,
    "Cape Verde": None,
    "Kosovo": "Kosovo",
    "Gambia": "Gambia",
}

con = duckdb.connect()

season_summary = pd.read_csv(f"{OUT}/player_season_summary.csv")
pl_player_ids = set(season_summary["player_id"].unique())

players = con.execute(f"""
    SELECT player_id, name AS player_name, country_of_citizenship, country_of_birth
    FROM read_csv_auto('{RAW}/players.csv')
""").fetchdf()
players = players[players["player_id"].isin(pl_player_ids)].copy()
players = players.dropna(subset=["country_of_citizenship"])

def normalize(nat):
    return NATIONALITY_TO_GEOJSON.get(nat, nat)

players["geo_country"] = players["country_of_citizenship"].apply(normalize)
players = players[players["geo_country"].notna()]

peak_value = season_summary.groupby("player_id")["peak_market_value_eur"].max().reset_index()
peak_fifa = season_summary.groupby("player_id")["fifa_overall"].max().reset_index()

player_stats = players.merge(peak_value, on="player_id", how="left").merge(peak_fifa, on="player_id", how="left")

print("Loading PL transfer spend by player...")
transfers = con.execute(f"""
    SELECT t.player_id, t.transfer_fee
    FROM read_csv_auto('{RAW}/transfers.csv') t
    JOIN read_csv_auto('{RAW}/clubs.csv') c ON t.to_club_id = c.club_id
    WHERE c.domestic_competition_id = 'GB1'
""").fetchdf()
transfers["transfer_fee"] = transfers["transfer_fee"].fillna(0)
spend_by_player = transfers.groupby("player_id")["transfer_fee"].sum().reset_index()
spend_by_player.columns = ["player_id", "total_transfer_spend"]

player_stats = player_stats.merge(spend_by_player, on="player_id", how="left")
player_stats["total_transfer_spend"] = player_stats["total_transfer_spend"].fillna(0)

country_agg = player_stats.groupby("geo_country").agg(
    player_count=("player_id", "count"),
    total_transfer_spend=("total_transfer_spend", "sum"),
    avg_peak_market_value=("peak_market_value_eur", "mean"),
    avg_fifa_overall=("fifa_overall", "mean"),
).reset_index()

nationalities_by_geo = players.groupby("geo_country")["country_of_citizenship"].agg(lambda s: sorted(set(s))).to_dict()

countries = {}
for _, row in country_agg.iterrows():
    geo = row["geo_country"]
    countries[geo] = {
        "player_count": int(row["player_count"]),
        "total_transfer_spend": round(float(row["total_transfer_spend"]), 0),
        "avg_peak_market_value": round(float(row["avg_peak_market_value"]), 0) if pd.notna(row["avg_peak_market_value"]) else None,
        "avg_fifa_overall": round(float(row["avg_fifa_overall"]), 1) if pd.notna(row["avg_fifa_overall"]) else None,
        "nationalities": nationalities_by_geo.get(geo, []),
    }

print(f"Countries mapped: {len(countries)}")
print(f"Total players placed: {sum(c['player_count'] for c in countries.values())} of {len(players)}")

top10 = sorted(countries.items(), key=lambda kv: -kv[1]["player_count"])[:10]
for name, c in top10:
    print(name, c["player_count"], round(c["total_transfer_spend"] / 1e6, 1), "M")

with open(f"{OUT}/nationality_stats.json", "w", encoding="utf-8") as f:
    json.dump({"countries": countries}, f)

print("Slimming world geojson...")
world = json.load(open(f"{FDA}/world.geojson", encoding="utf-8"))
slim_features = []
for feat in world["features"]:
    props = feat["properties"]
    slim_features.append({
        "type": "Feature",
        "properties": {"ADMIN": props.get("ADMIN"), "ISO_A3": props.get("ISO_A3")},
        "geometry": feat["geometry"],
    })
slim = {"type": "FeatureCollection", "features": slim_features}
with open(f"{OUT}/world-countries.geojson", "w", encoding="utf-8") as f:
    json.dump(slim, f)
print("done")
