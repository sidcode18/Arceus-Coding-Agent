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
                
                # Stream the workflow execution with node updates
                async for event in workflow.astream(initial_state):
                    # Extract node name and state
                    if hasattr(event, 'node'):
                        node_name = event.node
                        state = event.state if hasattr(event, 'state') else {}
                        
                        # Send node update
                        await websocket.send_json({
                            "event": "node_update",
                            "node": node_name,
                            "state": {
                                "status": state.get("status", "in_progress"),
                                "plan": state.get("plan", ""),
                                "plan_steps": state.get("plan_steps", []),
                                "code_changes": state.get("code_changes", []),
                                "review_status": state.get("review_status", ""),
                                "reflection_action": state.get("reflection_action", ""),
                                "errors": state.get("errors", [])
                            }
                        })
                        
                        # Send latest message if available
                        messages = state.get("messages", [])
                        if messages:
                            latest_message = messages[-1]
                            await websocket.send_json({
                                "event": "message_update",
                                "content": latest_message.content if hasattr(latest_message, 'content') else str(latest_message),
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
