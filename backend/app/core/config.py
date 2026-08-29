"""Application configuration"""
from functools import lru_cache
from typing import Any, Optional

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings"""
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )
    
    # Application
    app_name: str = "ai-coding-agent"
    app_env: str = "development"
    debug: bool = True
    log_level: str = "INFO"

    @field_validator("debug", mode="before")
    @classmethod
    def _coerce_debug(cls, v: Any) -> bool:
        """Accept any truthy/falsy value for DEBUG.

        The ``DEBUG`` environment variable is commonly set by other tools (e.g.
        Node, IDEs) to non-boolean strings like ``"release"`` or ``"0"``.
        Pydantic's default ``bool`` coercion rejects those and raises a
        ``ValidationError`` at import time.  This validator normalises any
        string to a proper bool so that importing the backend never fails
        purely because of an unrelated ``DEBUG`` value in the shell environment.
        """
        if isinstance(v, bool):
            return v
        if isinstance(v, str):
            return v.lower() not in {"0", "false", "no", "off", "release", ""}
        return bool(v)
    
    # Frontend
    frontend_url: str = "http://localhost:5173"
    
    # Backend
    backend_url: str = "http://localhost:8000"
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    
    # Database
    database_url: str = Field(
        default="postgresql+asyncpg://postgres:postgres@localhost:5433/ai_coding_agent"
    )
    database_pool_size: int = 20
    database_max_overflow: int = 10
    
    # Redis
    redis_url: str = Field(default="redis://localhost:6379/0")
    redis_cache_ttl: int = 3600
    
    # Qdrant
    qdrant_url: str = Field(default="http://localhost:6333")
    qdrant_api_key: Optional[str] = None
    
    # RabbitMQ
    rabbitmq_url: str = Field(default="amqp://admin:admin@localhost:5672/")
    rabbitmq_queue: str = "ai_coding_agent"
    
    # MinIO
    minio_endpoint: str = Field(default="localhost:9000")
    minio_access_key: str = Field(default="minioadmin")
    minio_secret_key: str = Field(default="minioadmin")
    minio_bucket: str = Field(default="ai-coding-agent")
    minio_secure: bool = False
    
    # Authentication
    jwt_secret: str = Field(default="your-secret-key-change-in-production")
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 15
    jwt_refresh_token_expire_days: int = 30
    
    # GitHub OAuth
    github_client_id: Optional[str] = None
    github_client_secret: Optional[str] = None
    github_oauth_callback_url: str = Field(
        default="http://localhost:8000/api/v1/auth/github/callback"
    )
    
    # OpenAI
    openai_api_key: Optional[str] = None
    openai_model: str = Field(default="gpt-4-turbo-preview")
    openai_embedding_model: str = Field(default="text-embedding-3-small")
    
    # Anthropic
    anthropic_api_key: Optional[str] = None
    anthropic_model: str = Field(default="claude-3-opus-20240229")
    
    # Gemini
    gemini_api_key: Optional[str] = None
    gemini_model: str = Field(default="gemini-2.5-flash")
    
    # LangGraph
    langchain_api_key: Optional[str] = None
    langchain_tracing_v2: bool = False
    langchain_project: str = Field(default="ai-coding-agent")
    
    # Monitoring
    prometheus_enabled: bool = True
    prometheus_port: int = 9090
    grafana_enabled: bool = True
    grafana_port: int = 3001
    grafana_admin_password: str = Field(default="admin")
    
    # OpenTelemetry
    otel_enabled: bool = True
    otel_exporter_otlp_endpoint: str = Field(default="http://localhost:4317")
    otel_service_name: str = Field(default="ai-coding-agent-backend")
    
    # Repository
    repository_clone_path: str = Field(default="storage/repositories")
    repository_max_size: int = Field(default=104857600)  # 100MB
    
    # Tool Execution
    tool_execution_timeout: int = 30
    tool_max_memory: int = Field(default=536870912)  # 512MB
    tool_max_cpu_time: int = 30

    # Workflow execution limits
    workflow_max_iterations: int = Field(
        default=5,
        description="Maximum number of full retriever→reflection cycles before aborting.",
    )
    workflow_max_retries: int = Field(
        default=3,
        description="Maximum number of coder→reviewer→coder retry loops before forcing reflection.",
    )
    workflow_timeout_seconds: float = Field(
        default=300.0,
        description="Hard wall-clock timeout (seconds) for a single workflow run.",
    )

    # Retrieval quality gate
    retrieval_min_score: float = Field(
        default=0.30,
        description="Minimum Qdrant cosine similarity score to include in retrieved context.",
    )

    # Rate Limiting
    rate_limit_enabled: bool = True
    rate_limit_per_minute: int = 100
    
    # CORS
    cors_origins: str = Field(default="http://localhost:3000,http://localhost:5173,http://localhost:8000")
    cors_allow_credentials: bool = True
    
    @field_validator('cors_origins')
    @classmethod
    def parse_cors_origins(cls, v: str) -> list[str]:
        """Parse CORS origins from string"""
        return [origin.strip() for origin in v.split(",")]
    
    @property
    def is_development(self) -> bool:
        """Check if running in development mode"""
        return self.app_env == "development"
    
    @property
    def is_production(self) -> bool:
        """Check if running in production mode"""
        return self.app_env == "production"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()


# Global settings instance
settings = get_settings()
