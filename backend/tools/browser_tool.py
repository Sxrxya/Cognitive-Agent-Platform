"""
Cognitive Agent Platform — Browser Tool
Web scraping and browsing capabilities using httpx + BeautifulSoup.
"""

import structlog
import httpx
from bs4 import BeautifulSoup

logger = structlog.get_logger(__name__)

DEFAULT_HEADERS = {
    "User-Agent": "CognitiveAgentPlatform/0.1 (Research Bot)",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}


def web_scrape(url_or_instruction: str) -> str:
    """Scrape a webpage and return clean text content."""
    # Extract URL from instruction if needed
    url = _extract_url(url_or_instruction)
    if not url:
        return f"Could not extract a valid URL from: {url_or_instruction}"

    try:
        with httpx.Client(timeout=15, follow_redirects=True, headers=DEFAULT_HEADERS) as client:
            response = client.get(url)
            response.raise_for_status()

        soup = BeautifulSoup(response.text, "html.parser")

        # Remove script and style elements
        for tag in soup(["script", "style", "nav", "footer", "header"]):
            tag.decompose()

        # Extract text
        text = soup.get_text(separator="\n", strip=True)

        # Clean up multiple newlines
        lines = [line.strip() for line in text.splitlines() if line.strip()]
        clean_text = "\n".join(lines)

        # Truncate to prevent memory overflow
        max_chars = 5000
        if len(clean_text) > max_chars:
            clean_text = clean_text[:max_chars] + "\n\n[... truncated]"

        logger.info("Web scrape complete", url=url, chars=len(clean_text))
        return clean_text

    except Exception as e:
        logger.error("Web scrape failed", url=url, error=str(e))
        return f"Failed to scrape {url}: {str(e)}"


def _extract_url(text: str) -> str | None:
    """Extract a URL from text."""
    import re
    match = re.search(r'https?://[^\s<>"{}|\\^`\[\]]+', text)
    return match.group(0) if match else None
