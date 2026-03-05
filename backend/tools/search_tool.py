"""
Cognitive Agent Platform — Search Tool (FREE)
Uses DuckDuckGo search — no API key, no cost.
"""

import structlog
from duckduckgo_search import DDGS

logger = structlog.get_logger(__name__)


def web_search(query: str, max_results: int = 5) -> str:
    """Perform a web search using DuckDuckGo (100% free, no API key)."""
    logger.info("Web search (DuckDuckGo)", query=query[:80])

    try:
        with DDGS() as ddgs:
            results = list(ddgs.text(query, max_results=max_results))

        if not results:
            return f"No results found for: {query}"

        # Format results
        formatted = []
        for i, r in enumerate(results, 1):
            formatted.append(
                f"{i}. **{r.get('title', 'No title')}**\n"
                f"   {r.get('body', 'No description')}\n"
                f"   Source: {r.get('href', 'N/A')}"
            )

        output = f"Search results for: {query}\n\n" + "\n\n".join(formatted)
        logger.info("Search complete", query=query[:50], results=len(results))
        return output

    except Exception as e:
        logger.error("Search failed", error=str(e))
        return f"Search failed: {str(e)}"


def web_search_news(query: str, max_results: int = 5) -> str:
    """Search recent news using DuckDuckGo (free)."""
    try:
        with DDGS() as ddgs:
            results = list(ddgs.news(query, max_results=max_results))

        if not results:
            return f"No news found for: {query}"

        formatted = []
        for i, r in enumerate(results, 1):
            formatted.append(
                f"{i}. **{r.get('title', '')}**\n"
                f"   {r.get('body', '')}\n"
                f"   Date: {r.get('date', 'N/A')} | Source: {r.get('source', 'N/A')}"
            )

        return f"News for: {query}\n\n" + "\n\n".join(formatted)

    except Exception as e:
        return f"News search failed: {str(e)}"
