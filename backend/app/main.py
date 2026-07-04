from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import structlog

from app.core.config import settings
from app.db.session import close_db, init_db

logger = structlog.get_logger()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting up application", env=settings.app_env)
    await init_db()
    yield
    # Shutdown
    logger.info("Shutting down application")
    await close_db()


from app.api.router import api_router

app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    description="AI Coding Agent Backend API",
    lifespan=lifespan,
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
)

app.include_router(api_router, prefix="/api/v1")

# CORS middleware
if settings.cors_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=settings.cors_allow_credentials,
        allow_methods=["*"],
        allow_headers=["*"],
    )

@app.get("/health")
async def health_check():
    return {"status": "healthy", "environment": settings.app_env}
