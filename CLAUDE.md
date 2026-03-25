# CLAUDE.md — Dialog Project Context

## What is Dialog

Dialog is a local-first AI-powered log analysis CLI tool and MCP server for developers. It auto-attaches to running projects on localhost, captures logs, reconstructs user journeys, and answers questions in plain English via Mistral AI's magistral models. AI is built into the product — users never configure API keys.

## Build Order

**Phase 1 (current): CLI + Core Daemon** — this is what we're building now.
Phase 2: MCP Server (after CLI works)
Phase 3: Web Dashboard (after MCP works)

## Tech Stack

- **Language:** TypeScript, Node.js 18+
- **Log Storage:** DuckDB with Parquet files
- **Journey Index:** better-sqlite3
- **AI:** Mistral API — `magistral-small-2509` (primary), `magistral-medium-2509` (complex queries), `mistral-embed-2312` (embeddings)
- **Vector Store:** ChromaDB for RAG semantic search
- **CLI:** Commander.js for commands, Ink for terminal UI
- **MCP:** @modelcontextprotocol/sdk with stdio transport

## Key Commands to Build

```bash
dialog start          # Start daemon, auto-detect projects, monitor logs
dialog stop           # Stop daemon
dialog status         # Show monitored services with health
dialog errors         # Recent errors (--last 1h, --service, --level)
dialog journey        # Replay user journey (--user, --session)
dialog ask "question" # AI-powered plain-English log query
dialog logs           # Raw log stream (--grep, --level, --endpoint)
dialog config         # Configure alerts, ports, retention
dialog export         # Export as md/json/csv
dialog attach         # Manually attach to port/url/docker
dialog mcp-serve      # Launch MCP server (Phase 2)
dialog dashboard      # Open web dashboard (Phase 3)
```

## AI Provider Details

- **DO NOT** ask users for API keys. AI is built-in. Dialog manages the Mistral key.
- **Primary model:** `magistral-small-2509` — 1B tokens/month free, 75K TPM
- **Complex model:** `magistral-medium-2509` — 1B tokens/month free, 75K TPM  
- **Embedding model:** `mistral-embed-2312` — 200B tokens/month, 20M TPM
- **No offline fallback.** Internet required for AI features. Non-AI features work without internet.
- Base URL: `https://api.mistral.ai/v1/`

## Data Storage

Everything stored locally at `~/.dialog/`:
- `~/.dialog/config.toml` — user preferences
- `~/.dialog/data/logs.duckdb` — log database
- `~/.dialog/data/parquet/` — partitioned log files
- `~/.dialog/data/journey.sqlite` — user journey index
- `~/.dialog/data/chroma/` — vector embeddings
- `~/.dialog/dialog.pid` — daemon PID

## Core Architecture Flow

```
Process detected on port → stdout/stderr captured → parsed to structured data →
stored in DuckDB + indexed in SQLite (journey) + embedded in ChromaDB (RAG) →
user asks question → AI router generates SQL + semantic search → retrieves context →
sends to magistral via Mistral API → returns plain-English answer
```

## Important Design Decisions

1. **Zero config:** `dialog start` must work with no arguments, no config file, no setup. Auto-detect everything.
2. **No user API keys:** Dialog manages its own Mistral API key. The user never sees or configures it.
3. **Local-first:** All log data stays on the developer's machine. Only the AI query context is sent to Mistral.
4. **Framework auto-detection:** Detect Express, FastAPI, Django, Rails, Next.js, Vite by reading stdout patterns.
5. **Journey reconstruction:** Every log entry with a user_id/session_id gets indexed for instant per-user replay.

## Reference Documents

- `PLAN.md` — Project plan, build order, team allocation, timeline
- `PRD.md` — Product requirements, user stories, functional requirements
- `ARCHITECTURE.md` — Full technical architecture, schemas, directory structure, data flow

## Testing

- Use vitest for unit tests
- Test with real Express and FastAPI apps running on localhost
- Test AI with real log data from Loghub (https://github.com/logpai/loghub)

## Style Guidelines

- TypeScript strict mode
- Async/await everywhere (no callbacks)
- Functional style where possible
- Clear error messages — Dialog is a developer tool, errors should be helpful
- Terminal output should be clean and beautiful (use chalk + Ink)
