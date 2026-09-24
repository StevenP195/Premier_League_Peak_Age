import json
import pandas as pd

OUT = r"C:\Users\Steven Prusak\prem-peak-age\data"

CLUB_CRESTS = {
    "AFC Bournemouth": "afc-bournemouth", "Arsenal FC": "arsenal-fc", "Aston Villa": "aston-villa",
    "Brentford FC": "brentford-fc", "Brighton & Hove Albion": "brighton", "Burnley FC": "burnley-fc",
    "Cardiff City": "cardiff-city", "Chelsea FC": "chelsea-fc", "Crystal Palace": "crystal-palace",
    "Everton FC": "everton-fc", "Fulham FC": "fulham-fc", "Huddersfield Town": "huddersfield-town",
    "Hull City": "hull-city", "Ipswich Town": "ipswich-town", "Leeds United": "leeds-united",
    "Leicester City": "leicester-city", "Liverpool FC": "liverpool-fc", "Luton Town": "luton-town",
    "Manchester City": "manchester-city", "Manchester United": "manchester-united",
    "Middlesbrough FC": "middlesbrough-fc", "Newcastle United": "newcastle-united",
    "Norwich City": "norwich-city", "Nottingham Forest": "nottingham-forest",
    "Queens Park Rangers": "queens-park-rangers", "Reading FC": "reading-fc",
    "Sheffield United": "sheffield-united", "Southampton FC": "southampton-fc", "Stoke City": "stoke-city",
    "Sunderland AFC": "sunderland-afc", "Swansea City": "swansea-city", "Tottenham Hotspur": "tottenham-hotspur",
    "Watford FC": "watford-fc", "West Bromwich Albion": "west-bromwich-albion", "West Ham United": "west-ham-united",
    "Wigan Athletic": "wigan-athletic", "Wolverhampton Wanderers": "wolverhampton-wanderers",
}

pm = pd.read_csv(f"{OUT}/player_match.csv", usecols=["club_name"])
counts = pm["club_name"].value_counts()

weights = {}
mn, mx = counts.min(), counts.max()
for club, n in counts.items():
    slug = CLUB_CRESTS.get(club)
    if not slug:
        continue
    norm = (n - mn) / (mx - mn)
    weights[club] = {"slug": slug, "appearances": int(n), "weight": round(0.55 + norm * 1.35, 3)}

with open(f"{OUT}/club_weights.json", "w", encoding="utf-8") as f:
    json.dump(weights, f)

print(f"Wrote {len(weights)} clubs to club_weights.json")
