# Dialog — Project Plan

> **Your Application Speaks. Dialog Translates.**
> A local-first AI-powered log analysis tool with CLI, MCP server, and web dashboard.

---

## What Is Dialog

Dialog is a local daemon that auto-attaches to any running development project (localhost or deployed), captures all logs, reconstructs per-user request journeys, and lets developers ask questions in plain English — powered by Mistral AI's magistral models with AI built directly into the product. Zero setup. No API keys for the user. Just `dialog start` and it works.

Three interfaces, one engine:
- **CLI** — `dialog ask "why did checkout fail?"` from any terminal
- **MCP Server** — Claude, Cursor, Windsurf can query logs via standard MCP tools
- **Web Dashboard** — localhost:9999 with AI chat bar, journey explorer, error detail

---

## Build Order

```
Phase 1: CLI + Core Daemon ← BUILD THIS FIRST (hackathon deliverable)
Phase 2: MCP Server        ← Adds AI IDE integration
Phase 3: Web Dashboard     ← Adds visual UI
```

Each phase produces a shippable, demo-able product.

---

## Phase 1: CLI + Core Daemon (48 hours)

### What We're Building
A Node.js/TypeScript daemon that:
1. Auto-detects running projects on localhost ports (3000, 5173, 8000, 8080, etc.)
2. Identifies the framework (Express, FastAPI, Django, Rails, Next.js)
3. Captures stdout/stderr log streams without any code changes
4. Parses structured data from logs (timestamps, levels, HTTP metadata, user IDs, DB queries)
5. Stores everything in DuckDB (Parquet format) for fast SQL queries
6. Indexes per-user journeys in SQLite for instant replay
7. Embeds logs into ChromaDB vectors via mistral-embed for semantic search
8. Answers plain-English questions via magistral-small AI model

### CLI Commands (Phase 1)
| Command | What It Does |
|---------|-------------|
| `dialog start` | Start daemon. Auto-detect projects. Start dashboard on :9999. |
| `dialog stop` | Stop daemon and all monitoring. |
| `dialog status` | Show monitored services with health (OK/WARN/ERROR). |
| `dialog attach --port 8080` | Manually attach to a specific port. |
| `dialog errors` | Recent errors grouped by type. Supports `--last 1h`, `--service`. |
| `dialog journey --user <id>` | Full server-side journey for a user/session. |
| `dialog ask "<question>"` | Ask anything in plain English. AI-powered answer. |
| `dialog logs` | Raw log stream with filters (`--level`, `--grep`, `--endpoint`). |
| `dialog config` | Configure alerts, ports, retention. |
| `dialog export` | Export errors/journeys as Markdown, JSON, CSV. |

### Team Allocation (4 devs, 48 hours)
| Hours | Dev 1 | Dev 2 | Dev 3 | Dev 4 |
|-------|-------|-------|-------|-------|
| 0–12 | Core daemon: port detection, log capture, parsing, DuckDB storage | Journey engine: user_id extraction, SQLite index, reconstruction | AI pipeline: Mistral API (magistral + embed), ChromaDB, RAG | CLI framework: all commands, terminal formatting (Ink) |
| 12–24 | Integration: daemon → DuckDB → journey pipeline | Test with live Express + FastAPI apps | Wire AI into `dialog ask`, semantic search end-to-end | Wire AI into CLI, test full question→answer flow |
| 24–36 | Deploy agent (12-line middleware), Docker log capture | Alert system: desktop notifications | Error grouping, anomaly detection | `dialog export`, bug report generation |
| 36–48 | End-to-end testing, edge cases | Demo app with intentional bugs | Demo script preparation | Pitch deck, rehearsal |

---

## Phase 2: MCP Server (Week 2)

### What We're Building
An MCP stdio server (using `@modelcontextprotocol/sdk`) that exposes Dialog's capabilities as tools any AI assistant can call.

### MCP Tools
| Tool | Input | Output |
|------|-------|--------|
| `dialog_get_errors` | time_range?, service?, severity? | Errors with stack traces, counts |
| `dialog_query_logs` | question (natural language) | Log results with AI summary |
| `dialog_replay_journey` | user_id \| session_id | Chronological event chain + root cause |
| `dialog_get_health` | service? | Error rate, latency p50/p95/p99, top failures |
| `dialog_explain_error` | error_id \| error_text | Plain-English explanation + fix |
| `dialog_get_slow_queries` | threshold_ms? | Slow DB queries + optimization hints |
| `dialog_compare_deploys` | before_time, after_time | Regressions, new errors, latency deltas |
| `dialog_list_services` | (none) | All monitored services + status |

### Timeline
- Day 1–2: Core MCP server, 4 primary tools (get_errors, query_logs, replay_journey, get_health)
- Day 3–4: Remaining 4 tools. Test with Claude Desktop and Claude Code.
- Day 5: Integration testing with Cursor/Windsurf. Documentation. Packaging.

---

## Phase 3: Web Dashboard (Weeks 3–4)

### What We're Building
A local web UI at localhost:9999 with built-in AI chat.

### Pages
| Page | Key Features |
|------|-------------|
| Ask Dialog | Persistent AI chat bar. Type any question. Instant answer from magistral. |
| Home / Overview | Health indicators, error sparklines, top errors, latency heatmap |
| Live Log Stream | Real-time feed, intelligent grouping, semantic search, filters |
| Journey Explorer | Search by user_id/email/session. Visual timeline. Root cause highlighted. |
| Error Detail | Stack trace, AI explanation, related logs, occurrence history, suggested fix |
| Deploy Comparison | Before/after error rates and latency post-deployment |
| Alerts Config | Multi-channel setup (WhatsApp, Telegram, Slack), severity thresholds |
| Settings | Monitored services, retention, alert preferences, MCP toggle |

### Timeline
- Week 3: Streamlit MVP — Ask Dialog chat, Home, Journey Explorer, Error Detail
- Week 4: Live Logs, Alerts, Settings, polish
- Post-launch: Migrate to Next.js for production quality

---

## Tech Stack

| Component | Technology | Why |
|-----------|-----------|-----|
| Runtime | Node.js 18+ (TypeScript) | Fast to build, huge ecosystem |
| Log Storage | DuckDB + Parquet | Embedded OLAP, MIT license, queries anything natively |
| Journey Index | better-sqlite3 | Embedded, fast, mature |
| AI (primary) | Mistral magistral-small-2509 | 1B tokens/month free, reasoning-optimized |
| AI (complex) | Mistral magistral-medium-2509 | Deeper reasoning, same 1B limit |
| Embeddings | Mistral mistral-embed-2312 | 20M TPM, effectively unlimited |
| Vector Store | ChromaDB | Local vector DB for RAG semantic search |
| MCP Server | @modelcontextprotocol/sdk | Official MCP SDK, stdio transport |
| CLI Framework | Commander.js + Ink | Beautiful terminal output, interactive |
| Dashboard (MVP) | Streamlit | 5-min deploy, built-in charts + chat |
| Dashboard (prod) | Next.js | Production-quality SPA |
| Alerts | WhatsApp Business API, Telegram Bot, Slack webhook | Multi-channel |

---

## AI Architecture

```
User asks question (CLI / Dashboard / MCP)
         │
         ▼
┌─────────────────────────┐
│     AI ROUTER            │
│                         │
│  1. Parse intent        │
│  2. Generate DuckDB SQL │
│  3. Query local logs    │
│  4. Retrieve via RAG    │──► mistral-embed (ChromaDB)
│  5. Package context     │
│  6. Send to magistral   │──► magistral-small (standard)
│     (or medium for      │──► magistral-medium (complex)
│      complex queries)   │
│  7. Return answer       │
└─────────────────────────┘
```

All AI calls go through Dialog's server-managed Mistral API key. User never configures anything.

---

## Key Design Principles

1. **Zero config** — `dialog start` and it works. No code changes. No API keys. No accounts.
2. **AI built-in** — Every interface (CLI, dashboard, MCP) has AI powered by Mistral magistral.
3. **Local-first** — All log data stays on the developer's machine. Only AI query text goes to Mistral.
4. **Framework-agnostic** — Express, FastAPI, Django, Rails, Next.js, Spring Boot, Go.
5. **Three interfaces, one engine** — CLI for terminal users, MCP for AI IDEs, dashboard for visual users.
6. **Build incrementally** — Each phase is shippable. CLI alone is a product.

---

## Success Metrics (MVP)

| Metric | Target |
|--------|--------|
| Install to first log | < 60 seconds |
| Error to root cause (CLI) | < 5 minutes |
| Error to root cause (MCP) | < 90 seconds |
| Journey reconstruction accuracy | > 90% |
| AI answer usefulness | 4.0 / 5.0 user rating |
| Supported frameworks at launch | ≥ 4 |
