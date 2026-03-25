import express, { type Request, type Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import type { LogStorage } from '../storage/duckdb.js';
import type { JourneyIndex } from '../journey/index.js';
import type { AiRouter } from '../ai/router.js';
import type { ParsedLogEntry } from '../types.js';
import { createDaemon, type Daemon } from '../daemon/index.js';
import type { DialogConfig } from '../types.js';
import { logger } from '../lib/logger.js';
import {
  errorsQuerySchema,
  logsQuerySchema,
  askBodySchema,
  exportBodySchema,
  userIdSchema,
  timeseriesQuerySchema,
  latencyQuerySchema,
} from './validation.js';

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

  // Security headers
  app.use(helmet({ contentSecurityPolicy: false })); // CSP disabled for SPA

  // CORS — localhost only
  app.use(cors({ origin: /^https?:\/\/localhost(:\d+)?$/ }));

  // Rate limiting
  const apiLimiter = rateLimit({ windowMs: 60_000, max: 100, standardHeaders: true, legacyHeaders: false });
  const aiLimiter = rateLimit({ windowMs: 60_000, max: 20, message: { error: 'AI rate limit exceeded. Try again in a minute.' } });
  app.use('/api/', apiLimiter);
  app.use('/api/ask', aiLimiter);

  // --- REST API Routes ---

  // Health / status
  app.get('/api/health', async (_req: Request, res: Response) => {
    try {
      const services = ctx.daemon.getServices();

      // Verify DB connectivity
      let dbStatus = 'unknown';
      try {
        await ctx.storage.queryLogs({ last: '1m', limit: 1 });
        dbStatus = 'connected';
      } catch {
        dbStatus = 'error';
      }

      // Check AI availability
      const aiAvailable = ctx.aiRouter ? true : false;

      res.json({
        status: dbStatus === 'connected' ? 'ok' : 'degraded',
        uptime: process.uptime(),
        services: services.length,
        service_list: services.map(s => ({
          port: s.port,
          framework: s.framework,
          status: s.status,
        })),
        db_status: dbStatus,
        ai_available: aiAvailable,
        version: '0.3.0',
      });
    } catch (err) {
      logger.error({ err }, 'Health check failed');
      res.status(500).json({ status: 'error', error: 'Health check failed' });
    }
  });

  // List services
  app.get('/api/services', async (_req: Request, res: Response) => {
    try {
      const services = ctx.daemon.getServices();
      const recentLogs = await ctx.storage.queryLogs({ last: '5m', limit: 1000 });
      const errors = await ctx.storage.queryErrors({ last: '5m', level: 'ERROR' });

      const serviceMap = new Map<string, { logCount: number; errorCount: number }>();
      for (const log of recentLogs) {
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
    } catch (err) {
      logger.error({ err, path: '/api/services' }, 'Route error');
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get errors
  app.get('/api/errors', async (req: Request, res: Response) => {
    try {
      const parsed = errorsQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' });
        return;
      }
      const errors = await ctx.storage.queryErrors(parsed.data);
      res.json({ errors, total: errors.length });
    } catch (err) {
      logger.error({ err, path: req.path }, 'Route error');
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get logs
  app.get('/api/logs', async (req: Request, res: Response) => {
    try {
      const parsed = logsQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' });
        return;
      }
      const logs = await ctx.storage.queryLogs(parsed.data);
      res.json({ logs, total: logs.length });
    } catch (err) {
      logger.error({ err, path: req.path }, 'Route error');
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get journey
  app.get('/api/journey/:userId', async (req: Request, res: Response) => {
    try {
      const { reconstructJourney } = await import('../journey/reconstruct.js');
      const userIdResult = userIdSchema.safeParse(req.params['userId']);
      if (!userIdResult.success) {
        res.status(400).json({ error: userIdResult.error.issues[0]?.message ?? 'Invalid user ID' });
        return;
      }
      const userId = userIdResult.data;
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
    } catch (err) {
      logger.error({ err, path: req.path }, 'Route error');
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // AI ask
  app.post('/api/ask', async (req: Request, res: Response) => {
    try {
      const parsed = askBodySchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' });
        return;
      }

      const response = await ctx.aiRouter.handleQuestion(parsed.data.question);
      res.json(response);
    } catch (err) {
      logger.error({ err, path: req.path }, 'Route error');
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Export
  app.post('/api/export', async (req: Request, res: Response) => {
    try {
      const parsed = exportBodySchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' });
        return;
      }

      const { type, format: exportFormat, filters } = parsed.data;

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
    } catch (err) {
      logger.error({ err, path: req.path }, 'Route error');
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Health metrics for dashboard charts
  app.get('/api/metrics/timeseries', async (req: Request, res: Response) => {
    try {
      const parsed = timeseriesQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' });
        return;
      }
      const { service, interval } = parsed.data;
      const services = ctx.daemon.getServices();

      const results: Record<string, { timestamp: string; count: number }[]> = {};
      for (const svc of services) {
        const key = service ?? `localhost:${svc.port}`;
        if (service && key !== service) continue;
        results[key] = [...await ctx.storage.queryTimeSeries(key, interval)];
      }

      res.json({ timeseries: results });
    } catch (err) {
      logger.error({ err, path: req.path }, 'Route error');
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Latency stats
  app.get('/api/metrics/latency', async (req: Request, res: Response) => {
    try {
      const parsed = latencyQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' });
        return;
      }
      const logs = await ctx.storage.queryLogs({
        last: parsed.data.last,
        service: parsed.data.service,
        limit: 1000,
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
    } catch (err) {
      logger.error({ err, path: req.path }, 'Route error');
      res.status(500).json({ error: 'Internal server error' });
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
      return new Promise((resolve, reject) => {
        httpServer.on('error', (err: NodeJS.ErrnoException) => {
          if (err.code === 'EADDRINUSE') {
            reject(new Error(`Port ${port} is already in use. Try a different port with --port`));
          } else {
            reject(err);
          }
        });
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
