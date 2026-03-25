import type { ParsedLogEntry } from '../../types.js';
import { extractLevel, extractTimestamp, extractUserId, extractDbQuery, extractExternalCall } from '../patterns.js';

// Morgan 'combined' format:
// :remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"
const MORGAN_COMBINED = /^(\S+)\s+-\s+(\S+)\s+\[([^\]]+)\]\s+"(\w+)\s+(\S+)\s+HTTP\/[\d.]+"\s+(\d{3})\s+(\S+)\s+"([^"]*)"\s+"([^"]*)"/;

// Morgan 'dev' format:
// :method :url :status :response-time ms
const MORGAN_DEV = /^(\w+)\s+(\S+)\s+(\d{3})\s+([\d.]+)\s*ms/;

export function parseExpressLog(line: string, service: string): ParsedLogEntry | null {
  const combinedMatch = MORGAN_COMBINED.exec(line);
  if (combinedMatch) {
    const clfDateStr = combinedMatch[3];
    const timestamp = parseClfDate(clfDateStr);

    return {
      id: crypto.randomUUID(),
      timestamp,
      service,
      level: parseInt(combinedMatch[6], 10) >= 500 ? 'ERROR' : parseInt(combinedMatch[6], 10) >= 400 ? 'WARN' : 'INFO',
      message: `${combinedMatch[4]} ${combinedMatch[5]} ${combinedMatch[6]}`,
      method: combinedMatch[4],
      path: combinedMatch[5],
      status: parseInt(combinedMatch[6], 10),
      duration_ms: null,
      user_id: combinedMatch[2] !== '-' ? combinedMatch[2] : extractUserId(line),
      session_id: null,
      request_id: null,
      error_message: parseInt(combinedMatch[6], 10) >= 500 ? `HTTP ${combinedMatch[6]}` : null,
      stack_trace: null,
      db_query: extractDbQuery(line),
      external_call: extractExternalCall(line),
      raw: line,
    };
  }

  const devMatch = MORGAN_DEV.exec(line);
  if (devMatch) {
    const status = parseInt(devMatch[3], 10);

    return {
      id: crypto.randomUUID(),
      timestamp: extractTimestamp(line) ?? new Date(),
      service,
      level: status >= 500 ? 'ERROR' : status >= 400 ? 'WARN' : 'INFO',
      message: `${devMatch[1]} ${devMatch[2]} ${devMatch[3]} ${devMatch[4]} ms`,
      method: devMatch[1],
      path: devMatch[2],
      status,
      duration_ms: parseFloat(devMatch[4]),
      user_id: extractUserId(line),
      session_id: null,
      request_id: null,
      error_message: status >= 500 ? `HTTP ${devMatch[3]}` : null,
      stack_trace: null,
      db_query: extractDbQuery(line),
      external_call: extractExternalCall(line),
      raw: line,
    };
  }

  return null;
}

function parseClfDate(clf: string): Date {
  // Format: 10/Oct/2000:13:55:36 -0700
  const parts = clf.match(/(\d{2})\/(\w{3})\/(\d{4}):(\d{2}):(\d{2}):(\d{2})\s([+-]\d{4})/);
  if (!parts) return new Date();

  const months: Readonly<Record<string, string>> = {
    Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
    Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
  };
  const month = months[parts[2]] ?? '01';
  const isoStr = `${parts[3]}-${month}-${parts[1]}T${parts[4]}:${parts[5]}:${parts[6]}${parts[7].slice(0, 3)}:${parts[7].slice(3)}`;
  const date = new Date(isoStr);
  return isNaN(date.getTime()) ? new Date() : date;
}
