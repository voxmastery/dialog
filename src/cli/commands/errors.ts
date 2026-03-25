import { type Command } from 'commander';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import chalk from 'chalk';
import { getDataDir } from '../../config/index.js';
import { DUCKDB_FILE } from '../../config/defaults.js';
import { isWebRunning, apiGet } from '../api-proxy.js';
import type { ErrorGroup } from '../../types.js';

function printErrors(errors: readonly ErrorGroup[], timeRange: string): void {
  if (errors.length === 0) {
    console.log(chalk.green('  No errors found.'));
    console.log(chalk.dim(`  Time range: last ${timeRange}`));
    return;
  }

  console.log(chalk.bold(`  Errors (last ${timeRange}):`));
  console.log('');

  for (const err of errors) {
    const countStr = chalk.red(`${err.count}x`);
    const msgStr = err.error_message.length > 80
      ? err.error_message.slice(0, 77) + '...'
      : err.error_message;

    console.log(`  ${countStr} ${chalk.bold(msgStr)}`);
    console.log(`    ${chalk.dim(`First: ${err.first_seen}  Last: ${err.last_seen}`)}`);
    if (err.affected_paths.length > 0) {
      console.log(`    ${chalk.dim(`Endpoints: ${err.affected_paths.join(', ')}`)}`);
    }
    console.log('');
  }

  console.log(chalk.dim(`  Total: ${errors.length} error group(s)`));
}

export function registerErrorsCommand(program: Command): void {
  program
    .command('errors')
    .description('Recent errors grouped by type')
    .option('--last <duration>', 'Time range (e.g., 1h, 30m, 1d)', '1h')
    .option('--service <name>', 'Filter by service')
    .option('--level <level>', 'Filter by level (ERROR, FATAL)')
    .action(async (options) => {
      try {
        // Try API first (avoids DuckDB lock)
        if (await isWebRunning()) {
          const qs = new URLSearchParams({
            last: options.last,
            ...(options.service && { service: options.service }),
            ...(options.level && { level: options.level }),
          }).toString();
          const data = await apiGet<{ errors: ErrorGroup[] }>(`/api/errors?${qs}`);
          printErrors(data.errors, options.last);
          return;
        }

        // Direct DB access
        const dbPath = join(getDataDir(), DUCKDB_FILE);
        if (!existsSync(dbPath)) {
          console.log(chalk.yellow('  No log data yet. Start monitoring with: dialog-cli start'));
          return;
        }

        const { createStorage } = await import('../../storage/duckdb.js');
        const storage = await createStorage(dbPath);
        await storage.init();
        const errors = await storage.queryErrors({
          last: options.last,
          service: options.service,
          level: options.level ?? 'ERROR',
        });
        await storage.close();
        printErrors(errors, options.last);
      } catch (err) {
        console.log(chalk.red('  Failed to query errors.'), err instanceof Error ? err.message : '');
      }
    });
}
