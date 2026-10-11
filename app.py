"""
The Swap Club — Flask app.
Contact form sends email via smtplib + Gmail SMTP.
Google Analytics (GA4) is loaded only after the visitor accepts cookies.
"""
import os
import re
import smtplib
from email.message import EmailMessage

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
    return render_template("business.html")


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
    username = os.environ.get("GMAIL_USERNAME")
    password = (os.environ.get("GMAIL_APP_PASSWORD") or "").replace(" ", "")
    to_address = os.environ.get("CONTACT_TO_EMAIL") or username

    if not (username and password):
        print("Email not configured: set GMAIL_USERNAME and GMAIL_APP_PASSWORD.")
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
            server.starttls()
            server.login(username, password)
            server.send_message(msg)
        return True
    except Exception as e:
        print(f"Email error: {e}")
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
