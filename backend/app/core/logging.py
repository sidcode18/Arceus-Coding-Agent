"""Structured logging configuration"""
import logging
import sys
from typing import Any

import structlog
from opentelemetry import trace
from opentelemetry.trace import Status, StatusCode


def configure_logging(log_level: str = "INFO") -> None:
    """Configure structured logging"""
    
    # Configure standard logging
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=getattr(logging, log_level.upper()),
    )
    
    # Configure structlog
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.StackInfoRenderer(),
            structlog.dev.set_exc_info,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.JSONRenderer() if log_level == "INFO" else structlog.dev.ConsoleRenderer(),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(
            getattr(logging, log_level.upper())
        ),
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )


def get_logger(name: str) -> structlog.stdlib.BoundLogger:
    """Get a structured logger instance"""
    return structlog.get_logger(name)


class LoggingMiddleware:
    """Middleware to add request context to logs"""
    
    def __init__(self, app):
        self.app = app
    
    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            # Add request context to logs
            structlog.contextvars.bind_contextvars(
                path=scope["path"],
                method=scope["method"],
                request_id=scope.get("state", {}).get("request_id"),
            )
        
        try:
            await self.app(scope, receive, send)
        finally:
            structlog.contextvars.clear_contextvars()


def log_exception(logger: structlog.stdlib.BoundLogger, exc: Exception, **kwargs: Any) -> None:
    """Log an exception with context"""
    span = trace.get_current_span()
    
    logger.exception(
        "exception_occurred",
        exception_type=type(exc).__name__,
        exception_message=str(exc),
        **kwargs
    )
    
    if span.is_recording():
        span.record_exception(exc)
        span.set_status(Status(StatusCode.ERROR, str(exc)))
