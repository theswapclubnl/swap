# The Swap Club — Website

A Flask website for The Swap Club's Amsterdam swapping community, events,
memberships, and business collaborations. Uses Jinja templates, plain CSS and
JavaScript, and Gmail SMTP for contact emails. No frontend build step or database
is required.

## Running locally

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python app.py
```

Visit <http://127.0.0.1:5001>. On Windows, activate the environment with
`.venv\Scripts\activate` instead. To change the local port on macOS/Linux, run
`PORT=5002 python app.py`.

Pages work without environment configuration. Sending contact emails requires
Gmail credentials; Analytics is disabled unless configured. Running `python
app.py` enables Flask's development server and debug mode.

## Contact form & Google Analytics — environment variables

Create `.env` beside `app.py`; `python-dotenv` loads it automatically. The
included `.env.example` is currently empty. For a new `.env`, start with these
placeholders and replace them with your own values:

```dotenv
SECRET_KEY=replace-with-a-long-random-secret
GMAIL_USERNAME=your-address@gmail.com
GMAIL_APP_PASSWORD=your-google-app-password
CONTACT_TO_EMAIL=
GA_MEASUREMENT_ID=
PORT=5001
```

Never commit `.env`; it is excluded by `.gitignore`. On a host, configure these
values through the hosting environment settings.

| Variable | Purpose |
|---|---|
| `GMAIL_USERNAME` | Gmail or Google Workspace address that sends contact form emails. |
| `GMAIL_APP_PASSWORD` | 16-character Google **App Password** (not your normal password). |
| `CONTACT_TO_EMAIL` | Optional. Deliver to a different inbox than `GMAIL_USERNAME`. |
| `GA_MEASUREMENT_ID` | GA4 Measurement ID (`G-XXXXXXXXXX`). Empty = Analytics and cookie banner are off. |
| `SECRET_KEY` | Signs Flask session cookies used for flash messages. Set a strong private value in production; otherwise the code uses `dev-only-change-me`. |
| `PORT` | Local port when running `python app.py`; defaults to `5001`. |

Analytics loads after consent, including on later visits with saved consent.
The choice is stored in `localStorage` under `swapclub_cookie_consent`. When
Analytics is configured, **Cookie settings** in the footer reopens the banner.

## Pages and routes

| URL | Template or behavior |
|---|---|
| `/` | `index.html`: homepage, events calendar, swapping steps, membership tiers, and community photos. |
| `/how` | `how.html`: how swapping works. |
| `/membership` | `membership.html`: membership options and calendar. |
| `/business` | `business.html`: business services and collaborations. |
| `/contact` | `contact.html`: contact form, accepting GET and POST. |
| `/about` | `about.html`: the club's story. |
| `/privacy` | `privacy.html`: privacy page. |
| `/terms` | `terms.html`: terms page. |
| `/events` | Redirects to `/#events` on the homepage. |
| `/community` | Redirects to `/#community` on the homepage. |

## Contact form

The backend validates names (2–100 characters), email addresses (up to 200
characters), one of the topics in `TOPICS`, and messages (10–2,000 characters).
Topics cover general questions, collaborations, business inquiries, and site
feedback. A hidden `website` honeypot field filters bots; `contact.js` adds
browser-side validation and a character counter.

Email is sent through `smtp.gmail.com:587` using STARTTLS. The recipient defaults
to `GMAIL_USERNAME`, and `Reply-To` is set to the visitor's address. Successful
submissions redirect back to the contact page to prevent resending on refresh.
Validation and delivery errors appear as flash messages.

### Contact form works locally but fails on the live site

The local `.env` is not uploaded to Vercel. Add `GMAIL_USERNAME`,
`GMAIL_APP_PASSWORD`, `CONTACT_TO_EMAIL`, and `SECRET_KEY` to the project's
**Production** environment variables, using the values from your local `.env`.
Redeploy after adding or changing them; existing deployments keep their previous
environment settings. For a preview URL, configure the **Preview** environment too.

If sending still fails, inspect the deployment's runtime logs for `Contact email`.
The log distinguishes missing configuration, rejected Gmail authentication,
SMTP rejection, and connection failures without printing credentials or messages.

## Hosting

`app.py` exposes the Flask application as `app`. Use that application object
with your host's Flask/WSGI setup for production; running the script directly
starts the development server with debug mode enabled.

The code is arranged for Vercel as well as local development, with assets under
`public/static/` and settings read from environment variables. No `vercel.json`
is included. Templates reference assets with `url_for('static', ...)`, and Flask
serves the same files locally at `/static/`.

## External services and content updates

- **Luma:** event and membership buttons link to `https://luma.com/theswapclub`.
  The shared calendar embed is in `templates/luma_calendar.html`; the homepage
  also contains a separate event link. Bookings and membership signup use
  external links.
- **Newsletter:** signup buttons open a hosted Piggy form. Links appear in
  several templates, including the shared footer and social section.
- **Fonts and animations:** `base.html` loads Google Fonts and AOS from external
  services. Local font files are also included under `public/static/fonts/`.

Edit page content in its template, shared styles in `base.css`, and page styles
in the corresponding CSS file. External service and social URLs are written
directly in the templates; search `templates/` when updating them so all
occurrences stay consistent.

## Project structure

```
app.py                    Flask routes, environment loading, and email backend
requirements.txt          Flask and python-dotenv dependencies
.env                      Local configuration (not committed)
.env.example              Empty configuration placeholder
templates/
  base.html               Shared navigation, footer, flash messages, cookie banner
  index.html              Homepage, including events and community sections
  how.html
  membership.html
  business.html
  contact.html
  about.html
  privacy.html
  terms.html
  luma_calendar.html      Shared calendar embed
  social_section.html     Shared newsletter and social links
public/static/            Served at /static/...
  css/base.css            Shared styles and components
  css/index.css           Homepage styles
  css/how.css
  css/membership.css
  css/business.css
  css/contact.css
  css/about.css
  css/legal.css           Privacy and terms styles
  js/base.js              Navigation, animations, and shared interactions
  js/contact.js           Contact form behavior
  js/analytics.js         GA4 consent and loading
  fonts/                  Local fonts and bundled license file
  images/                 Photos, videos, logos, and brand assets
```

### Business partnership logos

Add logo images to `public/static/images/logos/`. The Business page loads
them automatically in numbered filename order. Supported formats: SVG, PNG, JPG, JPEG,
WebP, and AVIF. Use the partner name as the filename (for example,
`Partner-Name.svg`); it also supplies the accessible image description.
The logo slider is shown once files are added.

White-background-removed versions live in `public/static/images/logos/transparent/`, using
the original filename stem and a `.png` extension. The Business page prefers
these versions while preserving the original uploads. Its logo slider loops
automatically, pauses on hover or keyboard focus, and has a pause button.
With reduced motion enabled, logos stay still and can be scrolled horizontally.
