import { type Command } from 'commander';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import chalk from 'chalk';
import { getDataDir } from '../../config/index.js';
import { DUCKDB_FILE } from '../../config/defaults.js';
import { isWebRunning, apiGet } from '../api-proxy.js';
import type { LogLevel, ParsedLogEntry } from '../../types.js';

const LEVEL_COLORS: Record<string, (s: string) => string> = {
  DEBUG: chalk.dim,
  INFO: chalk.white,
  WARN: chalk.yellow,
  ERROR: chalk.red,
  FATAL: chalk.bgRed.white,
};

function printLog(log: { level: string | null; timestamp: string; service: string; message: string }, json: boolean): void {
  if (json) {
    console.log(JSON.stringify(log));
    return;
  }
  const colorFn = LEVEL_COLORS[log.level ?? 'INFO'] ?? chalk.white;
  const ts = chalk.dim(log.timestamp.slice(11, 23));
  const svc = chalk.cyan(log.service);
  const lvl = colorFn((log.level ?? 'INFO').padEnd(5));
  console.log(`  ${ts} ${svc} ${lvl} ${log.message}`);
}

export function registerLogsCommand(program: Command): void {
  program
    .command('logs')
    .description('Raw log stream with filters')
    .option('--last <duration>', 'Time range (e.g., 1h, 30m)', '1h')
    .option('--level <level>', 'Filter by level')
    .option('--service <name>', 'Filter by service')
    .option('--endpoint <path>', 'Filter by endpoint path')
    .option('--grep <pattern>', 'Filter by text pattern')
    .option('--format <format>', 'Output format (text, json)', 'text')
    .option('--limit <n>', 'Max results', '100')
    .action(async (options) => {
      const isJson = options.format === 'json';

      try {
        // Try API first
        if (await isWebRunning()) {
          const params = new URLSearchParams({
            last: options.last,
            limit: options.limit,
            ...(options.level && { level: options.level }),
            ...(options.service && { service: options.service }),
            ...(options.endpoint && { path: options.endpoint }),
            ...(options.grep && { grep: options.grep }),
          }).toString();

          const data = await apiGet<{ logs: ParsedLogEntry[]; total: number }>(`/api/logs?${params}`);

          if (data.logs.length === 0) {
            console.log(chalk.dim('  No logs found matching filters.'));
            return;
          }

          for (const log of data.logs) {
            printLog({ level: log.level, timestamp: String(log.timestamp), service: log.service, message: log.message }, isJson);
          }
          if (!isJson) console.log(chalk.dim(`\n  ${data.logs.length} log(s) shown`));
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
        const logs = await storage.queryLogs({
          last: options.last,
          level: options.level as LogLevel | undefined,
          service: options.service,
          path: options.endpoint,
          grep: options.grep,
          limit: parseInt(options.limit, 10),
        });
        await storage.close();

        if (logs.length === 0) {
          console.log(chalk.dim('  No logs found matching filters.'));
          return;
        }

        for (const log of logs) {
          const ts = log.timestamp instanceof Date ? log.timestamp.toISOString() : String(log.timestamp);
          printLog({ level: log.level, timestamp: ts, service: log.service, message: log.message }, isJson);
        }
        if (!isJson) console.log(chalk.dim(`\n  ${logs.length} log(s) shown`));
      } catch (err) {
        console.log(chalk.red('  Failed to query logs.'), err instanceof Error ? err.message : '');
      }
    });
}
