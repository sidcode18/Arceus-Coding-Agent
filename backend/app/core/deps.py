"""FastAPI dependencies"""
from typing import AsyncGenerator, Optional

from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import AuthenticationError, NotFoundError
from app.core.security import decode_token
from app.db.session import get_async_session
from app.models.user import User
from app.repositories.user_repository import UserRepository


# HTTP Bearer security scheme
security = HTTPBearer()


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Get database session"""
    async for session in get_async_session():
        yield session


async def get_current_user(
    db: AsyncSession = Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> User:
    """Get current authenticated user"""
    try:
        token = credentials.credentials
        payload = decode_token(token)
        
        user_id: str = payload.get("sub")
        if user_id is None:
            raise AuthenticationError("Invalid token payload")
        
        user_repo = UserRepository(db)
        user = await user_repo.get_by_id(user_id)
        
        if user is None:
            raise NotFoundError("User", user_id)
        
        if not user.is_active:
            raise AuthenticationError("User account is inactive")
        
        return user
        
    except AuthenticationError:
        raise
    except Exception as e:
        raise AuthenticationError(f"Authentication failed: {str(e)}")


async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """Get current active user"""
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )
    return current_user


async def get_current_superuser(
    current_user: User = Depends(get_current_user)
) -> User:
    """Get current superuser"""
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions"
        )
    return current_user


async def get_request_id(
    x_request_id: Optional[str] = Header(None)
) -> str:
    """Get or generate request ID"""
    return x_request_id or "unknown"


def verify_cors_origin(origin: Optional[str] = Header(None)) -> Optional[str]:
    """Verify CORS origin"""
    if origin is None:
        return None
    
    allowed_origins = settings.cors_origins
    if origin in allowed_origins:
        return origin
    
    if settings.is_development:
        return origin
    
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Origin not allowed"
    )
