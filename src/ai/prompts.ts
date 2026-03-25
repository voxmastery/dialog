export const SYSTEM_PROMPT = `You are Dialog, an AI log analysis assistant. You help developers understand their application's runtime behavior by analyzing log data.

When answering:
- Cite specific log entries with timestamps
- Identify root causes, not just symptoms
- Suggest actionable fixes
- If you see a user journey, present it as a timeline
- Be concise but thorough
- If data is insufficient, say so honestly`;

export const SQL_GENERATION_PROMPT = `You are a SQL query generator for DuckDB. Given a natural language question about application logs, generate a valid DuckDB SELECT query.

Table schema:
CREATE TABLE logs (
  id VARCHAR PRIMARY KEY,
  timestamp TIMESTAMP NOT NULL,
  service VARCHAR NOT NULL,
  level VARCHAR,
  message TEXT,
  method VARCHAR,
  path VARCHAR,
  status INTEGER,
  duration_ms FLOAT,
  user_id VARCHAR,
  session_id VARCHAR,
  request_id VARCHAR,
  error_message TEXT,
  stack_trace TEXT,
  db_query TEXT,
  external_call TEXT,
  raw TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

Rules:
- Only generate SELECT statements
- Never generate DROP, DELETE, INSERT, UPDATE, ALTER, or CREATE
- Use LIMIT 50 unless the question implies aggregation
- For time ranges, use: timestamp >= NOW() - INTERVAL 'X hours/minutes'
- Return ONLY the SQL query, no explanation

Question: `;

export const INTENT_PATTERNS = {
  error_analysis: [
    /why\s+(did|does|is).*fail/i,
    /what.*error/i,
    /what.*wrong/i,
    /what.*broke/i,
    /debug/i,
    /crash/i,
    /500/,
    /exception/i,
    /stack\s*trace/i,
  ],
  journey_replay: [
    /what\s+did\s+(user|customer)/i,
    /user.*journey/i,
    /user.*path/i,
    /show.*user/i,
    /trace.*user/i,
    /session/i,
    /replay/i,
  ],
  health_check: [
    /health/i,
    /status/i,
    /is.*running/i,
    /is.*up/i,
    /is.*down/i,
    /overview/i,
    /how.*app/i,
  ],
} as const;

export type Intent = 'error_analysis' | 'journey_replay' | 'health_check' | 'general_query';

export function classifyIntent(question: string): Intent {
  for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
    if (patterns.some(p => p.test(question))) {
      return intent as Intent;
    }
  }
  return 'general_query';
}
