import type { LogLevel } from '../types.js';

const ISO_8601 = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?/;
const COMMON_DATETIME = /\d{2}\/\w{3}\/\d{4}:\d{2}:\d{2}:\d{2}\s[+-]\d{4}/;
const BRACKET_DATETIME = /\[\d{2}\/\w{3}\/\d{4}\s\d{2}:\d{2}:\d{2}\]/;
const SIMPLE_DATETIME = /\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}(?:\.\d+)?/;
const DJANGO_DATE = /\[\d{2}\/\w{3}\/\d{4}\s\d{2}:\d{2}:\d{2}\]/;

const LEVEL_PATTERN = /\b(DEBUG|INFO|WARN|WARNING|ERROR|FATAL|CRITICAL)\b/i;

const HTTP_ACCESS = /\b(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+(\/\S*)\s+(\d{3})(?:\s+(\d+(?:\.\d+)?)\s*(?:ms)?)?/;

const ERROR_MARKERS = /(?:^|\s|[\[])(?:Error:|Exception:|FATAL|Traceback|panic:|TypeError:|ReferenceError:|SyntaxError:)/;
const STACK_TRACE_LINE = /^\s+at\s+|^\s+File\s+"|^\s+from\s+|^\s{4,}\S|^Traceback\s/;

const USER_ID_PATTERNS: readonly RegExp[] = [
  /"(?:userId|user_id|uid)":\s*"([^"]+)"/,
  /\buser[_-]?id[=:]\s*"?([a-zA-Z0-9_-]+)"?/i,
  /\bx-user-id[=:]\s*"?([a-zA-Z0-9_-]+)"?/i,
  /"sub":\s*"([^"]+)"/,
];

const DB_QUERY_PATTERN = /\b(SELECT|INSERT\s+INTO|UPDATE|DELETE\s+FROM)\b[^;]*/i;

const EXTERNAL_CALL_PATTERNS: readonly RegExp[] = [
  /https?:\/\/(?:api\.)?stripe\.com\S*/,
  /https?:\/\/(?:api\.)?twilio\.com\S*/,
  /https?:\/\/(?:api\.)?sendgrid\.com\S*/,
  /https?:\/\/(?:api\.)?slack\.com\S*/,
  /https?:\/\/(?:api\.)?github\.com\S*/,
  /https?:\/\/(?:api\.)?aws\.amazonaws\.com\S*/,
  /https?:\/\/\S+\.googleapis\.com\S*/,
];

const LEVEL_MAP: Readonly<Record<string, LogLevel>> = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARN: 'WARN',
  WARNING: 'WARN',
  ERROR: 'ERROR',
  FATAL: 'FATAL',
  CRITICAL: 'FATAL',
};

export function extractTimestamp(line: string): Date | null {
  const isoMatch = ISO_8601.exec(line);
  if (isoMatch) {
    const date = new Date(isoMatch[0]);
    if (!isNaN(date.getTime())) return date;
  }

  const commonMatch = COMMON_DATETIME.exec(line);
  if (commonMatch) {
    const raw = commonMatch[0];
    const parsed = new Date(raw.replace(':', ' ').replace(/(\d{2})\/(\w{3})\/(\d{4})\s/, '$2 $1, $3 '));
    if (!isNaN(parsed.getTime())) return parsed;
  }

  const bracketMatch = BRACKET_DATETIME.exec(line);
  if (bracketMatch) {
    const raw = bracketMatch[0].slice(1, -1);
    const parsed = new Date(raw.replace(/\//g, ' '));
    if (!isNaN(parsed.getTime())) return parsed;
  }

  const simpleMatch = SIMPLE_DATETIME.exec(line);
  if (simpleMatch) {
    const date = new Date(simpleMatch[0].replace(' ', 'T'));
    if (!isNaN(date.getTime())) return date;
  }

  return null;
}

export function extractLevel(line: string): LogLevel | null {
  const match = LEVEL_PATTERN.exec(line);
  if (!match) return null;
  return LEVEL_MAP[match[1].toUpperCase()] ?? null;
}

export function extractHttpInfo(line: string): {
  readonly method: string;
  readonly path: string;
  readonly status: number;
  readonly duration_ms: number | null;
} | null {
  const match = HTTP_ACCESS.exec(line);
  if (!match) return null;
  return {
    method: match[1],
    path: match[2],
    status: parseInt(match[3], 10),
    duration_ms: match[4] ? parseFloat(match[4]) : null,
  };
}

export function extractUserId(line: string): string | null {
  for (const pattern of USER_ID_PATTERNS) {
    const match = pattern.exec(line);
    if (match?.[1]) return match[1];
  }
  return null;
}

export function extractDbQuery(line: string): string | null {
  const match = DB_QUERY_PATTERN.exec(line);
  return match ? match[0].trim() : null;
}

export function extractExternalCall(line: string): string | null {
  for (const pattern of EXTERNAL_CALL_PATTERNS) {
    const match = pattern.exec(line);
    if (match) return match[0];
  }
  return null;
}

export function isStackTraceLine(line: string): boolean {
  return STACK_TRACE_LINE.test(line);
}

export function isErrorLine(line: string): boolean {
  return ERROR_MARKERS.test(line);
}
