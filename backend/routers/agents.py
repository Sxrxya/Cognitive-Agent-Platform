"""
Cognitive Agent Platform — Agents Router
Manages autonomous task planning and execution.
"""

from fastapi import APIRouter
from models.schemas import AgentRunRequest, AgentRunResponse, AgentStatus
from agents.planner import get_agent_planner
from agents.executor import get_agent_executor
from agents.safety import get_safety_guard

router = APIRouter()

# In-memory task store (replace with DB in production)
_task_store: dict = {}


@router.post("/run", response_model=AgentRunResponse)
async def run_agent(request: AgentRunRequest):
    """Plan and execute a multi-step task."""
    planner = get_agent_planner()
    executor = get_agent_executor()
    safety = get_safety_guard()

    # Step 1: Safety check
    safety_result = safety.check_action(request.goal, auto_approve=request.auto_approve)
    if not safety_result["approved"]:
        task = planner.create_plan(request.goal, request.priority)
        task.status = AgentStatus.WAITING
        _task_store[task.task_id] = task
        return AgentRunResponse(
            task=task,
            message=f"⚠️ Action requires approval: {safety_result['reason']}",
        )

    # Step 2: Plan
    task = planner.create_plan(request.goal, request.priority)
    _task_store[task.task_id] = task

    # Step 3: Execute
    task = await executor.execute_task(task, auto_approve=request.auto_approve)
    _task_store[task.task_id] = task

    status_emoji = "✅" if task.status == AgentStatus.COMPLETED else "❌"
    return AgentRunResponse(
        task=task,
        message=f"{status_emoji} Task {task.status.value}: {task.goal[:100]}",
    )


@router.get("/tasks")
async def list_tasks():
    """List all tasks."""
    return {"tasks": list(_task_store.values()), "total": len(_task_store)}


@router.get("/tasks/{task_id}")
async def get_task(task_id: str):
    """Get a specific task by ID."""
    task = _task_store.get(task_id)
    if not task:
        return {"error": "Task not found"}
    return {"task": task}


@router.post("/tasks/{task_id}/approve")
async def approve_task(task_id: str):
    """Approve a pending task for execution."""
    task = _task_store.get(task_id)
    if not task:
        return {"error": "Task not found"}
    if task.status != AgentStatus.WAITING:
        return {"error": f"Task is not waiting for approval (status: {task.status.value})"}

    executor = get_agent_executor()
    task = await executor.execute_task(task, auto_approve=True)
    _task_store[task_id] = task

    return AgentRunResponse(task=task, message=f"✅ Approved and executed: {task.goal[:100]}")
