import type { ParsedLogEntry } from '../types.js';
import { parseJsonLog } from './json.js';
import { parseExpressLog } from './frameworks/express.js';
import { parseFastApiLog } from './frameworks/fastapi.js';
import { parseDjangoLog } from './frameworks/django.js';
import { parseRailsLog } from './frameworks/rails.js';
import {
  extractTimestamp,
  extractLevel,
  extractHttpInfo,
  extractUserId,
  extractDbQuery,
  extractExternalCall,
  isStackTraceLine,
  isErrorLine,
} from './patterns.js';

type FrameworkParser = (line: string, service: string) => ParsedLogEntry | null;

const FRAMEWORK_PARSERS: Readonly<Record<string, FrameworkParser>> = {
  express: parseExpressLog,
  fastapi: parseFastApiLog,
  django: parseDjangoLog,
  rails: parseRailsLog,
};

const ALL_FRAMEWORK_PARSERS: readonly FrameworkParser[] = [
  parseExpressLog,
  parseFastApiLog,
  parseDjangoLog,
  parseRailsLog,
];

function parseWithPatterns(line: string, service: string): ParsedLogEntry {
  const timestamp = extractTimestamp(line) ?? new Date();
  const level = extractLevel(line);
  const httpInfo = extractHttpInfo(line);
  const userId = extractUserId(line);
  const dbQuery = extractDbQuery(line);
  const externalCall = extractExternalCall(line);
  const errorDetected = isErrorLine(line);

  return {
    id: crypto.randomUUID(),
    timestamp,
    service,
    level: level ?? (errorDetected ? 'ERROR' : null),
    message: line,
    method: httpInfo?.method ?? null,
    path: httpInfo?.path ?? null,
    status: httpInfo?.status ?? null,
    duration_ms: httpInfo?.duration_ms ?? null,
    user_id: userId,
    session_id: null,
    request_id: null,
    error_message: errorDetected ? line : null,
    stack_trace: null,
    db_query: dbQuery,
    external_call: externalCall,
    raw: line,
  };
}

export function parseLine(line: string, service: string, framework?: string): ParsedLogEntry {
  // 1. Try JSON first
  const jsonResult = parseJsonLog(line, service);
  if (jsonResult) return jsonResult;

  // 2. Try framework-specific parser if framework is known
  if (framework) {
    const frameworkParser = FRAMEWORK_PARSERS[framework];
    if (frameworkParser) {
      const result = frameworkParser(line, service);
      if (result) return result;
    }
  }

  // 3. Try all framework parsers
  for (const parser of ALL_FRAMEWORK_PARSERS) {
    const result = parser(line, service);
    if (result) return result;
  }

  // 4. Fallback to pattern-based extraction
  return parseWithPatterns(line, service);
}

function isContinuationLine(line: string): boolean {
  return isStackTraceLine(line) || /^\s{2,}\S/.test(line) || /^Caused by:/.test(line);
}

export function parseMultiLine(lines: readonly string[], service: string, framework?: string): readonly ParsedLogEntry[] {
  const results: ParsedLogEntry[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Skip empty lines
    if (!line || line.trim() === '') {
      i++;
      continue;
    }

    // Parse the main line
    const entry = parseLine(line, service, framework);

    // Check for continuation lines (stack traces)
    const stackLines: string[] = [];
    let j = i + 1;

    while (j < lines.length && lines[j] !== undefined && isContinuationLine(lines[j])) {
      stackLines.push(lines[j]);
      j++;
    }

    // Also detect "Traceback (most recent call last):" multiline blocks
    if (line.includes('Traceback') || entry.error_message !== null) {
      while (j < lines.length && lines[j] !== undefined) {
        const nextLine = lines[j];
        if (nextLine.trim() === '' || (!isContinuationLine(nextLine) && !nextLine.startsWith('    ') && !nextLine.startsWith('\t'))) {
          break;
        }
        stackLines.push(nextLine);
        j++;
      }
    }

    if (stackLines.length > 0) {
      const stackTrace = stackLines.join('\n');
      const mergedEntry: ParsedLogEntry = {
        ...entry,
        stack_trace: entry.stack_trace
          ? `${entry.stack_trace}\n${stackTrace}`
          : stackTrace,
        error_message: entry.error_message ?? entry.message,
        level: entry.level ?? 'ERROR',
      };
      results.push(mergedEntry);
    } else {
      results.push(entry);
    }

    i = j;
  }

  return results;
}
