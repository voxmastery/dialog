import type { LogLevel, ParsedLogEntry } from '../../types.js';
import { extractTimestamp, extractUserId, extractDbQuery, extractExternalCall } from '../patterns.js';

// Rails production.log format:
// I, [2024-01-01T12:00:00.000000 #12345]  INFO -- : [request-id] Started GET "/path" for 127.0.0.1
const RAILS_START = /^\w,\s+\[([^\]]+)\]\s+(\w+)\s+--\s+:\s+(?:\[([^\]]*)\]\s+)?Started\s+(\w+)\s+"([^"]+)"\s+for\s+(\S+)/;

// Rails completed line:
// I, [2024-01-01T12:00:00.000000 #12345]  INFO -- : Completed 200 OK in 5ms
const RAILS_COMPLETED = /^\w,\s+\[([^\]]+)\]\s+(\w+)\s+--\s+:\s+(?:\[([^\]]*)\]\s+)?Completed\s+(\d{3})\s+\w+\s+in\s+([\d.]+)ms/;

// Rails generic log line:
// I, [2024-01-01T12:00:00.000000 #12345]  INFO -- : message
const RAILS_GENERIC = /^\w,\s+\[([^\]]+)\]\s+(\w+)\s+--\s+:\s+(?:\[([^\]]*)\]\s+)?(.*)/;

// Simple Rails format: Started GET "/path" for 127.0.0.1
const RAILS_SIMPLE_START = /^Started\s+(\w+)\s+"([^"]+)"\s+for\s+(\S+)/;

// Simple Rails format: Completed 200 OK in 5ms
const RAILS_SIMPLE_COMPLETED = /^Completed\s+(\d{3})\s+\w+\s+in\s+([\d.]+)ms/;

const LEVEL_MAP: Readonly<Record<string, LogLevel>> = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
  FATAL: 'FATAL',
};

function parseRailsTimestamp(raw: string): Date {
  // Format: 2024-01-01T12:00:00.000000 #12345
  const cleaned = raw.replace(/\s+#\d+$/, '');
  const date = new Date(cleaned);
  return isNaN(date.getTime()) ? new Date() : date;
}

export function parseRailsLog(line: string, service: string): ParsedLogEntry | null {
  const startMatch = RAILS_START.exec(line);
  if (startMatch) {
    return {
      id: crypto.randomUUID(),
      timestamp: parseRailsTimestamp(startMatch[1]),
      service,
      level: LEVEL_MAP[startMatch[2]] ?? 'INFO',
      message: `Started ${startMatch[4]} "${startMatch[5]}" for ${startMatch[6]}`,
      method: startMatch[4],
      path: startMatch[5],
      status: null,
      duration_ms: null,
      user_id: extractUserId(line),
      session_id: null,
      request_id: startMatch[3] || null,
      error_message: null,
      stack_trace: null,
      db_query: extractDbQuery(line),
      external_call: extractExternalCall(line),
      raw: line,
    };
  }

  const completedMatch = RAILS_COMPLETED.exec(line);
  if (completedMatch) {
    const status = parseInt(completedMatch[4], 10);
    return {
      id: crypto.randomUUID(),
      timestamp: parseRailsTimestamp(completedMatch[1]),
      service,
      level: status >= 500 ? 'ERROR' : status >= 400 ? 'WARN' : 'INFO',
      message: `Completed ${completedMatch[4]} in ${completedMatch[5]}ms`,
      method: null,
      path: null,
      status,
      duration_ms: parseFloat(completedMatch[5]),
      user_id: extractUserId(line),
      session_id: null,
      request_id: completedMatch[3] || null,
      error_message: status >= 500 ? `HTTP ${completedMatch[4]}` : null,
      stack_trace: null,
      db_query: extractDbQuery(line),
      external_call: extractExternalCall(line),
      raw: line,
    };
  }

  const genericMatch = RAILS_GENERIC.exec(line);
  if (genericMatch) {
    return {
      id: crypto.randomUUID(),
      timestamp: parseRailsTimestamp(genericMatch[1]),
      service,
      level: LEVEL_MAP[genericMatch[2]] ?? 'INFO',
      message: genericMatch[4],
      method: null,
      path: null,
      status: null,
      duration_ms: null,
      user_id: extractUserId(line),
      session_id: null,
      request_id: genericMatch[3] || null,
      error_message: genericMatch[2] === 'ERROR' || genericMatch[2] === 'FATAL' ? genericMatch[4] : null,
      stack_trace: null,
      db_query: extractDbQuery(line),
      external_call: extractExternalCall(line),
      raw: line,
    };
  }

  const simpleStartMatch = RAILS_SIMPLE_START.exec(line);
  if (simpleStartMatch) {
    return {
      id: crypto.randomUUID(),
      timestamp: extractTimestamp(line) ?? new Date(),
      service,
      level: 'INFO',
      message: `Started ${simpleStartMatch[1]} "${simpleStartMatch[2]}" for ${simpleStartMatch[3]}`,
      method: simpleStartMatch[1],
      path: simpleStartMatch[2],
      status: null,
      duration_ms: null,
      user_id: extractUserId(line),
      session_id: null,
      request_id: null,
      error_message: null,
      stack_trace: null,
      db_query: extractDbQuery(line),
      external_call: extractExternalCall(line),
      raw: line,
    };
  }

  const simpleCompletedMatch = RAILS_SIMPLE_COMPLETED.exec(line);
  if (simpleCompletedMatch) {
    const status = parseInt(simpleCompletedMatch[1], 10);
    return {
      id: crypto.randomUUID(),
      timestamp: extractTimestamp(line) ?? new Date(),
      service,
      level: status >= 500 ? 'ERROR' : status >= 400 ? 'WARN' : 'INFO',
      message: `Completed ${simpleCompletedMatch[1]} in ${simpleCompletedMatch[2]}ms`,
      method: null,
      path: null,
      status,
      duration_ms: parseFloat(simpleCompletedMatch[2]),
      user_id: extractUserId(line),
      session_id: null,
      request_id: null,
      error_message: status >= 500 ? `HTTP ${simpleCompletedMatch[1]}` : null,
      stack_trace: null,
      db_query: extractDbQuery(line),
      external_call: extractExternalCall(line),
      raw: line,
    };
  }

  return null;
}
