# Gong Second Hand Dashboard

Small dashboard for Gong second-hand items, deployed to GitHub Pages.

## What this project does

- Fetches product data from Gong second-hand collection JSON feeds.
- Filters items by your interests (keywords, exclusions, max price).
- Builds a static dashboard that shows matching and new items.
- Deploys manually via GitHub Actions (`workflow_dispatch`).

## Project structure

- `scripts/fetch_secondhand.py`: Python scraper and matcher.
- `config/preferences.json`: your collections and interests.
- `web/`: React + TypeScript dashboard (Vite).
- `.github/workflows/manual-pages.yml`: manual GitHub Pages deployment.

## Local usage

1. Install Python dependencies:

```bash
pip install -r requirements.txt
```

2. Generate dashboard data:

```bash
python scripts/fetch_secondhand.py \
  --config config/preferences.json \
  --output web/public/data/items.json \
  --history data/history.json
```

3. Run frontend:

```bash
cd web
npm install
npm run dev
```

## Deploy to GitHub Pages

1. Push repository to GitHub.
2. In repository settings, enable Pages with source `GitHub Actions`.
3. Run workflow `Manual Build And Deploy Dashboard` from Actions tab.

## Customize your interests

Edit `config/preferences.json`.

- Add more `collections` entries.
- Adjust `include_keywords`, `exclude_keywords`, and `max_price_eur`.
