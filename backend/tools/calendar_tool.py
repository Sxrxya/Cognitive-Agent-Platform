"""
Cognitive Agent Platform — Google Calendar Tool
Real Calendar API integration. List, create, and search events.
"""

import os
import structlog
from datetime import datetime, timedelta
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

logger = structlog.get_logger(__name__)

SCOPES = [
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/calendar.events",
]

TOKEN_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "token_calendar.json")
CREDENTIALS_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "credentials.json")


def _get_calendar_service():
    """Authenticate and return Calendar API service."""
    creds = None

    if os.path.exists(TOKEN_PATH):
        creds = Credentials.from_authorized_user_file(TOKEN_PATH, SCOPES)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not os.path.exists(CREDENTIALS_PATH):
                raise FileNotFoundError(
                    f"credentials.json not found at {CREDENTIALS_PATH}."
                )
            flow = InstalledAppFlow.from_client_secrets_file(CREDENTIALS_PATH, SCOPES)
            creds = flow.run_local_server(port=8091, open_browser=True)

        with open(TOKEN_PATH, "w") as f:
            f.write(creds.to_json())

    return build("calendar", "v3", credentials=creds)


def list_events(days_ahead: int = 7, max_results: int = 10) -> str:
    """List upcoming calendar events."""
    try:
        service = _get_calendar_service()

        now = datetime.utcnow()
        time_min = now.isoformat() + "Z"
        time_max = (now + timedelta(days=days_ahead)).isoformat() + "Z"

        results = service.events().list(
            calendarId="primary",
            timeMin=time_min,
            timeMax=time_max,
            maxResults=max_results,
            singleEvents=True,
            orderBy="startTime",
        ).execute()

        events = results.get("items", [])
        if not events:
            return f"No events in the next {days_ahead} days."

        output = []
        for event in events:
            start = event["start"].get("dateTime", event["start"].get("date"))
            end = event["end"].get("dateTime", event["end"].get("date"))
            summary = event.get("summary", "Untitled")
            location = event.get("location", "")

            entry = f"📅 **{summary}**\n   Start: {start}\n   End: {end}"
            if location:
                entry += f"\n   Location: {location}"
            output.append(entry)

        logger.info("Calendar events listed", count=len(output), days=days_ahead)
        return f"Upcoming events ({len(output)}):\n\n" + "\n\n".join(output)

    except Exception as e:
        logger.error("Failed to list events", error=str(e))
        return f"❌ Failed to list events: {str(e)}"


def create_event(
    title: str,
    start_time: str,
    end_time: str,
    description: str = "",
    location: str = "",
) -> str:
    """Create a calendar event.

    Args:
        title: Event title
        start_time: ISO format datetime (e.g. '2026-03-10T10:00:00')
        end_time: ISO format datetime
        description: Optional description
        location: Optional location
    """
    try:
        service = _get_calendar_service()

        event_body = {
            "summary": title,
            "description": description,
            "location": location,
            "start": {"dateTime": start_time, "timeZone": "Asia/Kolkata"},
            "end": {"dateTime": end_time, "timeZone": "Asia/Kolkata"},
        }

        event = service.events().insert(calendarId="primary", body=event_body).execute()

        logger.info("Calendar event created", title=title, id=event.get("id"))
        return (
            f"✅ Event created: {title}\n"
            f"   Start: {start_time}\n"
            f"   End: {end_time}\n"
            f"   Link: {event.get('htmlLink', 'N/A')}"
        )

    except Exception as e:
        logger.error("Failed to create event", error=str(e))
        return f"❌ Failed to create event: {str(e)}"


def search_events(query: str, max_results: int = 10) -> str:
    """Search calendar events by keyword."""
    try:
        service = _get_calendar_service()

        results = service.events().list(
            calendarId="primary",
            q=query,
            maxResults=max_results,
            singleEvents=True,
            orderBy="startTime",
            timeMin=datetime.utcnow().isoformat() + "Z",
        ).execute()

        events = results.get("items", [])
        if not events:
            return f"No events found matching: {query}"

        output = []
        for event in events:
            start = event["start"].get("dateTime", event["start"].get("date"))
            output.append(f"📅 **{event.get('summary', 'Untitled')}** — {start}")

        return f"Found {len(output)} events:\n\n" + "\n".join(output)

    except Exception as e:
        logger.error("Failed to search events", error=str(e))
        return f"❌ Failed to search events: {str(e)}"
