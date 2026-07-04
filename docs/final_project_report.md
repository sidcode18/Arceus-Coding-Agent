# Final Project Report: AI Coding Agent

## 1. Architecture
The AI Coding Agent is built on a modern, decoupled Clean Architecture:
- **Client Tier**: A Vite + React Single Page Application (SPA) offering a rich workspace interface (Monaco editor, real-time agent chat via WebSockets).
- **API Tier**: A high-performance, asynchronous FastAPI backend that handles user management, repository cloning, tool execution, and stateful WebSockets.
- **Agent Orchestration**: LangGraph state machines (`PlannerAgent`, `CoderAgent`) that bind LLMs to executable Python tools.
- **Data & Memory Tier**: PostgreSQL (SQLAlchemy) for persistence, Redis for short-term caching, and Qdrant for semantic code vectors (embeddings).

## 2. Features
- **Autonomous Multi-Agent Workflow**: Agents coordinate to plan, write, and review code based on user prompts.
- **Deep Code Understanding**: Integrated AST parsers (Python, TypeScript) chunk codebase structures, store them in Qdrant, and retrieve context contextually using Gemini embeddings.
- **Real-Time Streaming**: Agents stream their step-by-step thoughts and actions directly to the UI using FastAPI WebSockets.
- **Secure Sandboxed Tooling**: Built-in `TerminalTool`, `ReadFileTool`, and `WriteFileTool` equipped with security guardrails.

## 3. Technologies
- **Frontend**: React, TypeScript, TailwindCSS, Monaco Editor, Lucide Icons, Framer Motion.
- **Backend**: Python 3.11, FastAPI, SQLAlchemy, Alembic, LangChain, LangGraph, GitPython, Pytest.
- **Infrastructure**: Docker, Docker Compose, PostgreSQL 15, Redis 7, Qdrant, RabbitMQ, MinIO.
- **Observability**: Prometheus, Grafana, OpenTelemetry, Structlog.

## 4. Performance
- **Optimized Image Builds**: Implemented multi-stage Docker builds reducing the container size footprint by separating build dependencies from the runtime environment.
- **Database Connection Pooling**: Utilizes SQLAlchemy async engines with optimized pool sizes (`pool_size=20`, `max_overflow=10`).
- **Caching**: Heavy reliance on Redis for fast session retrieval and state caching, lowering PostgreSQL query pressure.

## 5. Security
- **Authentication**: JWT-based auth via FastAPI's `OAuth2PasswordBearer` with hashed passwords (bcrypt).
- **Tool Guardrails**:
  - *Path Traversal*: File tools enforce strict absolute path checking ensuring agents cannot escape the designated `workspace_root`.
  - *Command Validation*: Terminal tools intercept and deny destructive bash commands (e.g., `rm -rf /`, `mkfs`).
- **Secret Masking**: Sensitive keys (OpenAI, Gemini) are handled securely via `pydantic-settings` from `.env` without being hardcoded.

## 6. Scalability
- **Stateless API Design**: The FastAPI layer is stateless (state kept in Postgres/Redis), allowing horizontally scalable API replicas.
- **Message Queues**: RabbitMQ is configured for dispatching long-running asynchronous agent tasks across worker nodes.
- **Docker Compose**: The `docker-compose.yml` easily provisions the entire clustered environment, ready to be translated to Kubernetes manifests for enterprise scale.

## 7. Future Enhancements (Resume-Level Features)
- **MCP Support**: Integrate Model Context Protocol for cross-tool contextual awareness.
- **Plugin Architecture**: Expose a plugin system allowing users to add custom linters, testing frameworks, and deployment scripts to the Agent's toolbelt.
- **Cost Tracking**: Implement token counting per LangChain execution to display cost metrics in the frontend UI.
- **Automated PR Generation**: Allow agents to push their completed work directly to GitHub and open Pull Requests.
