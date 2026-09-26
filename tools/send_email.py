TOOL_NAME = "send_email"
TOOL_DESCRIPTION = "Sends a plain-text email through Gmail REST API using the authenticated user's Google session with MANDATORY interactive confirmation. Args format: to|subject|body"

import os
import sys

def _get_active_user_and_token():
    """
    Resolves Gmail credentials via:
    1. Local token.json / credentials.json OAuth flow (standard Google API pattern).
    2. Local ERIS user DB if OAuth token was recorded.
    """
    # 1. Standard token.json check (matches Google OAuth InstalledAppFlow)
    token_path = os.path.join(os.getcwd(), "token.json")
    creds_path = os.path.join(os.getcwd(), "credentials.json")

    try:
        from google.auth.transport.requests import Request
        from google.oauth2.credentials import Credentials

        SCOPES = ["https://www.googleapis.com/auth/gmail.send", "https://www.googleapis.com/auth/gmail.modify"]
        creds = None

        if os.path.exists(token_path):
            try:
                creds = Credentials.from_authorized_user_file(token_path, SCOPES)
            except Exception:
                creds = None

        if creds and creds.valid:
            return "me", creds.token, None

        if creds and creds.expired and creds.refresh_token:
            try:
                creds.refresh(Request())
                with open(token_path, "w") as tf:
                    tf.write(creds.to_json())
                return "me", creds.token, None
            except Exception:
                pass

        if os.path.exists(creds_path):
            try:
                from google_auth_oauthlib.flow import InstalledAppFlow
                flow = InstalledAppFlow.from_client_secrets_file(creds_path, SCOPES)
                creds = flow.run_local_server(port=0)
                with open(token_path, "w") as tf:
                    tf.write(creds.to_json())
                return "me", creds.token, None
            except Exception as oauth_err:
                return None, None, f"Google OAuth flow failed: {oauth_err}"
    except ImportError:
        pass

    # 2. Database Session Fallback
    import asyncio
    try:
        from backend.app.database import db_manager
        from backend.app.models import User
        from backend.app.services.email_service import get_valid_google_access_token
        from sqlalchemy import select

        client_id = os.environ.get("GOOGLE_CLIENT_ID", "")

        async def _fetch():
            if not db_manager.session_maker:
                await db_manager.initialize()

            async with db_manager.session_maker() as session:
                stmt = select(User).where(User.oauth_provider == "google").order_by(User.created_at.desc())
                res = await session.execute(stmt)
                user = res.scalars().first()

                if not user:
                    stmt_any = select(User).order_by(User.created_at.asc())
                    res_any = await session.execute(stmt_any)
                    user = res_any.scalars().first()

                if not user:
                    return None, None, "No active user found in the database. Please provide credentials.json or sign in with Google."

                if not user.oauth_refresh_token and not user.oauth_access_token:
                    return None, None, (
                        "No Gmail OAuth token found.\n"
                        "To use Gmail, place your `credentials.json` (from Google Cloud Console) into the workspace, "
                        "or sign in with Google in Settings."
                    )

                token = await get_valid_google_access_token(session, user, client_id)
                if not token:
                    return None, None, "Failed to obtain valid Google access token. Please re-authenticate."

                return user.email, token, None

        loop = None
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            loop = None

        if loop and loop.is_running():
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as pool:
                return pool.submit(lambda: asyncio.run(_fetch())).result()
        else:
            return asyncio.run(_fetch())
    except Exception as e:
        return None, None, (
            f"Gmail Authentication Notice: No credentials.json or active Google token found ({e}).\n"
            "To send emails: place your Google `credentials.json` file in the project root."
        )


def _send_via_gmail_api(sender_email: str, access_token: str, recipient: str, subject: str, body: str):
    """Dispatches email via Google's official REST API endpoint with video-welcome-02 template."""
    import base64
    import urllib.request
    import json
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart

    try:
        from backend.app.services.email_service import render_video_welcome_02_template
        html_body = render_video_welcome_02_template(
            recipient_email=recipient,
            subject=subject,
            message_body=body,
            recipient_name="",
        )
    except Exception:
        html_body = None

    if html_body:
        message = MIMEMultipart("alternative")
        message["From"] = sender_email
        message["To"] = recipient
        message["Subject"] = subject
        message.attach(MIMEText(body, "plain", "utf-8"))
        message.attach(MIMEText(html_body, "html", "utf-8"))
    else:
        message = MIMEText(body, "plain", "utf-8")
        message["From"] = sender_email
        message["To"] = recipient
        message["Subject"] = subject

    raw_b64 = base64.urlsafe_b64encode(message.as_bytes()).decode("utf-8")

    req = urllib.request.Request(
        "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
        data=json.dumps({"raw": raw_b64}).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        },
        method="POST"
    )

    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            if resp.status in (200, 202):
                return True, ""
            return False, f"Server responded with status {resp.status}"
    except Exception as exc:
        return False, str(exc)


def execute(args: str = "") -> str:
    """Returns the email operation result or confirmation prompt.
    Accepts args in format: to|subject|body or to|subject|body|save_default
    """
    if args == "__test_ping__":
        return "pong"

    parts = [p.strip() for p in args.split("|")] if args else []

    recipient_email = ""
    subject = "Hello from Eris"
    body = "Hi, this is a message sent via Eris assistant."
    save_as_default = False

    if len(parts) >= 3:
        recipient_email = parts[0]
        subject = parts[1]
        body = parts[2]
        extra_flags = [p.lower() for p in parts[3:]]
        if any(f in ("save", "default", "save_default") for f in extra_flags):
            save_as_default = True
    elif len(parts) == 2:
        if "@" in parts[0]:
            recipient_email = parts[0]
            subject = parts[1]
        else:
            return "ERROR: Missing recipient email address. Please specify recipient, subject, and message (format: to|subject|body)."
    elif len(parts) == 1 and parts[0]:
        if "@" in parts[0]:
            recipient_email = parts[0]
        else:
            return "ERROR: Missing recipient email address. Please specify recipient, subject, and message (format: to|subject|body)."
    else:
        return "ERROR: Missing recipient email address. Please specify recipient, subject, and message (format: to|subject|body)."

    if not recipient_email or "@" not in recipient_email:
        return "ERROR: Invalid or missing recipient email address. Please provide a valid email in format: to|subject|body."

    sender_email, access_token, err = _get_active_user_and_token()
    if err:
        return f"AUTH REQUIRED: {err}"

    # Check if explicit confirmation flag was already passed in arguments
    extra_flags = [p.lower() for p in parts[3:]] if len(parts) >= 4 else []
    is_confirmed = any(f in ("confirmed", "approved", "true") for f in extra_flags)

    # --- MANDATORY SAFETY CONFIRMATION CHECK ---
    print("\n" + "="*50)
    print(" [SECURITY ALERT] EMAIL SEND REQUESTED (GMAIL API)")
    print("="*50)
    print(f" From:      {sender_email}")
    print(f" To:        {recipient_email}")
    print(f" Subject:   {subject}")
    print(f" Body:\n{body}")
    print("="*50)

    # Standalone interactive CLI check
    is_standalone_cli = (
        os.environ.get("ERIS_CLI_MODE") == "1"
        or any("eris_cli" in str(arg).lower() for arg in sys.argv)
    ) and not (
        os.environ.get("ERIS_SERVER_MODE") == "1"
        or any(srv in str(arg).lower() for arg in sys.argv for srv in ("run.py", "uvicorn", "gunicorn"))
    )

    if not is_confirmed:
        if is_standalone_cli and sys.stdin and hasattr(sys.stdin, "isatty") and sys.stdin.isatty():
            try:
                confirmation = input("Do you wish to proceed and send this email? (yes/no): ").strip().lower()
                if confirmation in ["y", "yes"]:
                    is_confirmed = True
                else:
                    return "ABORTED: Email sending was cancelled by user confirmation check."
            except Exception:
                return "ABORTED: Confirmation prompt failed."
        else:
            # Server / Web UI mode: halt execution and require frontend confirmation card
            return (
                f"APPROVAL_REQUIRED: Send email to '{recipient_email}' with subject '{subject}'.\n"
                f"From: {sender_email}\n"
                f"To: {recipient_email}\n"
                f"Subject: {subject}\n"
                f"Body:\n{body}"
            )

    success, send_err = _send_via_gmail_api(sender_email, access_token, recipient_email, subject, body)

    if success:
        return f"CONFIRMED & SENT SUCCESSFULLY via Gmail API:\n- Sender: {sender_email}\n- Recipient: {recipient_email}\n- Subject: {subject}\n- Body: {body}"
    else:
        return f"Failed to send email via Gmail API: {send_err}"