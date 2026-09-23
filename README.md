# When Do Premier League Players Peak?

A two-page static site analyzing when Premier League players peak by age and
position, built from Transfermarkt, FBref, and FIFA/EA Sports FC data.

- `index.html` &mdash; scrollable report with eight data-backed findings
- `dashboard.html` &mdash; interactive explorer over 149,637 player-match rows
- `data/` &mdash; derived CSV/JSON files the pages load in the browser
- `scripts/` &mdash; the Python pipeline (`build_data.py`, `analysis.py`) that produced `data/` from the raw source exports

## Data sources

- Transfermarkt (via Kaggle): match appearances, player bios, market valuations
- FBref (via Kaggle): pass completion, take-ons, aerial duels, tackles, GK save/clean-sheet rates
- SoFIFA / EA Sports FC ratings (via Kaggle): overall, potential, pace

See the "About this data" section on the report page for row definitions, exclusions, and how every rate is computed.

## Running locally

```
python -m http.server 8000
```

then open `http://localhost:8000/index.html`.
