"""
Cognitive Agent Platform — Safety & Governance Module
Validates agent actions before execution.
"""

import structlog

logger = structlog.get_logger(__name__)

# Actions that require human approval
HIGH_RISK_ACTIONS = [
    "delete",
    "remove",
    "send email",
    "publish",
    "deploy",
    "payment",
    "transfer",
    "modify database",
    "drop table",
]

# Content filters
BLOCKED_CONTENT = [
    "password",
    "credit card",
    "social security",
    "private key",
]


class SafetyGuard:
    """Validates agent actions and content for safety compliance."""

    def __init__(self):
        logger.info("SafetyGuard initialized")

    def check_action(self, action_description: str, auto_approve: bool = False) -> dict:
        """Check if an action is safe to execute."""
        description_lower = action_description.lower()

        # Check for high-risk actions
        risks = [risk for risk in HIGH_RISK_ACTIONS if risk in description_lower]

        if risks and not auto_approve:
            logger.warning("High-risk action detected", action=action_description[:100], risks=risks)
            return {
                "approved": False,
                "reason": f"Action requires approval: contains high-risk operations ({', '.join(risks)})",
                "risks": risks,
                "requires_human": True,
            }

        return {
            "approved": True,
            "reason": "Action is safe to execute",
            "risks": [],
            "requires_human": False,
        }

    def check_content(self, content: str) -> dict:
        """Check content for sensitive information."""
        content_lower = content.lower()
        violations = [item for item in BLOCKED_CONTENT if item in content_lower]

        if violations:
            logger.warning("Sensitive content detected", violations=violations)
            return {
                "safe": False,
                "violations": violations,
                "message": "Content contains sensitive information that should not be exposed.",
            }

        return {
            "safe": True,
            "violations": [],
            "message": "Content is safe.",
        }

    def validate_tool_use(self, tool_name: str, parameters: dict) -> dict:
        """Validate that a tool is being used appropriately."""
        # Basic validation — extend as needed
        if not tool_name:
            return {"valid": False, "reason": "No tool specified"}

        if not parameters:
            return {"valid": False, "reason": "No parameters provided for tool"}

        return {"valid": True, "reason": "Tool use is valid"}


# Singleton
_guard: SafetyGuard | None = None


def get_safety_guard() -> SafetyGuard:
    global _guard
    if _guard is None:
        _guard = SafetyGuard()
    return _guard
