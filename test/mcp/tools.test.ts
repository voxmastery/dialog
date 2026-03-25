import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ToolContext } from '../../src/mcp/types.js';
import type { ParsedLogEntry, ErrorGroup, JourneyEvent } from '../../src/types.js';

import { handler as getErrorsHandler } from '../../src/mcp/tools/get-errors.js';
import { handler as queryLogsHandler } from '../../src/mcp/tools/query-logs.js';
import { handler as replayJourneyHandler } from '../../src/mcp/tools/replay-journey.js';
import { handler as getHealthHandler } from '../../src/mcp/tools/get-health.js';
import { handler as explainErrorHandler } from '../../src/mcp/tools/explain-error.js';
import { handler as compareDeploysHandler } from '../../src/mcp/tools/compare-deploys.js';
import { handler as getSlowQueriesHandler } from '../../src/mcp/tools/get-slow-queries.js';
import { handler as listServicesHandler } from '../../src/mcp/tools/list-services.js';

// --- Shared mock factories ---

function makeMockEntry(overrides: Partial<ParsedLogEntry> = {}): ParsedLogEntry {
  return {
    id: overrides.id ?? 'test-id-1',
    timestamp: overrides.timestamp ?? new Date('2026-03-25T10:00:00Z'),
    service: overrides.service ?? 'localhost:3000',
    level: overrides.level ?? 'INFO',
    message: overrides.message ?? 'Test log entry',
    method: overrides.method ?? 'GET',
    path: overrides.path ?? '/api/test',
    status: overrides.status ?? 200,
    duration_ms: overrides.duration_ms ?? 45,
    user_id: overrides.user_id ?? null,
    session_id: overrides.session_id ?? null,
    request_id: overrides.request_id ?? null,
    error_message: overrides.error_message ?? null,
    stack_trace: overrides.stack_trace ?? null,
    db_query: overrides.db_query ?? null,
    external_call: overrides.external_call ?? null,
    raw: overrides.raw ?? 'Test log entry',
  };
}

function makeMockErrorGroup(overrides: Partial<ErrorGroup> = {}): ErrorGroup {
  return {
    error_message: overrides.error_message ?? 'TypeError: Cannot read properties of null',
    count: overrides.count ?? 5,
    first_seen: overrides.first_seen ?? '2026-03-25T09:00:00Z',
    last_seen: overrides.last_seen ?? '2026-03-25T10:00:00Z',
    affected_paths: overrides.affected_paths ?? ['/api/users/:id'],
    services: overrides.services ?? ['localhost:3000'],
  };
}

function makeMockJourneyEvent(overrides: Partial<JourneyEvent> = {}): JourneyEvent {
  return {
    id: overrides.id ?? 1,
    user_id: overrides.user_id ?? 'user-101',
    session_id: overrides.session_id ?? null,
    request_id: overrides.request_id ?? null,
    timestamp: overrides.timestamp ?? '2026-03-25T10:00:00Z',
    service: overrides.service ?? 'localhost:3000',
    method: overrides.method ?? 'GET',
    path: overrides.path ?? '/products',
    status: overrides.status ?? 200,
    duration_ms: overrides.duration_ms ?? 45,
    log_id: overrides.log_id ?? 'log-1',
  };
}

function createMockContext(overrides: Partial<{
  logs: ParsedLogEntry[];
  errors: ErrorGroup[];
  journeyEvents: JourneyEvent[];
  logById: ParsedLogEntry | null;
  aiAnswer: string | null;
  aiAvailable: boolean;
}> = {}): ToolContext {
  const logs = overrides.logs ?? [];
  const errors = overrides.errors ?? [];
  const journeyEvents = overrides.journeyEvents ?? [];

  return {
    storage: {
      init: vi.fn().mockResolvedValue(undefined),
      insertLog: vi.fn().mockResolvedValue(undefined),
      insertBatch: vi.fn().mockResolvedValue(undefined),
      queryErrors: vi.fn().mockResolvedValue(errors),
      queryLogs: vi.fn().mockResolvedValue(logs),
      queryTimeSeries: vi.fn().mockResolvedValue([]),
      getLogById: vi.fn().mockResolvedValue(overrides.logById ?? null),
      cleanupOldLogs: vi.fn().mockResolvedValue(0),
      runSQL: vi.fn().mockResolvedValue([]),
      close: vi.fn().mockResolvedValue(undefined),
    },
    journeyIndex: {
      init: vi.fn(),
      indexEvent: vi.fn(),
      getJourneyByUser: vi.fn().mockReturnValue(journeyEvents),
      getJourneyBySession: vi.fn().mockReturnValue(journeyEvents),
      close: vi.fn(),
    },
    mistralClient: {
      askMagistral: vi.fn().mockResolvedValue({
        success: true,
        answer: overrides.aiAnswer ?? 'AI explanation here',
        error: null,
      }),
      generateSQL: vi.fn().mockResolvedValue(null),
      embedTexts: vi.fn().mockResolvedValue([]),
      isAvailable: vi.fn().mockReturnValue(overrides.aiAvailable ?? true),
    },
    embeddingStore: {
      init: vi.fn().mockResolvedValue(undefined),
      embedAndStore: vi.fn().mockResolvedValue(undefined),
      semanticSearch: vi.fn().mockResolvedValue([]),
    },
    aiRouter: {
      handleQuestion: vi.fn().mockResolvedValue({
        success: true,
        answer: overrides.aiAnswer ?? 'AI analysis: The error is caused by a null reference.',
        citations: [],
        error: null,
      }),
    },
    config: {
      ports: [3000, 5173, 8000, 8080],
      retention_hours: 168,
      alert_severity: 'ERROR',
      alert_cooldown_seconds: 300,
      scan_interval_ms: 10000,
      batch_flush_ms: 100,
      batch_flush_count: 50,
      embed_interval_ms: 30000,
    },
  };
}

// --- Tests ---

describe('dialog_get_errors', () => {
  it('returns grouped errors with metadata', async () => {
    const ctx = createMockContext({
      errors: [
        makeMockErrorGroup({ count: 10, error_message: 'Stripe timeout' }),
        makeMockErrorGroup({ count: 3, error_message: 'Null reference' }),
      ],
    });

    const result = await getErrorsHandler({}, ctx);

    expect(result.success).toBe(true);
    expect(result.data!.total_groups).toBe(2);
    expect(result.data!.errors[0]!.error_message).toBe('Stripe timeout');
    expect(result.data!.errors[0]!.count).toBe(10);
    expect(result.metadata.tool).toBe('dialog_get_errors');
  });

  it('returns empty when no errors', async () => {
    const ctx = createMockContext({ errors: [] });
    const result = await getErrorsHandler({ time_range: '30m' }, ctx);

    expect(result.success).toBe(true);
    expect(result.data!.total_groups).toBe(0);
    expect(result.data!.time_range).toBe('30m');
  });

  it('passes filters to storage', async () => {
    const ctx = createMockContext();
    await getErrorsHandler({ time_range: '2h', service: 'localhost:5000', severity: 'FATAL' }, ctx);

    expect(ctx.storage.queryErrors).toHaveBeenCalledWith({
      last: '2h',
      service: 'localhost:5000',
      level: 'FATAL',
    });
  });

  it('handles storage errors gracefully', async () => {
    const ctx = createMockContext();
    (ctx.storage.queryErrors as any).mockRejectedValue(new Error('DB connection lost'));

    const result = await getErrorsHandler({}, ctx);

    expect(result.success).toBe(false);
    expect(result.error).toContain('DB connection lost');
  });
});

describe('dialog_query_logs', () => {
  it('returns AI answer for a question', async () => {
    const ctx = createMockContext({ aiAnswer: 'The checkout failed due to Stripe API timeout.' });

    const result = await queryLogsHandler({ question: 'Why did checkout fail?' }, ctx);

    expect(result.success).toBe(true);
    expect(result.data!.answer).toContain('Stripe API timeout');
    expect(result.data!.question).toBe('Why did checkout fail?');
  });

  it('reports AI unavailability', async () => {
    const ctx = createMockContext({ aiAvailable: false });
    (ctx.aiRouter.handleQuestion as any).mockResolvedValue({
      success: false,
      answer: null,
      citations: [],
      error: 'AI not configured',
    });

    const result = await queryLogsHandler({ question: 'test' }, ctx);

    expect(result.success).toBe(false);
    expect(result.error).toContain('AI not configured');
  });
});

describe('dialog_replay_journey', () => {
  it('returns timeline for a user', async () => {
    const events = [
      makeMockJourneyEvent({ path: '/products', status: 200, timestamp: '2026-03-25T10:00:00Z' }),
      makeMockJourneyEvent({ path: '/cart/add', status: 200, method: 'POST', timestamp: '2026-03-25T10:01:00Z' }),
      makeMockJourneyEvent({ path: '/checkout', status: 500, method: 'POST', timestamp: '2026-03-25T10:02:00Z' }),
    ];
    const ctx = createMockContext({ journeyEvents: events });

    const result = await replayJourneyHandler({ user_id: 'user-101' }, ctx);

    expect(result.success).toBe(true);
    expect(result.data!.event_count).toBe(3);
    expect(result.data!.has_errors).toBe(true);
    expect(result.data!.root_cause).not.toBeNull();
    expect(result.data!.root_cause!.path).toBe('/checkout');
    expect(result.data!.timeline[2]!.is_root_cause).toBe(true);
    expect(result.data!.timeline[0]!.is_error).toBe(false);
  });

  it('returns error when no user_id or session_id provided', async () => {
    const ctx = createMockContext();

    const result = await replayJourneyHandler({}, ctx);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Provide either user_id or session_id');
  });

  it('returns error when no journey found', async () => {
    const ctx = createMockContext({ journeyEvents: [] });

    const result = await replayJourneyHandler({ user_id: 'nonexistent' }, ctx);

    expect(result.success).toBe(false);
    expect(result.error).toContain('No journey found');
  });

  it('supports session_id lookup', async () => {
    const events = [makeMockJourneyEvent({ session_id: 'sess-1' })];
    const ctx = createMockContext({ journeyEvents: events });

    const result = await replayJourneyHandler({ session_id: 'sess-1' }, ctx);

    expect(result.success).toBe(true);
    expect(ctx.journeyIndex.getJourneyBySession).toHaveBeenCalledWith('sess-1');
  });
});

describe('dialog_get_health', () => {
  it('returns health snapshot with latency stats', async () => {
    const logs = [
      makeMockEntry({ duration_ms: 30 }),
      makeMockEntry({ duration_ms: 50 }),
      makeMockEntry({ duration_ms: 200 }),
      makeMockEntry({ duration_ms: 10 }),
      makeMockEntry({ level: 'ERROR', error_message: 'fail' }),
    ];
    const ctx = createMockContext({
      logs,
      errors: [makeMockErrorGroup({ count: 1 })],
    });

    const result = await getHealthHandler({}, ctx);

    expect(result.success).toBe(true);
    expect(result.data!.services.length).toBeGreaterThan(0);
    const svc = result.data!.services[0]!;
    expect(svc.latency.p50_ms).not.toBeNull();
    expect(svc.latency.p95_ms).not.toBeNull();
  });

  it('returns OK when no errors', async () => {
    const ctx = createMockContext({
      logs: [makeMockEntry()],
      errors: [],
    });

    const result = await getHealthHandler({}, ctx);

    expect(result.success).toBe(true);
    expect(result.data!.overall_status).toBe('OK');
  });
});

describe('dialog_explain_error', () => {
  it('explains an error by ID', async () => {
    const entry = makeMockEntry({
      id: 'err-1',
      error_message: 'TypeError: Cannot read null',
      stack_trace: '  at foo.js:42\n  at bar.js:10',
      level: 'ERROR',
    });
    const ctx = createMockContext({ logById: entry, logs: [entry] });

    const result = await explainErrorHandler({ error_id: 'err-1' }, ctx);

    expect(result.success).toBe(true);
    expect(result.data!.error_text).toContain('Cannot read null');
    expect(result.data!.stack_trace).toContain('foo.js:42');
    expect(result.data!.ai_available).toBe(true);
  });

  it('explains an error by text', async () => {
    const ctx = createMockContext();

    const result = await explainErrorHandler({ error_text: 'ETIMEDOUT connecting to Stripe' }, ctx);

    expect(result.success).toBe(true);
    expect(result.data!.error_text).toContain('ETIMEDOUT');
  });

  it('returns error when neither id nor text provided', async () => {
    const ctx = createMockContext();

    const result = await explainErrorHandler({}, ctx);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Provide either error_id or error_text');
  });

  it('returns error when log entry not found', async () => {
    const ctx = createMockContext({ logById: null });

    const result = await explainErrorHandler({ error_id: 'nonexistent' }, ctx);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Log entry not found');
  });
});

describe('dialog_compare_deploys', () => {
  it('compares two time periods', async () => {
    const ctx = createMockContext({
      logs: [makeMockEntry({ duration_ms: 50 }), makeMockEntry({ duration_ms: 100 })],
      errors: [makeMockErrorGroup({ count: 2 })],
    });

    const result = await compareDeploysHandler({
      before_start: '2h',
      before_end: '1h',
    }, ctx);

    expect(result.success).toBe(true);
    expect(result.data!.verdict).toBeDefined();
    expect(result.data!.error_delta).toBeDefined();
    expect(result.data!.latency_change).toBeDefined();
  });

  it('returns INSUFFICIENT_DATA with few logs', async () => {
    const ctx = createMockContext({ logs: [], errors: [] });

    const result = await compareDeploysHandler({
      before_start: '2h',
      before_end: '1h',
    }, ctx);

    expect(result.success).toBe(true);
    expect(result.data!.verdict).toBe('INSUFFICIENT_DATA');
  });
});

describe('dialog_get_slow_queries', () => {
  it('finds slow DB queries', async () => {
    const ctx = createMockContext({
      logs: [
        makeMockEntry({ db_query: 'SELECT * FROM users', duration_ms: 200 }),
        makeMockEntry({ db_query: 'SELECT * FROM orders', duration_ms: 50 }),
        makeMockEntry({ db_query: 'SELECT * FROM analytics', duration_ms: 500 }),
        makeMockEntry({ duration_ms: 30 }), // no db_query
      ],
    });

    const result = await getSlowQueriesHandler({ threshold_ms: 100 }, ctx);

    expect(result.success).toBe(true);
    expect(result.data!.total_found).toBe(2);
    // Sorted by duration desc
    expect(result.data!.slow_queries[0]!.query).toBe('SELECT * FROM analytics');
    expect(result.data!.slow_queries[0]!.duration_ms).toBe(500);
  });

  it('returns empty with high threshold', async () => {
    const ctx = createMockContext({
      logs: [makeMockEntry({ db_query: 'SELECT 1', duration_ms: 5 })],
    });

    const result = await getSlowQueriesHandler({ threshold_ms: 1000 }, ctx);

    expect(result.success).toBe(true);
    expect(result.data!.total_found).toBe(0);
  });
});

describe('dialog_list_services', () => {
  it('lists services with status', async () => {
    const ctx = createMockContext({
      logs: [
        makeMockEntry({ service: 'localhost:3000' }),
        makeMockEntry({ service: 'localhost:3000' }),
        makeMockEntry({ service: 'localhost:5173' }),
      ],
      errors: [makeMockErrorGroup({ services: ['localhost:3000'], count: 1 })],
    });

    const result = await listServicesHandler({} as any, ctx);

    expect(result.success).toBe(true);
    expect(result.data!.total).toBe(2);
    const svc3000 = result.data!.services.find(s => s.service === 'localhost:3000');
    expect(svc3000).toBeDefined();
    expect(svc3000!.error_count_1h).toBe(1);
  });

  it('returns empty when no data', async () => {
    const ctx = createMockContext({ logs: [], errors: [] });

    const result = await listServicesHandler({} as any, ctx);

    expect(result.success).toBe(true);
    expect(result.data!.total).toBe(0);
  });
});

describe('response envelope', () => {
  it('includes metadata with timing on success', async () => {
    const ctx = createMockContext({ errors: [] });
    const result = await getErrorsHandler({}, ctx);

    expect(result.metadata).toBeDefined();
    expect(result.metadata.tool).toBe('dialog_get_errors');
    expect(result.metadata.timestamp).toBeTruthy();
    expect(typeof result.metadata.duration_ms).toBe('number');
    expect(result.metadata.duration_ms).toBeGreaterThanOrEqual(0);
  });

  it('includes metadata with timing on error', async () => {
    const ctx = createMockContext();
    (ctx.storage.queryErrors as any).mockRejectedValue(new Error('fail'));

    const result = await getErrorsHandler({}, ctx);

    expect(result.success).toBe(false);
    expect(result.metadata.tool).toBe('dialog_get_errors');
    expect(typeof result.metadata.duration_ms).toBe('number');
  });
});
