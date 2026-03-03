"""
Cognitive Agent Platform — Agent Executor
Executes planned task steps using available tools.
"""

import structlog
from datetime import datetime
from models.schemas import AgentTask, AgentStatus
from services.llm_service import get_llm_service
from services.memory_service import get_memory_service, NAMESPACE_EPISODIC
from tools.browser_tool import web_scrape
from tools.search_tool import web_search
from tools.document_tool import summarize_text

logger = structlog.get_logger(__name__)

# Tool registry — maps tool names to callables
TOOL_REGISTRY = {
    "browser": web_scrape,
    "search": web_search,
    "document": summarize_text,
    "summarize": summarize_text,
}


class AgentExecutor:
    """Executes task steps from a plan, using tools and LLM reasoning."""

    def __init__(self):
        self.llm = get_llm_service()
        self.memory = get_memory_service()
        logger.info("AgentExecutor initialized")

    async def execute_task(self, task: AgentTask, auto_approve: bool = False) -> AgentTask:
        """Execute all steps in a task sequentially."""
        task.status = AgentStatus.EXECUTING
        logger.info("Executing task", task_id=task.task_id, steps=len(task.steps))

        for step in task.steps:
            try:
                step.status = AgentStatus.EXECUTING

                # Check if a tool is specified
                if step.tool_used and step.tool_used.lower() in TOOL_REGISTRY:
                    tool_fn = TOOL_REGISTRY[step.tool_used.lower()]
                    result = await self._run_tool(tool_fn, step.description)
                else:
                    # Use LLM to execute the step
                    result = self.llm.generate(
                        f"Execute this task step and provide the result:\n{step.description}",
                        system_instruction="You are an intelligent agent executing a task step. Provide a clear, actionable result."
                    )

                step.result = result
                step.status = AgentStatus.COMPLETED
                logger.info("Step completed", step=step.step_number, tool=step.tool_used)

                # Store observation in episodic memory
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
                    return task

        # Mark complete
        task.status = AgentStatus.COMPLETED
        task.completed_at = datetime.utcnow()
        logger.info("Task completed", task_id=task.task_id)
        return task

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
