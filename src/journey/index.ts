import Database from 'better-sqlite3';
import type { ParsedLogEntry, JourneyEvent } from '../types.js';

export interface JourneyIndex {
  readonly init: () => void;
  readonly indexEvent: (entry: ParsedLogEntry) => void;
  readonly getJourneyByUser: (userId: string) => JourneyEvent[];
  readonly getJourneyBySession: (sessionId: string) => JourneyEvent[];
  readonly close: () => void;
}

const CREATE_JOURNEY_TABLE = `
  CREATE TABLE IF NOT EXISTS journey_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    session_id TEXT,
    request_id TEXT,
    timestamp TEXT NOT NULL,
    service TEXT NOT NULL,
    method TEXT,
    path TEXT,
    status INTEGER,
    duration_ms REAL,
    log_id TEXT NOT NULL
  )
`;

const CREATE_USER_TIMESTAMP_INDEX = `
  CREATE INDEX IF NOT EXISTS idx_journey_user_timestamp
  ON journey_events (user_id, timestamp)
`;

const CREATE_SESSION_TIMESTAMP_INDEX = `
  CREATE INDEX IF NOT EXISTS idx_journey_session_timestamp
  ON journey_events (session_id, timestamp)
`;

const INSERT_EVENT = `
  INSERT INTO journey_events (
    user_id, session_id, request_id, timestamp,
    service, method, path, status, duration_ms, log_id
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`;

const SELECT_BY_USER = `
  SELECT id, user_id, session_id, request_id, timestamp,
         service, method, path, status, duration_ms, log_id
  FROM journey_events
  WHERE user_id = ?
  ORDER BY timestamp ASC
`;

const SELECT_BY_SESSION = `
  SELECT id, user_id, session_id, request_id, timestamp,
         service, method, path, status, duration_ms, log_id
  FROM journey_events
  WHERE session_id = ?
  ORDER BY timestamp ASC
`;

export function createJourneyIndex(dbPath: string): JourneyIndex {
  const db = new Database(dbPath);

  let insertStmt: ReturnType<typeof db.prepare> | null = null;
  let selectByUserStmt: ReturnType<typeof db.prepare> | null = null;
  let selectBySessionStmt: ReturnType<typeof db.prepare> | null = null;

  const init = (): void => {
    db.exec(CREATE_JOURNEY_TABLE);
    db.exec(CREATE_USER_TIMESTAMP_INDEX);
    db.exec(CREATE_SESSION_TIMESTAMP_INDEX);

    insertStmt = db.prepare(INSERT_EVENT);
    selectByUserStmt = db.prepare(SELECT_BY_USER);
    selectBySessionStmt = db.prepare(SELECT_BY_SESSION);
  };

  const indexEvent = (entry: ParsedLogEntry): void => {
    if (entry.user_id === null && entry.session_id === null) {
      return;
    }

    const userId = entry.user_id ?? '';
    const timestamp = entry.timestamp.toISOString();

    insertStmt!.run([
      userId,
      entry.session_id,
      entry.request_id,
      timestamp,
      entry.service,
      entry.method,
      entry.path,
      entry.status,
      entry.duration_ms,
      entry.id,
    ]);
  };

  const getJourneyByUser = (userId: string): JourneyEvent[] => {
    return selectByUserStmt!.all(userId) as JourneyEvent[];
  };

  const getJourneyBySession = (sessionId: string): JourneyEvent[] => {
    return selectBySessionStmt!.all(sessionId) as JourneyEvent[];
  };

  const close = (): void => {
    db.close();
  };

  return { init, indexEvent, getJourneyByUser, getJourneyBySession, close };
}
