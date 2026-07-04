from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import json
import structlog
from typing import Dict, Any
from langchain_core.messages import HumanMessage

from app.agents.workflows.coding_workflow import create_coding_workflow

logger = structlog.get_logger()

router = APIRouter()


@router.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    """WebSocket endpoint for real-time agent execution streaming"""
    await websocket.accept()
    logger.info("WebSocket connected", session_id=session_id)
    
    workflow = create_coding_workflow()
    
    try:
        while True:
            data = await websocket.receive_text()
            logger.info("Received message", session_id=session_id)
            
            try:
                payload = json.loads(data)
                
                # Extract parameters from payload
                message = payload.get("message", "")
                project_id = payload.get("project_id", "")
                
                # Send acknowledgment
                await websocket.send_json({
                    "event": "workflow_started",
                    "session_id": session_id
                })
                
                # Build initial state
                initial_state: Dict[str, Any] = {
                    "messages": [HumanMessage(content=message)],
                    "plan": "",
                    "plan_steps": [],
                    "retrieved_context": [],
                    "code_changes": [],
                    "review_status": "",
                    "review_content": "",
                    "reflection_action": "",
                    "reflection_content": "",
                    "status": "starting",
                    "errors": [],
                    "project_id": project_id
                }
                
                # Stream the workflow execution with node updates.
                # LangGraph's astream (stream_mode="updates") yields a dict
                # mapping each executed node name to the partial state it
                # returned, e.g. {"planner": {"plan": "...", "messages": [...]}}.
                async for event in workflow.astream(initial_state):
                    for node_name, node_state in event.items():
                        if not isinstance(node_state, dict):
                            continue

                        # Send node update
                        await websocket.send_json({
                            "event": "node_update",
                            "node": node_name,
                            "state": {
                                "status": node_state.get("status", "in_progress"),
                                "plan": node_state.get("plan", ""),
                                "plan_steps": node_state.get("plan_steps", []),
                                "code_changes": node_state.get("code_changes", []),
                                "review_status": node_state.get("review_status", ""),
                                "reflection_action": node_state.get("reflection_action", ""),
                                "errors": node_state.get("errors", [])
                            }
                        })

                        # Send latest message produced by this node if available
                        messages = node_state.get("messages", [])
                        if messages:
                            latest_message = messages[-1]
                            content = (
                                latest_message.content
                                if hasattr(latest_message, "content")
                                else str(latest_message)
                            )
                            await websocket.send_json({
                                "event": "message_update",
                                "node": node_name,
                                "content": content,
                                "type": latest_message.__class__.__name__
                            })
                
                # Send completion event
                await websocket.send_json({
                    "event": "workflow_completed",
                    "session_id": session_id
                })
                
            except json.JSONDecodeError as e:
                logger.error("Invalid JSON received", error=str(e))
                await websocket.send_json({
                    "event": "error",
                    "message": "Invalid JSON format"
                })
            except Exception as e:
                logger.error("Error processing websocket message", error=str(e))
                await websocket.send_json({
                    "event": "error",
                    "message": str(e)
                })
                
    except WebSocketDisconnect:
        logger.info("WebSocket disconnected", session_id=session_id)
    except Exception as e:
        logger.error("WebSocket error", error=str(e))
        try:
            await websocket.send_json({
                "event": "error",
                "message": f"WebSocket error: {str(e)}"
            })
        except:
            pass
