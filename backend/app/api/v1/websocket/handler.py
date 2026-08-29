import asyncio
import time
import json
import structlog
from typing import Dict, Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_async_session

from app.agents.workflows.coding_workflow import create_coding_workflow, build_initial_state
from app.core.config import settings

logger = structlog.get_logger()

router = APIRouter()

# Workflow compiled lazily on first request so that importing this module
# (which happens at app startup, and during test collection) never triggers
# agent/LLM construction — and therefore never requires GOOGLE_API_KEY at
# import time.
_workflow = None


def _get_workflow():
    global _workflow
    if _workflow is None:
        _workflow = create_coding_workflow()
    return _workflow


def _build_metrics(final_state: Dict[str, Any], elapsed: float) -> Dict[str, Any]:
    """Extract execution metrics from the final workflow state."""
    return {
        "iteration_count": final_state.get("iteration_count", 0),
        "retry_count": final_state.get("retry_count", 0),
        "execution_time": round(elapsed, 3),
        "termination_reason": final_state.get("termination_reason", ""),
    }


@router.websocket("/ws/{session_id}")
async def websocket_endpoint(
    websocket: WebSocket, 
    session_id: str, 
    token: str = None,
    db: AsyncSession = Depends(get_async_session)
):
    """WebSocket endpoint for real-time agent execution streaming."""
    from app.core.security import decode_token
    from fastapi import status
    from app.core.exceptions import AuthenticationError
    
    if not token:
        logger.warning("WebSocket rejected: Missing token", session_id=session_id)
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Missing token")
        return
        
    try:
        payload = decode_token(token)
        user_id = payload.get("sub")
        if not user_id:
            raise AuthenticationError("Invalid token")
    except AuthenticationError as e:
        logger.warning("WebSocket rejected: Invalid token", session_id=session_id, error=str(e))
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid token")
        return

    # Verify project ownership (frontend passes projectId as session_id)
    from app.repositories.project_repository import ProjectRepository
    repo = ProjectRepository(db)
    project = await repo.get_by_id(session_id, user_id=user_id)
    if not project:
        logger.warning("WebSocket rejected: Project not found or unauthorized", session_id=session_id, user_id=user_id)
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Project not found or unauthorized")
        return

    await websocket.accept()
    logger.info("WebSocket connected", session_id=session_id)

    # Queue for decoupling websocket reads, completely preventing concurrent recv()
    message_queue = asyncio.Queue()

    async def _ws_reader():
        """Single dedicated task to read from websocket and put to queue."""
        try:
            while True:
                data = await websocket.receive_text()
                await message_queue.put(data)
        except WebSocketDisconnect:
            await message_queue.put(None)
        except Exception as e:
            logger.error("WebSocket reader error", error=str(e))
            await message_queue.put(None)

    # Start the single reader task for the lifetime of this connection
    reader_task = asyncio.create_task(_ws_reader())

    try:
        while True:
            # Wait for next prompt
            data = await message_queue.get()
            if data is None:
                break  # Connection closed
                
            logger.info("Received message", session_id=session_id)

            try:
                payload = json.loads(data)
                message = payload.get("message", "")
                project_id = payload.get("project_id", "")
                llm_provider = payload.get("llm_provider", "")
                llm_model = payload.get("llm_model", "")

                await websocket.send_json(
                    {"event": "workflow_started", "session_id": session_id}
                )

                initial_state = build_initial_state(
                    message=message, 
                    project_id=project_id, 
                    user_id=user_id,
                    llm_provider=llm_provider,
                    llm_model=llm_model
                )
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
                    async for event in _get_workflow().astream(initial_state):
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

                stream_task = asyncio.create_task(_run_stream())
                
                async def _listen_for_cancel():
                    """Listen for incoming cancel messages while the workflow runs."""
                    while True:
                        msg_data = await message_queue.get()
                        if msg_data is None:
                            return False  # Disconnected
                        try:
                            msg_payload = json.loads(msg_data)
                            if msg_payload.get("type") == "cancel":
                                return True
                        except Exception:
                            pass  # Ignore invalid JSON during execution, keep listening
                            
                listen_task = asyncio.create_task(_listen_for_cancel())
                
                try:
                    done, pending = await asyncio.wait(
                        [stream_task, listen_task],
                        return_when=asyncio.FIRST_COMPLETED,
                        timeout=settings.workflow_timeout_seconds
                    )
                    
                    if stream_task in done:
                        # Workflow finished naturally or raised an exception
                        listen_task.cancel()
                        try:
                            await listen_task
                        except asyncio.CancelledError:
                            pass
                        final_state = stream_task.result()
                    elif listen_task in done:
                        # Received cancel message or connection closed
                        stream_task.cancel()
                        try:
                            await stream_task
                        except asyncio.CancelledError:
                            pass
                        was_cancelled = listen_task.result()
                        if was_cancelled:
                            logger.info("Workflow cancelled by user", session_id=session_id)
                            await websocket.send_json({
                                "event": "workflow_terminated",
                                "session_id": session_id,
                                "reason": "cancelled",
                                "detail": "Execution stopped by user."
                            })
                            continue  # Wait for next prompt
                        else:
                            logger.warning("Connection lost during execution", session_id=session_id)
                            break  # Exit main loop
                    else:
                        # Timeout occurred
                        stream_task.cancel()
                        listen_task.cancel()
                        try:
                            await asyncio.gather(stream_task, listen_task, return_exceptions=True)
                        except Exception:
                            pass
                        raise asyncio.TimeoutError()
                        
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

    except Exception as e:
        logger.error("WebSocket error", error=str(e))
        try:
            await websocket.send_json(
                {"event": "error", "message": f"WebSocket error: {str(e)}"}
            )
        except Exception:
            pass
    finally:
        reader_task.cancel()
        try:
            await reader_task
        except asyncio.CancelledError:
            pass
