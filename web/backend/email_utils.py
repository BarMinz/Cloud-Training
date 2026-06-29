import os
import smtplib
import threading
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

logger = logging.getLogger(__name__)

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM = os.getenv("SMTP_FROM", SMTP_USER)
APP_NAME = "Cloud-Training"
APP_URL = os.getenv("APP_URL", "https://cloud-training.online")


def _send(to: str, subject: str, html: str, text: str) -> None:
    if not SMTP_USER or not SMTP_PASSWORD:
        logger.warning("Email not configured — skipping send to %s", to)
        return
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{APP_NAME} <{SMTP_FROM}>"
        msg["To"] = to
        msg.attach(MIMEText(text, "plain"))
        msg.attach(MIMEText(html, "html"))
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as s:
            s.ehlo()
            s.starttls()
            s.login(SMTP_USER, SMTP_PASSWORD)
            s.sendmail(SMTP_FROM, to, msg.as_string())
        logger.info("Email sent to %s: %s", to, subject)
    except Exception:
        logger.exception("Failed to send email to %s", to)


def send_async(to: str, subject: str, html: str, text: str) -> None:
    threading.Thread(target=_send, args=(to, subject, html, text), daemon=True).start()


def send_grade_notification(to: str, username: str, phase_title: str, grade: str, feedback: str) -> None:
    passed = grade == "passed"
    subject = f"{'✓ Passed' if passed else '✗ Needs Revision'} — {phase_title} | {APP_NAME}"
    color = "#059669" if passed else "#dc2626"
    verdict = "Passed" if passed else "Needs Revision"

    feedback_block_html = f"""
        <div style="margin-top:16px;padding:14px 16px;background:#f8fafc;border-left:3px solid {color};border-radius:4px;">
          <p style="margin:0 0 4px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:#64748b;">Admin Feedback</p>
          <p style="margin:0;font-size:14px;color:#1e293b;white-space:pre-wrap;">{feedback}</p>
        </div>""" if feedback else ""

    feedback_block_text = f"\nAdmin feedback:\n{feedback}\n" if feedback else ""

    cta = (
        f'<a href="{APP_URL}/dashboard" style="display:inline-block;margin-top:20px;padding:10px 20px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">Continue Training</a>'
        if passed else
        f'<a href="{APP_URL}/dashboard" style="display:inline-block;margin-top:20px;padding:10px 20px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">View Feedback &amp; Resubmit</a>'
    )

    html = f"""<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#f1f5f9;font-family:system-ui,sans-serif;">
  <div style="max-width:520px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);">
    <div style="padding:6px 0;background:{color};"></div>
    <div style="padding:32px 36px;">
      <p style="margin:0 0 4px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:#94a3b8;">{APP_NAME}</p>
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;">{phase_title}</h1>
      <p style="margin:0 0 16px;font-size:14px;color:#475569;">Hi {username},</p>
      <div style="display:inline-block;padding:6px 14px;background:{'#f0fdf4' if passed else '#fef2f2'};border:1px solid {color};border-radius:20px;font-size:14px;font-weight:600;color:{color};">
        {'✓ ' if passed else '✗ '}{verdict}
      </div>
      <p style="margin:16px 0 0;font-size:14px;color:#475569;">
        {'Great work — this phase has been marked as passed. You can move on to the next phase.' if passed else 'An admin has reviewed your submission and marked it as needing revision. Please read the feedback below and resubmit when ready.'}
      </p>
      {feedback_block_html}
      {cta}
    </div>
    <div style="padding:16px 36px;border-top:1px solid #f1f5f9;font-size:11px;color:#94a3b8;">
      This is an automated message from {APP_NAME}. Please do not reply.
    </div>
  </div>
</body></html>"""

    text = (
        f"{APP_NAME} — {phase_title}\n\n"
        f"Hi {username},\n\n"
        f"Result: {verdict}\n"
        + (
            "Great work — this phase has been marked as passed. You can move on to the next phase."
            if passed else
            "Your submission needs revision. Please read the feedback and resubmit when ready."
        )
        + feedback_block_text
        + f"\n{APP_URL}/dashboard"
    )

    send_async(to, subject, html, text)
