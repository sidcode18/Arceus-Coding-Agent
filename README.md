# AI Coding Agent 

An enterprise-grade, autonomous AI coding assistant built on **FastAPI**, **LangGraph**, **React**, and **Qdrant**. This project provides a complete infrastructure to run LLM-powered coding agents capable of cloning repositories, analyzing code with AST parsing, performing semantic code search, and writing complex features autonomously.

## Key Features

- **Multi-Agent Architecture:** Utilizes LangGraph to orchestrate specialized agents (Planner, Coder, Reviewer, Supervisor).
- **Advanced Code Understanding:** Uses AST parsers (Python, TypeScript) and Qdrant vector database for deep semantic code retrieval.
- **Secure Sandbox Execution:** Tools for file operations and terminal commands include path traversal and command validation protections.
- **Real-time Observability:** Streams agent thoughts and actions in real-time via WebSockets to a sleek React frontend.
- **Production-Ready Backend:** Fully asynchronous FastAPI backend, powered by PostgreSQL (SQLAlchemy) and Redis.

## Architecture

The system follows Clean Architecture principles:
- **Frontend**: Vite + React + TailwindCSS + Monaco Editor.
- **API Layer**: FastAPI handling JWT Auth, REST, and WebSockets.
- **Agent Framework**: LangGraph state machines binding LLMs (Gemini, Claude, OpenAI) to native Python tools.
- **Memory & Storage**: PostgreSQL for long-term memory, Redis for short-term fast retrieval, Qdrant for semantic code vectors.
- **Observability**: Prometheus metrics, Grafana dashboards, and structured logging via `structlog`.

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 18+
- Python 3.11+
- API keys (Gemini, OpenAI, or Anthropic)

### 1. Start the Infrastructure
```bash
docker-compose up -d
```
This boots up PostgreSQL, Redis, Qdrant, RabbitMQ, MinIO, Prometheus, and Grafana.

### 2. Run the Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

### 3. Run the Frontend
```bash
cd frontend
npm install
npm run dev
```

## Security
- Strict JWT authentication on all routes.
- Path traversal protection on all file-system tools.
- Command validation to prevent destructive terminal operations (`rm -rf`, `mkfs`, etc.).
- Robust secret masking (using `structlog` filters for API keys).

## Observability
- Access Prometheus metrics at `localhost:9090`
- Access Grafana at `localhost:3001` (login: `admin` / `admin`)
- OpenTelemetry traces are instrumented across FastAPI and LangChain.

## Contributing
Contributions are welcome! Please read our [Contribution Guidelines](docs/CONTRIBUTING.md) and ensure that all new tools and endpoints include `pytest` coverage.

## License
This project is licensed under the MIT License.
