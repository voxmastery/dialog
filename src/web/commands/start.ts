import { type Command } from 'commander';
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import chalk from 'chalk';
import { getDialogHome, getDataDir, ensureDirectories, loadConfig } from '../../config/index.js';
import { DUCKDB_FILE, SQLITE_FILE } from '../../config/defaults.js';
import { logger } from '../../lib/logger.js';

const WEB_PID_FILE = 'dialog-web.pid';

function isWebRunning(): { running: boolean; pid: number | null } {
  const pidPath = join(getDialogHome(), WEB_PID_FILE);
  if (!existsSync(pidPath)) return { running: false, pid: null };

  try {
    const pid = parseInt(readFileSync(pidPath, 'utf-8').trim(), 10);
    process.kill(pid, 0);
    return { running: true, pid };
  } catch (err) {
    logger.debug({ err }, 'Web PID check failed, not running');
    return { running: false, pid: null };
  }
}

export function registerWebStartCommand(program: Command): void {
  program
    .command('start')
    .description('Start the Dialog web dashboard with live log streaming')
    .option('--port <port>', 'Port to serve dashboard on', '9999')
    .action(async (options) => {
      const { running, pid } = isWebRunning();
      if (running) {
        console.log(chalk.yellow(`Dialog Web is already running (PID: ${pid}). Use 'dialog-web stop' first.`));
        return;
      }

      const port = parseInt(options.port, 10);
      ensureDirectories();
      const config = loadConfig();
      const dataDir = getDataDir();

      console.log(chalk.blue('Starting Dialog Web...'));

      try {
        // Initialize storage
        const { createStorage } = await import('../../storage/duckdb.js');
        const { createJourneyIndex } = await import('../../journey/index.js');
        const { createUnifiedAiClient } = await import('../../ai/providers.js');
        const { createEmbeddingStore } = await import('../../ai/embeddings.js');
        const { createAiRouter } = await import('../../ai/router.js');
        const { createDaemon } = await import('../../daemon/index.js');
        const { createWebServer } = await import('../server.js');
        const { createAlertDispatcher } = await import('../../alerts/index.js');

        const dbPath = join(dataDir, DUCKDB_FILE);
        const sqlitePath = join(dataDir, SQLITE_FILE);

        const storage = await createStorage(dbPath);
        await storage.init();

        const journeyIndex = createJourneyIndex(sqlitePath);
        journeyIndex.init();

        const mistralClient = createUnifiedAiClient();
        const embeddingStore = createEmbeddingStore(mistralClient);
        await embeddingStore.init();

        const aiRouter = createAiRouter(mistralClient, embeddingStore, storage);
        const alerts = createAlertDispatcher(config);

        // Start log capture daemon
        const daemon = createDaemon(config);

        daemon.onLog((entry) => {
          storage.insertLog(entry).catch(err => logger.error({ err, service: entry.service }, 'Failed to insert log'));
          journeyIndex.indexEvent(entry);
          alerts.processEntry(entry);
        });

        await daemon.start();

        const services = daemon.getServices();
        if (services.length > 0) {
          console.log(chalk.green(`Monitoring ${services.length} service(s):`));
          for (const svc of services) {
            console.log(`  ${chalk.green('●')} localhost:${svc.port} ${chalk.cyan(`(${svc.framework})`)}`);
          }
        } else {
          console.log(chalk.yellow('No services detected yet. Start your dev server.'));
        }

        // Start web server
        const webServer = createWebServer({
          storage,
          journeyIndex,
          aiRouter,
          config,
          daemon,
        });

        await webServer.start(port);

        // Write PID
        const pidPath = join(getDialogHome(), WEB_PID_FILE);
        writeFileSync(pidPath, String(process.pid));

        console.log('');
        console.log(chalk.green.bold(`Dashboard: http://localhost:${port}`));
        console.log(chalk.dim(`API:       http://localhost:${port}/api/health`));
        console.log(chalk.dim(`Live logs: ws://localhost:${port}/api/logs/live`));
        console.log('');
        console.log(chalk.dim('Press Ctrl+C to stop.'));

        // Graceful shutdown
        const shutdown = async () => {
          console.log(chalk.blue('\nShutting down...'));
          daemon.stop();
          await webServer.stop();
          journeyIndex.close();
          await storage.close();
          try {
            const { unlinkSync } = await import('node:fs');
            unlinkSync(pidPath);
          } catch (err) { logger.debug({ err }, 'Failed to clean up PID file'); }
          process.exit(0);
        };

        process.on('SIGTERM', shutdown);
        process.on('SIGINT', shutdown);

        // Periodic cleanup
        setInterval(() => {
          storage.cleanupOldLogs(config.retention_hours).catch(err => logger.error({ err }, 'Log cleanup failed'));
        }, 3600000);

      } catch (err) {
        console.log(chalk.red('Failed to start Dialog Web.'));
        console.log(chalk.red(err instanceof Error ? err.message : String(err)));
        process.exit(1);
      }
    });
}
