import { type Command } from 'commander';
import chalk from 'chalk';
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
      if (!(await isWebRunning())) {
        console.log(chalk.yellow('  dialog-web is not running. Start it first:'));
        console.log(chalk.dim('  $ dialog-web start'));
        return;
      }

      try {
        const qs = new URLSearchParams({
          last: options.last,
          ...(options.service && { service: options.service }),
          ...(options.level && { level: options.level }),
        }).toString();
        const data = await apiGet<{ errors: ErrorGroup[] }>(`/api/errors?${qs}`);
        printErrors(data.errors, options.last);
      } catch (err) {
        console.log(chalk.red('  Failed to query errors.'), err instanceof Error ? err.message : '');
      }
    });
}
