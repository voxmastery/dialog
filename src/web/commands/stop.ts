import { type Command } from 'commander';
import { readFileSync, unlinkSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import chalk from 'chalk';
import { getDialogHome } from '../../config/index.js';

const WEB_PID_FILE = 'dialog-web.pid';

export function registerWebStopCommand(program: Command): void {
  program
    .command('stop')
    .description('Stop the Dialog web dashboard')
    .action(() => {
      const pidPath = join(getDialogHome(), WEB_PID_FILE);

      if (!existsSync(pidPath)) {
        console.log(chalk.yellow('Dialog Web is not running.'));
        return;
      }

      try {
        const pid = parseInt(readFileSync(pidPath, 'utf-8').trim(), 10);

        try {
          process.kill(pid, 0);
          process.kill(pid, 'SIGTERM');
          console.log(chalk.green(`Dialog Web stopped (PID: ${pid})`));
        } catch {
          console.log(chalk.yellow('Dialog Web process was not running (stale PID file).'));
        }

        unlinkSync(pidPath);
      } catch {
        console.log(chalk.red('Failed to read PID file.'));
      }
    });
}
