// Daemon worker - runs as a forked background process
import { ensureDirectories, loadConfig, getDataDir } from '../config/index.js';
import { createDaemon } from './index.js';
import { createAlertDispatcher } from '../alerts/index.js';
import { DUCKDB_FILE, SQLITE_FILE } from '../config/defaults.js';
import { join } from 'node:path';
import { logger } from '../lib/logger.js';

async function main(): Promise<void> {
  ensureDirectories();
  const config = loadConfig();

  // Initialize storage
  const { createStorage } = await import('../storage/duckdb.js');
  const { createJourneyIndex } = await import('../journey/index.js');

  const dbPath = join(getDataDir(), DUCKDB_FILE);
  const sqlitePath = join(getDataDir(), SQLITE_FILE);

  const storage = await createStorage(dbPath);
  await storage.init();

  const journeyIndex = createJourneyIndex(sqlitePath);
  journeyIndex.init();

  const alerts = createAlertDispatcher(config);
  const daemon = createDaemon(config);

  // Wire up log pipeline
  daemon.onLog((entry) => {
    // Store in DuckDB
    storage.insertLog(entry).catch(err => logger.error({ err, service: entry.service }, 'Failed to insert log'));

    // Index journey
    journeyIndex.indexEvent(entry);

    // Check alerts
    alerts.processEntry(entry);
  });

  // Start daemon
  await daemon.start();

  // Graceful shutdown
  const shutdown = async () => {
    daemon.stop();
    journeyIndex.close();
    await storage.close();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  // Keep alive
  setInterval(() => {
    // Periodic retention cleanup
    storage.cleanupOldLogs(config.retention_hours).catch(err => logger.error({ err }, 'Log cleanup failed'));
  }, 3600000); // Every hour
}

main().catch((err) => {
  console.error('Dialog daemon failed to start:', err);
  process.exit(1);
});
