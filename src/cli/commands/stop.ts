import { type Command } from 'commander';
import { readFileSync, unlinkSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import chalk from 'chalk';
import { getDialogHome } from '../../config/index.js';
import { PID_FILE } from '../../config/defaults.js';
import { logger } from '../../lib/logger.js';

export function registerStopCommand(program: Command): void {
  program
    .command('stop')
    .description('Stop daemon and all monitoring')
    .action(() => {
      const pidPath = join(getDialogHome(), PID_FILE);

      if (!existsSync(pidPath)) {
        console.log(chalk.yellow('Dialog is not running.'));
        return;
      }

      try {
        const pid = parseInt(readFileSync(pidPath, 'utf-8').trim(), 10);

        try {
          process.kill(pid, 0); // Check if alive
          process.kill(pid, 'SIGTERM');
          console.log(chalk.green(`Dialog stopped (PID: ${pid})`));
        } catch (err) {
          logger.debug({ err, pid }, 'Process not running');
          console.log(chalk.yellow('Dialog process was not running (stale PID file).'));
        }

        unlinkSync(pidPath);
      } catch (err) {
        logger.error({ err, pidPath }, 'Failed to read PID file');
        console.log(chalk.red('Failed to read PID file.'));
      }
    });
}
