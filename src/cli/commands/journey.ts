import { type Command } from 'commander';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import chalk from 'chalk';
import { getDataDir } from '../../config/index.js';
import { SQLITE_FILE } from '../../config/defaults.js';

export function registerJourneyCommand(program: Command): void {
  program
    .command('journey')
    .description('Replay user journey')
    .option('--user <id>', 'User ID to trace')
    .option('--session <id>', 'Session ID to trace')
    .action(async (options) => {
      if (!options.user && !options.session) {
        console.log(chalk.red('Please provide --user <id> or --session <id>'));
        return;
      }

      const dbPath = join(getDataDir(), SQLITE_FILE);

      if (!existsSync(dbPath)) {
        console.log(chalk.yellow('No journey data yet. Start monitoring with: dialog start'));
        return;
      }

      try {
        const { createJourneyIndex } = await import('../../journey/index.js');
        const { reconstructJourney, formatJourneyForCli } = await import('../../journey/reconstruct.js');

        const journeyIndex = createJourneyIndex(dbPath);
        journeyIndex.init();

        const events = options.user
          ? journeyIndex.getJourneyByUser(options.user)
          : journeyIndex.getJourneyBySession(options.session);

        journeyIndex.close();

        if (events.length === 0) {
          const idType = options.user ? 'user' : 'session';
          const idValue = options.user ?? options.session;
          console.log(chalk.yellow(`No journey found for ${idType}: ${idValue}`));
          return;
        }

        const journey = reconstructJourney(events);
        const formatted = formatJourneyForCli(journey);

        const idLabel = options.user ? `User: ${options.user}` : `Session: ${options.session}`;
        console.log(chalk.bold(`Journey — ${idLabel}`));
        console.log(chalk.dim(`${events.length} event(s)`));
        console.log('');
        console.log(formatted);
      } catch (err) {
        console.log(chalk.red('Failed to load journey.'), err instanceof Error ? err.message : '');
      }
    });
}
