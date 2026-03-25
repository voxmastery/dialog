import { type Command } from 'commander';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import chalk from 'chalk';
import { getDialogHome, getDataDir, loadConfig } from '../../config/index.js';
import { PID_FILE, DUCKDB_FILE } from '../../config/defaults.js';
import { scanAllPorts } from '../../daemon/detector.js';
import { logger } from '../../lib/logger.js';

export function registerStatusCommand(program: Command): void {
  program
    .command('status')
    .description('Show monitored services with health')
    .action(async () => {
      const pidPath = join(getDialogHome(), PID_FILE);

      // Check daemon status
      let daemonRunning = false;
      let daemonPid: number | null = null;
      if (existsSync(pidPath)) {
        try {
          daemonPid = parseInt(readFileSync(pidPath, 'utf-8').trim(), 10);
          process.kill(daemonPid, 0);
          daemonRunning = true;
        } catch (err) {
          logger.debug({ err, daemonPid }, 'Daemon PID check failed');
          daemonRunning = false;
        }
      }

      if (daemonRunning) {
        console.log(chalk.green(`● Dialog is running (PID: ${daemonPid})`));
      } else {
        console.log(chalk.yellow('○ Dialog is not running'));
      }

      console.log('');

      // Scan for services regardless
      const config = loadConfig();
      const services = await scanAllPorts([...config.ports]);

      if (services.length === 0) {
        console.log(chalk.dim('No services detected on monitored ports.'));
        console.log(chalk.dim(`Scanned: ${[...config.ports].join(', ')}`));
        return;
      }

      console.log(chalk.bold('Services:'));
      console.log('');

      // Try to get error counts from DuckDB
      let errorCounts = new Map<string, number>();
      const dbPath = join(getDataDir(), DUCKDB_FILE);
      if (existsSync(dbPath)) {
        try {
          const { createStorage } = await import('../../storage/duckdb.js');
          const storage = await createStorage(dbPath);
          await storage.init();
          const errors = await storage.queryErrors({ last: '5m' });
          for (const err of errors) {
            for (const svc of err.services) {
              errorCounts.set(svc, (errorCounts.get(svc) ?? 0) + err.count);
            }
          }
          await storage.close();
        } catch (err) {
          logger.debug({ err, dbPath }, 'Storage not available for error counts');
        }
      }

      for (const svc of services) {
        const svcKey = `localhost:${svc.port}`;
        const errors = errorCounts.get(svcKey) ?? 0;

        let statusIcon: string;
        let statusText: string;
        if (errors === 0) {
          statusIcon = chalk.green('●');
          statusText = chalk.green('OK');
        } else if (errors < 5) {
          statusIcon = chalk.yellow('●');
          statusText = chalk.yellow('WARN');
        } else {
          statusIcon = chalk.red('●');
          statusText = chalk.red('ERROR');
        }

        console.log(`  ${statusIcon} ${chalk.bold(`localhost:${svc.port}`)} ${chalk.cyan(svc.framework)} ${statusText}`);
        if (errors > 0) {
          console.log(`    ${chalk.dim(`${errors} error(s) in last 5 min`)}`);
        }
      }
    });
}
