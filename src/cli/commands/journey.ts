import { type Command } from 'commander';
import chalk from 'chalk';
import { isWebRunning, apiGet } from '../api-proxy.js';
import type { JourneyEvent } from '../../types.js';

function printTimeline(events: readonly JourneyEvent[], rootCauseIndex: number | null): void {
  for (let i = 0; i < events.length; i++) {
    const e = events[i]!;
    const method = e.method ?? '???';
    const path = e.path ?? '/';
    const status = e.status ?? 0;
    const dur = e.duration_ms !== null ? `${Math.round(e.duration_ms)}ms` : '';
    const ts = e.timestamp.slice(11, 19);

    const isError = status >= 500;
    const isRoot = i === rootCauseIndex;

    const statusColor = isError ? chalk.red : status >= 400 ? chalk.yellow : chalk.green;
    const line = `  ${chalk.dim(ts)} ${chalk.cyan(method.padEnd(6))} ${path.padEnd(25)} ${statusColor(String(status))} ${chalk.dim(dur)}`;

    console.log(isRoot ? `${line} ${chalk.red.bold('← ROOT CAUSE')}` : line);
  }
}

export function registerJourneyCommand(program: Command): void {
  program
    .command('journey')
    .description('Replay user journey')
    .option('--user <id>', 'User ID to trace')
    .option('--session <id>', 'Session ID to trace')
    .action(async (options) => {
      if (!options.user && !options.session) {
        console.log(chalk.red('  Please provide --user <id> or --session <id>'));
        return;
      }

      if (!(await isWebRunning())) {
        console.log(chalk.yellow('  dialog-web is not running. Start it first:'));
        console.log(chalk.dim('  $ dialog-web start'));
        return;
      }

      try {
        const userId = options.user ?? options.session;
        const data = await apiGet<{
          user_id: string;
          event_count: number;
          has_errors: boolean;
          root_cause_index: number | null;
          events: JourneyEvent[];
        }>(`/api/journey/${userId}`);

        console.log(chalk.bold(`\n  Journey — User: ${data.user_id}`));
        console.log(chalk.dim(`  ${data.event_count} event(s)${data.has_errors ? chalk.red(' (errors found)') : ''}\n`));
        printTimeline(data.events, data.root_cause_index);
        console.log('');
      } catch (err) {
        const msg = err instanceof Error ? err.message : '';
        if (msg.includes('404')) {
          console.log(chalk.yellow(`  No journey found for: ${options.user ?? options.session}`));
        } else {
          console.log(chalk.red('  Failed to load journey.'), msg);
        }
      }
    });
}
