"""
Cognitive Agent Platform — Gmail Tool
Real Gmail API integration using OAuth2. Send, read, and search emails.
"""

import os
import base64
import structlog
from email.mime.text import MIMEText
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

logger = structlog.get_logger(__name__)

SCOPES = [
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.modify",
]

TOKEN_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "token.json")
CREDENTIALS_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "credentials.json")


def _get_gmail_service():
    """Authenticate and return Gmail API service."""
    creds = None

    if os.path.exists(TOKEN_PATH):
        creds = Credentials.from_authorized_user_file(TOKEN_PATH, SCOPES)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not os.path.exists(CREDENTIALS_PATH):
                raise FileNotFoundError(
                    f"credentials.json not found at {CREDENTIALS_PATH}. "
                    "Download it from Google Cloud Console."
                )
            flow = InstalledAppFlow.from_client_secrets_file(CREDENTIALS_PATH, SCOPES)
            creds = flow.run_local_server(port=8090, open_browser=True)

        with open(TOKEN_PATH, "w") as f:
            f.write(creds.to_json())

    return build("gmail", "v1", credentials=creds)


def send_email(to: str, subject: str, body: str) -> str:
    """Send an email via Gmail API."""
    try:
        service = _get_gmail_service()

        message = MIMEText(body)
        message["to"] = to
        message["subject"] = subject
        raw = base64.urlsafe_b64encode(message.as_bytes()).decode()

        result = service.users().messages().send(
            userId="me", body={"raw": raw}
        ).execute()

        msg_id = result.get("id", "unknown")
        logger.info("Email sent", to=to, subject=subject, id=msg_id)
        return f"✅ Email sent to {to} (subject: {subject}, id: {msg_id})"

    except Exception as e:
        logger.error("Failed to send email", error=str(e))
        return f"❌ Failed to send email: {str(e)}"


def read_emails(query: str = "is:unread", max_results: int = 5) -> str:
    """Read emails matching a query."""
    try:
        service = _get_gmail_service()

        results = service.users().messages().list(
            userId="me", q=query, maxResults=max_results
        ).execute()

        messages = results.get("messages", [])
        if not messages:
            return f"No emails found for query: {query}"

        output = []
        for msg_ref in messages:
            msg = service.users().messages().get(
                userId="me", id=msg_ref["id"], format="metadata",
                metadataHeaders=["Subject", "From", "Date"]
            ).execute()

            headers = {h["name"]: h["value"] for h in msg.get("payload", {}).get("headers", [])}
            snippet = msg.get("snippet", "")

            output.append(
                f"📧 **{headers.get('Subject', 'No Subject')}**\n"
                f"   From: {headers.get('From', 'Unknown')}\n"
                f"   Date: {headers.get('Date', 'Unknown')}\n"
                f"   {snippet[:200]}"
            )

        logger.info("Emails read", query=query, count=len(output))
        return f"Found {len(output)} emails:\n\n" + "\n\n".join(output)

    except Exception as e:
        logger.error("Failed to read emails", error=str(e))
        return f"❌ Failed to read emails: {str(e)}"


def search_emails(query: str, max_results: int = 10) -> str:
    """Search emails by query string (Gmail search syntax)."""
    return read_emails(query=query, max_results=max_results)
