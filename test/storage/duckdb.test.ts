import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'node:path';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { createStorage, type LogStorage } from '../../src/storage/duckdb.js';
import type { ParsedLogEntry } from '../../src/types.js';
import {
  normalizeErrorMessage,
  detectAnomaly,
} from '../../src/storage/error-grouping.js';

function makeEntry(overrides: Partial<ParsedLogEntry> = {}): ParsedLogEntry {
  return {
    id: `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date(),
    service: 'test-service',
    level: 'INFO',
    message: 'test log message',
    method: 'GET',
    path: '/api/test',
    status: 200,
    duration_ms: 42.5,
    user_id: null,
    session_id: null,
    request_id: null,
    error_message: null,
    stack_trace: null,
    db_query: null,
    external_call: null,
    raw: 'raw log line',
    ...overrides,
  };
}

describe('DuckDB Storage', () => {
  let storage: LogStorage;
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = mkdtempSync(join(tmpdir(), 'dialog-test-'));
    const dbPath = join(tmpDir, 'test.duckdb');
    storage = await createStorage(dbPath);
    await storage.init();
  });

  afterEach(async () => {
    await storage.close();
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should create tables and indexes on init', async () => {
    // If init() didn't throw, tables and indexes were created successfully.
    // Verify by inserting and querying a log.
    const entry = makeEntry();
    await storage.insertLog(entry);
    const results = await storage.queryLogs({});
    expect(results).toHaveLength(1);
  });

  it('should insert a log and retrieve it', async () => {
    const entry = makeEntry({ id: 'log-1', service: 'auth', level: 'ERROR' });
    await storage.insertLog(entry);

    const results = await storage.queryLogs({});
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('log-1');
    expect(results[0].service).toBe('auth');
    expect(results[0].level).toBe('ERROR');
  });

  it('should retrieve a log by id', async () => {
    const entry = makeEntry({ id: 'unique-id-123' });
    await storage.insertLog(entry);

    const found = await storage.getLogById('unique-id-123');
    expect(found).not.toBeNull();
    expect(found!.id).toBe('unique-id-123');

    const notFound = await storage.getLogById('nonexistent');
    expect(notFound).toBeNull();
  });

  it('should insert a batch of entries', async () => {
    const entries = [
      makeEntry({ id: 'batch-1', message: 'first' }),
      makeEntry({ id: 'batch-2', message: 'second' }),
      makeEntry({ id: 'batch-3', message: 'third' }),
    ];
    await storage.insertBatch(entries);

    const results = await storage.queryLogs({ limit: 10 });
    expect(results).toHaveLength(3);
  });

  it('should group errors with queryErrors', async () => {
    const entries = [
      makeEntry({ id: 'e1', error_message: 'Connection refused', service: 'api', path: '/users' }),
      makeEntry({ id: 'e2', error_message: 'Connection refused', service: 'api', path: '/orders' }),
      makeEntry({ id: 'e3', error_message: 'Timeout error', service: 'worker', path: '/jobs' }),
      makeEntry({ id: 'e4', message: 'ok' }),
    ];
    await storage.insertBatch(entries);

    const errors = await storage.queryErrors({});
    expect(errors).toHaveLength(2);

    const connError = errors.find((e) => e.error_message === 'Connection refused');
    expect(connError).toBeDefined();
    expect(connError!.count).toBe(2);
    expect(connError!.services).toContain('api');
    expect(connError!.affected_paths).toContain('/users');
    expect(connError!.affected_paths).toContain('/orders');

    const timeoutError = errors.find((e) => e.error_message === 'Timeout error');
    expect(timeoutError).toBeDefined();
    expect(timeoutError!.count).toBe(1);
  });

  it('should filter logs by service', async () => {
    await storage.insertBatch([
      makeEntry({ id: 's1', service: 'auth' }),
      makeEntry({ id: 's2', service: 'api' }),
      makeEntry({ id: 's3', service: 'auth' }),
    ]);

    const results = await storage.queryLogs({ service: 'auth' });
    expect(results).toHaveLength(2);
    expect(results.every((r) => r.service === 'auth')).toBe(true);
  });

  it('should filter logs by level', async () => {
    await storage.insertBatch([
      makeEntry({ id: 'l1', level: 'ERROR' }),
      makeEntry({ id: 'l2', level: 'INFO' }),
      makeEntry({ id: 'l3', level: 'ERROR' }),
    ]);

    const results = await storage.queryLogs({ level: 'ERROR' });
    expect(results).toHaveLength(2);
    expect(results.every((r) => r.level === 'ERROR')).toBe(true);
  });

  it('should filter logs by time range using "last"', async () => {
    const oldDate = new Date(Date.now() - 7_200_000); // 2 hours ago
    const recentDate = new Date(Date.now() - 60_000);  // 1 minute ago

    await storage.insertBatch([
      makeEntry({ id: 't1', timestamp: oldDate }),
      makeEntry({ id: 't2', timestamp: recentDate }),
    ]);

    const results = await storage.queryLogs({ last: '1h' });
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('t2');
  });

  it('should clean up old logs', async () => {
    const oldDate = new Date(Date.now() - 48 * 3_600_000); // 48 hours ago
    const recentDate = new Date();

    await storage.insertBatch([
      makeEntry({ id: 'old1', timestamp: oldDate }),
      makeEntry({ id: 'old2', timestamp: oldDate }),
      makeEntry({ id: 'new1', timestamp: recentDate }),
    ]);

    const deleted = await storage.cleanupOldLogs(24);
    expect(deleted).toBe(2);

    const remaining = await storage.queryLogs({});
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe('new1');
  });
});

describe('Error Normalization', () => {
  it('should replace UUIDs with placeholder', () => {
    const msg = 'User 550e8400-e29b-41d4-a716-446655440000 not found';
    expect(normalizeErrorMessage(msg)).toBe('User <UUID> not found');
  });

  it('should replace timestamps with placeholder', () => {
    const msg = 'Error at 2024-01-15T10:30:00.123Z in handler';
    expect(normalizeErrorMessage(msg)).toBe('Error at <TIMESTAMP> in handler');
  });

  it('should replace numeric IDs with placeholder', () => {
    const msg = 'Record 12345 failed validation';
    expect(normalizeErrorMessage(msg)).toBe('Record <ID> failed validation');
  });

  it('should replace file paths with line numbers', () => {
    const msg = 'Error in /app/src/handler.ts:42:10';
    expect(normalizeErrorMessage(msg)).toBe('Error in <FILE_PATH>');
  });

  it('should handle multiple replacements', () => {
    const msg = 'User 550e8400-e29b-41d4-a716-446655440000 error at /app/index.ts:10 id 99999';
    const normalized = normalizeErrorMessage(msg);
    expect(normalized).not.toContain('550e8400');
    expect(normalized).not.toContain('/app/index.ts:10');
    expect(normalized).not.toContain('99999');
  });
});

describe('Anomaly Detection', () => {
  it('should detect anomaly when current rate exceeds 3x rolling average', () => {
    expect(detectAnomaly(31, 10)).toBe(true);
  });

  it('should not flag normal rates', () => {
    expect(detectAnomaly(15, 10)).toBe(false);
  });

  it('should detect anomaly when rolling average is zero and current > 0', () => {
    expect(detectAnomaly(1, 0)).toBe(true);
  });

  it('should not flag zero current with zero average', () => {
    expect(detectAnomaly(0, 0)).toBe(false);
  });

  it('should not flag exactly 3x (must exceed)', () => {
    expect(detectAnomaly(30, 10)).toBe(false);
  });
});
