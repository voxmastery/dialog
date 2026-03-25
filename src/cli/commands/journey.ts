import { type Command } from 'commander';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import chalk from 'chalk';
import { getDataDir } from '../../config/index.js';
import { SQLITE_FILE } from '../../config/defaults.js';
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

      try {
        // Try API first
        if (await isWebRunning()) {
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
          return;
        }

        // Direct DB access
        const dbPath = join(getDataDir(), SQLITE_FILE);
        if (!existsSync(dbPath)) {
          console.log(chalk.yellow('  No journey data yet. Start monitoring with: dialog-cli start'));
          return;
        }

        const { createJourneyIndex } = await import('../../journey/index.js');
        const { reconstructJourney } = await import('../../journey/reconstruct.js');
        const idx = createJourneyIndex(dbPath);
        idx.init();
        const events = options.user
          ? idx.getJourneyByUser(options.user)
          : idx.getJourneyBySession(options.session);
        idx.close();

        if (events.length === 0) {
          console.log(chalk.yellow(`  No journey found for ${options.user ? 'user' : 'session'}: ${options.user ?? options.session}`));
          return;
        }

        const journey = reconstructJourney(events);
        console.log(chalk.bold(`\n  Journey — User: ${journey.userId}`));
        console.log(chalk.dim(`  ${events.length} event(s)\n`));
        printTimeline(journey.events, journey.rootCauseIndex);
        console.log('');
      } catch (err) {
        const msg = err instanceof Error ? err.message : '';
        if (msg.includes('404') || msg.includes('No journey')) {
          console.log(chalk.yellow(`  No journey found for: ${options.user ?? options.session}`));
        } else {
          console.log(chalk.red('  Failed to load journey.'), msg);
        }
      }
    });
}
