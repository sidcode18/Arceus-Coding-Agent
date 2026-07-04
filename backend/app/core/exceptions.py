"""Custom exceptions for the application"""
from typing import Any, Optional


class BaseApplicationError(Exception):
    """Base exception for all application errors"""
    
    def __init__(
        self,
        message: str,
        status_code: int = 500,
        error_code: str = "INTERNAL_ERROR",
        details: Optional[dict[str, Any]] = None
    ):
        self.message = message
        self.status_code = status_code
        self.error_code = error_code
        self.details = details or {}
        super().__init__(self.message)


class ValidationError(BaseApplicationError):
    """Validation error"""
    
    def __init__(self, message: str, details: Optional[dict[str, Any]] = None):
        super().__init__(
            message=message,
            status_code=422,
            error_code="VALIDATION_ERROR",
            details=details
        )


class AuthenticationError(BaseApplicationError):
    """Authentication error"""
    
    def __init__(self, message: str = "Authentication failed"):
        super().__init__(
            message=message,
            status_code=401,
            error_code="AUTHENTICATION_ERROR"
        )


class AuthorizationError(BaseApplicationError):
    """Authorization error"""
    
    def __init__(self, message: str = "Insufficient permissions"):
        super().__init__(
            message=message,
            status_code=403,
            error_code="AUTHORIZATION_ERROR"
        )


class NotFoundError(BaseApplicationError):
    """Resource not found error"""
    
    def __init__(self, resource: str, identifier: Optional[str] = None):
        message = f"{resource} not found"
        if identifier:
            message = f"{resource} with identifier '{identifier}' not found"
        super().__init__(
            message=message,
            status_code=404,
            error_code="NOT_FOUND"
        )


class ConflictError(BaseApplicationError):
    """Resource conflict error"""
    
    def __init__(self, message: str):
        super().__init__(
            message=message,
            status_code=409,
            error_code="CONFLICT_ERROR"
        )


class RateLimitError(BaseApplicationError):
    """Rate limit exceeded error"""
    
    def __init__(self, message: str = "Rate limit exceeded"):
        super().__init__(
            message=message,
            status_code=429,
            error_code="RATE_LIMIT_ERROR"
        )


class ExternalServiceError(BaseApplicationError):
    """External service error"""
    
    def __init__(self, service: str, message: str = "External service error"):
        super().__init__(
            message=f"{service}: {message}",
            status_code=502,
            error_code="EXTERNAL_SERVICE_ERROR"
        )


class DatabaseError(BaseApplicationError):
    """Database error"""
    
    def __init__(self, message: str = "Database error occurred"):
        super().__init__(
            message=message,
            status_code=500,
            error_code="DATABASE_ERROR"
        )


class RepositoryError(BaseApplicationError):
    """Repository-related error"""
    
    def __init__(self, message: str):
        super().__init__(
            message=message,
            status_code=400,
            error_code="REPOSITORY_ERROR"
        )


class ToolExecutionError(BaseApplicationError):
    """Tool execution error"""
    
    def __init__(self, tool_name: str, message: str):
        super().__init__(
            message=f"Tool '{tool_name}' execution failed: {message}",
            status_code=500,
            error_code="TOOL_EXECUTION_ERROR",
            details={"tool_name": tool_name}
        )


class AgentError(BaseApplicationError):
    """Agent execution error"""
    
    def __init__(self, agent_name: str, message: str):
        super().__init__(
            message=f"Agent '{agent_name}' error: {message}",
            status_code=500,
            error_code="AGENT_ERROR",
            details={"agent_name": agent_name}
        )


class EmbeddingError(BaseApplicationError):
    """Embedding generation error"""
    
    def __init__(self, message: str = "Failed to generate embeddings"):
        super().__init__(
            message=message,
            status_code=500,
            error_code="EMBEDDING_ERROR"
        )


class SearchError(BaseApplicationError):
    """Search error"""
    
    def __init__(self, message: str = "Search operation failed"):
        super().__init__(
            message=message,
            status_code=500,
            error_code="SEARCH_ERROR"
        )


class MemoryError(BaseApplicationError):
    """Memory operation error"""
    
    def __init__(self, message: str = "Memory operation failed"):
        super().__init__(
            message=message,
            status_code=500,
            error_code="MEMORY_ERROR"
        )
