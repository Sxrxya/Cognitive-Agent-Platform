"""
Cognitive Agent Platform — Agent Planner
Decomposes goals into executable task steps using LLM reasoning.
"""

import uuid
import json
import structlog
from datetime import datetime
from services.llm_service import get_llm_service
from services.memory_service import get_memory_service, NAMESPACE_EPISODIC
from models.schemas import AgentTask, TaskStep, AgentStatus, TaskPriority

logger = structlog.get_logger(__name__)

PLANNING_SYSTEM_PROMPT = """You are a Cognitive Agent Planner. Your job is to decompose a user's goal into clear, executable steps.

Available tools:
- browser: Scrape and read web pages
- search: Web search via DuckDuckGo
- document: Summarize text or documents
- email/gmail: Read, search, and send emails via Gmail
- send_email: Send an email (specify to, subject, body in description)
- calendar: List upcoming calendar events
- create_event: Create a calendar event (specify title, date/time in description)
- memory: Store or recall information from memory
- (none): Use LLM reasoning directly

Rules:
1. Break the goal into 3-8 concrete steps.
2. Each step should be a single, actionable task.
3. Include which tool to use if applicable.
4. Order steps logically — dependencies first.
5. Return valid JSON only.

Return format:
{
  "steps": [
    {"step_number": 1, "description": "...", "tool": "search"},
    {"step_number": 2, "description": "...", "tool": "email"}
  ]
}"""


class AgentPlanner:
    """Plans multi-step task execution from natural language goals."""

    def __init__(self):
        self.llm = get_llm_service()
        self.memory = get_memory_service()
        logger.info("AgentPlanner initialized")

    def create_plan(self, goal: str, priority: TaskPriority = TaskPriority.MEDIUM) -> AgentTask:
        """Generate an execution plan for a given goal."""
        task_id = f"task-{uuid.uuid4().hex[:10]}"

        # Generate plan via LLM
        prompt = f"Goal: {goal}\n\nCreate a step-by-step execution plan."
        raw_response = self.llm.generate(prompt, system_instruction=PLANNING_SYSTEM_PROMPT)

        # Parse steps
        steps = self._parse_steps(raw_response)

        task = AgentTask(
            task_id=task_id,
            goal=goal,
            priority=priority,
            status=AgentStatus.PLANNING,
            steps=steps,
            created_at=datetime.utcnow(),
        )

        # Store plan in episodic memory
        self.memory.store(
            text=f"Plan for: {goal}\nSteps: {json.dumps([s.model_dump() for s in steps])}",
            namespace=NAMESPACE_EPISODIC,
            metadata={"task_id": task_id, "type": "plan"},
            memory_id=task_id,
        )

        logger.info("Plan created", task_id=task_id, steps=len(steps))
        return task

    def _parse_steps(self, llm_output: str) -> list[TaskStep]:
        """Parse LLM output into TaskStep objects."""
        try:
            # Try to extract JSON from response
            start = llm_output.find("{")
            end = llm_output.rfind("}") + 1
            if start >= 0 and end > start:
                data = json.loads(llm_output[start:end])
                return [
                    TaskStep(
                        step_number=s.get("step_number", i + 1),
                        description=s.get("description", ""),
                        tool_used=s.get("tool"),
                    )
                    for i, s in enumerate(data.get("steps", []))
                ]
        except (json.JSONDecodeError, KeyError) as e:
            logger.warning("Failed to parse plan JSON, creating single step", error=str(e))

        # Fallback: single step
        return [TaskStep(step_number=1, description=llm_output.strip())]


# Singleton
_planner: AgentPlanner | None = None


def get_agent_planner() -> AgentPlanner:
    global _planner
    if _planner is None:
        _planner = AgentPlanner()
    return _planner
