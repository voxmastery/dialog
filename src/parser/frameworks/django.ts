import type { ParsedLogEntry } from '../../types.js';
import { extractUserId, extractDbQuery, extractExternalCall } from '../patterns.js';

// Django dev server format:
// [01/Jan/2024 12:00:00] "GET /path HTTP/1.1" 200 1234
const DJANGO_DEV = /^\[(\d{2}\/\w{3}\/\d{4}\s\d{2}:\d{2}:\d{2})\]\s+"(\w+)\s+(\S+)\s+HTTP\/[\d.]+"\s+(\d{3})\s*(\d+)?/;

// Django logging format:
// 2024-01-01 12:00:00,000 LEVEL module message
const DJANGO_LOG = /^(\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}(?:,\d+)?)\s+(DEBUG|INFO|WARNING|ERROR|CRITICAL)\s+(\S+)\s+(.*)/;

export function parseDjangoLog(line: string, service: string): ParsedLogEntry | null {
  const devMatch = DJANGO_DEV.exec(line);
  if (devMatch) {
    const timestamp = parseDjangoDate(devMatch[1]);
    const status = parseInt(devMatch[4], 10);

    return {
      id: crypto.randomUUID(),
      timestamp,
      service,
      level: status >= 500 ? 'ERROR' : status >= 400 ? 'WARN' : 'INFO',
      message: `${devMatch[2]} ${devMatch[3]} ${devMatch[4]}`,
      method: devMatch[2],
      path: devMatch[3],
      status,
      duration_ms: null,
      user_id: extractUserId(line),
      session_id: null,
      request_id: null,
      error_message: status >= 500 ? `HTTP ${devMatch[4]}` : null,
      stack_trace: null,
      db_query: extractDbQuery(line),
      external_call: extractExternalCall(line),
      raw: line,
    };
  }

  const logMatch = DJANGO_LOG.exec(line);
  if (logMatch) {
    const timestamp = new Date(logMatch[1].replace(',', '.'));
    const levelMap: Readonly<Record<string, 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL'>> = {
      DEBUG: 'DEBUG',
      INFO: 'INFO',
      WARNING: 'WARN',
      ERROR: 'ERROR',
      CRITICAL: 'FATAL',
    };

    return {
      id: crypto.randomUUID(),
      timestamp: isNaN(timestamp.getTime()) ? new Date() : timestamp,
      service,
      level: levelMap[logMatch[2]] ?? 'INFO',
      message: logMatch[4],
      method: null,
      path: null,
      status: null,
      duration_ms: null,
      user_id: extractUserId(line),
      session_id: null,
      request_id: null,
      error_message: logMatch[2] === 'ERROR' || logMatch[2] === 'CRITICAL' ? logMatch[4] : null,
      stack_trace: null,
      db_query: extractDbQuery(line),
      external_call: extractExternalCall(line),
      raw: line,
    };
  }

  return null;
}

function parseDjangoDate(dateStr: string): Date {
  // Format: 01/Jan/2024 12:00:00
  const months: Readonly<Record<string, string>> = {
    Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
    Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
  };
  const parts = dateStr.match(/(\d{2})\/(\w{3})\/(\d{4})\s(\d{2}):(\d{2}):(\d{2})/);
  if (!parts) return new Date();

  const month = months[parts[2]] ?? '01';
  const isoStr = `${parts[3]}-${month}-${parts[1]}T${parts[4]}:${parts[5]}:${parts[6]}`;
  const date = new Date(isoStr);
  return isNaN(date.getTime()) ? new Date() : date;
}
