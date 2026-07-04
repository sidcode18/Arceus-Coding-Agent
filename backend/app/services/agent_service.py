import structlog

logger = structlog.get_logger()

class AgentService:
    def __init__(self):
        pass

    async def execute_task(self, task_prompt: str, session_id: str):
        logger.info("Executing task via AgentService", task=task_prompt, session_id=session_id)
        return {"status": "success", "result": "Stubs"}

agent_service = AgentService()
