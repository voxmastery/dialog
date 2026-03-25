import { type Command } from 'commander';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import chalk from 'chalk';
import { getDataDir } from '../../config/index.js';
import { DUCKDB_FILE } from '../../config/defaults.js';
import type { LogLevel } from '../../types.js';

const LEVEL_COLORS: Record<string, (s: string) => string> = {
  DEBUG: chalk.dim,
  INFO: chalk.white,
  WARN: chalk.yellow,
  ERROR: chalk.red,
  FATAL: chalk.bgRed.white,
};

function formatLogLine(level: string | null, timestamp: string, service: string, message: string): string {
  const colorFn = LEVEL_COLORS[level ?? 'INFO'] ?? chalk.white;
  const ts = chalk.dim(timestamp);
  const svc = chalk.cyan(service);
  const lvl = colorFn(level ?? 'INFO');
  return `${ts} ${svc} ${lvl} ${message}`;
}

export function registerLogsCommand(program: Command): void {
  program
    .command('logs')
    .description('Raw log stream with filters')
    .option('--last <duration>', 'Time range for historical mode (e.g., 1h, 30m)')
    .option('--level <level>', 'Filter by level')
    .option('--service <name>', 'Filter by service')
    .option('--endpoint <path>', 'Filter by endpoint path')
    .option('--grep <pattern>', 'Filter by text pattern')
    .option('--format <format>', 'Output format (text, json)', 'text')
    .option('--limit <n>', 'Max results', '100')
    .action(async (options) => {
      const dbPath = join(getDataDir(), DUCKDB_FILE);

      if (!existsSync(dbPath)) {
        console.log(chalk.yellow('No log data yet. Start monitoring with: dialog start'));
        return;
      }

      try {
        const { createStorage } = await import('../../storage/duckdb.js');
        const storage = await createStorage(dbPath);
        await storage.init();

        const logs = await storage.queryLogs({
          last: options.last ?? '1h',
          level: options.level as LogLevel | undefined,
          service: options.service,
          path: options.endpoint,
          grep: options.grep,
          limit: parseInt(options.limit, 10),
        });

        await storage.close();

        if (logs.length === 0) {
          console.log(chalk.dim('No logs found matching filters.'));
          return;
        }

        if (options.format === 'json') {
          for (const log of logs) {
            console.log(JSON.stringify(log));
          }
        } else {
          for (const log of logs) {
            console.log(formatLogLine(
              log.level,
              log.timestamp.toISOString(),
              log.service,
              log.message
            ));
          }
        }

        console.log(chalk.dim(`\n${logs.length} log(s) shown`));
      } catch (err) {
        console.log(chalk.red('Failed to query logs.'), err instanceof Error ? err.message : '');
      }
    });
}
