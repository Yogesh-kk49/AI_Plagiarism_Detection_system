"""
Sends transactional email via Brevo's HTTP API instead of SMTP.

Why: Render's free web services block outbound traffic on SMTP ports
(25, 465, 587), so django.core.mail's SMTP backend silently hangs/fails
there. Brevo's API runs over plain HTTPS (port 443), which is never
blocked, so this keeps email working without upgrading Render.

Setup:
1. Sign up at https://www.brevo.com (free tier: 300 emails/day).
2. Verify a "sender" (your Gmail address or any address you own) under
   Senders & IP in the Brevo dashboard.
3. Create an API key under SMTP & API > API Keys.
4. Add to your .env / Render environment variables:
     BREVO_API_KEY=your-api-key-here
     BREVO_SENDER_EMAIL=the-verified-sender@example.com
     BREVO_SENDER_NAME=AI Plagiarism System   (optional, cosmetic)
"""

import os
import requests

BREVO_API_URL = "https://api.brevo.com/v3/smtp/email"
BREVO_API_KEY = os.getenv("BREVO_API_KEY")
BREVO_SENDER_EMAIL = os.getenv("BREVO_SENDER_EMAIL")
BREVO_SENDER_NAME = os.getenv("BREVO_SENDER_NAME", "AI Plagiarism System")


def send_email_via_brevo(subject, message, to_email, reply_to=None):
    """
    Sends a plain-text email via Brevo's REST API.

    Raises RuntimeError if BREVO_API_KEY / BREVO_SENDER_EMAIL aren't
    configured, or if Brevo's API returns an error — callers should
    catch this the same way they'd catch an SMTP failure.
    """
    if not BREVO_API_KEY or not BREVO_SENDER_EMAIL:
        raise RuntimeError(
            "BREVO_API_KEY and BREVO_SENDER_EMAIL must be set in the "
            "environment to send email. See email_sender.py for setup steps."
        )

    payload = {
        "sender": {"name": BREVO_SENDER_NAME, "email": BREVO_SENDER_EMAIL},
        "to": [{"email": to_email}],
        "subject": subject,
        "textContent": message,
    }
    if reply_to:
        payload["replyTo"] = {"email": reply_to}

    response = requests.post(
        BREVO_API_URL,
        json=payload,
        headers={
            "api-key": BREVO_API_KEY,
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
        timeout=15,
    )

    if response.status_code >= 300:
        raise RuntimeError(
            f"Brevo API error {response.status_code}: {response.text}"
        )

    return response.json()