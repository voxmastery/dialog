# Dialog — Product Requirements Document (PRD)

**Version:** 1.0
**Date:** March 2026
**Status:** Active

---

## 1. Product Overview

**Dialog** is a local-first, AI-powered log analysis tool that auto-attaches to a developer's running project, captures all logs, reconstructs user journeys, and answers questions in plain English. AI is built-in — no user setup, no API keys, no accounts. It ships as a CLI daemon with an MCP server and a web dashboard.

**Tagline:** Your Application Speaks. Dialog Translates.

---

## 2. Problem Statement

Developers at every scale — from solo freelancers to startup teams — lack an affordable, zero-config tool that:

1. **Auto-attaches** to their running project without code changes
2. **Makes logs understandable** without learning SPL, KQL, LogQL, or regex
3. **Reconstructs user journeys** to answer "what did the customer do before it broke?"
4. **Works with ANY IDE** — not locked to AI-powered editors
5. **Costs $0** to start — Datadog is $15+/host/month, ELK needs DevOps expertise

The current developer debugging workflow: SSH → grep → scroll → add console.log → restart → repeat. 6–10 hours/week wasted.

---

## 3. Target Users

### Primary: Solo Developers & Freelancers
- 59M+ freelancers in the US, tens of millions more in India/SEA
- Use VS Code, IntelliJ, Vim — no AI IDE
- Deploy on Vercel, Railway, Fly.io, DigitalOcean
- Budget: $0–50/month for all tools combined
- Current monitoring: SSH + grep (nothing)

### Secondary: Small Engineering Teams (2–10 people)
- Seed to Series A startups
- Hit "Datadog bill shock" or "Grafana Loki complexity wall"
- Some use Cursor/Claude — want AI to see runtime, not just code
- Support team asks "what happened?" — engineers spend hours reproducing

### Tertiary: DevOps Managing Multiple Projects
- Manage 3–10 client projects simultaneously
- Need unified view across all projects
- Need exportable incident reports for clients

---

## 4. User Stories

### Core Stories (P0 — must ship in MVP)

**US-01: Auto-detect and monitor**
> As a developer, I want Dialog to automatically detect my running project on localhost and start capturing logs, so I don't have to configure anything.
>
> Acceptance: Run `dialog start` → sees "Detected: localhost:3000 (express)" within 5 seconds. Zero code changes to my project.

**US-02: See recent errors**
> As a developer, I want to see all recent errors grouped by type with counts, so I can quickly understand what's breaking.
>
> Acceptance: `dialog errors` shows errors grouped by error message, with count, first/last occurrence, and affected endpoint. Filterable by `--last 1h` and `--service`.

**US-03: Ask a question in plain English**
> As a developer, I want to type a question like "why did checkout fail?" and get a useful answer, so I don't have to manually search through logs.
>
> Acceptance: `dialog ask "why did checkout fail?"` returns a coherent answer within 5 seconds, citing specific log entries with timestamps, and suggesting a fix.

**US-04: Replay a user's journey**
> As a developer, when a user reports "it broke," I want to see exactly what that user did on the server side, so I can reproduce and fix the issue.
>
> Acceptance: `dialog journey --user 4521` shows chronological timeline: Login → Browse → Add to cart → Checkout (500 error). Root cause highlighted.

**US-05: Monitor health at a glance**
> As a developer, I want to quickly check if my app is healthy, so I know if something needs attention.
>
> Acceptance: `dialog status` shows each service with OK/WARN/ERROR indicator, error rate, and latency.

### AI IDE Stories (P0 for MCP phase)

**US-10: Query logs from AI IDE**
> As a developer using Cursor/Claude, I want my AI assistant to query Dialog's logs, so I can debug without leaving my editor.
>
> Acceptance: In Cursor, I type "Dialog, what errors happened in the last 5 minutes?" → Cursor calls `dialog_get_errors` MCP tool → returns structured errors I can act on.

**US-11: AI sees code AND runtime**
> As a developer, I want my AI assistant to explain an error using both my source code and the actual runtime log, so it can suggest a precise fix.
>
> Acceptance: AI calls `dialog_explain_error` → gets error context → combines with source code knowledge → suggests a fix that addresses the actual runtime cause, not just a guess.

### Dashboard Stories (P0 for dashboard phase)

**US-20: Ask Dialog in the browser**
> As a developer, I want an AI chat bar in the dashboard where I type questions, so I can debug visually without CLI.
>
> Acceptance: localhost:9999 has a persistent "Ask Dialog" input. I type "why did checkout fail?" → get the same quality answer as CLI `dialog ask`.

**US-21: Visual journey explorer**
> As a developer, I want a visual timeline of a user's journey, so I can see at a glance what happened.
>
> Acceptance: Journey Explorer page lets me search by user ID → shows horizontal flow diagram with color-coded status per step → root cause highlighted in red.

### Alert Stories (P1)

**US-30: Get notified on my phone**
> As a developer, I want to receive a WhatsApp/Telegram/Slack message when a critical error happens, so I know immediately even when I'm away from my desk.
>
> Acceptance: New 500 error → Dialog sends WhatsApp message within 30 seconds: "🛑 CRITICAL — POST /api/checkout returned 500 for 3 users in the last 5 min."

---

## 5. Functional Requirements

### 5.1 Core Daemon

| ID | Priority | Requirement | Acceptance Criteria |
|----|----------|-------------|-------------------|
| FR-01 | P0 | Auto-detect processes on common ports | Detect Express/FastAPI/Django/Rails on 3000/5173/8000/8080 within 5s |
| FR-02 | P0 | Capture stdout/stderr without code changes | Zero modification to user's source code |
| FR-03 | P0 | Parse structured log data | Extract: timestamp, level, HTTP method/path/status/duration. >90% accuracy |
| FR-04 | P0 | Store logs in DuckDB + Parquet | <100ms query on 1M entries. Time-range, level, endpoint filters |
| FR-05 | P0 | Extract user/session identifiers | Auto-detect JWT, session cookies, API keys, x-user-id headers |
| FR-06 | P0 | Journey index in SQLite | Reconstruct any user journey in <3 seconds |
| FR-07 | P0 | AI question answering via Mistral | `dialog ask` returns useful answer in <5 seconds using RAG |
| FR-08 | P1 | Docker container log capture | Read via Docker API |
| FR-09 | P1 | Deploy agent for production | 12-line middleware forwards logs via WebSocket |
| FR-10 | P1 | Smart model routing | magistral-small for standard, magistral-medium for complex queries |

### 5.2 CLI

| ID | Priority | Requirement | Acceptance Criteria |
|----|----------|-------------|-------------------|
| FR-20 | P0 | dialog start/stop/status | Start daemon, show monitored services with health |
| FR-21 | P0 | dialog errors with filters | List errors grouped by type, filter by --last, --service, --level |
| FR-22 | P0 | dialog journey | Display reconstructed journey in terminal |
| FR-23 | P0 | dialog ask with AI | Natural language → AI answer with log evidence |
| FR-24 | P1 | dialog logs with streaming | Live tail + historical search with --grep, --level, --endpoint |
| FR-25 | P1 | dialog attach | Manual attachment to specific ports/URLs/Docker |
| FR-26 | P1 | dialog export | Export as Markdown/JSON/CSV for bug reports |
| FR-27 | P1 | dialog config | Configure alerts, ports, retention |

### 5.3 MCP Server

| ID | Priority | Requirement | Acceptance Criteria |
|----|----------|-------------|-------------------|
| FR-30 | P0 | MCP stdio server | Compatible with Claude Desktop, Claude Code, Cursor |
| FR-31 | P0 | dialog_get_errors | Structured error data for AI reasoning |
| FR-32 | P0 | dialog_query_logs | Natural language → structured log results |
| FR-33 | P0 | dialog_replay_journey | Chronological journey with root cause |
| FR-34 | P0 | dialog_get_health | Health snapshot with metrics |
| FR-35 | P1 | dialog_explain_error | AI-analyzed explanation with fix suggestion |
| FR-36 | P1 | dialog_compare_deploys | Before/after deployment analysis |
| FR-37 | P1 | dialog_get_slow_queries | Slow queries with optimization hints |
| FR-38 | P1 | dialog_list_services | All services and status |

### 5.4 Web Dashboard

| ID | Priority | Requirement | Acceptance Criteria |
|----|----------|-------------|-------------------|
| FR-40 | P0 | Ask Dialog AI chat bar | Persistent on every page. <5s answer. Powered by magistral. |
| FR-41 | P0 | Home/Overview page | Health indicators, sparklines, top errors, drill-down |
| FR-42 | P0 | Journey Explorer page | Search by user_id/email, visual timeline, root cause |
| FR-43 | P0 | Error Detail page | Stack trace, AI explanation, related logs, fix suggestion |
| FR-44 | P1 | Live Log Stream page | Real-time feed, grouping, semantic search, filters |
| FR-45 | P1 | Alerts Config page | Multi-channel setup, severity thresholds |
| FR-46 | P1 | Settings page | Monitored services, retention, preferences |
| FR-47 | P2 | Deploy Comparison page | Before/after error and latency analysis |

---

## 6. Non-Functional Requirements

| ID | Category | Requirement | Metric |
|----|----------|-------------|--------|
| NF-01 | Performance | Log query response time | <100ms on 1M entries |
| NF-02 | Performance | AI response time | <5s first token, <10s full response |
| NF-03 | Performance | Journey reconstruction | <3 seconds for any user |
| NF-04 | Resources | Idle memory | <100MB RAM |
| NF-05 | Resources | Active memory | <300MB RAM during AI queries |
| NF-06 | Resources | Disk usage | ~1GB per 10M log entries (compressed) |
| NF-07 | Reliability | Graceful degradation | If Mistral unreachable, non-AI features still work |
| NF-08 | Security | Log data privacy | All data stays local. Only AI query text sent to Mistral. |
| NF-09 | Compatibility | OS support | macOS (ARM + Intel), Linux (x64), Windows (WSL2) |
| NF-10 | Compatibility | Node.js | >=18 |
| NF-11 | Install | Time to first log | <60 seconds from `dialog start` |
| NF-12 | Install | Zero config | No code changes, no config files for basic use |

---

## 7. AI Provider

| Role | Model | Limit (Free) | Use |
|------|-------|-------------|-----|
| Primary AI | magistral-small-2509 | 1B tokens/month, 75K TPM | Standard queries, error explanation |
| Complex AI | magistral-medium-2509 | 1B tokens/month, 75K TPM | Multi-service root cause analysis |
| Embeddings | mistral-embed-2312 | 200B tokens/month, 20M TPM | RAG vector search over logs |

AI is built into the product. Users never configure API keys. Dialog manages the Mistral API key server-side.

---

## 8. Out of Scope (v1.0)

- Mobile app
- Cloud-hosted log storage (all local for v1)
- Multi-user collaboration features
- Custom alerting rules engine
- Log forwarding to third-party tools (Splunk, Datadog export)
- Windows native support (WSL2 only for now)
- Offline AI (requires internet for AI features; non-AI features work offline)

---

## 9. Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|------------|-----------|
| Mistral changes free tier | AI costs increase | Medium | 1B/month headroom. Rate limit per user. Prompt caching. |
| Framework detection misses edge cases | Incomplete log capture | Medium | Start with 4 frameworks. Add more via community. |
| DuckDB performance at high volume | Slow queries | Low | Parquet partitioning. Auto-pruning. |
| MCP spec changes | Breaking AI IDE integration | Low | Pin to stable SDK version. |
| Mistral API downtime | AI features temporarily unavailable | Low | Non-AI features continue. Retry with backoff. |

---

## 10. Release Criteria

### MVP (Phase 1: CLI)
- [ ] `dialog start` auto-detects ≥4 frameworks
- [ ] `dialog errors` shows grouped errors with correct counts
- [ ] `dialog journey --user <id>` reconstructs journey accurately
- [ ] `dialog ask` returns useful AI-powered answers
- [ ] `dialog status` shows health for all monitored services
- [ ] Install-to-first-log < 60 seconds
- [ ] Works on macOS and Linux without extra dependencies

### Phase 2: MCP
- [ ] 4 core MCP tools working with Claude Desktop
- [ ] All 8 MCP tools implemented
- [ ] Tested with Cursor and Windsurf

### Phase 3: Dashboard
- [ ] Ask Dialog chat bar returns answers
- [ ] Journey Explorer renders visual timeline
- [ ] Error Detail shows AI explanation
- [ ] Dashboard loads in <2 seconds
