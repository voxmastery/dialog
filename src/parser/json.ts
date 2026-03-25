import type { LogLevel, ParsedLogEntry } from '../types.js';
import { logger } from '../lib/logger.js';

const LEVEL_MAP: Readonly<Record<string, LogLevel>> = {
  debug: 'DEBUG',
  info: 'INFO',
  warn: 'WARN',
  warning: 'WARN',
  error: 'ERROR',
  fatal: 'FATAL',
  critical: 'FATAL',
  '10': 'DEBUG',
  '20': 'DEBUG',
  '30': 'INFO',
  '40': 'WARN',
  '50': 'ERROR',
  '60': 'FATAL',
};

function extractField(obj: Readonly<Record<string, unknown>>, ...keys: readonly string[]): unknown {
  for (const key of keys) {
    if (key in obj) return obj[key];
  }
  return undefined;
}

function parseLevel(value: unknown): LogLevel | null {
  if (value == null) return null;
  const normalized = String(value).toLowerCase().trim();
  return LEVEL_MAP[normalized] ?? null;
}

function parseTimestamp(value: unknown): Date {
  if (value instanceof Date) return value;
  if (typeof value === 'number') return new Date(value);
  if (typeof value === 'string') {
    const date = new Date(value);
    if (!isNaN(date.getTime())) return date;
  }
  return new Date();
}

function toStringOrNull(value: unknown): string | null {
  return value != null ? String(value) : null;
}

function toNumberOrNull(value: unknown): number | null {
  if (value == null) return null;
  const num = Number(value);
  return isNaN(num) ? null : num;
}

export function parseJsonLog(line: string, service: string): ParsedLogEntry | null {
  let obj: Record<string, unknown>;
  try {
    obj = JSON.parse(line) as Record<string, unknown>;
  } catch (err) {
    logger.debug({ err, service }, 'JSON log parse failed');
    return null;
  }

  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
    return null;
  }

  const rawLevel = extractField(obj, 'level', 'severity', 'lvl');
  const rawMessage = extractField(obj, 'msg', 'message', 'text');
  const rawTimestamp = extractField(obj, 'timestamp', 'time', 'ts', '@timestamp', 'datetime', 'date');
  const rawMethod = extractField(obj, 'method', 'http_method', 'req_method');
  const rawUrl = extractField(obj, 'url', 'path', 'uri', 'req_url', 'request_url');
  const rawStatus = extractField(obj, 'statusCode', 'status', 'status_code', 'http_status', 'res_status');
  const rawDuration = extractField(obj, 'responseTime', 'duration', 'response_time', 'elapsed', 'latency');
  const rawUserId = extractField(obj, 'userId', 'user_id', 'uid');
  const rawSessionId = extractField(obj, 'sessionId', 'session_id', 'sid');
  const rawRequestId = extractField(obj, 'requestId', 'request_id', 'req_id', 'trace_id');
  const rawError = extractField(obj, 'err', 'error', 'error_message', 'err_msg');
  const rawStack = extractField(obj, 'stack', 'stack_trace', 'stackTrace');

  const errorMessage = rawError != null
    ? (typeof rawError === 'object' && rawError !== null && 'message' in rawError
      ? String((rawError as Readonly<Record<string, unknown>>).message)
      : String(rawError))
    : null;

  const stackTrace = rawStack != null
    ? String(rawStack)
    : (typeof rawError === 'object' && rawError !== null && 'stack' in rawError
      ? String((rawError as Readonly<Record<string, unknown>>).stack)
      : null);

  return {
    id: crypto.randomUUID(),
    timestamp: parseTimestamp(rawTimestamp),
    service,
    level: parseLevel(rawLevel),
    message: rawMessage != null ? String(rawMessage) : line,
    method: toStringOrNull(rawMethod),
    path: toStringOrNull(rawUrl),
    status: toNumberOrNull(rawStatus),
    duration_ms: toNumberOrNull(rawDuration),
    user_id: toStringOrNull(rawUserId),
    session_id: toStringOrNull(rawSessionId),
    request_id: toStringOrNull(rawRequestId),
    error_message: errorMessage,
    stack_trace: stackTrace,
    db_query: null,
    external_call: null,
    raw: line,
  };
}
