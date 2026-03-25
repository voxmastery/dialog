import { type Command } from 'commander';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import chalk from 'chalk';
import { getDataDir } from '../../config/index.js';
import { DUCKDB_FILE } from '../../config/defaults.js';

export function registerErrorsCommand(program: Command): void {
  program
    .command('errors')
    .description('Recent errors grouped by type')
    .option('--last <duration>', 'Time range (e.g., 1h, 30m, 1d)', '1h')
    .option('--service <name>', 'Filter by service')
    .option('--level <level>', 'Filter by level (ERROR, FATAL)')
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

        const errors = await storage.queryErrors({
          last: options.last,
          service: options.service,
          level: options.level ?? 'ERROR',
        });

        await storage.close();

        if (errors.length === 0) {
          console.log(chalk.green('No errors found.'));
          console.log(chalk.dim(`Time range: last ${options.last}`));
          return;
        }

        console.log(chalk.bold(`Errors (last ${options.last}):`));
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

        console.log(chalk.dim(`Total: ${errors.length} error group(s)`));
      } catch (err) {
        console.log(chalk.red('Failed to query errors.'), err instanceof Error ? err.message : '');
      }
    });
}
