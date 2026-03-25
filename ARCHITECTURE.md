# Dialog — Architecture

---

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    DIALOG DAEMON                             │
│                                                             │
│  ┌──────────────┐   ┌──────────────┐   ┌────────────────┐  │
│  │ Process      │──▶│ Log          │──▶│ Structured     │  │
│  │ Detector     │   │ Interceptor  │   │ Parser         │  │
│  └──────────────┘   └──────────────┘   └───────┬────────┘  │
│                                                 │           │
│                          ┌──────────────────────┼────┐      │
│                          ▼                      ▼    ▼      │
│                   ┌───────────┐  ┌──────────┐  ┌────────┐  │
│                   │ DuckDB    │  │ SQLite   │  │ChromaDB│  │
│                   │ + Parquet │  │ (journey │  │(RAG    │  │
│                   │ (logs)    │  │  index)  │  │vectors)│  │
│                   └─────┬─────┘  └────┬─────┘  └───┬────┘  │
│                         │             │            │        │
│                    ┌────┴─────────────┴────────────┴──┐     │
│                    │         AI ROUTER                 │     │
│                    │  magistral-small (standard)       │     │
│                    │  magistral-medium (complex)       │     │
│                    │  mistral-embed (embeddings)       │     │
│                    └──┬──────────┬──────────┬─────────┘     │
│                       │          │          │               │
│                  ┌────┴───┐ ┌───┴────┐ ┌───┴──────┐        │
│                  │  CLI   │ │  MCP   │ │   Web    │        │
│                  │        │ │ Server │ │ :9999    │        │
│                  └────────┘ └────────┘ └──────────┘        │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                    LOG SOURCES                        │   │
│  │  localhost:3000 │ localhost:5173 │ Docker containers  │   │
│  │  Deployed apps (via forwarding middleware)            │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Component Details

### 1. Process Detector
**Purpose:** Find running dev servers on the machine.

**How it works:**
- On `dialog start`, scans common ports: 3000, 3001, 4000, 5000, 5173, 8000, 8080, 8888
- For each occupied port, identifies the process via `lsof -i :PORT` (macOS/Linux)
- Determines framework by reading initial stdout output patterns:
  - Express: "Listening on port" / "Express server"
  - FastAPI: "Uvicorn running on"
  - Django: "Starting development server"
  - Next.js: "ready - started server on"
  - Rails: "Puma starting" / "Listening on"
  - Vite/Nuxt: "Local: http://localhost"
- Re-scans every 10 seconds for new/stopped services

**Key files:**
- `src/daemon/detector.ts` — port scanning and process identification
- `src/daemon/frameworks.ts` — framework signature patterns

### 2. Log Interceptor
**Purpose:** Capture log output from detected processes.

**How it works:**
- Attaches to process stdout/stderr using `process.stdout` pipe or by tailing the process output
- For Docker containers: uses Docker Engine API (`/containers/{id}/logs?follow=true`)
- For deployed apps: receives logs via WebSocket from forwarding middleware
- Streams raw log lines to the Structured Parser

**Key files:**
- `src/daemon/interceptor.ts` — stdout/stderr capture
- `src/daemon/docker.ts` — Docker container log reader
- `src/daemon/remote.ts` — WebSocket receiver for deployed apps

### 3. Structured Parser
**Purpose:** Extract structured data from raw log lines.

**Extracts:**
- `timestamp` — ISO 8601 or common formats
- `level` — DEBUG, INFO, WARN, ERROR, FATAL
- `method` — HTTP method (GET, POST, PUT, DELETE)
- `path` — request path (/api/users, /checkout)
- `status` — HTTP status code (200, 404, 500)
- `duration_ms` — response time
- `user_id` — from JWT, session cookie, x-user-id header, API key
- `session_id` — from session cookie or header
- `request_id` — from x-request-id header
- `error_message` — extracted error text
- `stack_trace` — multi-line stack trace
- `db_query` — SQL statements from ORM log patterns
- `external_call` — outbound HTTP to Stripe, Twilio, etc.

**Parser strategy:**
1. Try JSON parsing first (structured logging)
2. Try common log format regex patterns
3. Try framework-specific patterns (Express morgan, Django default, etc.)
4. Fall back to raw text with timestamp extraction

**Key files:**
- `src/parser/index.ts` — main parser orchestrator
- `src/parser/json.ts` — JSON log parser
- `src/parser/patterns.ts` — regex patterns for common formats
- `src/parser/frameworks/` — per-framework parsers

### 4. DuckDB Storage
**Purpose:** Store and query all log entries efficiently.

**Schema:**
```sql
CREATE TABLE logs (
  id              VARCHAR PRIMARY KEY,
  timestamp       TIMESTAMP NOT NULL,
  service         VARCHAR NOT NULL,      -- e.g., "localhost:3000"
  level           VARCHAR,               -- DEBUG/INFO/WARN/ERROR/FATAL
  message         TEXT,
  method          VARCHAR,               -- HTTP method
  path            VARCHAR,               -- request path
  status          INTEGER,               -- HTTP status code
  duration_ms     FLOAT,                 -- response time
  user_id         VARCHAR,               -- extracted user identifier
  session_id      VARCHAR,               -- extracted session identifier
  request_id      VARCHAR,               -- request correlation ID
  error_message   TEXT,                  -- error text if applicable
  stack_trace     TEXT,                  -- full stack trace
  db_query        TEXT,                  -- SQL query if detected
  external_call   TEXT,                  -- outbound API call details
  raw             TEXT NOT NULL,         -- original raw log line
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for common queries
CREATE INDEX idx_logs_timestamp ON logs(timestamp);
CREATE INDEX idx_logs_service ON logs(service);
CREATE INDEX idx_logs_level ON logs(level);
CREATE INDEX idx_logs_user_id ON logs(user_id);
CREATE INDEX idx_logs_path ON logs(path);
CREATE INDEX idx_logs_status ON logs(status);
```

**Storage:** Parquet files partitioned by date and service in `~/.dialog/data/`.

**Key files:**
- `src/storage/duckdb.ts` — DuckDB connection, writes, queries
- `src/storage/schema.ts` — table schema and migrations

### 5. Journey Index (SQLite)
**Purpose:** Fast per-user journey reconstruction.

**Schema:**
```sql
CREATE TABLE journey_events (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     TEXT NOT NULL,
  session_id  TEXT,
  request_id  TEXT,
  timestamp   TEXT NOT NULL,
  service     TEXT NOT NULL,
  method      TEXT,
  path        TEXT,
  status      INTEGER,
  duration_ms REAL,
  log_id      TEXT NOT NULL,  -- FK to DuckDB logs table
  FOREIGN KEY (log_id) REFERENCES logs(id)
);

CREATE INDEX idx_journey_user ON journey_events(user_id, timestamp);
CREATE INDEX idx_journey_session ON journey_events(session_id, timestamp);
```

**Key files:**
- `src/journey/index.ts` — SQLite operations
- `src/journey/reconstruct.ts` — journey reconstruction logic

### 6. AI Router
**Purpose:** Handle all AI queries across all interfaces.

**Flow:**
```
Question (from CLI / Dashboard / MCP)
  │
  ├─1. Intent classification
  │    "why did checkout fail?" → error_analysis
  │    "show user 4521's journey" → journey_replay
  │    "is my app healthy?" → health_check
  │
  ├─2. Data retrieval
  │    ├── DuckDB SQL query (generated from intent)
  │    └── ChromaDB semantic search (RAG)
  │
  ├─3. Context packaging
  │    Combine: question + retrieved logs + journey data + system prompt
  │
  ├─4. Model selection
  │    Standard query → magistral-small-2509
  │    Complex multi-service → magistral-medium-2509
  │
  ├─5. Mistral API call
  │    POST https://api.mistral.ai/v1/chat/completions
  │
  └─6. Response formatting
       Format for target interface (CLI terminal / JSON for MCP / HTML for dashboard)
```

**System prompt (core):**
```
You are Dialog, an AI log analysis assistant. You help developers understand
their application's runtime behavior by analyzing log data.

When answering:
- Cite specific log entries with timestamps
- Identify root causes, not just symptoms
- Suggest actionable fixes
- If you see a user journey, present it as a timeline
- Be concise but thorough
- If data is insufficient, say so honestly
```

**Key files:**
- `src/ai/router.ts` — main AI query handler
- `src/ai/mistral.ts` — Mistral API client
- `src/ai/embeddings.ts` — mistral-embed + ChromaDB
- `src/ai/prompts.ts` — system prompts and templates
- `src/ai/sql-generator.ts` — natural language → DuckDB SQL

### 7. CLI Interface
**Purpose:** Terminal commands for all Dialog features.

**Framework:** Commander.js for commands, Ink (React for CLI) for rich output.

**Key files:**
- `src/cli/index.ts` — main entry point, command registration
- `src/cli/commands/start.ts`
- `src/cli/commands/stop.ts`
- `src/cli/commands/status.ts`
- `src/cli/commands/errors.ts`
- `src/cli/commands/journey.ts`
- `src/cli/commands/ask.ts`
- `src/cli/commands/logs.ts`
- `src/cli/commands/config.ts`
- `src/cli/commands/export.ts`
- `src/cli/commands/attach.ts`
- `src/cli/components/` — Ink React components for terminal UI

### 8. MCP Server
**Purpose:** Expose Dialog tools for AI assistants.

**Transport:** stdio (AI assistant launches `dialog mcp-serve` as subprocess)

**Framework:** `@modelcontextprotocol/sdk`

**Key files:**
- `src/mcp/server.ts` — MCP server setup, tool registration
- `src/mcp/tools/get-errors.ts`
- `src/mcp/tools/query-logs.ts`
- `src/mcp/tools/replay-journey.ts`
- `src/mcp/tools/get-health.ts`
- `src/mcp/tools/explain-error.ts`
- `src/mcp/tools/compare-deploys.ts`
- `src/mcp/tools/get-slow-queries.ts`
- `src/mcp/tools/list-services.ts`

### 9. Web Dashboard
**Purpose:** Visual interface at localhost:9999.

**MVP:** Streamlit (Python) for rapid prototyping
**Production:** Next.js with Tailwind CSS

**Key files (Next.js production):**
- `src/dashboard/app/page.tsx` — Home/Overview
- `src/dashboard/app/logs/page.tsx` — Live Log Stream
- `src/dashboard/app/journey/page.tsx` — Journey Explorer
- `src/dashboard/app/errors/[id]/page.tsx` — Error Detail
- `src/dashboard/app/settings/page.tsx` — Settings
- `src/dashboard/components/ask-dialog.tsx` — AI Chat Bar
- `src/dashboard/components/journey-timeline.tsx` — Visual journey

---

## Directory Structure

```
dialog/
├── package.json
├── tsconfig.json
├── PLAN.md
├── PRD.md
├── ARCHITECTURE.md
├── CLAUDE.md
│
├── src/
│   ├── index.ts                  # Main entry point
│   │
│   ├── daemon/
│   │   ├── index.ts              # Daemon lifecycle
│   │   ├── detector.ts           # Process/port detection
│   │   ├── frameworks.ts         # Framework signatures
│   │   ├── interceptor.ts        # stdout/stderr capture
│   │   ├── docker.ts             # Docker log reader
│   │   └── remote.ts             # WebSocket for deployed apps
│   │
│   ├── parser/
│   │   ├── index.ts              # Parser orchestrator
│   │   ├── json.ts               # JSON log parser
│   │   ├── patterns.ts           # Common log format regex
│   │   └── frameworks/           # Per-framework parsers
│   │       ├── express.ts
│   │       ├── fastapi.ts
│   │       ├── django.ts
│   │       └── rails.ts
│   │
│   ├── storage/
│   │   ├── duckdb.ts             # DuckDB operations
│   │   └── schema.ts             # Table schema
│   │
│   ├── journey/
│   │   ├── index.ts              # SQLite journey index
│   │   └── reconstruct.ts        # Journey reconstruction
│   │
│   ├── ai/
│   │   ├── router.ts             # AI query handler
│   │   ├── mistral.ts            # Mistral API client
│   │   ├── embeddings.ts         # mistral-embed + ChromaDB
│   │   ├── prompts.ts            # System prompts
│   │   └── sql-generator.ts      # NL → DuckDB SQL
│   │
│   ├── cli/
│   │   ├── index.ts              # CLI entry, command registration
│   │   └── commands/
│   │       ├── start.ts
│   │       ├── stop.ts
│   │       ├── status.ts
│   │       ├── errors.ts
│   │       ├── journey.ts
│   │       ├── ask.ts
│   │       ├── logs.ts
│   │       ├── config.ts
│   │       ├── export.ts
│   │       └── attach.ts
│   │
│   ├── mcp/
│   │   ├── server.ts             # MCP server setup
│   │   └── tools/
│   │       ├── get-errors.ts
│   │       ├── query-logs.ts
│   │       ├── replay-journey.ts
│   │       ├── get-health.ts
│   │       ├── explain-error.ts
│   │       ├── compare-deploys.ts
│   │       ├── get-slow-queries.ts
│   │       └── list-services.ts
│   │
│   ├── alerts/
│   │   ├── index.ts              # Alert dispatcher
│   │   ├── whatsapp.ts
│   │   ├── telegram.ts
│   │   └── slack.ts
│   │
│   └── config/
│       ├── index.ts              # Config loader
│       └── defaults.ts           # Default configuration
│
├── test/
│   ├── daemon/
│   ├── parser/
│   ├── ai/
│   ├── cli/
│   └── mcp/
│
└── dashboard/                    # Phase 3 (separate)
    ├── streamlit_app.py          # MVP
    └── next-app/                 # Production
```

---

## Data Storage Locations

```
~/.dialog/
├── config.toml          # User preferences (alerts, ports, retention)
├── data/
│   ├── logs.duckdb      # DuckDB database
│   ├── parquet/          # Partitioned Parquet files
│   │   ├── 2026-03-24/
│   │   │   ├── localhost_3000.parquet
│   │   │   └── localhost_5173.parquet
│   │   └── 2026-03-25/
│   ├── journey.sqlite   # Journey index
│   └── chroma/          # ChromaDB vector store
└── dialog.pid           # Daemon PID file
```

---

## API Endpoints (Internal HTTP — localhost:9999/api)

The daemon exposes a local HTTP API that the dashboard and external tools can use:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Daemon health + monitored services |
| `/api/services` | GET | List all monitored services |
| `/api/errors` | GET | Recent errors (query params: service, last, level) |
| `/api/journey/:userId` | GET | Journey for a specific user |
| `/api/logs` | GET | Log stream (query params: service, level, grep, last) |
| `/api/ask` | POST | AI query (body: { question: string }) |
| `/api/export` | POST | Export data (body: { type, format, filters }) |

---

## Dependencies

### Runtime
```json
{
  "@mistralai/mistralai": "latest",
  "@modelcontextprotocol/sdk": "latest",
  "duckdb": "latest",
  "better-sqlite3": "latest",
  "chromadb": "latest",
  "commander": "latest",
  "ink": "latest",
  "ink-spinner": "latest",
  "chalk": "latest",
  "express": "latest",
  "ws": "latest",
  "uuid": "latest",
  "toml": "latest"
}
```

### Dev
```json
{
  "typescript": "latest",
  "tsx": "latest",
  "@types/node": "latest",
  "@types/better-sqlite3": "latest",
  "vitest": "latest"
}
```
