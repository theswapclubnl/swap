"""
The Swap Club — Flask app.
Contact form sends email via smtplib + Gmail SMTP.
Google Analytics (GA4) is loaded only after the visitor accepts cookies.
"""
import os
import re
import smtplib
import ssl
from email.message import EmailMessage
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, flash, redirect, render_template, request, url_for

# Load variables from .env locally. On Vercel they come from the project settings.
load_dotenv()

# On Vercel, static files must live in public/ (served by the CDN at /static/...).
# Pointing Flask at the same folder keeps local development identical.
app = Flask(__name__, static_folder="public/static", static_url_path="/static")
app.secret_key = os.environ.get("SECRET_KEY", "dev-only-change-me")

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

TOPICS = {
    "general": "General question",
    "collaboration": "Collaboration idea",
    "business": "Business inquiry",
    "feedback": "Site feedback",
}


@app.context_processor
def inject_analytics():
    """Makes GA_MEASUREMENT_ID available in every template (empty = Analytics off)."""
    return {"ga_measurement_id": os.environ.get("GA_MEASUREMENT_ID", "").strip()}


# ───────────────────────── Page routes ─────────────────────────

@app.route("/")
def home():
    return render_template("index.html")


@app.route("/events")
def events():
    return redirect("/#events")


@app.route("/how")
def how():
    return render_template("how.html")


@app.route("/membership")
def membership():
    return render_template("membership.html")


@app.route("/business")
def business():
    logo_folder = Path(app.static_folder) / "images" / "logos"
    logo_names = {
        "logo_1": "Zoku",
        "logo_2": "Minor Hotels",
        "logo_3": "Hotel Jakarta Amsterdam by Westcord",
        "logo_4": "The Hoxton",
        "logo_5": "AMS Institute",
        "logo_6": "Gemeente Amsterdam",
        "logo_7": "Droppie",
        "logo_8": "DB55",
        "logo_9": "Vrije Universiteit Amsterdam",
        "logo_10": "STACH",
        "logo_11": "Universiteit van Amsterdam",
        "logo_12": "Equals",
        "logo_13": "NEMO Science Museum",
    }
    partnership_logos = []
    if logo_folder.is_dir():
        def logo_order(path):
            return [int(part) if part.isdigit() else part for part in re.split(r"(\d+)", path.name.casefold())]

        for logo in sorted(logo_folder.iterdir(), key=logo_order):
            if logo.is_file() and logo.suffix.lower() in {".svg", ".png", ".jpg", ".jpeg", ".webp", ".avif"}:
                transparent_logo = logo_folder / "transparent" / f"{logo.stem}.png"
                partnership_logos.append({
                    "path": (f"images/logos/transparent/{logo.stem}.png"
                             if transparent_logo.is_file() else f"images/logos/{logo.name}"),
                    "name": logo_names.get(logo.stem, logo.stem.replace("_", " ").replace("-", " ")),
                })
    return render_template("business.html", partnership_logos=partnership_logos)


@app.route("/contact", methods=["GET", "POST"])
def contact():
    form_data = {
        "name": request.form.get("name", "").strip(),
        "email": request.form.get("email", "").strip(),
        "topic": request.form.get("topic", "general"),
        "message": request.form.get("message", "").strip(),
    }

    if request.method == "POST":
        # Honeypot: real visitors never see or fill this field, bots do.
        if request.form.get("website"):
            return redirect(url_for("contact", sent=1))

        # Server-side validation (the JS checks are only for convenience).
        if len(form_data["name"]) < 2 or len(form_data["name"]) > 100:
            flash("Please enter your name.", "error")
        elif not EMAIL_RE.match(form_data["email"]) or len(form_data["email"]) > 200:
            flash("Please enter a valid email address.", "error")
        elif form_data["topic"] not in TOPICS:
            flash("Please choose a topic.", "error")
        elif not 10 <= len(form_data["message"]) <= 2000:
            flash("Your message should be between 10 and 2000 characters.", "error")
        else:
            if send_contact_email(form_data):
                flash("Thanks! Your message has been sent. We'll get back to you soon.", "success")
                return redirect(url_for("contact", sent=1))  # redirect = no double-send on refresh
            flash("Sorry, something went wrong sending your message. "
                  "Please try again or email us directly.", "error")

    return render_template("contact.html", form_data=form_data)


def send_contact_email(data):
    """Send the form to your own Gmail inbox. Returns True on success."""
    username = (os.environ.get("GMAIL_USERNAME") or "").strip()
    password = "".join((os.environ.get("GMAIL_APP_PASSWORD") or "").split())
    to_address = (os.environ.get("CONTACT_TO_EMAIL") or "").strip() or username

    if not (username and password):
        app.logger.error(
            "Contact email is not configured: set GMAIL_USERNAME and "
            "GMAIL_APP_PASSWORD in the hosting environment, then redeploy."
        )
        return False

    msg = EmailMessage()
    msg["Subject"] = f"[{TOPICS[data['topic']]}] Contact form: {data['name']}"
    msg["From"] = username
    msg["To"] = to_address
    msg["Reply-To"] = data["email"]  # hitting "Reply" in Gmail answers the visitor
    msg.set_content(
        f"Name: {data['name']}\n"
        f"Email: {data['email']}\n"
        f"Topic: {TOPICS[data['topic']]}\n\n"
        f"{data['message']}"
    )

    try:
        with smtplib.SMTP("smtp.gmail.com", 587, timeout=15) as server:
            server.starttls(context=ssl.create_default_context())
            server.login(username, password)
            server.send_message(msg)
        return True
    except smtplib.SMTPAuthenticationError as exc:
        app.logger.error(
            "Contact email authentication failed (SMTP %s): check the deployed "
            "GMAIL_USERNAME and GMAIL_APP_PASSWORD.", exc.smtp_code
        )
        return False
    except smtplib.SMTPResponseException as exc:
        app.logger.error("Contact email rejected by Gmail (SMTP %s).", exc.smtp_code)
        return False
    except (OSError, smtplib.SMTPException) as exc:
        app.logger.error("Contact email connection/delivery failed (%s).", type(exc).__name__)
        return False


@app.route("/about")
def about():
    return render_template("about.html")


@app.route("/community")
def community():
    return redirect("/#community")


@app.route("/privacy")
def privacy():
    return render_template("privacy.html")


@app.route("/terms")
def terms():
    return render_template("terms.html")


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "5001"))
    app.run(debug=True, port=port)
