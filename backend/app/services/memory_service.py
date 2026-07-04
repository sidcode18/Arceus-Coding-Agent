import structlog

logger = structlog.get_logger()

class MemoryService:
    def __init__(self):
        pass

    async def add_memory(self, session_id: str, content: str):
        logger.info("Adding memory", session_id=session_id)
        return True

    async def get_context(self, session_id: str) -> list[str]:
        return []

memory_service = MemoryService()
