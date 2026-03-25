# Changelog

## [0.2.0] - 2026-03-25
### Added
- Interactive Claude Code-style CLI REPL (`dialog-cli ask`)
- Groq (Llama 3.3 70B) as primary AI provider
- OpenRouter (DeepSeek V3) as fallback AI provider
- MCP server proxy mode (uses dialog-web API when running)
- API-backed storage adapter for concurrent access
- DuckDB read-only fallback on lock conflict

### Changed
- Removed Gemini and Mistral as default providers
- CLI commands now proxy through dialog-web API when available

## [0.1.2] - 2026-03-25
### Added
- Groq and OpenRouter AI providers
- Gemini primary with Mistral fallback

## [0.1.1] - 2026-03-25
### Fixed
- Dashboard nav links across all HTML pages
- Marketing site install command updated to dialog-dev

## [0.1.0] - 2026-03-25
### Added
- Initial release: CLI + MCP Server + Web Dashboard
- 11 CLI commands (start, stop, status, errors, journey, ask, logs, config, export, attach, mcp-serve)
- 8 MCP tools for AI IDE integration
- Web dashboard with 13 pages
- Next.js marketing site
- DuckDB log storage with Parquet
- SQLite journey index
- Express/FastAPI/Django/Rails/Next.js/Vite framework detection
- 131 backend tests
