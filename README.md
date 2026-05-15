# Gong Second Hand Dashboard

Small dashboard for Gong second-hand items, deployed to GitHub Pages.

## What this project does

- Fetches product data from Gong second-hand collection JSON feeds.
- Filters items by your interests (keywords, exclusions, max price).
- Builds a static dashboard that shows matching and new items.
- Deploys manually via GitHub Actions (`workflow_dispatch`).

## Project structure

- `scripts/fetch_secondhand.py`: Python scraper and matcher.
- `scripts/detect_new_items.py`: helper script that exports `new_items` and `has_new` for workflow steps.
- `config/preferences.json`: your collections and interests.
- `web/`: React + TypeScript dashboard (Vite).
- `.github/workflows/manual-pages.yml`: manual GitHub Pages deployment.
- `.github/workflows/email-test.yml`: manual SMTP test email workflow.

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

## Notifications for new items

The workflow can send an email notification via SMTP when new items are found (`new_items > 0`).

In GitHub repository settings, add these Actions secrets:

- `SMTP_SERVER`
- `SMTP_PORT`
- `SMTP_USERNAME`
- `SMTP_PASSWORD`
- `EMAIL_FROM`
- `EMAIL_TO` (one or multiple recipients, separated by commas)

Common setup example (Gmail):

- `SMTP_SERVER`: `smtp.gmail.com`
- `SMTP_PORT`: `587`
- `SMTP_USERNAME`: your Gmail address
- `SMTP_PASSWORD`: app password (not your normal login password)
- `EMAIL_TO`: `name1@example.com, name2@example.com`

If no new items are found, no notification is sent.

## Test email job

You can manually trigger an SMTP test without waiting for new items:

1. Open the workflow `SMTP Email Test`.
2. Click `Run workflow`.

## Customize your interests

Edit `config/preferences.json`.

- Add more `collections` entries.
- Adjust `include_keywords`, `exclude_keywords`, and `max_price_eur`.
