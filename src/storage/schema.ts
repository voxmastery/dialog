export const CREATE_LOGS_TABLE = `
  CREATE TABLE IF NOT EXISTS logs (
    id VARCHAR PRIMARY KEY,
    timestamp TIMESTAMP NOT NULL,
    service VARCHAR NOT NULL,
    level VARCHAR,
    message TEXT NOT NULL,
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
  )
`;

export const CREATE_INDEXES = `
  CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs (timestamp);
  CREATE INDEX IF NOT EXISTS idx_logs_service ON logs (service);
  CREATE INDEX IF NOT EXISTS idx_logs_level ON logs (level);
  CREATE INDEX IF NOT EXISTS idx_logs_user_id ON logs (user_id);
  CREATE INDEX IF NOT EXISTS idx_logs_path ON logs (path);
  CREATE INDEX IF NOT EXISTS idx_logs_status ON logs (status);
`;

export const INSERT_LOG = `
  INSERT INTO logs (
    id, timestamp, service, level, message, method, path,
    status, duration_ms, user_id, session_id, request_id,
    error_message, stack_trace, db_query, external_call, raw
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`;

export const QUERY_ERRORS = `
  SELECT
    error_message,
    COUNT(*) AS count,
    MIN(timestamp)::VARCHAR AS first_seen,
    MAX(timestamp)::VARCHAR AS last_seen,
    LIST(DISTINCT path) AS affected_paths,
    LIST(DISTINCT service) AS services
  FROM logs
  WHERE error_message IS NOT NULL
  GROUP BY error_message
  ORDER BY count DESC
`;

export const QUERY_LOGS = `
  SELECT
    id, timestamp, service, level, message, method, path,
    status, duration_ms, user_id, session_id, request_id,
    error_message, stack_trace, db_query, external_call, raw
  FROM logs
  WHERE 1=1
`;
