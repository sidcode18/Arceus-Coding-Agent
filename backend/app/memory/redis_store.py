import json
from typing import Any, Dict, List, Optional
import structlog
from redis.asyncio import Redis

from app.memory.base import BaseMemoryStore
from app.core.config import settings

logger = structlog.get_logger()

class RedisMemoryStore(BaseMemoryStore):
    """Redis-based short-term memory store"""
    
    def __init__(self):
        self.redis = Redis.from_url(settings.redis_url, decode_responses=True)
        self.ttl = 86400  # 24 hours
        
    def _get_key(self, session_id: str) -> str:
        return f"memory:session:{session_id}"
        
    async def add_message(self, session_id: str, role: str, content: str, metadata: Optional[Dict[str, Any]] = None) -> bool:
        try:
            key = self._get_key(session_id)
            message = {
                "role": role,
                "content": content,
                "metadata": metadata or {}
            }
            # Append to list
            await self.redis.rpush(key, json.dumps(message))
            # Set expiry
            await self.redis.expire(key, self.ttl)
            return True
        except Exception as e:
            logger.error("Failed to add message to Redis", error=str(e), session_id=session_id)
            return False
            
    async def get_messages(self, session_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        try:
            key = self._get_key(session_id)
            # Get last `limit` messages
            raw_messages = await self.redis.lrange(key, -limit, -1)
            return [json.loads(msg) for msg in raw_messages]
        except Exception as e:
            logger.error("Failed to get messages from Redis", error=str(e), session_id=session_id)
            return []
            
    async def clear_session(self, session_id: str) -> bool:
        try:
            key = self._get_key(session_id)
            await self.redis.delete(key)
            return True
        except Exception as e:
            logger.error("Failed to clear session in Redis", error=str(e), session_id=session_id)
            return False
