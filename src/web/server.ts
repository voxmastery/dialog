import express, { type Request, type Response } from 'express';
import { createServer } from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import type { LogStorage } from '../storage/duckdb.js';
import type { JourneyIndex } from '../journey/index.js';
import type { AiRouter } from '../ai/router.js';
import type { ParsedLogEntry, LogLevel } from '../types.js';
import { createDaemon, type Daemon } from '../daemon/index.js';
import type { DialogConfig } from '../types.js';

export interface WebServerContext {
  readonly storage: LogStorage;
  readonly journeyIndex: JourneyIndex;
  readonly aiRouter: AiRouter;
  readonly config: DialogConfig;
  readonly daemon: Daemon;
}

export function createWebServer(ctx: WebServerContext) {
  const app = express();
  app.use(express.json());

  // --- REST API Routes ---

  // Health / status
  app.get('/api/health', async (_req: Request, res: Response) => {
    try {
      const services = ctx.daemon.getServices();
      res.json({
        status: 'ok',
        uptime: process.uptime(),
        services: services.length,
        service_list: services.map(s => ({
          port: s.port,
          framework: s.framework,
          status: s.status,
        })),
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to get health' });
    }
  });

  // List services
  app.get('/api/services', async (_req: Request, res: Response) => {
    try {
      const services = ctx.daemon.getServices();
      const logs = await ctx.storage.queryLogs({ last: '5m', limit: 10000 });
      const errors = await ctx.storage.queryErrors({ last: '5m', level: 'ERROR' });

      const serviceMap = new Map<string, { logCount: number; errorCount: number }>();
      for (const log of logs) {
        const existing = serviceMap.get(log.service) ?? { logCount: 0, errorCount: 0 };
        serviceMap.set(log.service, { ...existing, logCount: existing.logCount + 1 });
      }
      for (const err of errors) {
        for (const svc of err.services) {
          const existing = serviceMap.get(svc) ?? { logCount: 0, errorCount: 0 };
          serviceMap.set(svc, { ...existing, errorCount: existing.errorCount + err.count });
        }
      }

      const result = services.map(s => {
        const key = `localhost:${s.port}`;
        const stats = serviceMap.get(key) ?? { logCount: 0, errorCount: 0 };
        const errorRate = stats.logCount > 0 ? stats.errorCount / stats.logCount : 0;
        return {
          port: s.port,
          service: key,
          framework: s.framework,
          pid: s.pid,
          status: errorRate >= 0.05 ? 'ERROR' : stats.errorCount > 0 ? 'WARN' : 'OK',
          log_count_5m: stats.logCount,
          error_count_5m: stats.errorCount,
        };
      });

      res.json({ services: result });
    } catch {
      res.status(500).json({ error: 'Failed to list services' });
    }
  });

  // Get errors
  app.get('/api/errors', async (req: Request, res: Response) => {
    try {
      const errors = await ctx.storage.queryErrors({
        last: (req.query['last'] as string) ?? '1h',
        service: req.query['service'] as string | undefined,
        level: (req.query['level'] as LogLevel) ?? 'ERROR',
      });
      res.json({ errors, total: errors.length });
    } catch {
      res.status(500).json({ error: 'Failed to query errors' });
    }
  });

  // Get logs
  app.get('/api/logs', async (req: Request, res: Response) => {
    try {
      const logs = await ctx.storage.queryLogs({
        last: (req.query['last'] as string) ?? '1h',
        service: req.query['service'] as string | undefined,
        level: req.query['level'] as LogLevel | undefined,
        path: req.query['path'] as string | undefined,
        grep: req.query['grep'] as string | undefined,
        limit: req.query['limit'] ? parseInt(req.query['limit'] as string, 10) : 200,
      });
      res.json({ logs, total: logs.length });
    } catch {
      res.status(500).json({ error: 'Failed to query logs' });
    }
  });

  // Get journey
  app.get('/api/journey/:userId', async (req: Request, res: Response) => {
    try {
      const { reconstructJourney } = await import('../journey/reconstruct.js');
      const userId = req.params['userId'] as string;
      const events = ctx.journeyIndex.getJourneyByUser(userId);

      if (events.length === 0) {
        res.status(404).json({ error: `No journey found for user: ${userId}` });
        return;
      }

      const journey = reconstructJourney(events);
      res.json({
        user_id: userId,
        event_count: events.length,
        has_errors: journey.hasErrors,
        root_cause_index: journey.rootCauseIndex,
        events: journey.events,
      });
    } catch {
      res.status(500).json({ error: 'Failed to get journey' });
    }
  });

  // AI ask
  app.post('/api/ask', async (req: Request, res: Response) => {
    try {
      const { question } = req.body as { question?: string };
      if (!question?.trim()) {
        res.status(400).json({ error: 'Question is required' });
        return;
      }

      const response = await ctx.aiRouter.handleQuestion(question);
      res.json(response);
    } catch {
      res.status(500).json({ error: 'Failed to process question' });
    }
  });

  // Export
  app.post('/api/export', async (req: Request, res: Response) => {
    try {
      const { type, format, filters } = req.body as {
        type?: 'errors' | 'logs' | 'journey';
        format?: 'json' | 'csv' | 'md';
        filters?: Record<string, string>;
      };

      const exportFormat = format ?? 'json';

      if (type === 'errors') {
        const errors = await ctx.storage.queryErrors({
          last: filters?.['last'] ?? '1h',
          level: 'ERROR',
        });
        res.setHeader('Content-Type', exportFormat === 'json' ? 'application/json' : 'text/plain');
        res.json({ data: errors, format: exportFormat });
      } else if (type === 'journey' && filters?.['user_id']) {
        const events = ctx.journeyIndex.getJourneyByUser(filters['user_id']);
        res.json({ data: events, format: exportFormat });
      } else {
        const logs = await ctx.storage.queryLogs({
          last: filters?.['last'] ?? '1h',
          limit: 1000,
        });
        res.json({ data: logs, format: exportFormat });
      }
    } catch {
      res.status(500).json({ error: 'Failed to export' });
    }
  });

  // Health metrics for dashboard charts
  app.get('/api/metrics/timeseries', async (req: Request, res: Response) => {
    try {
      const service = req.query['service'] as string | undefined;
      const interval = parseInt((req.query['interval'] as string) ?? '5', 10);
      const services = ctx.daemon.getServices();

      const results: Record<string, { timestamp: string; count: number }[]> = {};
      for (const svc of services) {
        const key = service ?? `localhost:${svc.port}`;
        if (service && key !== service) continue;
        results[key] = [...await ctx.storage.queryTimeSeries(key, interval)];
      }

      res.json({ timeseries: results });
    } catch {
      res.status(500).json({ error: 'Failed to get timeseries' });
    }
  });

  // Latency stats
  app.get('/api/metrics/latency', async (req: Request, res: Response) => {
    try {
      const logs = await ctx.storage.queryLogs({
        last: (req.query['last'] as string) ?? '5m',
        service: req.query['service'] as string | undefined,
        limit: 5000,
      });

      const durations = logs
        .map(l => l.duration_ms)
        .filter((d): d is number => d !== null && d > 0)
        .sort((a, b) => a - b);

      const percentile = (sorted: number[], p: number): number | null => {
        if (sorted.length === 0) return null;
        const idx = Math.ceil((p / 100) * sorted.length) - 1;
        return sorted[Math.max(0, idx)] ?? null;
      };

      res.json({
        total_requests: durations.length,
        p50_ms: percentile(durations, 50),
        p95_ms: percentile(durations, 95),
        p99_ms: percentile(durations, 99),
        avg_ms: durations.length > 0
          ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
          : null,
      });
    } catch {
      res.status(500).json({ error: 'Failed to get latency' });
    }
  });

  // --- Static file serving (dashboard) ---
  const dashboardPath = join(import.meta.dirname ?? __dirname, '../../dashboard/dist');
  if (existsSync(dashboardPath)) {
    app.use(express.static(dashboardPath));

    // Named routes for multi-page HTML dashboard
    const pageRoutes: Record<string, string> = {
      '/': 'index.html',
      '/logs': 'logs.html',
      '/assistant': 'assistant.html',
      '/ask': 'ask.html',
      '/journeys': 'journeys.html',
      '/journey-detail': 'journey-detail.html',
      '/errors': 'errors.html',
      '/error-detail': 'error-detail.html',
      '/deployments': 'deployments.html',
      '/settings': 'settings.html',
      '/alerts': 'alerts.html',
      '/landing': 'landing.html',
    };

    for (const [route, file] of Object.entries(pageRoutes)) {
      app.get(route, (_req: Request, res: Response) => {
        const filePath = join(dashboardPath, file);
        if (existsSync(filePath)) {
          res.sendFile(filePath);
        } else {
          res.sendFile(join(dashboardPath, 'index.html'));
        }
      });
    }
  } else {
    app.get('/', (_req: Request, res: Response) => {
      res.json({
        message: 'Dialog Web API is running. Dashboard not built yet.',
        api_docs: {
          'GET /api/health': 'Daemon health + services',
          'GET /api/services': 'All monitored services',
          'GET /api/errors': 'Recent errors (query: last, service, level)',
          'GET /api/logs': 'Filtered logs (query: last, service, level, path, grep)',
          'GET /api/journey/:userId': 'User journey timeline',
          'POST /api/ask': 'AI query (body: { question })',
          'POST /api/export': 'Export data (body: { type, format, filters })',
          'GET /api/metrics/timeseries': 'Error timeseries (query: service, interval)',
          'GET /api/metrics/latency': 'Latency percentiles (query: last, service)',
          'WS /api/logs/live': 'WebSocket live log stream',
        },
      });
    });
  }

  // --- HTTP Server + WebSocket ---
  const httpServer = createServer(app);

  const wss = new WebSocketServer({ server: httpServer, path: '/api/logs/live' });

  // Broadcast new logs to all WebSocket clients
  ctx.daemon.onLog((entry: ParsedLogEntry) => {
    const message = JSON.stringify({
      type: 'log',
      data: {
        ...entry,
        timestamp: entry.timestamp.toISOString(),
      },
    });

    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    }
  });

  wss.on('connection', (ws) => {
    ws.send(JSON.stringify({
      type: 'connected',
      message: 'Connected to Dialog live log stream',
      services: ctx.daemon.getServices().map(s => ({
        port: s.port,
        framework: s.framework,
      })),
    }));
  });

  return {
    app,
    httpServer,
    wss,
    start(port: number): Promise<void> {
      return new Promise((resolve) => {
        httpServer.listen(port, () => resolve());
      });
    },
    stop(): Promise<void> {
      return new Promise((resolve, reject) => {
        wss.close();
        httpServer.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    },
  };
}
