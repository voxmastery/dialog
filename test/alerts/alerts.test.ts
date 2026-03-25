import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAlertDispatcher } from '../../src/alerts/index.js';
import type { ParsedLogEntry, DialogConfig } from '../../src/types.js';

// Mock node-notifier so desktop notifications don't fire during tests
vi.mock('node-notifier', () => ({
  default: { notify: vi.fn() },
}));

function makeEntry(overrides: Partial<ParsedLogEntry> = {}): ParsedLogEntry {
  return {
    id: 'log-1',
    timestamp: new Date('2026-03-25T12:00:00Z'),
    service: 'api',
    level: 'ERROR',
    message: 'Something went wrong',
    method: 'GET',
    path: '/checkout',
    status: 500,
    duration_ms: null,
    user_id: null,
    session_id: null,
    request_id: null,
    error_message: 'Connection refused',
    stack_trace: null,
    db_query: null,
    external_call: null,
    raw: 'ERROR Something went wrong',
    ...overrides,
  };
}

const baseConfig: DialogConfig = {
  ports: [3000, 8000],
  retention_hours: 72,
  alert_severity: 'ERROR',
  alert_cooldown_seconds: 300,
  scan_interval_ms: 5000,
  batch_flush_ms: 1000,
  batch_flush_count: 100,
  embed_interval_ms: 30000,
};

describe('AlertDispatcher', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('emits alert for ERROR entry', () => {
    const dispatcher = createAlertDispatcher(baseConfig);
    const handler = vi.fn();
    dispatcher.on('alert', handler);

    dispatcher.processEntry(makeEntry());

    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'ERROR',
        service: 'api',
        message: 'Connection refused',
      }),
    );
  });

  it('does NOT emit alert for DEBUG entry (below threshold)', () => {
    const dispatcher = createAlertDispatcher(baseConfig);
    const handler = vi.fn();
    dispatcher.on('alert', handler);

    dispatcher.processEntry(makeEntry({ level: 'DEBUG' }));

    expect(handler).not.toHaveBeenCalled();
  });

  it('cooldown prevents duplicate alerts within 5 minutes', () => {
    const dispatcher = createAlertDispatcher(baseConfig);
    const handler = vi.fn();
    dispatcher.on('alert', handler);

    const entry = makeEntry();
    dispatcher.processEntry(entry);
    dispatcher.processEntry(entry);
    dispatcher.processEntry(entry);

    expect(handler).toHaveBeenCalledOnce();
  });

  it('different errors are not affected by each other cooldown', () => {
    const dispatcher = createAlertDispatcher(baseConfig);
    const handler = vi.fn();
    dispatcher.on('alert', handler);

    dispatcher.processEntry(makeEntry({ error_message: 'Timeout on /api/users' }));
    dispatcher.processEntry(makeEntry({ error_message: 'Database connection lost' }));

    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('clearCooldowns resets all cooldowns', () => {
    const dispatcher = createAlertDispatcher(baseConfig);
    const handler = vi.fn();
    dispatcher.on('alert', handler);

    const entry = makeEntry();
    dispatcher.processEntry(entry);
    expect(handler).toHaveBeenCalledOnce();

    dispatcher.clearCooldowns();

    dispatcher.processEntry(entry);
    expect(handler).toHaveBeenCalledTimes(2);
  });
});
