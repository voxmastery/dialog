import { type Command } from 'commander';
import { join } from 'node:path';
import chalk from 'chalk';
import { getDataDir, ensureDirectories } from '../../config/index.js';
import { DUCKDB_FILE, SQLITE_FILE } from '../../config/defaults.js';
import type { ParsedLogEntry } from '../../types.js';

const SERVICES = ['localhost:3000', 'localhost:5173', 'localhost:8000'];
const FRAMEWORKS = ['Express', 'Vite', 'FastAPI'];
const USERS = ['user-101', 'user-202', 'user-303', 'user-404', 'user-505'];
const SESSIONS = ['sess-a1b2', 'sess-c3d4', 'sess-e5f6', 'sess-g7h8'];
const PATHS = ['/api/products', '/api/cart', '/api/checkout', '/api/users/:id', '/api/orders', '/api/health', '/api/inventory', '/api/payments'];
const METHODS = ['GET', 'POST', 'PUT', 'DELETE'];
const ERROR_MESSAGES = [
  'Stripe API timeout after 30000ms — POST https://api.stripe.com/v1/charges',
  'TypeError: Cannot read properties of null (reading \'preferences\')',
  'ECONNREFUSED 127.0.0.1:5432 — PostgreSQL connection refused',
  'JWT token expired for user session',
  'Rate limit exceeded for /api/checkout endpoint',
];
const STACK_TRACES = [
  `    at CheckoutService.processPayment (/app/services/checkout.js:42:15)
    at Router.handle (/app/node_modules/express/lib/router/index.js:282:12)
    at /app/routes/checkout.js:28:20`,
  `    at UserService.getPreferences (/app/services/user-service.js:87:28)
    at /app/routes/users.js:15:20
    at Layer.handle [as handle_request] (/app/node_modules/express/lib/router/layer.js:95:5)`,
  `    at ConnectionPool.acquire (/app/node_modules/pg-pool/index.js:45:11)
    at Client.connect (/app/node_modules/pg/lib/client.js:82:18)`,
];
const DB_QUERIES = [
  'SELECT * FROM users WHERE id = $1',
  'SELECT * FROM products WHERE category = $1 ORDER BY price',
  'INSERT INTO orders (user_id, total, status) VALUES ($1, $2, $3)',
  'UPDATE inventory SET quantity = quantity - $1 WHERE product_id = $2',
  'SELECT o.*, u.email FROM orders o JOIN users u ON o.user_id = u.id WHERE o.id = $1',
];

function randomItem<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateLogs(count: number): readonly ParsedLogEntry[] {
  const now = Date.now();
  const logs: ParsedLogEntry[] = [];

  for (let i = 0; i < count; i++) {
    const timestamp = new Date(now - randomInt(0, 3600000)); // Last 1 hour
    const service = randomItem(SERVICES);
    const isError = Math.random() < 0.15;
    const isWarn = !isError && Math.random() < 0.1;
    const hasUser = Math.random() < 0.6;
    const hasDbQuery = Math.random() < 0.2;
    const method = randomItem(METHODS);
    const path = randomItem(PATHS);
    const status = isError ? (Math.random() < 0.7 ? 500 : 503) : isWarn ? 429 : (Math.random() < 0.9 ? 200 : 201);
    const duration = isError ? randomInt(1000, 5000) : randomInt(5, 500);
    const errorMsg = isError ? randomItem(ERROR_MESSAGES) : null;
    const userId = hasUser ? randomItem(USERS) : null;
    const sessionId = hasUser ? randomItem(SESSIONS) : null;

    const message = isError
      ? `[ERROR] ${errorMsg}`
      : isWarn
        ? `[WARN] Rate limit approaching for ${path}`
        : `[INFO] ${method} ${path} ${status} ${duration}ms${userId ? ` user_id=${userId}` : ''}`;

    logs.push({
      id: crypto.randomUUID(),
      timestamp,
      service,
      level: isError ? 'ERROR' : isWarn ? 'WARN' : 'INFO',
      message,
      method,
      path,
      status,
      duration_ms: duration,
      user_id: userId,
      session_id: sessionId,
      request_id: `req-${crypto.randomUUID().slice(0, 8)}`,
      error_message: errorMsg,
      stack_trace: isError && Math.random() < 0.6 ? randomItem(STACK_TRACES) : null,
      db_query: hasDbQuery ? randomItem(DB_QUERIES) : null,
      external_call: isError && errorMsg?.includes('Stripe') ? 'https://api.stripe.com/v1/charges' : null,
      raw: message,
    });
  }

  // Sort by timestamp descending
  return logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

export function registerSeedCommand(program: Command): void {
  program
    .command('seed')
    .description('Populate database with realistic demo data for dashboard showcase')
    .option('--count <n>', 'Number of log entries to generate', '500')
    .action(async (options) => {
      ensureDirectories();
      const dataDir = getDataDir();
      const logCount = parseInt(options.count, 10);

      console.log(chalk.blue(`  Seeding ${logCount} demo log entries...`));

      try {
        const { createStorage } = await import('../../storage/duckdb.js');
        const { createJourneyIndex } = await import('../../journey/index.js');

        const dbPath = join(dataDir, DUCKDB_FILE);
        const sqlitePath = join(dataDir, SQLITE_FILE);

        const storage = await createStorage(dbPath);
        await storage.init();

        const journeyIndex = createJourneyIndex(sqlitePath);
        journeyIndex.init();

        const logs = generateLogs(logCount);

        // Insert in batches
        const batchSize = 50;
        let inserted = 0;
        for (let i = 0; i < logs.length; i += batchSize) {
          const batch = logs.slice(i, i + batchSize);
          await storage.insertBatch(batch);
          for (const entry of batch) {
            journeyIndex.indexEvent(entry);
          }
          inserted += batch.length;
          process.stdout.write(`\r  ${chalk.dim(`Inserted ${inserted}/${logCount}...`)}`);
        }

        journeyIndex.close();
        await storage.close();

        console.log(`\r  ${chalk.green('✓')} Seeded ${logCount} log entries                `);
        console.log('');

        // Summary
        const errors = logs.filter(l => l.level === 'ERROR');
        const warns = logs.filter(l => l.level === 'WARN');
        const users = new Set(logs.filter(l => l.user_id).map(l => l.user_id));
        const services = new Set(logs.map(l => l.service));

        console.log(`  ${chalk.bold('Summary:')}`);
        console.log(`    ${chalk.dim('Services:')} ${services.size}`);
        console.log(`    ${chalk.dim('Total logs:')} ${logCount}`);
        console.log(`    ${chalk.red(`Errors: ${errors.length}`)}`);
        console.log(`    ${chalk.yellow(`Warnings: ${warns.length}`)}`);
        console.log(`    ${chalk.dim('Unique users:')} ${users.size}`);
        console.log('');
        console.log(chalk.dim('  Now run: dialog-web start'));
        console.log(chalk.dim('  Dashboard: http://localhost:9999'));
        console.log('');
      } catch (err) {
        console.log(chalk.red('  Failed to seed data.'), err instanceof Error ? err.message : '');
      }
    });
}
