# The Swap Club — Website

A Flask site for The Swap Club.

## Running locally

```bash
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env      # then fill in real values
python app.py
```

Visit http://127.0.0.1:5001

## Contact form & Google Analytics — environment variables

Set these in `.env` locally and under **Vercel -> Project -> Settings -> Environment Variables** in production
(see `.env.example`). Never commit `.env`.

| Variable | Purpose |
|---|---|
| `GMAIL_USERNAME` | Gmail or Google Workspace address that sends contact form emails. |
| `GMAIL_APP_PASSWORD` | 16-character Google **App Password** (not your normal password). |
| `CONTACT_TO_EMAIL` | Optional. Deliver to a different inbox than `GMAIL_USERNAME`. |
| `GA_MEASUREMENT_ID` | GA4 Measurement ID (`G-XXXXXXXXXX`). Empty = Analytics and cookie banner are off. |
| `SECRET_KEY` | Long random string that signs the success/error messages. |

Analytics only loads after a visitor clicks "Accept" in the cookie banner.

## Deploying on Vercel

Vercel detects Flask automatically (`app.py` exposes `app`). Static files live in
`public/static/` because Vercel serves `public/` from its CDN and ignores Flask's own static folder.
Templates still use `url_for('static', ...)` unchanged.

## Luma page

"Ticket" and "Membership" buttons across the site link to
`https://luma.com/theswapclub` (this URL was already present and used
consistently in the original code, so it was kept as-is rather than
replaced with a placeholder). If that isn't the club's real Luma URL,
search-and-replace `https://luma.com/theswapclub` across the `templates/`
folder.

## Project structure

```
app.py                  Flask routes + contact form backend
.env                    local secrets (same folder as app.py, never committed)
.env.example            template listing the required variables

templates/
  base.html              Shared layout: nav, footer, flash messages
  home.html, how.html, membership.html, business.html,
  community.html, events.html, about.html, privacy.html, terms.html
public/static/          (served at /static/...)
  css/base.css            Shared tokens (plum & matcha palette), resets,
                           nav/footer/buttons, and components used on 2+ pages
  css/<page>.css          Page-specific styles only
  js/base.js, contact.js, analytics.js
  images/
```



echo "# swapclub" >> README.md
git init
git add README.md
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/donnagerholt/swapclub.git
git push -u origin main
