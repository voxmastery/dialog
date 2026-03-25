import { type Command } from 'commander';
import chalk from 'chalk';
import { isWebRunning, apiGet } from '../api-proxy.js';
import type { ParsedLogEntry } from '../../types.js';

const LEVEL_COLORS: Record<string, (s: string) => string> = {
  DEBUG: chalk.dim,
  INFO: chalk.white,
  WARN: chalk.yellow,
  ERROR: chalk.red,
  FATAL: chalk.bgRed.white,
};

function printLog(log: { level: string | null; timestamp: string; service: string; message: string }, json: boolean): void {
  if (json) { console.log(JSON.stringify(log)); return; }
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
      if (!(await isWebRunning())) {
        console.log(chalk.yellow('  dialog-web is not running. Start it first:'));
        console.log(chalk.dim('  $ dialog-web start'));
        return;
      }

      const isJson = options.format === 'json';
      try {
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
      } catch (err) {
        console.log(chalk.red('  Failed to query logs.'), err instanceof Error ? err.message : '');
      }
    });
}
