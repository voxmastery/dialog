import duckdb from 'duckdb';
import type { ParsedLogEntry, QueryFilters, ErrorGroup } from '../types.js';
import {
  CREATE_LOGS_TABLE,
  CREATE_INDEXES,
  INSERT_LOG,
  QUERY_ERRORS,
  QUERY_LOGS,
} from './schema.js';

export interface LogStorage {
  readonly init: () => Promise<void>;
  readonly insertLog: (entry: ParsedLogEntry) => Promise<void>;
  readonly insertBatch: (entries: readonly ParsedLogEntry[]) => Promise<void>;
  readonly queryErrors: (filters: QueryFilters) => Promise<ErrorGroup[]>;
  readonly queryLogs: (filters: QueryFilters) => Promise<ParsedLogEntry[]>;
  readonly queryTimeSeries: (
    service: string,
    intervalMinutes: number,
  ) => Promise<readonly { readonly timestamp: string; readonly count: number }[]>;
  readonly getLogById: (id: string) => Promise<ParsedLogEntry | null>;
  readonly cleanupOldLogs: (retentionHours: number) => Promise<number>;
  readonly runSQL: (sql: string) => Promise<readonly Record<string, unknown>[]>;
  readonly close: () => Promise<void>;
}

function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)([mhd])$/);
  if (!match) {
    throw new Error(`Invalid duration format: "${duration}". Use e.g. "1h", "30m", "1d".`);
  }
  const value = parseInt(match[1], 10);
  const unit = match[2];
  const multipliers: Record<string, number> = { m: 60_000, h: 3_600_000, d: 86_400_000 };
  return value * multipliers[unit];
}

function runAsync(conn: duckdb.Connection, sql: string, params: unknown[] = []): Promise<void> {
  return new Promise((resolve, reject) => {
    conn.run(sql, ...params, (err: Error | null) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function allAsync<T>(conn: duckdb.Connection, sql: string, params: unknown[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const cb = (err: Error | null, rows: unknown[]) => {
      if (err) reject(err);
      else resolve((rows ?? []) as T[]);
    };
    if (params.length > 0) {
      conn.all(sql, ...params, cb);
    } else {
      conn.all(sql, cb);
    }
  });
}

function entryToParams(entry: ParsedLogEntry): unknown[] {
  return [
    entry.id,
    entry.timestamp.toISOString(),
    entry.service,
    entry.level,
    entry.message,
    entry.method,
    entry.path,
    entry.status,
    entry.duration_ms,
    entry.user_id,
    entry.session_id,
    entry.request_id,
    entry.error_message,
    entry.stack_trace,
    entry.db_query,
    entry.external_call,
    entry.raw,
  ];
}

function rowToEntry(row: Record<string, unknown>): ParsedLogEntry {
  return {
    id: row.id as string,
    timestamp: new Date(row.timestamp as string),
    service: row.service as string,
    level: (row.level as ParsedLogEntry['level']) ?? null,
    message: row.message as string,
    method: (row.method as string) ?? null,
    path: (row.path as string) ?? null,
    status: row.status != null ? Number(row.status) : null,
    duration_ms: row.duration_ms != null ? Number(row.duration_ms) : null,
    user_id: (row.user_id as string) ?? null,
    session_id: (row.session_id as string) ?? null,
    request_id: (row.request_id as string) ?? null,
    error_message: (row.error_message as string) ?? null,
    stack_trace: (row.stack_trace as string) ?? null,
    db_query: (row.db_query as string) ?? null,
    external_call: (row.external_call as string) ?? null,
    raw: row.raw as string,
  };
}

function buildFilteredQuery(
  filters: QueryFilters,
): { readonly sql: string; readonly params: unknown[] } {
  const parts: readonly { readonly clause: string; readonly param: unknown }[] = [
    ...(filters.last
      ? [{ clause: 'timestamp >= ?', param: new Date(Date.now() - parseDuration(filters.last)).toISOString() }]
      : []),
    ...(filters.service ? [{ clause: 'service = ?', param: filters.service }] : []),
    ...(filters.level ? [{ clause: 'level = ?', param: filters.level }] : []),
    ...(filters.path ? [{ clause: 'path = ?', param: filters.path }] : []),
    ...(filters.grep ? [{ clause: 'message LIKE ?', param: `%${filters.grep}%` }] : []),
  ];

  const whereClause = parts.length > 0
    ? parts.map((p) => ` AND ${p.clause}`).join('')
    : '';

  const limit = filters.limit ?? 100;

  return {
    sql: `${QUERY_LOGS}${whereClause} ORDER BY timestamp DESC LIMIT ?`,
    params: [...parts.map((p) => p.param), limit],
  };
}

function buildErrorQuery(
  filters: QueryFilters,
): { readonly sql: string; readonly params: unknown[] } {
  const parts: readonly { readonly clause: string; readonly param: unknown }[] = [
    ...(filters.last
      ? [{ clause: 'AND timestamp >= ?', param: new Date(Date.now() - parseDuration(filters.last)).toISOString() }]
      : []),
    ...(filters.service ? [{ clause: 'AND service = ?', param: filters.service }] : []),
  ];

  const extraWhere = parts.map((p) => p.clause).join(' ');

  const sql = `
    SELECT
      error_message,
      COUNT(*) AS count,
      MIN(timestamp)::VARCHAR AS first_seen,
      MAX(timestamp)::VARCHAR AS last_seen,
      LIST(DISTINCT path) AS affected_paths,
      LIST(DISTINCT service) AS services
    FROM logs
    WHERE error_message IS NOT NULL ${extraWhere}
    GROUP BY error_message
    ORDER BY count DESC
  `;

  return { sql, params: parts.map((p) => p.param) };
}

export function createStorage(dbPath: string, readOnly = false): Promise<LogStorage> {
  return new Promise((resolve, reject) => {
    const config: Record<string, string> = readOnly ? { access_mode: 'READ_ONLY' } : {};
    const db = new duckdb.Database(dbPath, config, (err: Error | null) => {
      if (err) {
        // If lock conflict, retry in read-only mode
        if (!readOnly && err.message.includes('Could not set lock')) {
          createStorage(dbPath, true).then(resolve).catch(reject);
          return;
        }
        reject(err);
        return;
      }

      const conn = new duckdb.Connection(db);

      const storage: LogStorage = {
        async init(): Promise<void> {
          await runAsync(conn, CREATE_LOGS_TABLE);
          const indexStatements = CREATE_INDEXES
            .split(';')
            .map((s) => s.trim())
            .filter((s) => s.length > 0);
          for (const stmt of indexStatements) {
            await runAsync(conn, stmt);
          }
        },

        async insertLog(entry: ParsedLogEntry): Promise<void> {
          await runAsync(conn, INSERT_LOG, entryToParams(entry));
        },

        async insertBatch(entries: readonly ParsedLogEntry[]): Promise<void> {
          await runAsync(conn, 'BEGIN TRANSACTION');
          try {
            for (const entry of entries) {
              await runAsync(conn, INSERT_LOG, entryToParams(entry));
            }
            await runAsync(conn, 'COMMIT');
          } catch (error) {
            await runAsync(conn, 'ROLLBACK');
            throw error;
          }
        },

        async queryErrors(filters: QueryFilters): Promise<ErrorGroup[]> {
          const { sql, params } = buildErrorQuery(filters);
          const rows = await allAsync<Record<string, unknown>>(conn, sql, params);
          return rows.map((row) => ({
            error_message: row.error_message as string,
            count: Number(row.count),
            first_seen: row.first_seen as string,
            last_seen: row.last_seen as string,
            affected_paths: (row.affected_paths as string[] ?? []).filter(Boolean),
            services: (row.services as string[] ?? []).filter(Boolean),
          }));
        },

        async queryLogs(filters: QueryFilters): Promise<ParsedLogEntry[]> {
          const { sql, params } = buildFilteredQuery(filters);
          const rows = await allAsync<Record<string, unknown>>(conn, sql, params);
          return rows.map(rowToEntry);
        },

        async queryTimeSeries(
          service: string,
          intervalMinutes: number,
        ): Promise<readonly { readonly timestamp: string; readonly count: number }[]> {
          const sql = `
            SELECT
              time_bucket(INTERVAL '${intervalMinutes} minutes', timestamp)::VARCHAR AS timestamp,
              COUNT(*) AS count
            FROM logs
            WHERE service = ?
            GROUP BY 1
            ORDER BY 1
          `;
          const rows = await allAsync<Record<string, unknown>>(conn, sql, [service]);
          return rows.map((row) => ({
            timestamp: row.timestamp as string,
            count: Number(row.count),
          }));
        },

        async getLogById(id: string): Promise<ParsedLogEntry | null> {
          const sql = `${QUERY_LOGS} AND id = ?`;
          const rows = await allAsync<Record<string, unknown>>(conn, sql, [id]);
          if (rows.length === 0) return null;
          return rowToEntry(rows[0]);
        },

        async cleanupOldLogs(retentionHours: number): Promise<number> {
          const cutoff = new Date(Date.now() - retentionHours * 3_600_000).toISOString();
          const countRows = await allAsync<Record<string, unknown>>(
            conn,
            'SELECT COUNT(*) AS cnt FROM logs WHERE timestamp < ?',
            [cutoff],
          );
          const count = Number(countRows[0]?.cnt ?? 0);
          if (count > 0) {
            await runAsync(conn, 'DELETE FROM logs WHERE timestamp < ?', [cutoff]);
          }
          return count;
        },

        async runSQL(sql: string): Promise<readonly Record<string, unknown>[]> {
          // Safety: only allow SELECT
          const upper = sql.trim().toUpperCase();
          const forbidden = ['DROP', 'DELETE', 'INSERT', 'UPDATE', 'ALTER', 'CREATE', 'TRUNCATE'];
          if (forbidden.some(kw => upper.includes(kw)) || !upper.startsWith('SELECT')) {
            throw new Error('Only SELECT queries are allowed');
          }
          return allAsync<Record<string, unknown>>(conn, sql);
        },

        close(): Promise<void> {
          return new Promise((resolveClose, rejectClose) => {
            conn.close();
            db.close((err: Error | null) => {
              if (err) rejectClose(err);
              else resolveClose();
            });
          });
        },
      };

      resolve(storage);
    });
  });
}
