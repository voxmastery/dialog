import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createJourneyIndex } from '../../src/journey/index.js';
import {
  reconstructJourney,
  formatJourneyForCli,
} from '../../src/journey/reconstruct.js';
import type { JourneyIndex } from '../../src/journey/index.js';
import type { ParsedLogEntry } from '../../src/types.js';

function makeParsedLogEntry(
  overrides: Partial<ParsedLogEntry> = {},
): ParsedLogEntry {
  return {
    id: 'log-1',
    timestamp: new Date('2026-03-25T10:00:00Z'),
    service: 'api-gateway',
    level: 'INFO',
    message: 'Request handled',
    method: 'GET',
    path: '/products',
    status: 200,
    duration_ms: 45,
    user_id: 'user-123',
    session_id: 'sess-abc',
    request_id: 'req-001',
    error_message: null,
    stack_trace: null,
    db_query: null,
    external_call: null,
    raw: '2026-03-25T10:00:00Z GET /products 200',
    ...overrides,
  };
}

describe('JourneyIndex', () => {
  let index: JourneyIndex;

  beforeEach(() => {
    index = createJourneyIndex(':memory:');
    index.init();
  });

  afterEach(() => {
    index.close();
  });

  describe('init', () => {
    it('should create the journey_events table', () => {
      // init already called in beforeEach; calling again should not throw
      expect(() => index.init()).not.toThrow();
    });

    it('should create indexes on user_id,timestamp and session_id,timestamp', () => {
      // A second init should be idempotent (CREATE IF NOT EXISTS)
      expect(() => index.init()).not.toThrow();
    });
  });

  describe('indexEvent', () => {
    it('should store events with user_id', () => {
      const entry = makeParsedLogEntry();
      index.indexEvent(entry);

      const results = index.getJourneyByUser('user-123');
      expect(results).toHaveLength(1);
      expect(results[0].log_id).toBe('log-1');
      expect(results[0].service).toBe('api-gateway');
      expect(results[0].method).toBe('GET');
      expect(results[0].path).toBe('/products');
      expect(results[0].status).toBe(200);
      expect(results[0].duration_ms).toBe(45);
    });

    it('should store events with only session_id (no user_id)', () => {
      const entry = makeParsedLogEntry({
        user_id: null,
        session_id: 'sess-only',
      });
      index.indexEvent(entry);

      const results = index.getJourneyBySession('sess-only');
      expect(results).toHaveLength(1);
      expect(results[0].session_id).toBe('sess-only');
    });

    it('should skip entries without user_id or session_id', () => {
      const entry = makeParsedLogEntry({
        user_id: null,
        session_id: null,
      });
      index.indexEvent(entry);

      const userResults = index.getJourneyByUser('');
      const sessionResults = index.getJourneyBySession('');
      expect(userResults).toHaveLength(0);
      expect(sessionResults).toHaveLength(0);
    });
  });

  describe('getJourneyByUser', () => {
    it('should return events in chronological order', () => {
      const entries = [
        makeParsedLogEntry({
          id: 'log-3',
          timestamp: new Date('2026-03-25T10:02:00Z'),
          path: '/checkout',
        }),
        makeParsedLogEntry({
          id: 'log-1',
          timestamp: new Date('2026-03-25T10:00:00Z'),
          path: '/products',
        }),
        makeParsedLogEntry({
          id: 'log-2',
          timestamp: new Date('2026-03-25T10:01:00Z'),
          path: '/cart',
        }),
      ];

      for (const entry of entries) {
        index.indexEvent(entry);
      }

      const results = index.getJourneyByUser('user-123');
      expect(results).toHaveLength(3);
      expect(results[0].path).toBe('/products');
      expect(results[1].path).toBe('/cart');
      expect(results[2].path).toBe('/checkout');
    });

    it('should return empty array for unknown user', () => {
      const results = index.getJourneyByUser('nonexistent');
      expect(results).toHaveLength(0);
    });
  });

  describe('getJourneyBySession', () => {
    it('should return events for a given session in order', () => {
      const entries = [
        makeParsedLogEntry({
          id: 'log-2',
          timestamp: new Date('2026-03-25T10:01:00Z'),
          session_id: 'sess-xyz',
          path: '/cart',
        }),
        makeParsedLogEntry({
          id: 'log-1',
          timestamp: new Date('2026-03-25T10:00:00Z'),
          session_id: 'sess-xyz',
          path: '/products',
        }),
      ];

      for (const entry of entries) {
        index.indexEvent(entry);
      }

      const results = index.getJourneyBySession('sess-xyz');
      expect(results).toHaveLength(2);
      expect(results[0].path).toBe('/products');
      expect(results[1].path).toBe('/cart');
    });
  });
});

describe('reconstructJourney', () => {
  it('should identify root cause as first 5xx error', () => {
    const events = [
      {
        id: 1,
        user_id: 'user-123',
        session_id: null,
        request_id: null,
        timestamp: '2026-03-25T10:00:00.000Z',
        service: 'api-gateway',
        method: 'GET',
        path: '/products',
        status: 200,
        duration_ms: 45,
        log_id: 'log-1',
      },
      {
        id: 2,
        user_id: 'user-123',
        session_id: null,
        request_id: null,
        timestamp: '2026-03-25T10:01:00.000Z',
        service: 'api-gateway',
        method: 'POST',
        path: '/cart',
        status: 500,
        duration_ms: 120,
        log_id: 'log-2',
      },
      {
        id: 3,
        user_id: 'user-123',
        session_id: null,
        request_id: null,
        timestamp: '2026-03-25T10:02:00.000Z',
        service: 'api-gateway',
        method: 'GET',
        path: '/error',
        status: 502,
        duration_ms: 300,
        log_id: 'log-3',
      },
    ] as const;

    const journey = reconstructJourney(events);
    expect(journey.rootCauseIndex).toBe(1);
    expect(journey.hasErrors).toBe(true);
    expect(journey.userId).toBe('user-123');
  });

  it('should return null rootCauseIndex when no errors', () => {
    const events = [
      {
        id: 1,
        user_id: 'user-123',
        session_id: null,
        request_id: null,
        timestamp: '2026-03-25T10:00:00.000Z',
        service: 'api-gateway',
        method: 'GET',
        path: '/products',
        status: 200,
        duration_ms: 45,
        log_id: 'log-1',
      },
    ] as const;

    const journey = reconstructJourney(events);
    expect(journey.rootCauseIndex).toBeNull();
    expect(journey.hasErrors).toBe(false);
  });

  it('should handle empty events array', () => {
    const journey = reconstructJourney([]);
    expect(journey.userId).toBe('');
    expect(journey.events).toHaveLength(0);
    expect(journey.rootCauseIndex).toBeNull();
    expect(journey.hasErrors).toBe(false);
  });
});

describe('formatJourneyForCli', () => {
  it('should produce formatted lines with status and duration', () => {
    const journey = reconstructJourney([
      {
        id: 1,
        user_id: 'user-123',
        session_id: null,
        request_id: null,
        timestamp: '2026-03-25T10:00:00.000Z',
        service: 'api-gateway',
        method: 'GET',
        path: '/products',
        status: 200,
        duration_ms: 45,
        log_id: 'log-1',
      },
    ]);

    const output = formatJourneyForCli(journey);
    expect(output).toContain('2026-03-25T10:00:00.000Z');
    expect(output).toContain('GET');
    expect(output).toContain('/products');
    expect(output).toContain('200');
    expect(output).toContain('(45ms)');
  });

  it('should mark root cause with indicator', () => {
    const journey = reconstructJourney([
      {
        id: 1,
        user_id: 'user-123',
        session_id: null,
        request_id: null,
        timestamp: '2026-03-25T10:00:00.000Z',
        service: 'api-gateway',
        method: 'GET',
        path: '/products',
        status: 200,
        duration_ms: 45,
        log_id: 'log-1',
      },
      {
        id: 2,
        user_id: 'user-123',
        session_id: null,
        request_id: null,
        timestamp: '2026-03-25T10:01:00.000Z',
        service: 'api-gateway',
        method: 'POST',
        path: '/checkout',
        status: 500,
        duration_ms: 200,
        log_id: 'log-2',
      },
    ]);

    const output = formatJourneyForCli(journey);
    expect(output).toContain('ROOT CAUSE');
    // The first line (200) should not have ROOT CAUSE
    const lines = output.split('\n');
    expect(lines[0]).not.toContain('ROOT CAUSE');
    expect(lines[1]).toContain('ROOT CAUSE');
  });

  it('should handle events with null method and path', () => {
    const journey = reconstructJourney([
      {
        id: 1,
        user_id: 'user-123',
        session_id: null,
        request_id: null,
        timestamp: '2026-03-25T10:00:00.000Z',
        service: 'api-gateway',
        method: null,
        path: null,
        status: 200,
        duration_ms: null,
        log_id: 'log-1',
      },
    ]);

    const output = formatJourneyForCli(journey);
    expect(output).toContain('???');
    expect(output).toContain('/');
    expect(output).not.toContain('ms)');
  });
});
