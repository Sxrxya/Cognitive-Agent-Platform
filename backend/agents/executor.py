"""
Cognitive Agent Platform — Agent Executor (Production)
Executes planned task steps using real tools, with reflection loop.
"""

import structlog
from datetime import datetime
from models.schemas import AgentTask, TaskStep, AgentStatus
from services.llm_service import get_llm_service
from services.memory_service import get_memory_service, NAMESPACE_EPISODIC
from tools.browser_tool import web_scrape
from tools.search_tool import web_search
from tools.document_tool import summarize_text
from tools.gmail_tool import send_email, read_emails
from tools.calendar_tool import list_events, create_event

logger = structlog.get_logger(__name__)

# Tool registry — maps tool names to callables
TOOL_REGISTRY = {
    "browser": web_scrape,
    "scrape": web_scrape,
    "search": web_search,
    "document": summarize_text,
    "summarize": summarize_text,
    "email": read_emails,
    "send_email": send_email,
    "gmail": read_emails,
    "calendar": list_events,
    "create_event": create_event,
    "memory": None,  # handled specially
}

REFLECTION_PROMPT = """You are a Cognitive Agent performing self-reflection after task execution.

ORIGINAL GOAL: {goal}

EXECUTED STEPS AND RESULTS:
{step_results}

Analyze:
1. Was the goal fully achieved?
2. Were there any errors or incomplete steps?
3. What is the quality of the results?
4. Should any steps be retried or additional steps added?

Respond in this exact JSON format:
{{
  "goal_achieved": true/false,
  "quality_score": 1-10,
  "summary": "Brief summary of what was accomplished",
  "issues": ["list of issues if any"],
  "retry_steps": [step_numbers_to_retry],
  "additional_steps": ["new step descriptions if needed"]
}}"""


class AgentExecutor:
    """Executes task steps with tool dispatch and self-reflection."""

    def __init__(self):
        self.llm = get_llm_service()
        self.memory = get_memory_service()
        logger.info("AgentExecutor initialized", tools=list(TOOL_REGISTRY.keys()))

    async def execute_task(self, task: AgentTask, auto_approve: bool = False) -> AgentTask:
        """Execute all steps, then reflect and optionally retry."""
        task.status = AgentStatus.EXECUTING
        logger.info("Executing task", task_id=task.task_id, steps=len(task.steps))

        # === Execute all planned steps ===
        await self._execute_steps(task, auto_approve)

        # === Reflection loop (max 2 cycles) ===
        for cycle in range(2):
            reflection = await self._reflect(task)

            if reflection.get("goal_achieved", True) and reflection.get("quality_score", 10) >= 6:
                logger.info("Reflection passed", cycle=cycle, score=reflection.get("quality_score"))
                break

            # Retry failed steps
            retry_steps = reflection.get("retry_steps", [])
            if retry_steps:
                logger.info("Retrying steps", steps=retry_steps, cycle=cycle)
                for step in task.steps:
                    if step.step_number in retry_steps:
                        step.status = AgentStatus.IDLE
                        step.result = None
                await self._execute_steps(task, auto_approve=True)

            # Add new steps if reflection suggested them
            additional = reflection.get("additional_steps", [])
            if additional:
                start_num = len(task.steps) + 1
                new_steps = [
                    TaskStep(step_number=start_num + i, description=desc)
                    for i, desc in enumerate(additional)
                ]
                task.steps.extend(new_steps)
                await self._execute_steps(task, auto_approve=True)

            # Store reflection in memory
            self.memory.store(
                text=f"Reflection for task {task.task_id}: {reflection.get('summary', '')}",
                namespace=NAMESPACE_EPISODIC,
                metadata={
                    "task_id": task.task_id,
                    "type": "reflection",
                    "cycle": cycle,
                    "quality_score": reflection.get("quality_score", 0),
                },
            )

        # === Final status ===
        failed_steps = [s for s in task.steps if s.status == AgentStatus.FAILED]
        if failed_steps:
            task.status = AgentStatus.FAILED
        else:
            task.status = AgentStatus.COMPLETED
            task.completed_at = datetime.utcnow()

        # Memory write-back: store the completed task as a learning
        self.memory.store(
            text=(
                f"Completed task: {task.goal}\n"
                f"Status: {task.status.value}\n"
                f"Steps: {len(task.steps)}, Failed: {len(failed_steps)}"
            ),
            namespace=NAMESPACE_EPISODIC,
            metadata={"task_id": task.task_id, "type": "task_completion"},
        )

        logger.info("Task finished", task_id=task.task_id, status=task.status.value)
        return task

    async def _execute_steps(self, task: AgentTask, auto_approve: bool):
        """Execute all IDLE steps in a task."""
        for step in task.steps:
            if step.status != AgentStatus.IDLE:
                continue

            try:
                step.status = AgentStatus.EXECUTING

                if step.tool_used and step.tool_used.lower() in TOOL_REGISTRY:
                    tool_fn = TOOL_REGISTRY[step.tool_used.lower()]
                    if tool_fn is not None:
                        result = await self._run_tool(tool_fn, step.description)
                    else:
                        result = self.llm.generate(
                            f"Execute: {step.description}",
                            system_instruction="You are an agent. Execute this step precisely."
                        )
                else:
                    result = self.llm.generate(
                        f"Execute this task step and provide the result:\n{step.description}",
                        system_instruction="You are an intelligent agent. Provide a clear, actionable result."
                    )

                step.result = result
                step.status = AgentStatus.COMPLETED
                logger.info("Step completed", step=step.step_number, tool=step.tool_used)

                # Store observation
                self.memory.store(
                    text=f"Step {step.step_number}: {step.description}\nResult: {result[:500]}",
                    namespace=NAMESPACE_EPISODIC,
                    metadata={"task_id": task.task_id, "step": step.step_number, "type": "observation"},
                )

            except Exception as e:
                step.status = AgentStatus.FAILED
                step.result = f"Error: {str(e)}"
                logger.error("Step failed", step=step.step_number, error=str(e))

                if not auto_approve:
                    task.status = AgentStatus.FAILED
                    return

    async def _reflect(self, task: AgentTask) -> dict:
        """Reflect on task execution and evaluate results."""
        step_results = "\n".join(
            f"Step {s.step_number} [{s.status.value}]: {s.description}\n  Result: {(s.result or 'N/A')[:300]}"
            for s in task.steps
        )

        prompt = REFLECTION_PROMPT.format(goal=task.goal, step_results=step_results)

        try:
            raw = self.llm.generate(prompt)
            import json
            start = raw.find("{")
            end = raw.rfind("}") + 1
            if start >= 0 and end > start:
                return json.loads(raw[start:end])
        except Exception as e:
            logger.warning("Reflection parse failed", error=str(e))

        return {"goal_achieved": True, "quality_score": 7, "summary": "Reflection unavailable"}

    async def _run_tool(self, tool_fn, description: str) -> str:
        """Run a tool function (sync or async)."""
        import asyncio
        import inspect

        if inspect.iscoroutinefunction(tool_fn):
            return await tool_fn(description)
        return await asyncio.to_thread(tool_fn, description)


# Singleton
_executor: AgentExecutor | None = None


def get_agent_executor() -> AgentExecutor:
    global _executor
    if _executor is None:
        _executor = AgentExecutor()
    return _executor
