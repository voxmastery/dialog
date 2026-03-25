# Dialog — Task Breakdown

## Phase 1: CLI + Core Daemon

### Sprint 1: Foundation (Hours 0–12)

#### T-01: Project scaffolding
- [ ] Init Node.js project with TypeScript
- [ ] Configure tsconfig.json (strict mode, ES2022, Node16 module resolution)
- [ ] Install core deps: commander, duckdb, better-sqlite3, chalk, @mistralai/mistralai
- [ ] Set up directory structure per ARCHITECTURE.md
- [ ] Create `src/index.ts` entry point
- [ ] Add `bin` field in package.json so `dialog` is a global command
- [ ] Add basic `dialog --version` and `dialog --help`

#### T-02: Process Detector
- [ ] Implement port scanner for ports: 3000, 3001, 4000, 5000, 5173, 8000, 8080, 8888
- [ ] Use `lsof -i :PORT` (macOS/Linux) to find process on each port
- [ ] Read process name/command to identify framework
- [ ] Framework signatures: Express ("Listening on"), FastAPI ("Uvicorn running"), Django ("Starting development server"), Next.js ("ready - started server"), Rails ("Puma starting"), Vite ("Local: http://localhost")
- [ ] Return array of `{ port, pid, framework, status }` objects
- [ ] Re-scan every 10 seconds for changes
- [ ] Handle: port not occupied, process died, new process started

#### T-03: Log Interceptor
- [ ] Attach to process stdout/stderr by spawning and piping, or tailing process output
- [ ] Stream raw log lines to parser in real-time
- [ ] Handle multi-line entries (stack traces) by detecting continuation patterns
- [ ] Buffer and batch for efficiency (flush every 100ms or 50 lines)
- [ ] Handle process restart gracefully (re-attach)

#### T-04: Structured Parser
- [ ] JSON parser: detect JSON log lines, extract all fields
- [ ] Common format parser: regex for "timestamp level message" patterns
- [ ] HTTP request parser: extract method, path, status, duration from access logs
- [ ] Error parser: detect error messages and stack traces
- [ ] User ID extractor: detect JWT subject, session cookies, x-user-id headers in log context
- [ ] DB query detector: detect SQL statements from ORM log output
- [ ] External call detector: detect outbound HTTP calls (Stripe, Twilio URLs)
- [ ] Framework-specific parsers for Express (morgan format), FastAPI, Django, Rails
- [ ] Fallback: raw text with timestamp extraction

#### T-05: DuckDB Storage
- [ ] Initialize DuckDB database at `~/.dialog/data/logs.duckdb`
- [ ] Create logs table with schema from ARCHITECTURE.md
- [ ] Implement `insertLog(entry)` — single insert
- [ ] Implement `insertBatch(entries[])` — batch insert for performance
- [ ] Implement `queryErrors(filters)` — errors grouped by message
- [ ] Implement `queryLogs(filters)` — filtered log retrieval
- [ ] Implement `queryTimeSeries(service, metric, interval)` — for health sparklines
- [ ] Auto-create `~/.dialog/data/` directory if not exists
- [ ] Handle retention: delete entries older than `retention_hours` config

#### T-06: Journey Index (SQLite)
- [ ] Initialize SQLite database at `~/.dialog/data/journey.sqlite`
- [ ] Create journey_events table with schema from ARCHITECTURE.md
- [ ] Implement `indexEvent(logEntry)` — add to journey index on every log with user_id
- [ ] Implement `getJourney(userId)` — return chronological events for a user
- [ ] Implement `getJourney(sessionId)` — return by session
- [ ] Format journey as readable timeline with root cause highlighting

---

### Sprint 2: AI + CLI Commands (Hours 12–24)

#### T-07: Mistral AI Client
- [ ] Initialize Mistral client with built-in API key
- [ ] Implement `askMagistral(question, context, model?)` — chat completion
- [ ] Implement `embedTexts(texts[])` — batch embeddings via mistral-embed
- [ ] Handle rate limits: retry with exponential backoff on 429
- [ ] Handle API errors gracefully (show "AI temporarily unavailable" in CLI)
- [ ] Model selection: magistral-small for standard, magistral-medium for complex

#### T-08: RAG Pipeline (ChromaDB)
- [ ] Initialize ChromaDB local instance at `~/.dialog/data/chroma/`
- [ ] Create "logs" collection with mistral-embed embeddings
- [ ] Implement `embedAndStore(logEntries[])` — embed new logs, store vectors
- [ ] Implement `semanticSearch(query, k=10)` — find relevant logs by meaning
- [ ] Batch embedding pipeline: embed new logs every 30 seconds
- [ ] Handle: collection doesn't exist yet, empty results

#### T-09: AI Router
- [ ] Implement `handleQuestion(question)` — main entry point
- [ ] Intent classification: error_analysis, journey_replay, health_check, general_query
- [ ] SQL generation: convert natural language to DuckDB SQL query
- [ ] Context building: combine DuckDB results + ChromaDB semantic results
- [ ] System prompt from ARCHITECTURE.md
- [ ] Model selection based on query complexity
- [ ] Response formatting for CLI (terminal-friendly text)

#### T-10: CLI — `dialog start`
- [ ] Parse arguments (--port, --no-dashboard)
- [ ] Check if daemon already running (PID file check)
- [ ] Start daemon as background process (or foreground with --foreground)
- [ ] Write PID to `~/.dialog/dialog.pid`
- [ ] Run Process Detector
- [ ] Print detected services with framework labels
- [ ] Start Log Interceptor for each detected service
- [ ] Print "Dashboard: localhost:9999" (placeholder for Phase 3)

#### T-11: CLI — `dialog stop`
- [ ] Read PID from `~/.dialog/dialog.pid`
- [ ] Send SIGTERM to daemon process
- [ ] Remove PID file
- [ ] Print confirmation

#### T-12: CLI — `dialog status`
- [ ] Query daemon for current monitored services
- [ ] For each service: show port, framework, status (OK/WARN/ERROR)
- [ ] Show error count in last 5 minutes
- [ ] Show uptime
- [ ] Use chalk for color coding (green OK, yellow WARN, red ERROR)

#### T-13: CLI — `dialog errors`
- [ ] Query DuckDB for recent errors
- [ ] Group by error message
- [ ] Show: count, first occurrence, last occurrence, affected endpoint
- [ ] Support filters: --last (1h, 30m, 1d), --service, --level
- [ ] Format as clean terminal table

#### T-14: CLI — `dialog journey --user <id>`
- [ ] Query SQLite journey index for user
- [ ] Reconstruct chronological timeline
- [ ] Format as: "timestamp METHOD /path → STATUS (duration)"
- [ ] Highlight errors in red
- [ ] Show root cause line (first error in sequence)
- [ ] Support --session flag for session-based lookup

#### T-15: CLI — `dialog ask "<question>"`
- [ ] Pass question to AI Router
- [ ] Show spinner while waiting for response
- [ ] Print AI response with log citations
- [ ] Handle: no relevant data found, API error, empty question

---

### Sprint 3: Polish + Demo (Hours 24–48)

#### T-16: CLI — `dialog logs`
- [ ] Live tail mode (default): stream new logs in real-time
- [ ] Historical mode (--last 1h): query DuckDB
- [ ] Filters: --level, --service, --endpoint, --grep, --format json
- [ ] Color-coded output by log level

#### T-17: CLI — `dialog config`
- [ ] Load/save `~/.dialog/config.toml`
- [ ] Interactive prompts for: alert channels, extra ports, retention hours
- [ ] Validate inputs
- [ ] Show current config with `dialog config --show`

#### T-18: CLI — `dialog export`
- [ ] Export errors as Markdown (for GitHub issues)
- [ ] Export journey as Markdown (for bug reports)
- [ ] Export logs as JSON or CSV
- [ ] Support: --format (md, json, csv), --last, --user, --service

#### T-19: CLI — `dialog attach`
- [ ] `--port N` — manually attach to a specific port
- [ ] `--docker CONTAINER` — attach to Docker container logs
- [ ] `--url URL` — start WebSocket listener for remote forwarding (P1)
- [ ] Add to monitored services list

#### T-20: Alert System (basic)
- [ ] Detect new ERROR/FATAL log entries
- [ ] Desktop notification via node-notifier
- [ ] Configurable severity threshold
- [ ] Cooldown: don't spam (max 1 alert per error type per 5 min)

#### T-21: Error Grouping + Anomaly Detection
- [ ] Group errors by normalized message (strip variable parts like IDs, timestamps)
- [ ] Track error frequency over time
- [ ] Detect anomaly: error rate > 3x the rolling 1-hour average
- [ ] Flag new error types (never seen before)

#### T-22: Demo App
- [ ] Simple Express e-commerce app with intentional bugs:
  - GET /products — works fine
  - POST /cart/add — works fine
  - POST /checkout — 500 error (Stripe timeout)
  - GET /api/users/:id — intermittent null reference
- [ ] Generates realistic log output
- [ ] Has user_id in JWT tokens for journey reconstruction

#### T-23: Integration Testing
- [ ] Test: dialog start → detects demo app → captures logs
- [ ] Test: dialog errors → shows grouped errors correctly
- [ ] Test: dialog journey --user test-user-1 → shows correct timeline
- [ ] Test: dialog ask "why did checkout fail?" → returns useful answer
- [ ] Test: dialog status → shows service health
- [ ] Test: full flow from error to root cause in <5 minutes

---

## Phase 2: MCP Server

#### T-30: MCP Server Core
- [ ] Set up MCP server using @modelcontextprotocol/sdk
- [ ] stdio transport
- [ ] Register all 8 tools with proper schemas
- [ ] Test: `dialog mcp-serve` launches correctly

#### T-31: dialog_get_errors tool
- [ ] Input schema: { time_range?, service?, severity? }
- [ ] Query DuckDB, return structured error array
- [ ] Test with Claude Desktop

#### T-32: dialog_query_logs tool
- [ ] Input schema: { question: string }
- [ ] Route through AI Router
- [ ] Return structured results with AI summary

#### T-33: dialog_replay_journey tool
- [ ] Input schema: { user_id? | session_id? | request_id? }
- [ ] Return chronological event chain with root cause

#### T-34: dialog_get_health tool
- [ ] Input schema: { service? }
- [ ] Return: error_rate, latency p50/p95/p99, top_failures

#### T-35: dialog_explain_error tool
- [ ] Input schema: { error_id? | error_text? }
- [ ] Return AI explanation + suggested fix

#### T-36: dialog_compare_deploys tool
- [ ] Input schema: { before_time, after_time }
- [ ] Return: error deltas, new errors, latency changes

#### T-37: dialog_get_slow_queries tool
- [ ] Input schema: { threshold_ms?, service? }
- [ ] Return slow DB queries with stats

#### T-38: dialog_list_services tool
- [ ] No input
- [ ] Return all monitored services with status

---

## Phase 3: Web Dashboard

#### T-40: Dashboard skeleton (Streamlit MVP)
- [ ] Streamlit app at localhost:9999
- [ ] Sidebar navigation: Ask, Home, Logs, Journeys, Errors, Settings

#### T-41: Ask Dialog page
- [ ] Text input for questions
- [ ] POST to /api/ask
- [ ] Display AI response with formatting

#### T-42: Home/Overview page
- [ ] Service health cards
- [ ] Error rate sparkline chart
- [ ] Top 5 errors list
- [ ] Latency heatmap

#### T-43: Journey Explorer page
- [ ] User ID search input
- [ ] Visual timeline display
- [ ] Expandable step details

#### T-44: Error Detail page
- [ ] Stack trace with syntax highlighting
- [ ] AI explanation section
- [ ] Related logs
- [ ] Occurrence history chart

#### T-45: Live Log Stream page
- [ ] Real-time log feed
- [ ] Filter controls
- [ ] Color-coded by level

#### T-46: Settings page
- [ ] Monitored services list
- [ ] Alert channel config
- [ ] Retention setting
