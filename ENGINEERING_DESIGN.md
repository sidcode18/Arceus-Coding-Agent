# AI Coding Agent - Engineering Design Document

**Version:** 1.0  
**Date:** July 3, 2026  
**Status:** Design Phase  
**Authors:** Engineering Team

---

## Table of Contents

1. [Product Requirements Document](#1-product-requirements-document)
2. [High-Level Architecture](#2-high-level-architecture)
3. [Folder Structure](#3-folder-structure)
4. [Database Schema](#4-database-schema)
5. [API Specification](#5-api-specification)
6. [Agent Architecture](#6-agent-architecture)
7. [LangGraph Workflow](#7-langgraph-workflow)
8. [Tool Framework](#8-tool-framework)
9. [Memory Architecture](#9-memory-architecture)
10. [Security Model](#10-security-model)
11. [Logging and Observability](#11-logging-and-observability)
12. [Deployment Architecture](#12-deployment-architecture)
13. [Docker Compose Architecture](#13-docker-compose-architecture)
14. [CI/CD Workflow](#14-cicd-workflow)
15. [Testing Strategy](#15-testing-strategy)
16. [Implementation Roadmap](#16-implementation-roadmap)
17. [Architecture Diagrams](#17-architecture-diagrams)
18. [Sequence Diagrams](#18-sequence-diagrams)

---

## 1. Product Requirements Document

### 1.1 Product Vision

Build a production-grade AI Coding Agent that serves as an intelligent programming assistant, capable of understanding codebases, making safe modifications, executing tasks autonomously, and learning from interactions. The system will be open-source and demonstrate advanced backend engineering, AI agents, distributed systems, and DevOps practices.

### 1.2 Target Users

- **Individual Developers:** Seeking AI assistance for coding tasks
- **Engineering Teams:** Requiring collaborative AI pair programming
- **Open Source Contributors:** Needing automated code analysis and PR reviews
- **Students:** Learning programming through AI-guided exploration

### 1.3 Core Features

#### 1.3.1 Repository Analysis
- Parse and understand code structure across multiple languages
- Build abstract syntax trees (AST) for code comprehension
- Identify dependencies, imports, and code relationships
- Generate code metrics and complexity analysis

#### 1.3.2 Semantic Code Search
- Natural language queries to find relevant code
- Vector-based semantic search using embeddings
- Hybrid retrieval combining keyword and semantic search
- Code-aware search understanding function signatures and context

#### 1.3.3 Repository Indexing
- Incremental indexing for large repositories
- Support for multiple file types and languages
- Efficient re-indexing on code changes
- Index versioning and rollback capabilities

#### 1.3.4 Hybrid Retrieval
- Combine vector similarity with keyword matching
- Re-rank results using learned models
- Context-aware result filtering
- Support for code-specific ranking signals

#### 1.3.5 Long-term Memory
- Persistent storage of user preferences and patterns
- Cross-session context retention
- Project-specific knowledge accumulation
- Memory consolidation and pruning

#### 1.3.6 Multi-Agent Orchestration
- Specialized agents for different tasks (planner, coder, reviewer)
- Agent communication and coordination
- Hierarchical agent structure with supervisor
- Dynamic agent selection based on task complexity

#### 1.3.7 Planning
- Task decomposition into sub-tasks
- Dependency graph generation
- Resource estimation and allocation
- Plan validation and adjustment

#### 1.3.8 Tool Calling
- Extensible tool framework
- Safe tool execution with sandboxing
- Tool result caching and optimization
- Parallel tool execution support

#### 1.3.9 Safe File Editing
- Atomic file operations
- Conflict detection and resolution
- Rollback capabilities
- Edit validation before application

#### 1.3.10 Secure Terminal Execution
- Sandboxed command execution
- Resource limits (CPU, memory, time)
- Command whitelist/blacklist
- Execution logging and audit trails

#### 1.3.11 Git Integration
- Branch management and switching
- Commit generation with messages
- Diff visualization and understanding
- PR creation and review automation

#### 1.3.12 Test Execution
- Automated test discovery
- Test execution in isolated environments
- Result analysis and failure diagnosis
- Coverage reporting

#### 1.3.13 Documentation Generation
- Auto-generate code documentation
- API documentation from type hints
- Architecture documentation
- README and contribution guides

#### 1.3.14 Background Jobs
- Asynchronous task processing
- Job queue management
- Priority scheduling
- Job status tracking and notifications

#### 1.3.15 Session Persistence
- Save and restore conversation state
- Context preservation across sessions
- Session versioning
- Export/import capabilities

#### 1.3.16 Observability
- Real-time metrics and monitoring
- Distributed tracing
- Performance profiling
- Error tracking and alerting

#### 1.3.17 Plugin Architecture
- Extensible plugin system
- Plugin marketplace (future)
- Plugin lifecycle management
- Security sandboxing for plugins

#### 1.3.18 MCP Support
- Model Context Protocol integration
- External tool integration via MCP
- MCP server hosting
- MCP client capabilities

### 1.4 Non-Functional Requirements

#### 1.4.1 Performance
- API response time < 200ms for p95
- Code search latency < 500ms for p95
- Support repositories up to 1M files
- Concurrent user support: 1000+ simultaneous sessions

#### 1.4.2 Scalability
- Horizontal scaling for all components
- Stateless API design
- Database sharding support
- CDN for static assets

#### 1.4.3 Availability
- 99.9% uptime SLA
- Graceful degradation
- Multi-region deployment capability
- Disaster recovery procedures

#### 1.4.4 Security
- End-to-end encryption for sensitive data
- RBAC for all operations
- Audit logging for all actions
- Regular security audits

#### 1.4.5 Maintainability
- Comprehensive documentation
- >80% test coverage
- Clear code organization
- Automated dependency updates

### 1.5 Success Metrics

- **User Adoption:** 10,000 active users in first 6 months
- **Performance:** 95% of tasks completed without human intervention
- **Satisfaction:** 4.5/5 star rating
- **Reliability:** <1% error rate on API calls
- **Community:** 1,000 GitHub stars, 100 contributors

---

## 2. High-Level Architecture

### 2.1 Architectural Principles

The system follows **Clean Architecture** principles with clear separation of concerns:

1. **Domain Independence:** Business logic independent of frameworks
2. **Testability:** All components can be tested in isolation
3. **Independence of UI:** Frontend can be replaced without affecting backend
4. **Independence of Database:** Can swap databases without changing business logic
5. **Independence of External Services:** External services are abstracted

### 2.2 System Overview

The system consists of the following major components:

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend Layer                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Next.js    │  │   Monaco     │  │   Zustand    │          │
│  │   (React)    │  │   Editor     │  │  (State)     │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP/WebSocket
                              │
┌─────────────────────────────────────────────────────────────────┐
│                        API Gateway Layer                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  FastAPI     │  │  WebSocket   │  │  Rate Limit  │          │
│  │  (REST)      │  │  Handler     │  │  & Auth      │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │
┌─────────────────────────────────────────────────────────────────┐
│                         Service Layer                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Agent       │  │  Code        │  │  Git         │          │
│  │  Orchestrator│  │  Analysis    │  │  Service     │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Search      │  │  Memory      │  │  Tool        │          │
│  │  Service     │  │  Service     │  │  Executor    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │
┌─────────────────────────────────────────────────────────────────┐
│                         AI Layer                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  LangGraph   │  │  Provider    │  │  Embedding   │          │
│  │  Workflows   │  │  Abstraction │  │  Service     │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│  ┌──────────────┐  ┌──────────────┐                           │
│  │  Agent       │  │  Tool        │                           │
│  │  Definitions │  │  Registry    │                           │
│  └──────────────┘  └──────────────┘                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │
┌─────────────────────────────────────────────────────────────────┐
│                       Data Layer                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ PostgreSQL   │  │    Redis     │  │   Qdrant     │          │
│  │ (Relational) │  │   (Cache)    │  │  (Vector)    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│  ┌──────────────┐  ┌──────────────┐                           │
│  │   MinIO      │  │  RabbitMQ    │                           │
│  │  (Storage)   │  │   (Queue)    │                           │
│  └──────────────┘  └──────────────┘                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │
┌─────────────────────────────────────────────────────────────────┐
│                    Infrastructure Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Docker      │  │  Prometheus  │  │   Grafana    │          │
│  │  Compose     │  │  (Metrics)   │  │  (Dashboards)│          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│  ┌──────────────┐  ┌──────────────┐                           │
│  │ OpenTelemetry│  │   GitHub     │                           │
│  │  (Tracing)   │  │   OAuth      │                           │
│  └──────────────┘  └──────────────┘                           │
└─────────────────────────────────────────────────────────────────┘
```

### 2.3 Component Responsibilities

#### 2.3.1 Frontend Layer
- **Next.js:** SSR/SSG framework, routing, API integration
- **Monaco Editor:** Code editing, syntax highlighting, IntelliSense
- **Zustand:** Client-side state management
- **shadcn/ui:** UI component library
- **Tailwind CSS:** Styling

#### 2.3.2 API Gateway Layer
- **FastAPI:** REST API endpoints, request validation
- **WebSocket Handler:** Real-time communication for streaming responses
- **Rate Limiting:** API rate limiting and throttling
- **Authentication:** JWT validation, GitHub OAuth

#### 2.3.3 Service Layer
- **Agent Orchestrator:** Coordinates multi-agent workflows
- **Code Analysis Service:** AST parsing, code understanding
- **Git Service:** Git operations, branch management
- **Search Service:** Semantic and keyword search
- **Memory Service:** Long-term and short-term memory management
- **Tool Executor:** Safe tool execution with sandboxing

#### 2.3.4 AI Layer
- **LangGraph Workflows:** Agent workflow definitions and execution
- **Provider Abstraction:** Unified interface for multiple LLM providers
- **Embedding Service:** Text and code embedding generation
- **Agent Definitions:** Individual agent implementations
- **Tool Registry:** Tool registration and discovery

#### 2.3.5 Data Layer
- **PostgreSQL:** Relational data storage (users, sessions, projects)
- **Redis:** Caching, session storage, rate limiting
- **Qdrant:** Vector storage for semantic search
- **MinIO:** Object storage for files, artifacts
- **RabbitMQ:** Message queue for background jobs

#### 2.3.6 Infrastructure Layer
- **Docker Compose:** Container orchestration for local development
- **Prometheus:** Metrics collection
- **Grafana:** Visualization and dashboards
- **OpenTelemetry:** Distributed tracing
- **GitHub OAuth:** Authentication provider

### 2.4 Data Flow

#### 2.4.1 User Request Flow
1. User submits request via frontend
2. Frontend sends HTTP request to FastAPI
3. API Gateway validates auth and rate limits
4. Request routed to appropriate service
5. Service may invoke AI layer for LLM calls
6. AI layer uses provider abstraction
7. Results stored in data layer
8. Response returned through API Gateway
9. Frontend updates UI

#### 2.4.2 Background Job Flow
1. Service enqueues job to RabbitMQ
2. Worker picks up job from queue
3. Worker processes job (e.g., indexing)
4. Worker updates job status in Redis
5. Worker stores results in PostgreSQL/Qdrant
6. Worker notifies via WebSocket if applicable

### 2.5 Design Decisions

#### 2.5.1 Why FastAPI?
- **Performance:** Built on Starlette, async support out of the box
- **Type Safety:** Native Python type hints reduce bugs
- **Documentation:** Auto-generated OpenAPI docs
- **Validation:** Pydantic for request/response validation
- **Ecosystem:** Rich middleware and plugin ecosystem

#### 2.5.2 Why LangGraph?
- **State Management:** Built-in state management for complex workflows
- **Visualization:** Automatic workflow graph generation
- **Debugging:** Easy to trace execution paths
- **Flexibility:** Support for cyclic graphs and complex agent interactions
- **LangChain Integration:** Seamless integration with LangChain ecosystem

#### 2.5.3 Why PostgreSQL?
- **Reliability:** ACID compliance, mature database
- **Features:** Full-text search, JSON support, advanced indexing
- **Scalability:** Proven horizontal scaling capabilities
- **Ecosystem:** Excellent tooling and monitoring

#### 2.5.4 Why Qdrant?
- **Performance:** Written in Rust, extremely fast
- **Features:** Hybrid search, filtering, payload indexing
- **Ease of Use:** Simple API, Docker deployment
- **Open Source:** No vendor lock-in

#### 2.5.5 Why RabbitMQ?
- **Reliability:** Proven message broker with acknowledgments
- **Flexibility:** Multiple exchange types, routing keys
- **Monitoring:** Built-in management UI
- **Protocol:** AMQP is widely supported

#### 2.5.6 Why Redis?
- **Speed:** In-memory, sub-millisecond latency
- **Data Structures:** Rich data types (lists, sets, sorted sets)
- **Persistence:** Optional disk persistence
- **Features:** Pub/sub, transactions, Lua scripting

---

## 3. Folder Structure

```
ai-coding-agent/
├── frontend/                          # Next.js Frontend Application
│   ├── src/
│   │   ├── app/                       # Next.js App Router
│   │   │   ├── (auth)/                # Auth routes group
│   │   │   │   ├── login/
│   │   │   │   └── callback/
│   │   │   ├── (dashboard)/           # Dashboard routes group
│   │   │   │   ├── workspace/
│   │   │   │   ├── sessions/
│   │   │   │   └── settings/
│   │   │   ├── api/                   # API routes (if needed)
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   ├── components/                # React Components
│   │   │   ├── ui/                    # shadcn/ui components
│   │   │   ├── editor/                # Monaco Editor components
│   │   │   ├── chat/                  # Chat interface components
│   │   │   ├── workspace/             # Workspace components
│   │   │   └── common/                # Shared components
│   │   ├── lib/                       # Utility libraries
│   │   │   ├── api/                   # API client
│   │   │   ├── hooks/                 # Custom React hooks
│   │   │   ├── stores/                # Zustand stores
│   │   │   └── utils/                 # Utility functions
│   │   ├── types/                     # TypeScript type definitions
│   │   ├── styles/                    # Global styles
│   │   └── config/                    # Configuration files
│   ├── public/                        # Static assets
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   ├── next.config.js
│   └── docker-compose.yml
│
├── backend/                           # FastAPI Backend Application
│   ├── app/
│   │   ├── api/                       # API Routes
│   │   │   ├── v1/
│   │   │   │   ├── auth/              # Authentication endpoints
│   │   │   │   │   ├── __init__.py
│   │   │   │   │   ├── router.py
│   │   │   │   │   └── schemas.py
│   │   │   │   ├── sessions/          # Session management
│   │   │   │   │   ├── __init__.py
│   │   │   │   │   ├── router.py
│   │   │   │   │   └── schemas.py
│   │   │   │   ├── projects/          # Project management
│   │   │   │   │   ├── __init__.py
│   │   │   │   │   ├── router.py
│   │   │   │   │   └── schemas.py
│   │   │   │   ├── agents/            # Agent execution
│   │   │   │   │   ├── __init__.py
│   │   │   │   │   ├── router.py
│   │   │   │   │   └── schemas.py
│   │   │   │   ├── search/            # Code search
│   │   │   │   │   ├── __init__.py
│   │   │   │   │   ├── router.py
│   │   │   │   │   └── schemas.py
│   │   │   │   ├── memory/            # Memory operations
│   │   │   │   │   ├── __init__.py
│   │   │   │   │   ├── router.py
│   │   │   │   │   └── schemas.py
│   │   │   │   ├── tools/             # Tool execution
│   │   │   │   │   ├── __init__.py
│   │   │   │   │   ├── router.py
│   │   │   │   │   └── schemas.py
│   │   │   │   ├── git/               # Git operations
│   │   │   │   │   ├── __init__.py
│   │   │   │   │   ├── router.py
│   │   │   │   │   └── schemas.py
│   │   │   │   └── jobs/              # Background jobs
│   │   │   │       ├── __init__.py
│   │   │   │       ├── router.py
│   │   │   │       └── schemas.py
│   │   │   └── websocket/             # WebSocket endpoints
│   │   │       └── handler.py
│   │   ├── core/                      # Core application logic
│   │   │   ├── config.py              # Configuration management
│   │   │   ├── security.py            # Security utilities
│   │   │   ├── auth.py                # Authentication logic
│   │   │   ├── deps.py                # FastAPI dependencies
│   │   │   └── exceptions.py          # Custom exceptions
│   │   ├── services/                  # Business logic services
│   │   │   ├── agent_service.py       # Agent orchestration
│   │   │   ├── code_analysis.py       # Code analysis
│   │   │   ├── git_service.py         # Git operations
│   │   │   ├── search_service.py      # Search operations
│   │   │   ├── memory_service.py      # Memory management
│   │   │   ├── tool_executor.py       # Tool execution
│   │   │   └── indexing_service.py    # Repository indexing
│   │   ├── agents/                    # LangGraph Agents
│   │   │   ├── __init__.py
│   │   │   ├── base.py                # Base agent class
│   │   │   ├── planner.py             # Planning agent
│   │   │   ├── coder.py               # Coding agent
│   │   │   ├── reviewer.py            # Review agent
│   │   │   ├── supervisor.py          # Supervisor agent
│   │   │   └── workflows/             # LangGraph workflows
│   │   │       ├── __init__.py
│   │   │       ├── coding_workflow.py
│   │   │       ├── analysis_workflow.py
│   │   │       └── planning_workflow.py
│   │   ├── tools/                     # Tool implementations
│   │   │   ├── __init__.py
│   │   │   ├── base.py                # Base tool class
│   │   │   ├── file_tools.py          # File operations
│   │   │   ├── terminal_tools.py      # Terminal operations
│   │   │   ├── git_tools.py           # Git tools
│   │   │   ├── search_tools.py        # Search tools
│   │   │   ├── test_tools.py          # Test execution
│   │   │   └── registry.py            # Tool registry
│   │   ├── memory/                    # Memory system
│   │   │   ├── __init__.py
│   │   │   ├── base.py                # Base memory class
│   │   │   ├── short_term.py          # Short-term memory
│   │   │   ├── long_term.py           # Long-term memory
│   │   │   ├── episodic.py            # Episodic memory
│   │   │   └── semantic.py            # Semantic memory
│   │   ├── llm/                       # LLM Provider Abstraction
│   │   │   ├── __init__.py
│   │   │   ├── base.py                # Base provider
│   │   │   ├── openai.py              # OpenAI provider
│   │   │   ├── anthropic.py           # Anthropic provider
│   │   │   ├── gemini.py              # Gemini provider
│   │   │   ├── ollama.py              # Ollama provider
│   │   │   ├── openrouter.py          # OpenRouter provider
│   │   │   └── factory.py             # Provider factory
│   │   ├── embeddings/                # Embedding service
│   │   │   ├── __init__.py
│   │   │   ├── service.py             # Embedding generation
│   │   │   └── models.py              # Embedding models
│   │   ├── models/                    # Database Models (SQLAlchemy)
│   │   │   ├── __init__.py
│   │   │   ├── user.py
│   │   │   ├── project.py
│   │   │   ├── session.py
│   │   │   ├── message.py
│   │   │   ├── memory.py
│   │   │   ├── job.py
│   │   │   └── plugin.py
│   │   ├── schemas/                   # Pydantic Schemas
│   │   │   ├── __init__.py
│   │   │   ├── user.py
│   │   │   ├── project.py
│   │   │   ├── session.py
│   │   │   ├── agent.py
│   │   │   └── common.py
│   │   ├── repositories/              # Repository Pattern (Data Access)
│   │   │   ├── __init__.py
│   │   │   ├── base.py                # Base repository
│   │   │   ├── user_repository.py
│   │   │   ├── project_repository.py
│   │   │   ├── session_repository.py
│   │   │   └── memory_repository.py
│   │   ├── db/                        # Database configuration
│   │   │   ├── __init__.py
│   │   │   ├── session.py             # Database session
│   │   │   ├── base.py                # Base model
│   │   │   └── init_db.py             # Database initialization
│   │   ├── vector/                    # Vector database (Qdrant)
│   │   │   ├── __init__.py
│   │   │   ├── client.py              # Qdrant client
│   │   │   ├── collections.py         # Collection management
│   │   │   └── operations.py          # Vector operations
│   │   ├── cache/                     # Redis cache
│   │   │   ├── __init__.py
│   │   │   ├── client.py              # Redis client
│   │   │   └── decorators.py          # Cache decorators
│   │   ├── queue/                     # RabbitMQ queue
│   │   │   ├── __init__.py
│   │   │   ├── client.py              # RabbitMQ client
│   │   │   ├── publishers.py          # Message publishers
│   │   │   └── consumers.py           # Message consumers
│   │   ├── storage/                   # MinIO storage
│   │   │   ├── __init__.py
│   │   │   ├── client.py              # MinIO client
│   │   │   └── operations.py          # Storage operations
│   │   ├── workers/                   # Background workers
│   │   │   ├── __init__.py
│   │   │   ├── base.py                # Base worker
│   │   │   ├── indexing_worker.py     # Repository indexing
│   │   │   ├── embedding_worker.py    # Embedding generation
│   │   │   └── cleanup_worker.py      # Cleanup tasks
│   │   ├── middleware/                # Custom middleware
│   │   │   ├── __init__.py
│   │   │   ├── auth.py                # Authentication middleware
│   │   │   ├── logging.py             # Logging middleware
│   │   │   ├── rate_limit.py          # Rate limiting
│   │   │   └── cors.py                # CORS middleware
│   │   ├── monitoring/                # Monitoring and observability
│   │   │   ├── __init__.py
│   │   │   ├── metrics.py             # Prometheus metrics
│   │   │   ├── tracing.py             # OpenTelemetry tracing
│   │   │   └── logging.py             # Structured logging
│   │   ├── mcp/                       # Model Context Protocol
│   │   │   ├── __init__.py
│   │   │   ├── server.py              # MCP server
│   │   │   ├── client.py              # MCP client
│   │   │   └── tools.py               # MCP tool adapters
│   │   ├── plugins/                   # Plugin system
│   │   │   ├── __init__.py
│   │   │   ├── base.py                # Base plugin
│   │   │   ├── manager.py             # Plugin manager
│   │   │   └── loader.py              # Plugin loader
│   │   └── main.py                    # FastAPI application entry
│   ├── tests/                         # Backend tests
│   │   ├── unit/                      # Unit tests
│   │   ├── integration/               # Integration tests
│   │   ├── e2e/                       # End-to-end tests
│   │   └── fixtures/                  # Test fixtures
│   ├── scripts/                       # Utility scripts
│   │   ├── init_db.py
│   │   ├── migrate.py
│   │   └── seed.py
│   ├── requirements/                 # Python dependencies
│   │   ├── base.txt
│   │   ├── dev.txt
│   │   ├── prod.txt
│   │   └── test.txt
│   ├── alembic/                       # Database migrations
│   │   ├── versions/
│   │   └── env.py
│   ├── alembic.ini
│   ├── pyproject.toml
│   └── docker-compose.yml
│
├── infrastructure/                    # Infrastructure as Code
│   ├── docker/
│   │   ├── docker-compose.yml         # Main Docker Compose
│   │   ├── docker-compose.dev.yml     # Development override
│   │   ├── docker-compose.prod.yml    # Production override
│   │   └── Dockerfile.backend         # Backend Dockerfile
│   ├── kubernetes/                    # Kubernetes manifests (future)
│   │   ├── base/
│   │   ├── staging/
│   │   └── production/
│   ├── terraform/                     # Terraform configs (future)
│   │   ├── modules/
│   │   └── environments/
│   └── monitoring/
│       ├── prometheus/
│       │   └── prometheus.yml
│       ├── grafana/
│       │   └── dashboards/
│       └── otel-collector/
│           └── otel-collector.yaml
│
├── docs/                              # Documentation
│   ├── api/                           # API documentation
│   ├── architecture/                 # Architecture docs
│   ├── guides/                        # User guides
│   ├── development/                   # Development guides
│   └── deployment/                    # Deployment guides
│
├── .github/                           # GitHub configuration
│   ├── workflows/
│   │   ├── ci.yml                     # CI pipeline
│   │   ├── cd.yml                     # CD pipeline
│   │   └── security.yml               # Security scanning
│   ├── ISSUE_TEMPLATE/
│   └── PULL_REQUEST_TEMPLATE.md
│
├── .gitignore
├── README.md
├── LICENSE
└── CONTRIBUTING.md
```

### 3.1 Structure Justification

#### 3.1.1 Monorepo vs Polyrepo
**Decision:** Monorepo structure

**Rationale:**
- Simplified dependency management between frontend and backend
- Shared types and schemas can be synchronized
- Easier to test full-stack changes together
- Single CI/CD pipeline for coordinated deployments
- Better for open-source project contributions

#### 3.1.2 Clean Architecture Layers
The backend follows strict layer separation:
- **API Layer:** HTTP/WebSocket endpoints only
- **Service Layer:** Business logic
- **Repository Layer:** Data access
- **Models:** Database entities
- **Schemas:** Request/response validation

This ensures testability and maintainability.

#### 3.1.3 Plugin System
Dedicated `plugins/` directory allows:
- Hot-reloading of plugins
- Sandboxed execution
- Clear plugin API contracts
- Easy discovery and loading

---

## 4. Database Schema

### 4.1 PostgreSQL Schema

#### 4.1.1 Users Table

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    github_id VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    avatar_url TEXT,
    full_name VARCHAR(255),
    bio TEXT,
    is_active BOOLEAN DEFAULT true,
    is_superuser BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP WITH TIME ZONE,
    
    INDEX idx_users_github_id (github_id),
    INDEX idx_users_email (email),
    INDEX idx_users_username (username)
);

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

**Rationale:**
- UUID for distributed system compatibility
- GitHub OAuth integration requires github_id
- Separate username/email for flexibility
- Timestamps for auditing
- Indexes for common query patterns

#### 4.1.2 Projects Table

```sql
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    repository_url TEXT NOT NULL,
    clone_path TEXT,  -- Local path where repo is cloned
    branch VARCHAR(255) DEFAULT 'main',
    is_indexed BOOLEAN DEFAULT false,
    index_status VARCHAR(50) DEFAULT 'pending',  -- pending, indexing, completed, failed
    last_indexed_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',  -- Flexible metadata storage
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_projects_user_id (user_id),
    INDEX idx_projects_repository_url (repository_url),
    INDEX idx_projects_index_status (index_status)
);

CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

**Rationale:**
- User relationship for ownership
- Repository URL for cloning
- Index status tracking for background jobs
- JSONB for flexible metadata without schema changes
- Cascade delete for data consistency

#### 4.1.3 Sessions Table

```sql
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    title VARCHAR(255),
    status VARCHAR(50) DEFAULT 'active',  -- active, paused, completed, archived
    context JSONB DEFAULT '{}',  -- Session context and state
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    INDEX idx_sessions_user_id (user_id),
    INDEX idx_sessions_project_id (project_id),
    INDEX idx_sessions_status (status),
    INDEX idx_sessions_created_at (created_at)
);

CREATE TRIGGER update_sessions_updated_at
    BEFORE UPDATE ON sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

**Rationale:**
- Session tracking for conversation continuity
- Optional project association
- JSONB context for flexible state storage
- Status tracking for lifecycle management
- Timestamps for analytics

#### 4.1.4 Messages Table

```sql
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL,  -- user, assistant, system, tool
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    token_count INTEGER,
    embedding VECTOR(1536),  -- pgvector extension
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_messages_session_id (session_id),
    INDEX idx_messages_role (role),
    INDEX idx_messages_created_at (created_at)
);
```

**Rationale:**
- Message history for conversation context
- Role-based message types
- Token count for cost tracking
- Vector embedding for semantic search
- Cascade delete for cleanup

#### 4.1.5 Memory Table

```sql
CREATE TABLE memory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    memory_type VARCHAR(50) NOT NULL,  -- semantic, episodic, procedural
    key VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    embedding VECTOR(1536),
    importance FLOAT DEFAULT 0.5,
    access_count INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id, project_id, key),
    INDEX idx_memory_user_id (user_id),
    INDEX idx_memory_project_id (project_id),
    INDEX idx_memory_type (memory_type),
    INDEX idx_memory_importance (importance),
    INDEX idx_memory_expires_at (expires_at)
);

CREATE TRIGGER update_memory_updated_at
    BEFORE UPDATE ON memory
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

**Rationale:**
- Multiple memory types for different use cases
- Importance scoring for retrieval prioritization
- Access tracking for memory optimization
- Expiration for automatic cleanup
- Vector embedding for semantic retrieval

#### 4.1.6 Jobs Table

```sql
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    job_type VARCHAR(100) NOT NULL,  -- indexing, embedding, analysis, etc.
    status VARCHAR(50) DEFAULT 'pending',  -- pending, running, completed, failed, cancelled
    priority INTEGER DEFAULT 5,
    payload JSONB DEFAULT '{}',
    result JSONB DEFAULT '{}',
    error_message TEXT,
    progress INTEGER DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_jobs_user_id (user_id),
    INDEX idx_jobs_project_id (project_id),
    INDEX idx_jobs_status (status),
    INDEX idx_jobs_job_type (job_type),
    INDEX idx_jobs_priority (priority),
    INDEX idx_jobs_created_at (created_at)
);

CREATE TRIGGER update_jobs_updated_at
    BEFORE UPDATE ON jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

**Rationale:**
- Background job tracking
- Priority-based scheduling
- Progress tracking for long-running jobs
- Error logging for debugging
- Timestamps for SLA monitoring

#### 4.1.7 Plugins Table

```sql
CREATE TABLE plugins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    version VARCHAR(50) NOT NULL,
    description TEXT,
    author VARCHAR(255),
    repository_url TEXT,
    is_active BOOLEAN DEFAULT true,
    is_builtin BOOLEAN DEFAULT false,
    config_schema JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_plugins_name (name),
    INDEX idx_plugins_is_active (is_active)
);

CREATE TRIGGER update_plugins_updated_at
    BEFORE UPDATE ON plugins
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

**Rationale:**
- Plugin registry and management
- Version tracking for updates
- Config schema for validation
- Built-in vs user plugin distinction

#### 4.1.8 User Plugin Config Table

```sql
CREATE TABLE user_plugin_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plugin_id UUID NOT NULL REFERENCES plugins(id) ON DELETE CASCADE,
    config JSONB NOT NULL DEFAULT '{}',
    is_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id, plugin_id),
    INDEX idx_user_plugin_config_user_id (user_id),
    INDEX idx_user_plugin_config_plugin_id (plugin_id)
);

CREATE TRIGGER update_user_plugin_config_updated_at
    BEFORE UPDATE ON user_plugin_config
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

**Rationale:**
- Per-user plugin configuration
- Enable/disable per user
- JSONB for flexible config storage

#### 4.1.9 API Keys Table

```sql
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    key_hash VARCHAR(255) NOT NULL UNIQUE,
    scopes TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    last_used_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_api_keys_user_id (user_id),
    INDEX idx_api_keys_key_hash (key_hash)
);
```

**Rationale:**
- API key management for programmatic access
- Scopes for permission granularity
- Hashed keys for security
- Expiration for automatic revocation

#### 4.1.10 Audit Log Table

```sql
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id UUID,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_audit_log_user_id (user_id),
    INDEX idx_audit_log_action (action),
    INDEX idx_audit_log_resource_type (resource_type),
    INDEX idx_audit_log_created_at (created_at)
);
```

**Rationale:**
- Comprehensive audit trail
- Security compliance
- Forensics and debugging
- IP and user agent tracking

### 4.2 Database Extensions

```sql
-- Enable vector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pg_trgm for fuzzy string matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';
```

### 4.3 Qdrant Vector Database Schema

#### 4.3.1 Code Embeddings Collection

```python
{
    "collection_name": "code_embeddings",
    "vectors": {
        "size": 1536,  # OpenAI embedding dimension
        "distance": "Cosine"
    },
    "payload": {
        "project_id": "uuid",
        "file_path": "string",
        "language": "string",
        "function_name": "string",
        "class_name": "string",
        "start_line": "integer",
        "end_line": "integer",
        "code_type": "string",  -- function, class, variable, comment
        "is_test": "boolean",
        "dependencies": "array<string>",
        "complexity": "float",
        "last_modified": "timestamp"
    }
}
```

#### 4.3.2 Documentation Embeddings Collection

```python
{
    "collection_name": "doc_embeddings",
    "vectors": {
        "size": 1536,
        "distance": "Cosine"
    },
    "payload": {
        "project_id": "uuid",
        "file_path": "string",
        "doc_type": "string",  -- README, API, inline, etc.
        "section": "string",
        "language": "string"
    }
}
```

#### 4.3.3 Memory Embeddings Collection

```python
{
    "collection_name": "memory_embeddings",
    "vectors": {
        "size": 1536,
        "distance": "Cosine"
    },
    "payload": {
        "user_id": "uuid",
        "project_id": "uuid",
        "memory_type": "string",
        "importance": "float",
        "access_count": "integer",
        "created_at": "timestamp"
    }
}
```

### 4.4 Redis Cache Schema

#### 4.4.1 Session Cache

```
Key: session:{session_id}
Type: Hash
Fields:
  - user_id: uuid
  - project_id: uuid
  - context: json
  - last_activity: timestamp
TTL: 3600 (1 hour)
```

#### 4.4.2 Rate Limiting

```
Key: rate_limit:{user_id}:{endpoint}
Type: String (counter)
TTL: 60 (1 minute window)
```

#### 4.4.3 Indexing Status

```
Key: indexing_status:{project_id}
Type: Hash
Fields:
  - status: string
  - progress: integer
  - files_processed: integer
  - total_files: integer
  - started_at: timestamp
TTL: 86400 (24 hours)
```

#### 4.4.4 Embedding Cache

```
Key: embedding:{content_hash}
Type: String (base64 encoded vector)
TTL: 604800 (7 days)
```

#### 4.4.5 Search Results Cache

```
Key: search:{query_hash}:{project_id}
Type: String (json)
TTL: 300 (5 minutes)
```

#### 4.4.6 Job Queue Locks

```
Key: job_lock:{job_id}
Type: String
TTL: 3600 (1 hour)
```

---

## 5. API Specification

### 5.1 API Design Principles

1. **RESTful Design:** Resource-oriented URLs
2. **Versioning:** URL-based versioning (/api/v1/)
3. **Consistent Responses:** Standardized response format
4. **Error Handling:** HTTP status codes + error details
5. **Pagination:** Cursor-based for large datasets
6. **Rate Limiting:** Per-user rate limits
7. **Authentication:** JWT Bearer tokens
8. **Validation:** Request validation with Pydantic
9. **Documentation:** OpenAPI/Swagger auto-generated
10. **Idempotency:** Safe retry mechanisms

### 5.2 Standard Response Format

```json
{
  "data": { /* response data */ },
  "meta": {
    "request_id": "uuid",
    "timestamp": "iso8601",
    "pagination": {
      "cursor": "string",
      "limit": 100,
      "has_more": false
    }
  },
  "errors": []
}
```

### 5.3 Error Response Format

```json
{
  "data": null,
  "meta": {
    "request_id": "uuid",
    "timestamp": "iso8601"
  },
  "errors": [
    {
      "code": "VALIDATION_ERROR",
      "message": "Invalid input",
      "details": {
        "field": "email",
        "issue": "Invalid email format"
      }
    }
  ]
}
```

### 5.4 Authentication Endpoints

#### 5.4.1 GitHub OAuth Initiate

```http
GET /api/v1/auth/github
```

**Response:** Redirect to GitHub OAuth page

#### 5.4.2 GitHub OAuth Callback

```http
GET /api/v1/auth/github/callback?code={code}
```

**Response:**
```json
{
  "data": {
    "access_token": "jwt_token",
    "refresh_token": "refresh_token",
    "user": {
      "id": "uuid",
      "username": "string",
      "email": "string",
      "avatar_url": "string"
    }
  }
}
```

#### 5.4.3 Refresh Token

```http
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refresh_token": "string"
}
```

**Response:**
```json
{
  "data": {
    "access_token": "jwt_token",
    "refresh_token": "refresh_token"
  }
}
```

#### 5.4.4 Logout

```http
POST /api/v1/auth/logout
Authorization: Bearer {token}
```

**Response:** 204 No Content

### 5.5 User Endpoints

#### 5.5.1 Get Current User

```http
GET /api/v1/users/me
Authorization: Bearer {token}
```

**Response:**
```json
{
  "data": {
    "id": "uuid",
    "username": "string",
    "email": "string",
    "avatar_url": "string",
    "full_name": "string",
    "bio": "string",
    "created_at": "iso8601"
  }
}
```

#### 5.5.2 Update User

```http
PATCH /api/v1/users/me
Authorization: Bearer {token}
Content-Type: application/json

{
  "full_name": "string",
  "bio": "string"
}
```

**Response:** Updated user object

#### 5.5.3 Delete User

```http
DELETE /api/v1/users/me
Authorization: Bearer {token}
```

**Response:** 204 No Content

### 5.6 Project Endpoints

#### 5.6.1 List Projects

```http
GET /api/v1/projects
Authorization: Bearer {token}
Query Params: ?cursor={cursor}&limit={limit}
```

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "string",
      "description": "string",
      "repository_url": "string",
      "branch": "string",
      "is_indexed": false,
      "index_status": "pending",
      "created_at": "iso8601"
    }
  ],
  "meta": {
    "pagination": {
      "cursor": "string",
      "limit": 100,
      "has_more": false
    }
  }
}
```

#### 5.6.2 Create Project

```http
POST /api/v1/projects
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "string",
  "description": "string",
  "repository_url": "string",
  "branch": "main"
}
```

**Response:** Created project object

#### 5.6.3 Get Project

```http
GET /api/v1/projects/{project_id}
Authorization: Bearer {token}
```

**Response:** Project object with metadata

#### 5.6.4 Update Project

```http
PATCH /api/v1/projects/{project_id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "string",
  "description": "string",
  "branch": "string"
}
```

**Response:** Updated project object

#### 5.6.5 Delete Project

```http
DELETE /api/v1/projects/{project_id}
Authorization: Bearer {token}
```

**Response:** 204 No Content

#### 5.6.6 Trigger Indexing

```http
POST /api/v1/projects/{project_id}/index
Authorization: Bearer {token}
```

**Response:**
```json
{
  "data": {
    "job_id": "uuid",
    "status": "pending"
  }
}
```

### 5.7 Session Endpoints

#### 5.7.1 List Sessions

```http
GET /api/v1/sessions
Authorization: Bearer {token}
Query Params: ?project_id={uuid}&cursor={cursor}&limit={limit}
```

**Response:** Paginated list of sessions

#### 5.7.2 Create Session

```http
POST /api/v1/sessions
Authorization: Bearer {token}
Content-Type: application/json

{
  "project_id": "uuid",
  "title": "string"
}
```

**Response:** Created session object

#### 5.7.3 Get Session

```http
GET /api/v1/sessions/{session_id}
Authorization: Bearer {token}
```

**Response:** Session object with messages

#### 5.7.4 Update Session

```http
PATCH /api/v1/sessions/{session_id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "string",
  "status": "paused"
}
```

**Response:** Updated session object

#### 5.7.5 Delete Session

```http
DELETE /api/v1/sessions/{session_id}
Authorization: Bearer {token}
```

**Response:** 204 No Content

### 5.8 Agent Endpoints

#### 5.8.1 Send Message (Streaming)

```http
POST /api/v1/agents/chat
Authorization: Bearer {token}
Content-Type: application/json

{
  "session_id": "uuid",
  "message": "string",
  "project_id": "uuid",
  "tools_enabled": ["file_read", "file_write", "terminal"],
  "stream": true
}
```

**Response:** Server-Sent Events (SSE) stream

#### 5.8.2 Execute Agent Task

```http
POST /api/v1/agents/execute
Authorization: Bearer {token}
Content-Type: application/json

{
  "session_id": "uuid",
  "task": "string",
  "project_id": "uuid",
  "agent_type": "coder"
}
```

**Response:**
```json
{
  "data": {
    "job_id": "uuid",
    "status": "pending"
  }
}
```

#### 5.8.3 Get Agent Status

```http
GET /api/v1/agents/status/{job_id}
Authorization: Bearer {token}
```

**Response:**
```json
{
  "data": {
    "job_id": "uuid",
    "status": "running",
    "progress": 50,
    "current_step": "Analyzing code",
    "result": {}
  }
}
```

### 5.9 Search Endpoints

#### 5.9.1 Semantic Search

```http
POST /api/v1/search/semantic
Authorization: Bearer {token}
Content-Type: application/json

{
  "query": "string",
  "project_id": "uuid",
  "filters": {
    "language": "python",
    "code_type": "function"
  },
  "limit": 10
}
```

**Response:**
```json
{
  "data": {
    "results": [
      {
        "file_path": "string",
        "content": "string",
        "score": 0.95,
        "start_line": 10,
        "end_line": 20,
        "metadata": {}
      }
    ]
  }
}
```

#### 5.9.2 Hybrid Search

```http
POST /api/v1/search/hybrid
Authorization: Bearer {token}
Content-Type: application/json

{
  "query": "string",
  "project_id": "uuid",
  "semantic_weight": 0.7,
  "keyword_weight": 0.3,
  "limit": 10
}
```

**Response:** Same format as semantic search

#### 5.9.3 Code Search by Pattern

```http
POST /api/v1/search/pattern
Authorization: Bearer {token}
Content-Type: application/json

{
  "pattern": "string",
  "project_id": "uuid",
  "file_pattern": "*.py",
  "limit": 100
}
```

**Response:** List of matching code snippets

### 5.10 Memory Endpoints

#### 5.10.1 Store Memory

```http
POST /api/v1/memory
Authorization: Bearer {token}
Content-Type: application/json

{
  "project_id": "uuid",
  "memory_type": "semantic",
  "key": "string",
  "content": "string",
  "importance": 0.8
}
```

**Response:** Created memory object

#### 5.10.2 Retrieve Memory

```http
GET /api/v1/memory
Authorization: Bearer {token}
Query Params: ?project_id={uuid}&type={type}&query={query}
```

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "key": "string",
      "content": "string",
      "memory_type": "semantic",
      "importance": 0.8,
      "created_at": "iso8601"
    }
  ]
}
```

#### 5.10.3 Delete Memory

```http
DELETE /api/v1/memory/{memory_id}
Authorization: Bearer {token}
```

**Response:** 204 No Content

### 5.11 Tool Endpoints

#### 5.11.1 List Available Tools

```http
GET /api/v1/tools
Authorization: Bearer {token}
```

**Response:**
```json
{
  "data": [
    {
      "name": "file_read",
      "description": "Read file contents",
      "parameters": {
        "file_path": "string"
      }
    }
  ]
}
```

#### 5.11.2 Execute Tool

```http
POST /api/v1/tools/execute
Authorization: Bearer {token}
Content-Type: application/json

{
  "tool_name": "file_read",
  "parameters": {
    "file_path": "string"
  },
  "project_id": "uuid"
}
```

**Response:**
```json
{
  "data": {
    "result": {},
    "execution_time": 0.5
  }
}
```

### 5.12 Git Endpoints

#### 5.12.1 Get Repository Status

```http
GET /api/v1/git/status/{project_id}
Authorization: Bearer {token}
```

**Response:**
```json
{
  "data": {
    "branch": "main",
    "modified": ["file1.py", "file2.py"],
    "untracked": ["new_file.py"],
    "ahead": 2,
    "behind": 0
  }
}
```

#### 5.12.2 Create Branch

```http
POST /api/v1/git/branch/{project_id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "branch_name": "feature/new-feature",
  "base_branch": "main"
}
```

**Response:** 204 No Content

#### 5.12.3 Commit Changes

```http
POST /api/v1/git/commit/{project_id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "message": "string",
  "files": ["file1.py", "file2.py"]
}
```

**Response:**
```json
{
  "data": {
    "commit_hash": "string",
    "branch": "string"
  }
}
```

#### 5.12.4 Push Changes

```http
POST /api/v1/git/push/{project_id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "branch": "feature/new-feature"
}
```

**Response:** 204 No Content

### 5.13 Job Endpoints

#### 5.13.1 List Jobs

```http
GET /api/v1/jobs
Authorization: Bearer {token}
Query Params: ?project_id={uuid}&status={status}&cursor={cursor}
```

**Response:** Paginated list of jobs

#### 5.13.2 Get Job

```http
GET /api/v1/jobs/{job_id}
Authorization: Bearer {token}
```

**Response:** Job object with status and result

#### 5.13.3 Cancel Job

```http
POST /api/v1/jobs/{job_id}/cancel
Authorization: Bearer {token}
```

**Response:** 204 No Content

### 5.14 WebSocket Endpoints

#### 5.14.1 Session WebSocket

```
WS /api/v1/ws/session/{session_id}
Authorization: Bearer {token} (via query param)
```

**Messages:**
- Client → Server: `{ "type": "message", "content": "string" }`
- Server → Client: `{ "type": "response", "content": "string", "done": false }`
- Server → Client: `{ "type": "tool_call", "tool": "string", "params": {} }`
- Server → Client: `{ "type": "error", "message": "string" }`

---

## 6. Agent Architecture

### 6.1 Multi-Agent System Design

The agent system uses a hierarchical multi-agent architecture with specialized roles:

```
┌─────────────────────────────────────────────────────────────┐
│                     Supervisor Agent                         │
│              (Orchestrates and delegates tasks)              │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼────────┐  ┌──────▼────────┐  ┌──────▼────────┐
│  Planner Agent │  │  Coder Agent  │  │ Reviewer Agent│
│  (Task         │  │  (Code        │  │  (Code        │
│   decomposition)│  │   generation) │  │   review)     │
└────────────────┘  └───────────────┘  └───────────────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
                    ┌───────▼────────┐
                    │  Tool Executor│
                    │  (Safe tool    │
                    │   execution)  │
                    └────────────────┘
```

### 6.2 Agent Definitions

#### 6.2.1 Supervisor Agent

**Responsibilities:**
- Analyze user requests
- Determine task complexity
- Delegate to appropriate specialized agents
- Monitor agent execution
- Handle failures and retries
- Aggregate results

**Capabilities:**
- Task classification
- Resource allocation
- Progress tracking
- Error recovery
- Result synthesis

**State:**
```python
{
    "current_task": "string",
    "active_agents": ["agent1", "agent2"],
    "agent_status": {
        "planner": "completed",
        "coder": "in_progress",
        "reviewer": "pending"
    },
    "intermediate_results": {},
    "final_result": null
}
```

#### 6.2.2 Planner Agent

**Responsibilities:**
- Decompose complex tasks into sub-tasks
- Identify dependencies between sub-tasks
- Estimate effort and resources
- Create execution plan
- Validate plan feasibility

**Capabilities:**
- Task analysis
- Dependency graph generation
- Resource estimation
- Plan optimization
- Risk assessment

**Output:**
```python
{
    "plan": {
        "steps": [
            {
                "id": "step1",
                "description": "Read and analyze file",
                "agent": "coder",
                "dependencies": [],
                "estimated_time": 30
            },
            {
                "id": "step2",
                "description": "Implement changes",
                "agent": "coder",
                "dependencies": ["step1"],
                "estimated_time": 120
            }
        ],
        "total_estimated_time": 150
    }
}
```

#### 6.2.3 Coder Agent

**Responsibilities:**
- Generate code based on requirements
- Modify existing code safely
- Understand code context
- Apply coding best practices
- Generate tests

**Capabilities:**
- Code generation
- Code modification
- Code understanding
- Test generation
- Documentation generation

**Tools Used:**
- `file_read`: Read file contents
- `file_write`: Write/modify files
- `search`: Search codebase
- `terminal_execute`: Run commands
- `git_commit`: Commit changes

#### 6.2.4 Reviewer Agent

**Responsibilities:**
- Review generated code
- Check for bugs
- Verify best practices
- Security analysis
- Performance assessment

**Capabilities:**
- Static analysis
- Security scanning
- Best practice checking
- Performance analysis
- Test coverage verification

**Output:**
```python
{
    "review": {
        "approved": true,
        "issues": [],
        "suggestions": [],
        "security_score": 9.5,
        "quality_score": 8.8
    }
}
```

#### 6.2.5 Search Agent

**Responsibilities:**
- Execute semantic search
- Perform pattern matching
- Find relevant code examples
- Locate documentation
- Identify dependencies

**Capabilities:**
- Semantic search
- Keyword search
- Pattern matching
- Dependency analysis
- Cross-reference finding

#### 6.2.6 Git Agent

**Responsibilities:**
- Manage git operations
- Handle branches
- Create commits
- Generate commit messages
- Manage PRs

**Capabilities:**
- Branch management
- Commit generation
- Diff analysis
- PR creation
- Conflict resolution

### 6.3 Agent Communication

Agents communicate through a shared state managed by LangGraph:

```python
class AgentState(TypedDict):
    """Shared state across all agents"""
    user_id: str
    project_id: str
    session_id: str
    current_task: str
    messages: List[Message]
    context: Dict[str, Any]
    tool_results: Dict[str, Any]
    plan: Optional[Plan]
    execution_status: str
    errors: List[Error]
```

### 6.4 Agent Selection Strategy

The supervisor uses the following logic to select agents:

```python
def select_agent(task: str, context: Dict) -> str:
    """Select appropriate agent based on task type"""
    
    task_type = classify_task(task)
    
    if task_type == "code_generation":
        return "coder"
    elif task_type == "code_review":
        return "reviewer"
    elif task_type == "search":
        return "search"
    elif task_type == "git_operation":
        return "git"
    elif task_type == "complex":
        # For complex tasks, use planner first
        return "planner"
    else:
        return "general"
```

### 6.5 Agent Failure Handling

```python
def handle_agent_failure(agent: str, error: Exception, state: AgentState) -> AgentState:
    """Handle agent failures with retry logic"""
    
    max_retries = 3
    retry_count = state.get("retry_counts", {}).get(agent, 0)
    
    if retry_count < max_retries:
        # Retry with modified context
        state["retry_counts"][agent] = retry_count + 1
        state["errors"].append({
            "agent": agent,
            "error": str(error),
            "retry": retry_count + 1
        })
        return state
    else:
        # Max retries exceeded, escalate to supervisor
        state["execution_status"] = "failed"
        state["errors"].append({
            "agent": agent,
            "error": str(error),
            "escalated": True
        })
        return state
```

---

## 7. LangGraph Workflow

### 7.1 Workflow Architecture

LangGraph provides the orchestration framework for multi-agent workflows. Workflows are defined as state graphs where nodes are agents and edges represent transitions.

### 7.2 Coding Workflow

```python
from langgraph.graph import StateGraph, END

def create_coding_workflow() -> StateGraph:
    """Create the main coding workflow"""
    
    workflow = StateGraph(AgentState)
    
    # Add nodes (agents)
    workflow.add_node("supervisor", supervisor_agent)
    workflow.add_node("planner", planner_agent)
    workflow.add_node("coder", coder_agent)
    workflow.add_node("reviewer", reviewer_agent)
    
    # Define edges
    workflow.set_entry_point("supervisor")
    
    # Supervisor decides next step
    workflow.add_conditional_edges(
        "supervisor",
        should_continue,
        {
            "plan": "planner",
            "code": "coder",
            "review": "reviewer",
            "end": END
        }
    )
    
    # Planner → Coder
    workflow.add_edge("planner", "coder")
    
    # Coder → Reviewer
    workflow.add_edge("coder", "reviewer")
    
    # Reviewer → Supervisor (for feedback loop)
    workflow.add_edge("reviewer", "supervisor")
    
    return workflow.compile()
```

### 7.3 Workflow States

#### 7.3.1 Initial State

```python
{
    "user_id": "uuid",
    "project_id": "uuid",
    "session_id": "uuid",
    "current_task": "Implement user authentication",
    "messages": [],
    "context": {},
    "tool_results": {},
    "plan": None,
    "execution_status": "pending",
    "errors": [],
    "retry_counts": {}
}
```

#### 7.3.2 Planning State

```python
{
    "current_task": "Implement user authentication",
    "plan": {
        "steps": [
            {"id": "1", "description": "Analyze existing auth", "agent": "coder"},
            {"id": "2", "description": "Create auth models", "agent": "coder"},
            {"id": "3", "description": "Implement auth endpoints", "agent": "coder"},
            {"id": "4", "description": "Add tests", "agent": "coder"},
            {"id": "5", "description": "Review implementation", "agent": "reviewer"}
        ]
    },
    "execution_status": "planning",
    "current_step": 0
}
```

#### 7.3.3 Execution State

```python
{
    "execution_status": "executing",
    "current_step": 2,
    "tool_results": {
        "file_read": {"success": true, "content": "..."},
        "file_write": {"success": true, "path": "auth.py"}
    },
    "messages": [
        {"role": "assistant", "content": "Creating auth models..."}
    ]
}
```

#### 7.3.4 Review State

```python
{
    "execution_status": "reviewing",
    "review_result": {
        "approved": false,
        "issues": [
            {"severity": "high", "message": "Missing input validation"}
        ],
        "suggestions": [
            {"message": "Add Pydantic models for validation"}
        ]
    }
}
```

#### 7.3.5 Completed State

```python
{
    "execution_status": "completed",
    "final_result": {
        "files_modified": ["auth.py", "models.py"],
        "commits_created": ["abc123"],
        "tests_added": 5,
        "review_score": 9.2
    }
}
```

### 7.4 Conditional Edge Logic

```python
def should_continue(state: AgentState) -> str:
    """Determine next step based on current state"""
    
    status = state.get("execution_status")
    
    if status == "completed":
        return "end"
    elif status == "failed":
        return "end"
    elif state.get("plan") is None:
        # Need to create a plan first
        return "plan"
    elif state.get("review_result", {}).get("approved") is False:
        # Review failed, go back to coding
        return "code"
    elif state.get("current_step", 0) < len(state.get("plan", {}).get("steps", [])):
        # Continue execution
        return "code"
    else:
        # All steps done, review
        return "review"
```

### 7.5 Workflow Persistence

Workflows are persisted to allow resumption:

```python
async def save_workflow_state(session_id: str, state: AgentState):
    """Save workflow state to database"""
    await redis.setex(
        f"workflow:{session_id}",
        3600,  # 1 hour TTL
        json.dumps(state)
    )

async def load_workflow_state(session_id: str) -> AgentState:
    """Load workflow state from database"""
    data = await redis.get(f"workflow:{session_id}")
    if data:
        return json.loads(data)
    return None
```

### 7.6 Workflow Monitoring

```python
def monitor_workflow(workflow_id: str):
    """Monitor workflow execution"""
    
    while True:
        state = get_workflow_state(workflow_id)
        
        # Update metrics
        metrics.gauge("workflow.progress", state.get("progress", 0))
        metrics.gauge("workflow.current_step", state.get("current_step", 0))
        
        if state.get("execution_status") in ["completed", "failed"]:
            break
        
        time.sleep(1)
```

---

## 8. Tool Framework

### 8.1 Tool Architecture

The tool framework provides a safe, extensible interface for agents to interact with the system:

```
┌─────────────────────────────────────────────────────────┐
│                    Tool Registry                          │
│         (Discovers and registers available tools)        │
└─────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼────────┐  ┌──────▼────────┐  ┌──────▼────────┐
│  File Tools    │  │ Terminal Tools│  │  Git Tools    │
│  - read        │  │ - execute     │  │ - commit      │
│  - write       │  │ - shell       │  │ - branch      │
│  - delete      │  │ - test        │  │ - push        │
└────────────────┘  └───────────────┘  └───────────────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
                    ┌───────▼────────┐
                    │ Tool Executor  │
                    │  - Validation  │
                    │  - Sandboxing  │
                    │  - Rate Limit  │
                    │  - Logging     │
                    └────────────────┘
```

### 8.2 Base Tool Interface

```python
from abc import ABC, abstractmethod
from pydantic import BaseModel, Field
from typing import Any, Dict, Optional

class ToolParameters(BaseModel):
    """Base class for tool parameters"""
    pass

class ToolResult(BaseModel):
    """Standard tool result format"""
    success: bool
    data: Optional[Any] = None
    error: Optional[str] = None
    execution_time: float
    metadata: Dict[str, Any] = {}

class BaseTool(ABC):
    """Base class for all tools"""
    
    name: str
    description: str
    parameters_schema: type[ToolParameters]
    
    def __init__(self, config: Dict[str, Any] = None):
        self.config = config or {}
    
    @abstractmethod
    async def execute(self, parameters: ToolParameters, context: Dict[str, Any]) -> ToolResult:
        """Execute the tool with given parameters"""
        pass
    
    def validate_parameters(self, parameters: Dict) -> ToolParameters:
        """Validate and parse parameters"""
        return self.parameters_schema(**parameters)
    
    def get_schema(self) -> Dict:
        """Get tool schema for LLM"""
        return {
            "name": self.name,
            "description": self.description,
            "parameters": self.parameters_schema.model_json_schema()
        }
```

### 8.3 Tool Implementations

#### 8.3.1 File Read Tool

```python
class FileReadParameters(ToolParameters):
    file_path: str = Field(..., description="Path to the file to read")
    start_line: Optional[int] = Field(None, description="Starting line number")
    end_line: Optional[int] = Field(None, description="Ending line number")

class FileReadTool(BaseTool):
    name = "file_read"
    description = "Read contents of a file"
    parameters_schema = FileReadParameters
    
    async def execute(self, parameters: FileReadParameters, context: Dict) -> ToolResult:
        start_time = time.time()
        
        try:
            # Validate path is within project
            project_path = context.get("project_path")
            full_path = self._validate_path(parameters.file_path, project_path)
            
            # Read file
            with open(full_path, 'r') as f:
                content = f.read()
            
            # Apply line range if specified
            if parameters.start_line or parameters.end_line:
                lines = content.split('\n')
                start = parameters.start_line or 0
                end = parameters.end_line or len(lines)
                content = '\n'.join(lines[start:end])
            
            return ToolResult(
                success=True,
                data={"content": content, "path": parameters.file_path},
                execution_time=time.time() - start_time
            )
            
        except Exception as e:
            return ToolResult(
                success=False,
                error=str(e),
                execution_time=time.time() - start_time
            )
    
    def _validate_path(self, file_path: str, project_path: str) -> str:
        """Ensure file path is within project directory"""
        full_path = os.path.abspath(os.path.join(project_path, file_path))
        if not full_path.startswith(project_path):
            raise ValueError("File path outside project directory")
        return full_path
```

#### 8.3.2 File Write Tool

```python
class FileWriteParameters(ToolParameters):
    file_path: str = Field(..., description="Path to the file to write")
    content: str = Field(..., description="Content to write")
    create_dirs: bool = Field(False, description="Create parent directories if needed")

class FileWriteTool(BaseTool):
    name = "file_write"
    description = "Write content to a file"
    parameters_schema = FileWriteParameters
    
    async def execute(self, parameters: FileWriteParameters, context: Dict) -> ToolResult:
        start_time = time.time()
        
        try:
            project_path = context.get("project_path")
            full_path = self._validate_path(parameters.file_path, project_path)
            
            # Create backup before writing
            backup_path = self._create_backup(full_path)
            
            # Create directories if needed
            if parameters.create_dirs:
                os.makedirs(os.path.dirname(full_path), exist_ok=True)
            
            # Write content
            with open(full_path, 'w') as f:
                f.write(parameters.content)
            
            return ToolResult(
                success=True,
                data={
                    "path": parameters.file_path,
                    "backup": backup_path,
                    "size": len(parameters.content)
                },
                execution_time=time.time() - start_time
            )
            
        except Exception as e:
            return ToolResult(
                success=False,
                error=str(e),
                execution_time=time.time() - start_time
            )
```

#### 8.3.3 Terminal Execute Tool

```python
class TerminalExecuteParameters(ToolParameters):
    command: str = Field(..., description="Command to execute")
    cwd: Optional[str] = Field(None, description="Working directory")
    timeout: int = Field(30, description="Timeout in seconds")

class TerminalExecuteTool(BaseTool):
    name = "terminal_execute"
    description = "Execute a terminal command in a sandboxed environment"
    parameters_schema = TerminalExecuteParameters
    
    async def execute(self, parameters: TerminalExecuteParameters, context: Dict) -> ToolResult:
        start_time = time.time()
        
        try:
            # Validate command against whitelist
            self._validate_command(parameters.command)
            
            # Execute in sandbox
            result = await self._execute_sandboxed(
                parameters.command,
                parameters.cwd or context.get("project_path"),
                parameters.timeout
            )
            
            return ToolResult(
                success=result.returncode == 0,
                data={
                    "stdout": result.stdout,
                    "stderr": result.stderr,
                    "returncode": result.returncode
                },
                execution_time=time.time() - start_time
            )
            
        except Exception as e:
            return ToolResult(
                success=False,
                error=str(e),
                execution_time=time.time() - start_time
            )
    
    def _validate_command(self, command: str):
        """Validate command against security rules"""
        dangerous_commands = ['rm -rf', 'mkfs', 'dd if=', 'chmod 777']
        for dangerous in dangerous_commands:
            if dangerous in command:
                raise ValueError(f"Dangerous command detected: {dangerous}")
```

#### 8.3.4 Search Tool

```python
class SearchParameters(ToolParameters):
    query: str = Field(..., description="Search query")
    project_id: str = Field(..., description="Project ID to search in")
    code_type: Optional[str] = Field(None, description="Filter by code type")
    language: Optional[str] = Field(None, description="Filter by language")
    limit: int = Field(10, description="Maximum results")

class SearchTool(BaseTool):
    name = "search"
    description = "Search code using semantic and keyword search"
    parameters_schema = SearchParameters
    
    def __init__(self, search_service):
        super().__init__()
        self.search_service = search_service
    
    async def execute(self, parameters: SearchParameters, context: Dict) -> ToolResult:
        start_time = time.time()
        
        try:
            results = await self.search_service.hybrid_search(
                query=parameters.query,
                project_id=parameters.project_id,
                filters={
                    "code_type": parameters.code_type,
                    "language": parameters.language
                },
                limit=parameters.limit
            )
            
            return ToolResult(
                success=True,
                data={"results": results, "count": len(results)},
                execution_time=time.time() - start_time
            )
            
        except Exception as e:
            return ToolResult(
                success=False,
                error=str(e),
                execution_time=time.time() - start_time
            )
```

### 8.4 Tool Registry

```python
class ToolRegistry:
    """Registry for managing available tools"""
    
    def __init__(self):
        self._tools: Dict[str, BaseTool] = {}
    
    def register(self, tool: BaseTool):
        """Register a tool"""
        self._tools[tool.name] = tool
    
    def get(self, name: str) -> Optional[BaseTool]:
        """Get a tool by name"""
        return self._tools.get(name)
    
    def list_tools(self) -> List[Dict]:
        """List all available tools with schemas"""
        return [tool.get_schema() for tool in self._tools.values()]
    
    def get_tools_for_agent(self, agent_type: str) -> List[BaseTool]:
        """Get tools available for a specific agent type"""
        tool_permissions = {
            "coder": ["file_read", "file_write", "search", "terminal_execute"],
            "reviewer": ["file_read", "search"],
            "planner": ["file_read", "search"],
            "git": ["git_commit", "git_branch", "git_push"]
        }
        
        allowed = tool_permissions.get(agent_type, [])
        return [self._tools[name] for name in allowed if name in self._tools]
```

### 8.5 Tool Executor

```python
class ToolExecutor:
    """Executes tools with safety measures"""
    
    def __init__(self, registry: ToolRegistry, rate_limiter):
        self.registry = registry
        self.rate_limiter = rate_limiter
    
    async def execute(
        self,
        tool_name: str,
        parameters: Dict,
        context: Dict,
        agent_type: str
    ) -> ToolResult:
        """Execute a tool with safety checks"""
        
        # Rate limiting
        await self.rate_limiter.check_limit(context["user_id"], tool_name)
        
        # Get tool
        tool = self.registry.get(tool_name)
        if not tool:
            return ToolResult(success=False, error=f"Tool not found: {tool_name}")
        
        # Check agent permissions
        allowed_tools = self.registry.get_tools_for_agent(agent_type)
        if tool not in allowed_tools:
            return ToolResult(success=False, error="Agent not authorized for this tool")
        
        # Validate parameters
        try:
            validated_params = tool.validate_parameters(parameters)
        except Exception as e:
            return ToolResult(success=False, error=f"Invalid parameters: {str(e)}")
        
        # Execute tool
        result = await tool.execute(validated_params, context)
        
        # Log execution
        await self._log_execution(tool_name, parameters, result, context)
        
        return result
    
    async def _log_execution(self, tool_name: str, params: Dict, result: ToolResult, context: Dict):
        """Log tool execution for audit trail"""
        log_entry = {
            "tool_name": tool_name,
            "parameters": params,
            "success": result.success,
            "execution_time": result.execution_time,
            "user_id": context.get("user_id"),
            "session_id": context.get("session_id"),
            "timestamp": datetime.utcnow().isoformat()
        }
        # Send to logging system
```

### 8.6 Tool Sandboxing

Tool execution is sandboxed using:

1. **Path Validation:** All file operations restricted to project directory
2. **Command Whitelisting:** Dangerous commands blocked
3. **Resource Limits:** CPU, memory, and time limits enforced
4. **Network Restrictions:** Network access limited or disabled
5. **Process Isolation:** Commands run in isolated process

```python
class SandboxConfig:
    """Sandbox configuration"""
    
    MAX_CPU_TIME = 30  # seconds
    MAX_MEMORY = 512 * 1024 * 1024  # 512 MB
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
    ALLOWED_NETWORK = False
    ALLOWED_COMMANDS = [
        'git', 'python', 'npm', 'node', 'go', 'rustc',
        'ls', 'cat', 'grep', 'find', 'head', 'tail'
    ]
```

---

## 9. Memory Architecture

### 9.1 Memory System Overview

The memory system provides persistent storage and retrieval of information across sessions:

```
┌─────────────────────────────────────────────────────────┐
│                  Memory Manager                          │
│         (Coordinates all memory operations)              │
└─────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼────────┐  ┌──────▼────────┐  ┌──────▼────────┐
│ Short-term     │  │ Long-term     │  │ Episodic      │
│ Memory         │  │ Memory        │  │ Memory        │
│  - Session     │  │  - User       │  │  - Events     │
│    context     │  │    prefs      │  │  - Timeline   │
│  - Recent      │  │  - Patterns   │  │  - Outcomes   │
│    messages    │  │  - Knowledge  │  │               │
└────────────────┘  └───────────────┘  └───────────────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
                    ┌───────▼────────┐
                    │  Memory Store  │
                    │  - PostgreSQL │
                    │  - Qdrant     │
                    │  - Redis      │
                    └────────────────┘
```

### 9.2 Memory Types

#### 9.2.1 Short-term Memory

**Purpose:** Store session-specific context and recent interactions

**Storage:** Redis (fast access, session-scoped)

**TTL:** 1 hour after session ends

**Structure:**
```python
{
    "session_id": "uuid",
    "messages": [
        {"role": "user", "content": "...", "timestamp": "..."},
        {"role": "assistant", "content": "...", "timestamp": "..."}
    ],
    "current_context": {
        "active_file": "main.py",
        "cursor_position": {"line": 10, "column": 5},
        "recent_edits": [...]
    },
    "tool_results": {},
    "intermediate_state": {}
}
```

**Operations:**
- `add_message(message)`: Add message to history
- `get_context()`: Get current context
- `update_context(updates)`: Update context
- `clear()`: Clear session memory

#### 9.2.2 Long-term Memory

**Purpose:** Store persistent knowledge across sessions

**Storage:** PostgreSQL + Qdrant (for semantic search)

**Structure:**
```python
{
    "user_id": "uuid",
    "project_id": "uuid",
    "memory_type": "semantic",  # or "procedural"
    "key": "unique_key",
    "content": "memory content",
    "embedding": [0.1, 0.2, ...],  # Vector embedding
    "importance": 0.8,  # 0-1 score
    "access_count": 10,
    "last_accessed": "timestamp",
    "metadata": {}
}
```

**Memory Categories:**
- **User Preferences:** Coding style, preferred frameworks
- **Project Knowledge:** Architecture, patterns, conventions
- **Code Patterns:** Common patterns used in project
- **Procedural Knowledge:** How to perform specific tasks
- **Best Practices:** Project-specific best practices

**Operations:**
- `store(memory)`: Store new memory
- `retrieve(query, filters)`: Retrieve relevant memories
- `update(key, updates)`: Update existing memory
- `delete(key)`: Delete memory
- `consolidate()`: Merge similar memories

#### 9.2.3 Episodic Memory

**Purpose:** Store specific events and their outcomes

**Storage:** PostgreSQL

**Structure:**
```python
{
    "user_id": "uuid",
    "project_id": "uuid",
    "episode_id": "uuid",
    "timestamp": "timestamp",
    "event_type": "code_change",  # or "error", "success", etc.
    "context": {
        "task": "...",
        "files_modified": [...],
        "tools_used": [...]
    },
    "outcome": {
        "success": true,
        "errors": [],
        "metrics": {}
    },
    "lessons_learned": []
}
```

**Operations:**
- `record_episode(episode)`: Record an event
- `get_episodes(filters)`: Retrieve episodes
- `analyze_patterns()`: Analyze patterns across episodes
- `get_similar_episodes(context)`: Find similar past events

### 9.3 Memory Retrieval

#### 9.3.1 Semantic Retrieval

```python
async def retrieve_semantic_memory(
    query: str,
    user_id: str,
    project_id: Optional[str] = None,
    limit: int = 10
) -> List[Memory]:
    """Retrieve memories using semantic search"""
    
    # Generate query embedding
    query_embedding = await embedding_service.embed(query)
    
    # Search Qdrant
    results = await qdrant_client.search(
        collection_name="memory_embeddings",
        query_vector=query_embedding,
        query_filter={
            "must": [
                {"key": "user_id", "match": {"value": user_id}}
            ]
        },
        limit=limit
    )
    
    # Return memories with scores
    return [
        Memory(
            content=r.payload["content"],
            score=r.score,
            metadata=r.payload
        )
        for r in results
    ]
```

#### 9.3.2 Hybrid Retrieval

```python
async def retrieve_memory_hybrid(
    query: str,
    user_id: str,
    project_id: Optional[str] = None,
    semantic_weight: float = 0.7,
    keyword_weight: float = 0.3
) -> List[Memory]:
    """Retrieve memories using hybrid search"""
    
    # Semantic search
    semantic_results = await retrieve_semantic_memory(query, user_id, project_id)
    
    # Keyword search
    keyword_results = await retrieve_keyword_memory(query, user_id, project_id)
    
    # Combine and re-rank
    combined = []
    for mem in semantic_results:
        mem.score = mem.score * semantic_weight
        combined.append(mem)
    
    for mem in keyword_results:
        mem.score = mem.score * keyword_weight
        combined.append(mem)
    
    # Sort by combined score
    combined.sort(key=lambda x: x.score, reverse=True)
    
    return combined[:10]
```

### 9.4 Memory Consolidation

```python
async def consolidate_memories(user_id: str):
    """Consolidate similar memories to reduce redundancy"""
    
    # Get all memories for user
    memories = await get_all_memories(user_id)
    
    # Cluster similar memories
    clusters = cluster_similar_memories(memories)
    
    # For each cluster, create consolidated memory
    for cluster in clusters:
        if len(cluster) > 1:
            consolidated = merge_memories(cluster)
            
            # Delete old memories
            for mem in cluster:
                await delete_memory(mem.key)
            
            # Store consolidated memory
            await store_memory(consolidated)
```

### 9.5 Memory Importance Scoring

```python
def calculate_importance(memory: Memory) -> float:
    """Calculate importance score for memory"""
    
    score = 0.5  # Base score
    
    # Factor in access frequency
    score += min(memory.access_count * 0.05, 0.3)
    
    # Factor in recency
    days_since_access = (datetime.now() - memory.last_accessed).days
    score += max(0.2 - (days_since_access * 0.01), 0)
    
    # Factor in content length (longer = more important)
    score += min(len(memory.content) * 0.0001, 0.1)
    
    # Factor in explicit importance if set
    if memory.importance:
        score = (score + memory.importance) / 2
    
    return min(score, 1.0)
```

### 9.6 Memory Pruning

```python
async def prune_memories(user_id: str):
    """Remove low-importance or expired memories"""
    
    memories = await get_all_memories(user_id)
    
    for memory in memories:
        # Remove if expired
        if memory.expires_at and datetime.now() > memory.expires_at:
            await delete_memory(memory.key)
            continue
        
        # Remove if low importance and old
        importance = calculate_importance(memory)
        if importance < 0.2 and memory.access_count < 5:
            await delete_memory(memory.key)
            continue
```

---

## 10. Security Model

### 10.1 Security Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Security Layer                         │
└─────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼────────┐  ┌──────▼────────┐  ┌──────▼────────┐
│ Authentication │  │ Authorization │  │ Audit Logging │
│  - JWT         │  │  - RBAC       │  │  - All actions│
│  - OAuth       │  │  - ABAC       │  │  - Immutable  │
│  - MFA (future)│  │  - Scopes     │  │               │
└────────────────┘  └───────────────┘  └───────────────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
                    ┌───────▼────────┐
                    │ Data Protection│
                    │  - Encryption  │
                    │  - Hashing     │
                    │  - Secrets Mgmt│
                    └────────────────┘
```

### 10.2 Authentication

#### 10.2.1 GitHub OAuth Flow

1. User clicks "Login with GitHub"
2. Redirect to GitHub OAuth authorize endpoint
3. User authorizes application
4. GitHub redirects to callback with code
5. Backend exchanges code for access token
4. Backend fetches user profile from GitHub
5. Backend creates/updates user in database
6. Backend issues JWT token
7. Frontend stores token for subsequent requests

#### 10.2.2 JWT Token Structure

```python
{
    "header": {
        "alg": "RS256",
        "typ": "JWT"
    },
    "payload": {
        "sub": "user_id",
        "iss": "ai-coding-agent",
        "aud": "api",
        "exp": 1234567890,
        "iat": 1234567890,
        "github_id": "github_user_id",
        "scopes": ["read", "write", "execute"]
    }
}
```

**Token Types:**
- **Access Token:** Short-lived (15 minutes), used for API calls
- **Refresh Token:** Long-lived (30 days), used to get new access tokens

#### 10.2.3 Token Storage

- **Frontend:** HttpOnly, Secure, SameSite cookies
- **Backend:** Redis blacklist for revoked tokens

### 10.3 Authorization

#### 10.3.1 Role-Based Access Control (RBAC)

**Roles:**
- **User:** Basic access to own projects
- **Admin:** Full system access
- **Service:** Service account for background jobs

**Permissions:**
```python
PERMISSIONS = {
    "user": [
        "project:read",
        "project:create",
        "project:update",
        "project:delete",
        "session:read",
        "session:create",
        "agent:execute",
        "tool:execute"
    ],
    "admin": [
        "user:read",
        "user:update",
        "user:delete",
        "system:read",
        "system:configure"
    ],
    "service": [
        "project:index",
        "job:execute",
        "memory:write"
    ]
}
```

#### 10.3.2 Attribute-Based Access Control (ABAC)

Additional context-based permissions:

```python
def check_permission(
    user: User,
    resource: str,
    action: str,
    context: Dict
) -> bool:
    """Check if user has permission for action on resource"""
    
    # Check RBAC
    if action not in user.permissions:
        return False
    
    # Check resource ownership
    if resource.startswith("project:"):
        project_id = context.get("project_id")
        if project_id and not owns_project(user.id, project_id):
            return False
    
    # Check additional constraints
    if action == "tool:execute":
        tool_name = context.get("tool_name")
        if tool_name in DANGEROUS_TOOLS and not user.is_admin:
            return False
    
    return True
```

### 10.4 Data Protection

#### 10.4.1 Encryption

**At Rest:**
- Database: PostgreSQL transparent data encryption (TDE)
- Storage: MinIO server-side encryption
- Secrets: Encrypted with AES-256

**In Transit:**
- TLS 1.3 for all connections
- Certificate pinning for production

#### 10.4.2 Hashing

- Passwords: Not stored (OAuth only)
- API Keys: SHA-256 with salt
- Sensitive data: SHA-256 for comparison

#### 10.4.3 Secrets Management

```python
# Use environment variables for local dev
# Use HashiCorp Vault or AWS Secrets Manager for production

class SecretsManager:
    """Manage secrets securely"""
    
    def __init__(self):
        self.vault_client = VaultClient()
    
    def get_secret(self, key: str) -> str:
        """Retrieve secret from vault"""
        return self.vault_client.read_secret(key)
    
    def set_secret(self, key: str, value: str):
        """Store secret in vault"""
        self.vault_client.write_secret(key, value)
```

### 10.5 Input Validation

#### 10.5.1 Request Validation

All API requests validated using Pydantic:

```python
class CreateProjectRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)
    repository_url: HttpUrl
    branch: str = Field(default="main", max_length=100)
    
    @validator('repository_url')
    def validate_github_url(cls, v):
        if not v.startswith(('https://github.com/', 'git@github.com:')):
            raise ValueError('Only GitHub repositories are supported')
        return v
```

#### 10.5.2 SQL Injection Prevention

- Use parameterized queries (SQLAlchemy)
- Never concatenate SQL strings
- Input sanitization for free-form text

#### 10.5.3 XSS Prevention

- Sanitize all user-generated content
- Content Security Policy (CSP) headers
- Escape HTML in frontend

### 10.6 Rate Limiting

```python
class RateLimiter:
    """Rate limiting using Redis"""
    
    async def check_limit(self, user_id: str, endpoint: str) -> bool:
        """Check if user is within rate limits"""
        
        key = f"rate_limit:{user_id}:{endpoint}"
        current = await redis.incr(key)
        
        if current == 1:
            await redis.expire(key, 60)  # 1 minute window
        
        limits = {
            "api/v1/agents/chat": 100,  # 100 requests per minute
            "api/v1/tools/execute": 50,
            "default": 1000
        }
        
        limit = limits.get(endpoint, limits["default"])
        
        if current > limit:
            raise RateLimitExceeded(limit)
        
        return True
```

### 10.7 Audit Logging

```python
async def log_audit_event(
    user_id: str,
    action: str,
    resource_type: str,
    resource_id: str,
    metadata: Dict
):
    """Log audit event"""
    
    await audit_log.create({
        "user_id": user_id,
        "action": action,
        "resource_type": resource_type,
        "resource_id": resource_id,
        "ip_address": get_client_ip(),
        "user_agent": get_user_agent(),
        "metadata": metadata
    })
```

**Logged Events:**
- All authentication attempts
- All resource modifications
- All tool executions
- All git operations
- All admin actions

### 10.8 Security Headers

```python
SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "Content-Security-Policy": "default-src 'self'",
    "Referrer-Policy": "strict-origin-when-cross-origin"
}
```

### 10.9 Dependency Security

- **SCA:** Regular dependency scanning with Snyk or Dependabot
- **SBOM:** Generate Software Bill of Materials
- **Updates:** Automated dependency updates with security patches
- **Pinning:** Lock file for reproducible builds

---

## 11. Logging and Observability

### 11.1 Observability Stack

```
┌─────────────────────────────────────────────────────────┐
│                   Application                            │
└─────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼────────┐  ┌──────▼────────┐  ┌──────▼────────┐
│   Structured   │  │   Metrics     │  │   Tracing     │
│    Logging     │  │  (Prometheus) │  │ (OpenTelemetry)│
│  (JSON format) │  │               │  │               │
└────────────────┘  └───────────────┘  └───────────────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼────────┐  ┌──────▼────────┐  ┌──────▼────────┐
│   Loki /      │  │  Prometheus   │  │   Jaeger /    │
│   ELK Stack   │  │               │  │   Tempo       │
│               │  │               │  │               │
└────────────────┘  └───────────────┘  └───────────────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
                    ┌───────▼────────┐
                    │    Grafana     │
                    │  (Dashboards)  │
                    └────────────────┘
```

### 11.2 Structured Logging

#### 11.2.1 Log Format

```json
{
  "timestamp": "2026-07-03T10:30:00.000Z",
  "level": "INFO",
  "service": "agent-service",
  "environment": "production",
  "request_id": "uuid",
  "user_id": "uuid",
  "session_id": "uuid",
  "message": "Agent execution started",
  "context": {
    "agent_type": "coder",
    "task": "Implement feature"
  },
  "tags": ["agent", "execution"]
}
```

#### 11.2.2 Log Levels

- **ERROR:** Errors requiring attention
- **WARN:** Warning conditions
- **INFO:** Normal operational messages
- **DEBUG:** Detailed debugging information

#### 11.2.3 Logging Implementation

```python
import structlog
from opentelemetry import trace

logger = structlog.get_logger()

async def execute_agent(agent_type: str, task: str):
    """Execute agent with logging"""
    
    span = trace.get_current_span()
    request_id = get_request_id()
    
    logger.info(
        "agent_execution_started",
        agent_type=agent_type,
        task=task,
        request_id=request_id
    )
    
    try:
        result = await agent.execute(task)
        
        logger.info(
            "agent_execution_completed",
            agent_type=agent_type,
            result=result,
            duration=span.get_span_context().elapsed_time
        )
        
        return result
        
    except Exception as e:
        logger.error(
            "agent_execution_failed",
            agent_type=agent_type,
            error=str(e),
            error_type=type(e).__name__
        )
        raise
```

### 11.3 Metrics

#### 11.3.1 Key Metrics

**Business Metrics:**
- `agent_executions_total`: Total agent executions
- `agent_execution_duration`: Agent execution time
- `tool_executions_total`: Tool executions by tool name
- `search_requests_total`: Search requests
- `search_latency`: Search response time

**System Metrics:**
- `http_requests_total`: HTTP requests by endpoint
- `http_request_duration`: HTTP request duration
- `db_query_duration`: Database query duration
- `cache_hit_rate`: Cache hit rate
- `queue_length`: Background queue length

**Custom Metrics:**
- `memory_operations_total`: Memory operations
- `embedding_generation_duration`: Embedding generation time
- `indexing_progress`: Repository indexing progress

#### 11.3.2 Prometheus Integration

```python
from prometheus_client import Counter, Histogram, Gauge

# Define metrics
agent_executions = Counter(
    'agent_executions_total',
    'Total agent executions',
    ['agent_type', 'status']
)

agent_duration = Histogram(
    'agent_execution_duration_seconds',
    'Agent execution duration',
    ['agent_type']
)

tool_executions = Counter(
    'tool_executions_total',
    'Total tool executions',
    ['tool_name', 'status']
)

search_latency = Histogram(
    'search_latency_seconds',
    'Search latency',
    ['search_type']
)

# Use in code
async def execute_agent(agent_type: str, task: str):
    start_time = time.time()
    
    try:
        result = await agent.execute(task)
        agent_executions.labels(agent_type=agent_type, status='success').inc()
        return result
    except Exception as e:
        agent_executions.labels(agent_type=agent_type, status='error').inc()
        raise
    finally:
        agent_duration.labels(agent_type=agent_type).observe(time.time() - start_time)
```

### 11.4 Tracing

#### 11.4.1 OpenTelemetry Setup

```python
from opentelemetry import trace
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
from opentelemetry.exporter.jaeger import JaegerExporter
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor

# Setup tracing
trace.set_tracer_provider(TracerProvider())
jaeger_exporter = JaegerExporter(
    agent_host_name="jaeger",
    agent_port=6831,
)

trace.get_tracer_provider().add_span_processor(
    BatchSpanProcessor(jaeger_exporter)
)

# Instrument FastAPI
FastAPIInstrumentor.instrument_app(app)

# Instrument HTTP client
HTTPXClientInstrumentor().instrument()
```

#### 11.4.2 Span Creation

```python
tracer = trace.get_tracer(__name__)

async def execute_workflow(session_id: str):
    """Execute workflow with tracing"""
    
    with tracer.start_as_current_span("workflow_execution") as span:
        span.set_attribute("session_id", session_id)
        
        # Planning phase
        with tracer.start_as_current_span("planning"):
            plan = await planner_agent.plan()
            span.set_attribute("plan_steps", len(plan.steps))
        
        # Execution phase
        with tracer.start_as_current_span("execution"):
            for step in plan.steps:
                with tracer.start_as_current_span("step_execution") as step_span:
                    step_span.set_attribute("step_id", step.id)
                    result = await execute_step(step)
                    step_span.set_attribute("success", result.success)
```

### 11.5 Health Checks

```python
from fastapi import FastAPI
from fastapi.responses import JSONResponse

app = FastAPI()

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    
    checks = {
        "database": await check_database(),
        "redis": await check_redis(),
        "qdrant": await check_qdrant(),
        "rabbitmq": await check_rabbitmq()
    }
    
    healthy = all(checks.values())
    
    return JSONResponse(
        status_code=200 if healthy else 503,
        content={
            "status": "healthy" if healthy else "unhealthy",
            "checks": checks
        }
    )

@app.get("/health/ready")
async def readiness_check():
    """Readiness check - includes dependencies"""
    return await health_check()

@app.get("/health/live")
async def liveness_check():
    """Liveness check - basic server health"""
    return {"status": "alive"}
```

### 11.6 Alerting

**Alert Rules:**

```yaml
# Prometheus alert rules
groups:
  - name: ai_coding_agent
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        annotations:
          summary: "High error rate detected"
      
      - alert: SlowResponseTime
        expr: histogram_quantile(0.95, http_request_duration_seconds) > 1
        for: 5m
        annotations:
          summary: "95th percentile latency > 1s"
      
      - alert: QueueBacklog
        expr: queue_length > 1000
        for: 10m
        annotations:
          summary: "Background queue backlog"
      
      - alert: DatabaseConnectionPoolExhausted
        expr: db_connection_pool_usage > 0.9
        for: 5m
        annotations:
          summary: "Database connection pool nearly exhausted"
```

### 11.7 Dashboards

**Grafana Dashboards:**

1. **System Overview:**
   - Request rate
   - Error rate
   - Latency (p50, p95, p99)
   - Active sessions

2. **Agent Performance:**
   - Agent execution rate
   - Agent success rate
   - Agent duration by type
   - Tool execution rate

3. **Infrastructure:**
   - CPU, memory, disk usage
   - Database connection pool
   - Cache hit rate
   - Queue length

4. **Business Metrics:**
   - Active users
   - Projects indexed
   - Search queries
   - Memory operations

---

## 12. Deployment Architecture

### 12.1 Deployment Environments

```
┌─────────────────────────────────────────────────────────┐
│                    Development                           │
│  - Local Docker Compose                                 │
│  - Hot reloading                                         │
│  - Debug mode enabled                                    │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                     Staging                              │
│  - Cloud deployment (AWS/GCP)                            │
│  - Production-like configuration                         │
│  - Integration tests                                     │
│  - Load testing                                          │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                    Production                             │
│  - Multi-region deployment                               │
│  - Auto-scaling                                          │
│  - CDN for static assets                                 │
│  - Disaster recovery                                     │
└─────────────────────────────────────────────────────────┘
```

### 12.2 Production Architecture

```
┌─────────────────────────────────────────────────────────┐
│                        CDN                               │
│                    (CloudFront)                          │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                   Load Balancer                          │
│                    (ALB/NLB)                             │
└─────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼────────┐  ┌──────▼────────┐  ┌──────▼────────┐
│  Frontend      │  │  Backend      │  │  Workers      │
│  (Next.js)     │  │  (FastAPI)    │  │  (Celery)     │
│  Auto-scaling  │  │  Auto-scaling │  │  Auto-scaling │
└────────────────┘  └───────────────┘  └───────────────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼────────┐  ┌──────▼────────┐  ┌──────▼────────┐
│  PostgreSQL    │  │    Redis      │  │    Qdrant     │
│  (RDS/Cloud    │  │   (ElastiCache│  │   (Managed)   │
│   SQL)         │  │    /Memcached)│  │               │
└────────────────┘  └───────────────┘  └───────────────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼────────┐  ┌──────▼────────┐  ┌──────▼────────┐
│   MinIO        │  │   RabbitMQ    │  │   Monitoring  │
│   (S3/GCS)     │  │   (MQ/CloudMQ)│  │   (Prometheus)│
└────────────────┘  └───────────────┘  └───────────────┘
```

### 12.3 Scaling Strategy

#### 12.3.1 Horizontal Scaling

**Frontend:**
- Stateless design allows horizontal scaling
- Auto-scaling based on CPU/memory
- Session state in Redis

**Backend:**
- Stateless API design
- Auto-scaling based on request rate
- Connection pooling for databases

**Workers:**
- Scale based on queue length
- Priority queues for important jobs
- Worker-specific scaling policies

#### 12.3.2 Database Scaling

**PostgreSQL:**
- Read replicas for read-heavy workloads
- Connection pooling (PgBouncer)
- Query optimization and indexing

**Redis:**
- Cluster mode for horizontal scaling
- Read replicas for caching
- Persistence configuration

**Qdrant:**
- Distributed mode for large datasets
- Sharding by project_id
- Replication for high availability

### 12.4 High Availability

#### 12.4.1 Multi-Region Deployment

```
Region US-East
├── Frontend (3 instances)
├── Backend (3 instances)
├── Workers (3 instances)
├── PostgreSQL (Primary + 2 replicas)
├── Redis (Cluster)
└── Qdrant (Cluster)

Region US-West
├── Frontend (3 instances)
├── Backend (3 instances)
├── Workers (3 instances)
├── PostgreSQL (Read replica)
├── Redis (Replica)
└── Qdrant (Replica)
```

#### 12.4.2 Disaster Recovery

- **RPO:** 15 minutes (maximum data loss)
- **RTO:** 1 hour (recovery time objective)
- **Backups:** Daily snapshots, continuous WAL archiving
- **Failover:** Automated failover for critical services

### 12.5 CI/CD Pipeline

See Section 14 for detailed CI/CD workflow.

---

## 13. Docker Compose Architecture

### 13.1 Local Development Setup

```yaml
version: '3.8'

services:
  # Frontend
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:8000
    volumes:
      - ./frontend:/app
      - /app/node_modules
    depends_on:
      - backend

  # Backend
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://user:password@postgres:5432/ai_coding_agent
      - REDIS_URL=redis://redis:6379
      - QDRANT_URL=http://qdrant:6333
      - RABBITMQ_URL=amqp://rabbitmq:5672
      - MINIO_ENDPOINT=minio:9000
      - MINIO_ACCESS_KEY=minioadmin
      - MINIO_SECRET_KEY=minioadmin
    volumes:
      - ./backend:/app
      - ./repositories:/repositories
    depends_on:
      - postgres
      - redis
      - qdrant
      - rabbitmq
      - minio

  # PostgreSQL
  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=ai_coding_agent
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./infrastructure/postgres/init.sql:/docker-entrypoint-initdb.d/init.sql

  # Redis
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  # Qdrant
  qdrant:
    image: qdrant/qdrant:latest
    ports:
      - "6333:6333"
      - "6334:6334"
    volumes:
      - qdrant_data:/qdrant/storage

  # RabbitMQ
  rabbitmq:
    image: rabbitmq:3-management-alpine
    ports:
      - "5672:5672"
      - "15672:15672"
    environment:
      - RABBITMQ_DEFAULT_USER=admin
      - RABBITMQ_DEFAULT_PASS=admin
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq

  # MinIO
  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      - MINIO_ROOT_USER=minioadmin
      - MINIO_ROOT_PASSWORD=minioadmin
    volumes:
      - minio_data:/data

  # Prometheus
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./infrastructure/monitoring/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus

  # Grafana
  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana
      - ./infrastructure/monitoring/grafana/dashboards:/etc/grafana/provisioning/dashboards
    depends_on:
      - prometheus

  # Jaeger
  jaeger:
    image: jaegertracing/all-in-one:latest
    ports:
      - "16686:16686"
      - "14268:14268"
    environment:
      - COLLECTOR_OTLP_ENABLED=true

volumes:
  postgres_data:
  redis_data:
  qdrant_data:
  rabbitmq_data:
  minio_data:
  prometheus_data:
  grafana_data:
```

### 13.2 Production Docker Compose

```yaml
version: '3.8'

services:
  # Nginx reverse proxy
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./infrastructure/nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./infrastructure/nginx/ssl:/etc/nginx/ssl
    depends_on:
      - frontend
      - backend

  # Frontend (production build)
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.prod
    environment:
      - NEXT_PUBLIC_API_URL=https://api.example.com
    depends_on:
      - backend

  # Backend
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.prod
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - QDRANT_URL=${QDRANT_URL}
      - RABBITMQ_URL=${RABBITMQ_URL}
      - MINIO_ENDPOINT=${MINIO_ENDPOINT}
      - MINIO_ACCESS_KEY=${MINIO_ACCESS_KEY}
      - MINIO_SECRET_KEY=${MINIO_SECRET_KEY}
      - GITHUB_CLIENT_ID=${GITHUB_CLIENT_ID}
      - GITHUB_CLIENT_SECRET=${GITHUB_CLIENT_SECRET}
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - postgres
      - redis
      - qdrant
      - rabbitmq
      - minio

  # Worker (multiple instances)
  worker:
    build:
      context: ./backend
      dockerfile: Dockerfile.prod
    command: python -m app.workers.indexing_worker
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - RABBITMQ_URL=${RABBITMQ_URL}
    depends_on:
      - postgres
      - redis
      - rabbitmq
    deploy:
      replicas: 3

  # External services (managed)
  postgres:
    external: true
  redis:
    external: true
  qdrant:
    external: true
  rabbitmq:
    external: true
  minio:
    external: true
```

---

## 14. CI/CD Workflow

### 14.1 CI Pipeline

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - name: Install dependencies
        run: |
          pip install ruff black mypy pylint
          pip install -r backend/requirements/dev.txt
      
      - name: Run linting
        run: |
          ruff check backend/
          black --check backend/
          mypy backend/
      
      - name: Set up Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install frontend dependencies
        run: cd frontend && npm ci
      
      - name: Lint frontend
        run: cd frontend && npm run lint

  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - name: Install dependencies
        run: |
          pip install -r backend/requirements/test.txt
      
      - name: Run unit tests
        run: |
          pytest backend/tests/unit/ -v --cov=backend --cov-report=xml
      
      - name: Run integration tests
        run: |
          pytest backend/tests/integration/ -v
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db
          REDIS_URL: redis://localhost:6379
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3

  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          scan-ref: '.'
          format: 'sarif'
          output: 'trivy-results.sarif'
      
      - name: Upload Trivy results
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: 'trivy-results.sarif'
      
      - name: Run Bandit
        run: |
          pip install bandit
          bandit -r backend/ -f json -o bandit-report.json
      
      - name: Run npm audit
        run: cd frontend && npm audit --audit-level=moderate

  build:
    runs-on: ubuntu-latest
    needs: [lint, test, security]
    steps:
      - uses: actions/checkout@v3
      
      - name: Build Docker images
        run: |
          docker build -t ai-coding-agent-backend:${{ github.sha }} backend/
          docker build -t ai-coding-agent-frontend:${{ github.sha }} frontend/
      
      - name: Login to registry
        uses: docker/login-action@v2
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Push images
        run: |
          docker tag ai-coding-agent-backend:${{ github.sha }} ghcr.io/${{ github.repository }}/backend:${{ github.sha }}
          docker tag ai-coding-agent-frontend:${{ github.sha }} ghcr.io/${{ github.repository }}/frontend:${{ github.sha }}
          docker push ghcr.io/${{ github.repository }}/backend:${{ github.sha }}
          docker push ghcr.io/${{ github.repository }}/frontend:${{ github.sha }}
```

### 14.2 CD Pipeline

```yaml
name: CD

on:
  push:
    branches: [main]
    tags: ['v*']

jobs:
  deploy-staging:
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    environment:
      name: staging
      url: https://staging.example.com
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to staging
        run: |
          # Deploy using Kubernetes or Helm
          kubectl set image deployment/backend backend=ghcr.io/${{ github.repository }}/backend:${{ github.sha }}
          kubectl set image deployment/frontend frontend=ghcr.io/${{ github.repository }}/frontend:${{ github.sha }}
      
      - name: Run smoke tests
        run: |
          curl -f https://staging.example.com/health || exit 1
      
      - name: Run integration tests
        run: |
          pytest tests/e2e/ --base-url=https://staging.example.com

  deploy-production:
    runs-on: ubuntu-latest
    if: startsWith(github.ref, 'refs/tags/v')
    environment:
      name: production
      url: https://example.com
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to production
        run: |
          # Blue-green deployment
          kubectl apply -f infrastructure/kubernetes/production/
      
      - name: Wait for rollout
        run: |
          kubectl rollout status deployment/backend
          kubectl rollout status deployment/frontend
      
      - name: Run smoke tests
        run: |
          curl -f https://example.com/health || exit 1
      
      - name: Create GitHub release
        uses: actions/create-release@v1
        with:
          tag_name: ${{ github.ref }}
          release_name: Release ${{ github.ref }}
```

### 14.3 Git Workflow

**Branch Strategy:**
- `main`: Production-ready code
- `develop`: Integration branch
- `feature/*`: Feature branches
- `bugfix/*`: Bug fix branches
- `hotfix/*`: Production hotfixes

**Release Process:**
1. Feature branch → develop (PR)
2. develop → main (PR)
3. Tag release on main
4. Deploy to production

---

## 15. Testing Strategy

### 15.1 Testing Pyramid

```
                    ┌─────────────┐
                    │   E2E Tests │
                    │    (5%)     │
                    └─────────────┘
                  ┌───────────────┐
                  │  Integration  │
                  │    Tests      │
                  │    (15%)      │
                  └───────────────┘
                ┌───────────────────┐
                │    Unit Tests     │
                │      (80%)        │
                └───────────────────┘
```

### 15.2 Unit Tests

**Coverage Target:** 80%

**Tools:**
- pytest
- pytest-asyncio
- pytest-cov
- unittest.mock

**Examples:**

```python
# backend/tests/unit/test_agent_service.py
import pytest
from unittest.mock import AsyncMock, MagicMock
from app.services.agent_service import AgentService

@pytest.fixture
def agent_service():
    mock_llm = AsyncMock()
    mock_tool_executor = AsyncMock()
    return AgentService(mock_llm, mock_tool_executor)

@pytest.mark.asyncio
async def test_execute_agent_success(agent_service):
    """Test successful agent execution"""
    
    # Arrange
    task = "Write a function"
    agent_service.llm.generate.return_value = "def function(): pass"
    
    # Act
    result = await agent_service.execute_agent("coder", task)
    
    # Assert
    assert result.success is True
    assert "function" in result.content
    agent_service.llm.generate.assert_called_once()

@pytest.mark.asyncio
async def test_execute_agent_failure(agent_service):
    """Test agent execution failure"""
    
    # Arrange
    agent_service.llm.generate.side_effect = Exception("LLM error")
    
    # Act & Assert
    with pytest.raises(Exception):
        await agent_serviceexecute_agent("coder", "task")
```

### 15.3 Integration Tests

**Scope:** Test interactions between components

**Tools:**
- pytest
- testcontainers-python
- pytest-docker

**Examples:**

```python
# backend/tests/integration/test_search_service.py
import pytest
from testcontainers.postgres import PostgresContainer
from app.services.search_service import SearchService

@pytest.fixture(scope="module")
def postgres_container():
    """Start PostgreSQL container"""
    with PostgresContainer("postgres:15") as postgres:
        yield postgres

@pytest.fixture
def search_service(postgres_container):
    """Create search service with real database"""
    service = SearchService(
        database_url=postgres_container.get_connection_url()
    )
    yield service

@pytest.mark.asyncio
async def test_hybrid_search(search_service):
    """Test hybrid search with real database"""
    
    # Arrange
    await search_service.index_code("test.py", "def test(): pass")
    
    # Act
    results = await search_service.hybrid_search("test function")
    
    # Assert
    assert len(results) > 0
    assert "test.py" in results[0]["file_path"]
```

### 15.4 End-to-End Tests

**Scope:** Test complete user workflows

**Tools:**
- Playwright
- pytest-playwright

**Examples:**

```python
# tests/e2e/test_coding_workflow.py
from playwright.sync_api import Page, expect

def test_complete_coding_workflow(page: Page):
    """Test complete coding workflow from login to code generation"""
    
    # Login
    page.goto("http://localhost:3000")
    page.click("text=Login with GitHub")
    expect(page).to_have_url("http://localhost:3000/dashboard")
    
    # Create project
    page.click("text=New Project")
    page.fill("input[name='name']", "Test Project")
    page.fill("input[name='repository_url']", "https://github.com/test/repo")
    page.click("button[type='submit']")
    
    # Start coding session
    page.click("text=Start Coding")
    page.fill("textarea", "Write a hello world function")
    page.click("button[type='submit']")
    
    # Verify response
    expect(page.locator(".assistant-message")).to_be_visible()
    expect(page.locator(".assistant-message")).to_contain_text("def")
```

### 15.5 Performance Tests

**Tools:**
- Locust
- k6

**Example:**

```python
# tests/performance/locustfile.py
from locust import HttpUser, task, between

class APIUser(HttpUser):
    wait_time = between(1, 3)
    
    def on_start(self):
        # Login
        response = self.client.post("/api/v1/auth/github/callback", json={
            "code": "test_code"
        })
        self.token = response.json()["data"]["access_token"]
    
    @task
    def search_code(self):
        self.client.post(
            "/api/v1/search/semantic",
            headers={"Authorization": f"Bearer {self.token}"},
            json={"query": "test", "project_id": "test-id"}
        )
    
    @task
    def execute_agent(self):
        self.client.post(
            "/api/v1/agents/chat",
            headers={"Authorization": f"Bearer {self.token}"},
            json={"message": "Write code", "session_id": "test-id"}
        )
```

### 15.6 Security Tests

**Tools:**
- OWASP ZAP
- Bandit
- Snyk

**Tests:**
- SQL injection attempts
- XSS attempts
- Authentication bypass
- Authorization bypass
- Rate limiting

---

## 16. Implementation Roadmap

### 16.1 Milestone 1: Foundation (Weeks 1-4)

**Goal:** Set up project infrastructure and basic services

**Tasks:**
- [ ] Initialize monorepo structure
- [ ] Set up Docker Compose for local development
- [ ] Configure PostgreSQL with initial schema
- [ ] Set up Redis for caching
- [ ] Configure Qdrant for vector storage
- [ ] Set up RabbitMQ for background jobs
- [ ] Configure MinIO for object storage
- [ ] Set up Prometheus and Grafana
- [ ] Configure OpenTelemetry tracing
- [ ] Set up CI/CD pipeline
- [ ] Create base authentication system (GitHub OAuth)
- [ ] Implement basic API structure (FastAPI)
- [ ] Create frontend skeleton (Next.js)

**Deliverables:**
- Running local development environment
- Basic authentication flow
- API health endpoints
- Monitoring dashboards

### 16.2 Milestone 2: Core Services (Weeks 5-8)

**Goal:** Implement core backend services

**Tasks:**
- [ ] Implement user management service
- [ ] Implement project management service
- [ ] Implement session management service
- [ ] Create repository models and repositories
- [ ] Implement Git service (clone, branch, commit)
- [ ] Implement code analysis service (AST parsing)
- [ ] Create embedding service
- [ ] Implement indexing service (background job)
- [ ] Create vector database operations
- [ ] Implement basic search service (keyword)
- [ ] Set up worker infrastructure

**Deliverables:**
- User can create and manage projects
- Repository can be cloned and analyzed
- Basic code search works
- Background job system operational

### 16.3 Milestone 3: Agent Framework (Weeks 9-12)

**Goal:** Build multi-agent system with LangGraph

**Tasks:**
- [ ] Implement LLM provider abstraction
- [ ] Add OpenAI provider
- [ ] Add Anthropic provider
- [ ] Create base agent class
- [ ] Implement tool framework
- [ ] Implement file tools (read, write)
- [ ] Implement terminal tool (sandboxed)
- [ ] Implement search tool
- [ ] Implement git tools
- [ ] Create tool registry
- [ ] Implement tool executor with safety
- [ ] Create LangGraph workflow base
- [ ] Implement supervisor agent
- [ ] Implement planner agent
- [ ] Implement coder agent
- [ ] Implement reviewer agent

**Deliverables:**
- Multi-agent system operational
- Tools can be executed safely
- Basic coding workflow works
- Agent coordination functional

### 16.4 Milestone 4: Memory System (Weeks 13-16)

**Goal:** Implement memory architecture

**Tasks:**
- [ ] Implement short-term memory (Redis)
- [ ] Implement long-term memory (PostgreSQL)
- [ ] Implement episodic memory
- [ ] Create memory manager
- [ ] Implement semantic memory retrieval
- [ ] Implement memory consolidation
- [ ] Add memory importance scoring
- [ ] Implement memory pruning
- [ ] Create memory API endpoints
- [ ] Integrate memory with agents

**Deliverables:**
- Memory system operational
- Agents can store and retrieve memories
- Memory consolidation works
- Memory API functional

### 16.5 Milestone 5: Advanced Features (Weeks 17-20)

**Goal:** Implement advanced features

**Tasks:**
- [ ] Implement semantic search (vector)
- [ ] Implement hybrid search
- [ ] Add code pattern matching
- [ ] Implement test execution
- [ ] Add documentation generation
- [ ] Implement PR creation
- [ ] Add code review automation
- [ ] Implement MCP support
- [ ] Create plugin system
- [ ] Add plugin manager
- [ ] Implement WebSocket streaming
- [ ] Add real-time progress updates

**Deliverables:**
- Semantic search operational
- Test execution works
- Documentation generation functional
- MCP integration complete
- Plugin system operational

### 16.6 Milestone 6: Frontend Integration (Weeks 21-24)

**Goal:** Build complete frontend

**Tasks:**
- [ ] Implement authentication UI
- [ ] Create project management UI
- [ ] Build code editor integration (Monaco)
- [ ] Implement chat interface
- [ ] Create workspace UI
- [ ] Add file browser
- [ ] Implement search UI
- [ ] Create session management UI
- [ ] Add settings page
- [ ] Implement real-time updates (WebSocket)
- [ ] Add error handling and toasts
- [ ] Implement responsive design

**Deliverables:**
- Complete frontend application
- All features accessible via UI
- Real-time updates working
- Responsive design complete

### 16.7 Milestone 7: Testing & QA (Weeks 25-28)

**Goal:** Comprehensive testing

**Tasks:**
- [ ] Write unit tests (80% coverage)
- [ ] Write integration tests
- [ ] Write E2E tests (Playwright)
- [ ] Performance testing (Locust)
- [ ] Security testing (OWASP ZAP)
- [ ] Load testing
- [ ] Fix identified issues
- [ ] Optimize performance
- [ ] Security hardening
- [ ] Documentation review

**Deliverables:**
- 80%+ test coverage
- All tests passing
- Performance benchmarks met
- Security audit passed

### 16.8 Milestone 8: Production Deployment (Weeks 29-32)

**Goal:** Deploy to production

**Tasks:**
- [ ] Set up production infrastructure
- [ ] Configure production databases
- [ ] Set up CDN
- [ ] Configure SSL certificates
- [ ] Set up monitoring and alerting
- [ ] Configure log aggregation
- [ ] Set up backup and recovery
- [ ] Configure auto-scaling
- [ ] Run production smoke tests
- [ ] Deploy to staging
- [ ] Deploy to production
- [ ] Configure DNS

**Deliverables:**
- Production deployment complete
- Monitoring operational
- Backups configured
- Disaster recovery tested

### 16.9 Milestone 9: Documentation (Weeks 33-34)

**Goal:** Complete documentation

**Tasks:**
- [ ] Write API documentation
- [ ] Write architecture documentation
- [ ] Write user guides
- [ ] Write development guides
- [ ] Write deployment guides
- [ ] Create contribution guide
- [ ] Write README
- [ ] Create diagrams
- [ ] Record demo videos
- [ ] Set up documentation site

**Deliverables:**
- Complete documentation
- User guides available
- Developer documentation complete
- Demo videos available

### 16.10 Milestone 10: Launch (Weeks 35-36)

**Goal:** Launch project

**Tasks:**
- [ ] Final testing
- [ ] Security audit
- [ ] Performance optimization
- [ ] Beta testing with select users
- [ ] Gather feedback
- [ ] Address issues
- [ ] Prepare launch announcement
- [ ] Launch to public
- [ ] Monitor for issues
- [ ] Address post-launch issues

**Deliverables:**
- Public launch
- Stable production system
- User onboarding complete
- Support channels operational

---

## 17. Architecture Diagrams

### 17.1 System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Layer                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Browser    │  │   VS Code    │  │   CLI Tool   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS/WSS
                              │
┌─────────────────────────────────────────────────────────────────┐
│                      CDN / Load Balancer                        │
│                    (CloudFront / ALB)                           │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
┌─────────────▼──────────┐        ┌──────────▼──────────┐
│    Frontend Cluster    │        │   Backend Cluster   │
│  ┌──────────────────┐  │        │  ┌────────────────┐ │
│  │  Next.js App 1   │  │        │  │ FastAPI App 1  │ │
│  └──────────────────┘  │        │  └────────────────┘ │
│  ┌──────────────────┐  │        │  ┌────────────────┐ │
│  │  Next.js App 2   │  │        │  │ FastAPI App 2  │ │
│  └──────────────────┘  │        │  └────────────────┘ │
│  ┌──────────────────┐  │        │  ┌────────────────┐ │
│  │  Next.js App 3   │  │        │  │ FastAPI App 3  │ │
│  └──────────────────┘  │        │  └────────────────┘ │
└────────────────────────┘        └──────────┬──────────┘
                                            │
              ┌─────────────────────────────┼─────────────────────┐
              │                             │                     │
┌─────────────▼──────────┐  ┌──────────────▼──────────┐  ┌───────▼────────┐
│   Worker Cluster      │  │   Database Cluster     │  │  Cache Cluster │
│  ┌──────────────────┐  │  │  ┌──────────────────┐  │  ┌─────────────┐ │
│  │ Indexing Worker │  │  │  │  PostgreSQL      │  │  │   Redis     │ │
│  └──────────────────┘  │  │  │  (Primary)       │  │  └─────────────┘ │
│  ┌──────────────────┐  │  │  └──────────────────┘  │  ┌─────────────┐ │
│  │ Embedding Worker│  │  │  ┌──────────────────┐  │  │   Redis     │ │
│  └──────────────────┘  │  │  │  PostgreSQL      │  │  └─────────────┘ │
│  ┌──────────────────┐  │  │  │  (Replica 1)     │  │                 │
│  │ Cleanup Worker   │  │  │  └──────────────────┘  │                 │
│  └──────────────────┘  │  │  ┌──────────────────┐  │                 │
└────────────────────────┘  │  │  PostgreSQL      │  │                 │
                            │  │  (Replica 2)     │  │                 │
                            │  └──────────────────┘  │                 │
                            └────────────────────────┘                 │
              ┌─────────────────────────────┼─────────────────────┐   │
              │                             │                     │   │
┌─────────────▼──────────┐  ┌──────────────▼──────────┐  ┌─────────▼──────┐
│  Vector Database      │  │   Message Queue        │  │ Object Storage │
│  ┌──────────────────┐  │  ┌──────────────────┐    │  ┌─────────────┐ │
│  │   Qdrant         │  │  │   RabbitMQ       │    │  │   MinIO      │ │
│  │   (Primary)      │  │  │                  │    │  └─────────────┘ │
│  └──────────────────┘  │  └──────────────────┘    │                  │
│  ┌──────────────────┐  │                         │                  │
│  │   Qdrant         │  │                         │                  │
│  │   (Replica)      │  │                         │                  │
│  └──────────────────┘  │                         │                  │
└────────────────────────┘                         └──────────────────┘
              │
              │
┌─────────────▼──────────┐
│  Monitoring Stack      │
│  ┌──────────────────┐  │
│  │   Prometheus     │  │
│  └──────────────────┘  │
│  ┌──────────────────┐  │
│  │   Grafana        │  │
│  └──────────────────┘  │
│  ┌──────────────────┐  │
│  │   Jaeger         │  │
│  └──────────────────┘  │
└────────────────────────┘
```

### 17.2 Data Flow Diagram

```
┌──────────────┐
│    User      │
└──────┬───────┘
       │
       │ Request
       ▼
┌──────────────┐
│  Frontend    │
│  (Next.js)   │
└──────┬───────┘
       │
       │ API Call
       ▼
┌──────────────┐
│  API Gateway │
│  (FastAPI)   │
└──────┬───────┘
       │
       │ Route Request
       ▼
┌──────────────┐
│  	Service     │
│  Layer       │
└──────┬───────┘
       │
       │  ┌─────────────────────────────────────┐
       ├──▶│ Agent Service                        │
       │  │  - Orchestrate agents                │
       │  │  - Manage workflows                 │
       │  └─────────────────────────────────────┘
       │
       │  ┌─────────────────────────────────────┐
       ├──▶│ Search Service                       │
       │  │  - Semantic search                   │
       │  │  - Keyword search                    │
       │  └─────────────────────────────────────┘
       │
       │  ┌─────────────────────────────────────┐
       ├──▶│ Memory Service                       │
       │  │  - Store/retrieve memories           │
       │  │  - Consolidate memories              │
       │  └─────────────────────────────────────┘
       │
       │  ┌─────────────────────────────────────┐
       └──▶│ Tool Executor                        │
          │  - Execute tools safely              │
          │  - Validate permissions               │
          └─────────────────────────────────────┘
                    │
                    │
       ┌────────────┴────────────┐
       │                         │
       ▼                         ▼
┌──────────────┐        ┌──────────────┐
│   LLM Provider│        │  Data Layer  │
│  (OpenAI,    │        │              │
│   Anthropic) │        │  ┌─────────┐ │
└──────────────┘        │  │PostgreSQL│ │
                       │  └─────────┘ │
                       │  ┌─────────┐ │
                       │  │  Redis  │ │
                       │  └─────────┘ │
                       │  ┌─────────┐ │
                       │  │ Qdrant  │ │
                       │  └─────────┘ │
                       │  ┌─────────┐ │
                       │  │RabbitMQ │ │
                       │  └─────────┘ │
                       │  ┌─────────┐ │
                       │  │ MinIO   │ │
                       │  └─────────┘ │
                       └──────────────┘
```

### 17.3 Agent Workflow Diagram

```
┌──────────────┐
│   User       │
│  Request     │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Supervisor   │
│  Agent       │
└──────┬───────┘
       │
       │ Analyze Task
       ▼
┌──────────────┐     Simple?     ┌──────────────┐
│  Decision    │────────────────▶│  Direct      │
│  Point       │                 │  Execution   │
└──────┬───────┘                 └──────────────┘
       │
       │ Complex
       ▼
┌──────────────┐
│  Planner     │
│  Agent       │
└──────┬───────┘
       │
       │ Create Plan
       ▼
┌──────────────┐
│  Plan        │
│  Steps       │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Coder      │
│  Agent       │
└──────┬───────┘
       │
       │ Execute Steps
       ▼
┌──────────────┐
│  Tool Calls  │
│  (File, Term,│
│   Search)    │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Reviewer    │
│  Agent       │
└──────┬───────┘
       │
       │ Approved?
       ├──────No────┐
       │            │
       ▼            ▼
┌──────────────┐ ┌──────────────┐
│  Complete   │ │  Revise      │
│  Task       │ │  Code        │
└──────┬───────┘ └──────┬───────┘
       │                │
       └────────┬───────┘
                │
                ▼
        ┌──────────────┐
        │  Response    │
        │  to User     │
        └──────────────┘
```

---

## 18. Sequence Diagrams

### 18.1 User Authentication Flow

```
User          Frontend          Backend          GitHub
 │               │                │                │
 │─Login────────▶│                │                │
 │               │─OAuth Init────▶│                │
 │               │                │─Redirect──────▶│
 │               │                │                │
 │               │                │◀─Auth Code────│
 │               │◀─Redirect─────│                │
 │◀─GitHub Page─│                │                │
 │               │                │                │
 │─Authorize────▶│                │                │
 │               │                │                │
 │               │◀─Callback─────│                │
 │               │─Code─────────▶│                │
 │               │                │─Exchange─────▶│
 │               │                │                │
 │               │                │◀─Access Token─│
 │               │                │                │
 │               │                │─Get Profile──▶│
 │               │                │                │
 │               │                │◀─User Data────│
 │               │                │                │
 │               │                │─Create/Update─│
 │               │                │  User         │
 │               │                │                │
 │               │                │─Generate JWT──│
 │               │                │                │
 │               │◀─Token────────│                │
 │◀─Token────────│                │                │
 │               │                │                │
 │─API Request─▶│                │                │
 │               │─Request + Token▶│                │
 │               │                │                │
 │               │                │─Validate JWT──│
 │               │                │                │
 │               │◀─Response─────│                │
 │◀─Response────│                │                │
```

### 18.2 Code Search Flow

```
User          Frontend          Backend         Qdrant        PostgreSQL
 │               │                │               │              │
 │─Search Query─▶│                │               │              │
 │               │─Search Request─▶│               │              │
 │               │                │               │              │
 │               │                │─Generate      │              │
 │               │                │  Embedding    │              │
 │               │                │               │              │
 │               │                │─Vector Search─▶│              │
 │               │                │               │              │
 │               │                │◀─Results──────│              │
 │               │                │               │              │
 │               │                │─Fetch File    │              │
 │               │                │  Metadata     │              │
 │               │                │               │              │
 │               │                │               │─Query──────▶│
 │               │                │               │              │
 │               │                │               │◀─Metadata───│
 │               │                │               │              │
 │               │                │─Combine &     │              │
 │               │                │  Rank Results │              │
 │               │                │               │              │
 │               │◀─Search Results│               │              │
 │◀─Results──────│                │               │              │
```

### 18.3 Agent Execution Flow

```
User          Frontend          Backend        Agent      Tools      Data
 │               │                │             │           │         │
 │─Task─────────▶│                │             │           │         │
 │               │─Execute Request▶│             │           │         │
 │               │                │             │           │         │
 │               │                │─Create      │           │         │
 │               │                │  Workflow    │           │         │
 │               │                │             │           │         │
 │               │                │─Start       │           │         │
 │               │                │  Supervisor  │           │         │
 │               │                │             │           │         │
 │               │                │             │─Plan─────▶│         │
 │               │                │             │           │         │
 │               │                │             │◀─Plan────│         │
 │               │                │             │           │         │
 │               │                │             │─Execute──▶│         │
 │               │                │             │           │         │
 │               │                │             │           │─Read──▶│
 │               │                │             │           │         │
 │               │                │             │           │◀─Content│
 │               │                │             │           │         │
 │               │                │             │─Write───▶│         │
 │               │                │             │           │         │
 │               │                │             │◀─Success─│         │
 │               │                │             │           │         │
 │               │                │             │─Search───▶│         │
 │               │                │             │           │─Query▶│
 │               │                │             │           │      │
 │               │                │             │           │◀─Results│
 │               │                │             │◀─Results─│         │
 │               │                │             │           │         │
 │               │                │             │─Review───▶│         │
 │               │                │             │           │         │
 │               │                │             │◀─Approved│         │
 │               │                │             │           │         │
 │               │                │◀─Final Result│           │         │
 │               │◀─Response─────│             │           │         │
 │◀─Response─────│                │             │           │         │
```

### 18.4 Repository Indexing Flow

```
User          Backend        Worker         Git         Qdrant       PostgreSQL
 │               │              │            │             │              │
 │─Index Request─▶│              │            │             │              │
 │               │              │            │             │              │
 │               │─Enqueue Job─▶│            │             │              │
 │               │              │            │             │              │
 │               │◀─Job ID──────│            │             │              │
 │◀─Job ID────────│              │            │             │              │
 │               │              │            │             │              │
 │               │              │─Pick Job──▶│             │              │
 │               │              │            │             │              │
 │               │              │            │─Clone Repo─▶│              │
 │               │              │            │             │              │
 │               │              │            │◀─Files─────│              │
 │               │              │            │             │              │
 │               │              │─Parse Files│             │              │
 │               │              │            │             │              │
 │               │              │─Generate    │             │              │
 │               │              │  Embeddings │             │              │
 │               │              │            │             │              │
 │               │              │            │             │─Store──────▶│
 │               │              │            │             │              │
 │               │              │            │             │◀─Success────│
 │               │              │            │             │              │
 │               │              │─Update     │             │              │
 │               │              │  Status     │             │              │
 │               │              │            │             │              │
 │               │◀─Progress───│            │             │              │
 │◀─Progress─────│              │            │             │              │
 │               │              │            │             │              │
 │               │              │─Complete───▶│             │              │
 │               │              │            │             │              │
 │               │              │            │             │─Update──────▶│
 │               │              │            │             │              │
 │               │◀─Complete───│            │             │              │
 │◀─Complete─────│              │            │             │              │
```

### 18.5 Memory Storage and Retrieval Flow

```
User          Backend        Memory Service    Embedding    Qdrant      PostgreSQL
 │               │                  │              │           │              │
 │─Store Memory─▶│                  │              │           │              │
 │               │                  │              │           │              │
 │               │─Store Request──▶│              │           │              │
 │               │                  │              │           │              │
 │               │                  │─Generate    │           │              │
 │               │                  │  Embedding──▶│           │              │
 │               │                  │              │           │              │
 │               │                  │◀─Embedding──│           │              │
 │               │                  │              │           │              │
 │               │                  │─Store Vector─▶│           │              │
 │               │                  │              │           │              │
 │               │                  │              │─Store───▶│              │
 │               │                  │              │           │              │
 │               │                  │              │◀─Success─│              │
 │               │                  │              │           │              │
 │               │                  │─Store Metadata──────────────────────▶│
 │               │                  │              │           │              │
 │               │                  │◀─Success────│           │              │
 │               │◀─Success────────│              │           │              │
 │◀─Success──────│                  │              │           │              │
 │               │                  │              │           │              │
 │─Retrieve─────▶│                  │              │           │              │
 │               │                  │              │           │              │
 │               │─Retrieve Req───▶│              │           │              │
 │               │                  │              │           │              │
 │               │                  │─Generate    │           │              │
 │               │                  │  Query Embed─▶│           │              │
 │               │                  │              │           │              │
 │               │                  │◀─Embedding──│           │              │
 │               │                  │              │           │              │
 │               │                  │─Vector Search─────────────────────▶│
 │               │                  │              │           │              │
 │               │                  │              │           │─Search──▶│
 │               │                  │              │           │              │
 │               │                  │              │           │◀─Results─│
 │               │                  │◀─Results────│           │              │
 │               │                  │              │           │              │
 │               │                  │─Fetch Metadata──────────────────────▶│
 │               │                  │              │           │              │
 │               │                  │◀─Metadata────│           │              │
 │               │                  │              │           │              │
 │               │                  │─Combine & Rank│           │              │
 │               │                  │              │           │              │
 │               │◀─Memories───────│              │           │              │
 │◀─Memories─────│                  │              │           │              │
```

---

## Conclusion

This engineering design document provides a comprehensive blueprint for building a production-grade AI Coding Agent. The design emphasizes:

- **Scalability:** Horizontal scaling, stateless services, distributed architecture
- **Maintainability:** Clean architecture, clear separation of concerns, comprehensive documentation
- **Modularity:** Plugin system, tool framework, provider abstraction
- **Security:** Authentication, authorization, input validation, audit logging
- **Performance:** Caching, indexing, efficient algorithms, monitoring
- **Extensibility:** Plugin architecture, MCP support, modular design
- **Production Readiness:** Monitoring, logging, CI/CD, disaster recovery

The implementation roadmap provides a clear path from foundation to launch, with well-defined milestones and deliverables. The architecture is designed to evolve as requirements change while maintaining stability and performance.

This document serves as the single source of truth for implementation and should be referenced throughout the development process. Any changes to the architecture should be documented and approved by the engineering team.

---

**Document Version:** 1.0  
**Last Updated:** July 3, 2026  
**Next Review:** August 3, 2026
