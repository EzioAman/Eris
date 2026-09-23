import asyncio
import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional, Tuple, Any
from backend.app.config import settings

logger = logging.getLogger("eris.email")

def _send_smtp_sync(to_email: str, subject: str, html_content: str, text_content: str) -> bool:
    if not settings.SMTP_HOST or not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        logger.warning("SMTP credentials not configured. Email will not be dispatched externally.")
        return False

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"ERIS <{settings.SMTP_USER}>"
    msg["To"] = to_email
    msg["Reply-To"] = "no-reply@eris.ai"
    msg["Auto-Submitted"] = "auto-generated"
    msg["X-Auto-Response-Suppress"] = "All"

    msg.attach(MIMEText(text_content, "plain", "utf-8"))
    msg.attach(MIMEText(html_content, "html", "utf-8"))

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_USER, [to_email], msg.as_string())
        logger.info(f"✅ [NO-REPLY DISPATCH] Verification OTP successfully dispatched to {to_email}")
        return True
    except Exception as e:
        logger.error(f"❌ [NO-REPLY DISPATCH ERROR] Failed to send email to {to_email}: {e}", exc_info=True)
        return False

async def dispatch_verification_email(to_email: str, otp_code: str) -> bool:
    """
    Asynchronously dispatches an automated, clean no-reply OTP verification email
    to whichever email address was provided during sign-up or sign-in.
    """
    subject = "Verify your email address for ERIS"
    
    text_content = (
        f"Hi,\n\n"
        f"Please use the following verification code to complete your verification:\n\n"
        f"    {otp_code}\n\n"
        f"This code will expire in {settings.OTP_EXPIRE_MINUTES} minutes.\n\n"
        f"If you did not request this verification, you can safely disregard this email.\n\n"
        f"---\n"
        f"This is an automated message sent to {to_email}. Please do not reply directly to this email.\n"
        f"© 2026 ERIS Inc. All rights reserved."
    )

    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify your email address</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b0e14; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #f1f5f9;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0b0e14; padding: 40px 15px;">
    <tr>
      <td align="center">
        <!-- Main Card -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 480px; background-color: #121722; border: 1px solid #1e2638; border-radius: 12px; box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4); overflow: hidden;">
          
          <!-- Accent Line -->
          <tr>
            <td height="3" style="background-color: #3b82f6;"></td>
          </tr>

          <!-- Brand Header -->
          <tr>
            <td style="padding: 32px 36px 16px 36px;">
              <div style="font-size: 20px; font-weight: 700; letter-spacing: 2px; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                ERIS
              </div>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 0 36px 32px 36px;">
              <h1 style="margin: 0 0 14px 0; font-size: 19px; font-weight: 600; color: #ffffff; letter-spacing: -0.01em;">
                Verify your email address
              </h1>
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #94a3b8;">
                Please enter the following single-use code to complete your verification:
              </p>

              <!-- Clean Code Container -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 20px 0;">
                <tr>
                  <td align="center" style="background-color: #0d121c; border: 1px solid #2563eb; border-radius: 8px; padding: 18px 0;">
                    <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #60a5fa; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;">
                      {otp_code}
                    </span>
                  </td>
                </tr>
              </table>

              <p style="margin: 20px 0 0 0; font-size: 13px; line-height: 1.5; color: #64748b;">
                This code will expire in <strong style="color: #cbd5e1;">{settings.OTP_EXPIRE_MINUTES} minutes</strong>. If you did not make this request, you can safely disregard this email.
              </p>
            </td>
          </tr>

          <!-- Footer / No-reply Notice -->
          <tr>
            <td style="padding: 22px 36px; background-color: #0d121c; border-top: 1px solid #1e2638;">
              <p style="margin: 0 0 6px 0; font-size: 12px; line-height: 1.5; color: #475569;">
                This is an automated message sent to <strong style="color: #64748b;">{to_email}</strong>. Please do not reply directly to this email.
              </p>
              <p style="margin: 0; font-size: 11px; color: #334155;">
                &copy; 2026 ERIS Inc. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""

    return await asyncio.to_thread(_send_smtp_sync, to_email, subject, html_content, text_content)


async def dispatch_contact_email(
    first_name: str,
    last_name: str,
    sender_email: str,
    topic: str,
    message: str
) -> bool:
    """
    Bilateral contact message dispatch:
    1. Sends the user's message to the configured creator or support inbox.
    2. Sends an automated receipt/confirmation email to the sender.
    3. Persists the contact record in memory/contact_messages.json.
    """
    import json
    from datetime import datetime, timezone

    creator_email = getattr(settings, "CREATOR_EMAIL", "") or "sinhadeep2409@gmail.com"
    support_email = getattr(settings, "SUPPORT_EMAIL", "") or "eris.ai.official@gmail.com"
    full_name = f"{first_name.strip()} {last_name.strip()}".strip() or "Anonymous User"

    # 1. Persist to memory/contact_messages.json
    try:
        contact_file = settings.MEMORY_DIR / "contact_messages.json"
        settings.MEMORY_DIR.mkdir(parents=True, exist_ok=True)
        entries = []
        if contact_file.exists():
            try:
                with open(contact_file, "r", encoding="utf-8") as f:
                    entries = json.load(f)
            except Exception:
                entries = []
        
        entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "name": full_name,
            "email": sender_email,
            "topic": topic,
            "message": message,
        }
        entries.append(entry)
        with open(contact_file, "w", encoding="utf-8") as f:
            json.dump(entries, f, indent=4)
    except Exception as ex:
        logger.error(f"Failed to save contact message to JSON log: {ex}")

    # 2. Email 1: Dispatch message to Aman Sinha
    admin_subject = f"[ERIS Contact] {topic} from {full_name}"
    admin_text = (
        f"New Contact Dispatch from ERIS Workspace:\n\n"
        f"Sender: {full_name} <{sender_email}>\n"
        f"Topic: {topic}\n"
        f"Time: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}\n\n"
        f"Message:\n{message}\n\n"
        f"---\n"
        f"Dispatched by ERIS Local Companion"
    )
    admin_html = f"""<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0c0f17; color: #f1f5f9; padding: 24px;">
  <div style="max-width: 600px; margin: 0 auto; background: #131926; border: 1px solid #1f293d; border-radius: 16px; padding: 24px;">
    <h2 style="color: #38bdf8; margin-top: 0;">New ERIS Contact Message</h2>
    <p><strong>From:</strong> {full_name} (<a href="mailto:{sender_email}" style="color: #818cf8;">{sender_email}</a>)</p>
    <p><strong>Topic:</strong> {topic}</p>
    <div style="background: #090d14; border-left: 3px solid #38bdf8; padding: 16px; border-radius: 8px; margin: 16px 0; white-space: pre-wrap; color: #e2e8f0;">
{message}
    </div>
    <p style="font-size: 11px; color: #64748b; margin-top: 24px;">Dispatched via ERIS SMTP Gateway</p>
  </div>
</body>
</html>"""

    # 3. Email 2: Send confirmation receipt to the user
    user_subject = f"We received your message — ERIS & Aman Sinha"
    user_text = (
        f"Hi {first_name or 'there'},\n\n"
        f"Thank you for contacting Aman Sinha via ERIS.\n"
        f"Your message regarding '{topic}' has been received.\n\n"
        f"Summary of your note:\n"
        f"\"{message}\"\n\n"
        f"Aman will review your dispatch and get back to you as soon as possible.\n\n"
        f"Best regards,\n"
        f"Aman Sinha & The ERIS Companion"
    )
    user_html = f"""<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0c0f17; color: #f1f5f9; padding: 24px;">
  <div style="max-width: 600px; margin: 0 auto; background: #131926; border: 1px solid #1f293d; border-radius: 16px; padding: 24px;">
    <h2 style="color: #38bdf8; margin-top: 0;">Message Received</h2>
    <p>Hi {first_name or 'there'},</p>
    <p>Thank you for getting in touch! We have received your note regarding <strong>{topic}</strong>.</p>
    <div style="background: #090d14; border-left: 3px solid #6366f1; padding: 16px; border-radius: 8px; margin: 16px 0; color: #cbd5e1; font-style: italic;">
"{message}"
    </div>
    <p>Aman Sinha will review your note and respond to you at this email address shortly.</p>
    <p style="margin-top: 24px; color: #94a3b8;">Warm regards,<br><strong>Aman Sinha</strong><br><span style="font-size: 12px; color: #64748b;">Creator of ERIS</span></p>
  </div>
</body>
</html>"""

    task_admin = asyncio.to_thread(_send_smtp_sync, creator_email, admin_subject, admin_html, admin_text)
    task_user = asyncio.to_thread(_send_smtp_sync, sender_email, user_subject, user_html, user_text)
    res_admin, res_user = await asyncio.gather(task_admin, task_user, return_exceptions=True)

    logger.info(f"Contact dispatch complete. Admin sent: {res_admin}, User sent: {res_user}")
    return bool(res_admin is True or res_user is True)


async def get_valid_google_access_token(db: Any, user: Any, client_id: str) -> Optional[str]:
    """
    Ensures the user has an active, valid Google access token.
    If the access token has expired or is expiring in less than 2 minutes,
    it refreshes it silently using the user's stored refresh token.
    """
    import httpx
    from datetime import timedelta
    from backend.app.models import utc_now

    now = utc_now()
    if user.oauth_access_token and user.oauth_token_expires_at:
        if user.oauth_token_expires_at > (now + timedelta(minutes=2)):
            return user.oauth_access_token

    if not user.oauth_refresh_token:
        logger.warning(f"No refresh_token found for {user.email}. User needs to re-authenticate with Google.")
        return None

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "client_id": client_id,
                    "grant_type": "refresh_token",
                    "refresh_token": user.oauth_refresh_token,
                }
            )

            if resp.status_code == 200:
                payload = resp.json()
                new_access_token = payload["access_token"]
                expires_in = payload.get("expires_in", 3600)

                user.oauth_access_token = new_access_token
                user.oauth_token_expires_at = now + timedelta(seconds=expires_in)
                await db.commit()
                return new_access_token
            else:
                logger.error(f"Failed to refresh Google token for {user.email}: {resp.text}")
                return None
    except Exception as ex:
        logger.error(f"Exception while refreshing Google OAuth token: {ex}", exc_info=True)
        return None


async def dispatch_agent_email(
    db: Any,
    user: Any,
    to_email: str,
    subject: str,
    body: str,
    google_client_id: str
) -> Tuple[bool, str]:
    """
    Callable by the Eris agent to send an email to anyone on the user's behalf
    using their connected Google account via the Gmail REST API (zero SMTP needed).
    """
    import base64
    import httpx
    from email.mime.text import MIMEText

    token = await get_valid_google_access_token(db, user, google_client_id)
    if not token:
        return False, "Google account is not connected with email sending permissions or token refresh failed."

    try:
        message = MIMEText(body, "plain", "utf-8")
        message["to"] = to_email
        message["from"] = user.email
        message["subject"] = subject

        raw_b64 = base64.urlsafe_b64encode(message.as_bytes()).decode("utf-8")

        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.post(
                "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json"
                },
                json={"raw": raw_b64}
            )

            if response.status_code == 200:
                logger.info(f"✅ [GMAIL API] Agent successfully sent email from {user.email} to {to_email}")
                return True, f"Email successfully sent to {to_email}."
            else:
                err_msg = response.text
                logger.error(f"❌ [GMAIL API ERROR] Failed to send email: {err_msg}")
                return False, f"Failed to send email via Gmail API: {err_msg}"
    except Exception as ex:
        logger.error(f"❌ [AGENT EMAIL EXCEPTION] Failed to dispatch email: {ex}", exc_info=True)
        return False, f"An unexpected error occurred while sending email: {str(ex)}"