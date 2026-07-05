import asyncio
import time
import json
import structlog
from typing import Dict, Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.agents.workflows.coding_workflow import create_coding_workflow, build_initial_state
from app.core.config import settings

logger = structlog.get_logger()

router = APIRouter()

# Compile the workflow once at module import time so every connection reuses
# the same compiled graph object rather than rebuilding it per message.
_workflow = create_coding_workflow()


def _build_metrics(final_state: Dict[str, Any], elapsed: float) -> Dict[str, Any]:
    """Extract execution metrics from the final workflow state."""
    return {
        "iteration_count": final_state.get("iteration_count", 0),
        "retry_count": final_state.get("retry_count", 0),
        "execution_time": round(elapsed, 3),
        "termination_reason": final_state.get("termination_reason", ""),
    }


@router.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    """WebSocket endpoint for real-time agent execution streaming."""
    await websocket.accept()
    logger.info("WebSocket connected", session_id=session_id)

    try:
        while True:
            data = await websocket.receive_text()
            logger.info("Received message", session_id=session_id)

            try:
                payload = json.loads(data)
                message = payload.get("message", "")
                project_id = payload.get("project_id", "")

                await websocket.send_json(
                    {"event": "workflow_started", "session_id": session_id}
                )

                initial_state = build_initial_state(message, project_id)
                wall_start = time.monotonic()

                # ----------------------------------------------------------
                # Stream the workflow, wrapped in a hard timeout.
                # asyncio.wait_for cancels the coroutine if the timeout fires,
                # at which point we report a clean termination event.
                # ----------------------------------------------------------
                final_state: Dict[str, Any] = {}
                timed_out = False

                async def _run_stream() -> Dict[str, Any]:
                    """Drive the astream loop and return the last observed state."""
                    last: Dict[str, Any] = {}
                    async for event in _workflow.astream(initial_state):
                        for node_name, node_state in event.items():
                            if not isinstance(node_state, dict):
                                continue

                            # Merge into last so we always have a current view
                            last = {**last, **node_state}

                            # Per-node update
                            await websocket.send_json(
                                {
                                    "event": "node_update",
                                    "node": node_name,
                                    "state": {
                                        "status": node_state.get("status", "in_progress"),
                                        "plan": node_state.get("plan", ""),
                                        "plan_steps": node_state.get("plan_steps", []),
                                        "code_changes": node_state.get("code_changes", []),
                                        "review_status": node_state.get("review_status", ""),
                                        "reflection_action": node_state.get(
                                            "reflection_action", ""
                                        ),
                                        "errors": node_state.get("errors", []),
                                        # metrics fields for real-time UI feedback
                                        "iteration_count": node_state.get(
                                            "iteration_count",
                                            last.get("iteration_count", 0),
                                        ),
                                        "retry_count": node_state.get(
                                            "retry_count",
                                            last.get("retry_count", 0),
                                        ),
                                    },
                                }
                            )

                            # Latest agent message
                            messages = node_state.get("messages", [])
                            if messages:
                                latest = messages[-1]
                                content = (
                                    latest.content
                                    if hasattr(latest, "content")
                                    else str(latest)
                                )
                                await websocket.send_json(
                                    {
                                        "event": "message_update",
                                        "node": node_name,
                                        "content": content,
                                        "type": latest.__class__.__name__,
                                    }
                                )
                    return last

                try:
                    final_state = await asyncio.wait_for(
                        _run_stream(),
                        timeout=settings.workflow_timeout_seconds,
                    )
                except asyncio.TimeoutError:
                    timed_out = True
                    elapsed = time.monotonic() - wall_start
                    logger.warning(
                        "Workflow timed out",
                        session_id=session_id,
                        timeout=settings.workflow_timeout_seconds,
                        elapsed=round(elapsed, 2),
                    )
                    await websocket.send_json(
                        {
                            "event": "workflow_terminated",
                            "session_id": session_id,
                            "reason": "timeout",
                            "detail": (
                                f"Workflow exceeded the {settings.workflow_timeout_seconds}s "
                                "time limit and was stopped."
                            ),
                            "metrics": {
                                "iteration_count": final_state.get("iteration_count", 0),
                                "retry_count": final_state.get("retry_count", 0),
                                "execution_time": round(elapsed, 3),
                            },
                        }
                    )
                    continue  # wait for next message on this connection

                elapsed = time.monotonic() - wall_start
                metrics = _build_metrics(final_state, elapsed)

                # Emit a termination notice if a safeguard limit triggered
                termination_reason = final_state.get("termination_reason", "")
                if termination_reason:
                    await websocket.send_json(
                        {
                            "event": "workflow_terminated",
                            "session_id": session_id,
                            "reason": termination_reason,
                            "detail": f"Workflow stopped early: {termination_reason}",
                            "metrics": metrics,
                        }
                    )
                else:
                    await websocket.send_json(
                        {
                            "event": "workflow_completed",
                            "session_id": session_id,
                            "metrics": metrics,
                        }
                    )

            except json.JSONDecodeError as e:
                logger.error("Invalid JSON received", error=str(e))
                await websocket.send_json(
                    {"event": "error", "message": "Invalid JSON format"}
                )
            except Exception as e:
                logger.error("Error processing websocket message", error=str(e))
                await websocket.send_json({"event": "error", "message": str(e)})

    except WebSocketDisconnect:
        logger.info("WebSocket disconnected", session_id=session_id)
    except Exception as e:
        logger.error("WebSocket error", error=str(e))
        try:
            await websocket.send_json(
                {"event": "error", "message": f"WebSocket error: {str(e)}"}
            )
        except Exception:
            pass
