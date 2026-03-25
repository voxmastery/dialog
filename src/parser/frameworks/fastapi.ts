import type { ParsedLogEntry } from '../../types.js';
import { extractLevel, extractTimestamp, extractUserId, extractDbQuery, extractExternalCall } from '../patterns.js';

// Uvicorn access log format:
// INFO:     127.0.0.1:PORT - "METHOD /path HTTP/1.1" STATUS
const UVICORN_ACCESS = /^(\w+):\s+(\d+\.\d+\.\d+\.\d+):?\d*\s+-\s+"(\w+)\s+(\S+)\s+HTTP\/[\d.]+"\s+(\d{3})/;

// Uvicorn with timestamp:
// 2024-01-01 12:00:00,000 INFO     127.0.0.1:PORT - "METHOD /path HTTP/1.1" STATUS
const UVICORN_WITH_TIMESTAMP = /^(\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}(?:,\d+)?)\s+(\w+)\s+(\d+\.\d+\.\d+\.\d+):?\d*\s+-\s+"(\w+)\s+(\S+)\s+HTTP\/[\d.]+"\s+(\d{3})/;

export function parseFastApiLog(line: string, service: string): ParsedLogEntry | null {
  const tsMatch = UVICORN_WITH_TIMESTAMP.exec(line);
  if (tsMatch) {
    const status = parseInt(tsMatch[6], 10);
    const timestamp = new Date(tsMatch[1].replace(',', '.'));

    return {
      id: crypto.randomUUID(),
      timestamp: isNaN(timestamp.getTime()) ? new Date() : timestamp,
      service,
      level: extractLevel(tsMatch[2]) ?? (status >= 500 ? 'ERROR' : status >= 400 ? 'WARN' : 'INFO'),
      message: `${tsMatch[4]} ${tsMatch[5]} ${tsMatch[6]}`,
      method: tsMatch[4],
      path: tsMatch[5],
      status,
      duration_ms: null,
      user_id: extractUserId(line),
      session_id: null,
      request_id: null,
      error_message: status >= 500 ? `HTTP ${tsMatch[6]}` : null,
      stack_trace: null,
      db_query: extractDbQuery(line),
      external_call: extractExternalCall(line),
      raw: line,
    };
  }

  const match = UVICORN_ACCESS.exec(line);
  if (match) {
    const status = parseInt(match[5], 10);

    return {
      id: crypto.randomUUID(),
      timestamp: extractTimestamp(line) ?? new Date(),
      service,
      level: extractLevel(match[1]) ?? (status >= 500 ? 'ERROR' : status >= 400 ? 'WARN' : 'INFO'),
      message: `${match[3]} ${match[4]} ${match[5]}`,
      method: match[3],
      path: match[4],
      status,
      duration_ms: null,
      user_id: extractUserId(line),
      session_id: null,
      request_id: null,
      error_message: status >= 500 ? `HTTP ${match[5]}` : null,
      stack_trace: null,
      db_query: extractDbQuery(line),
      external_call: extractExternalCall(line),
      raw: line,
    };
  }

  return null;
}
