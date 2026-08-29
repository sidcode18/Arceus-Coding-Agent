from redis.asyncio import Redis
from app.core.config import settings

# Global redis connection for blocklist
_redis_client = None

import sys

def get_redis() -> Redis:
    global _redis_client
    if "pytest" in sys.modules:
        return Redis.from_url(settings.redis_url, decode_responses=True)
    if _redis_client is None:
        _redis_client = Redis.from_url(settings.redis_url, decode_responses=True)
    return _redis_client

async def blocklist_token(jti: str, expires_in_seconds: int) -> None:
    """Add a JWT id to the blocklist with an expiration."""
    if expires_in_seconds <= 0:
        return
    redis = get_redis()
    await redis.setex(f"blocklist:{jti}", expires_in_seconds, "true")

async def is_token_blocklisted(jti: str) -> bool:
    """Check if a JWT id is in the blocklist."""
    redis = get_redis()
    exists = await redis.exists(f"blocklist:{jti}")
    return exists > 0
