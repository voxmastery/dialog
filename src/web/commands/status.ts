import { type Command } from 'commander';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import chalk from 'chalk';
import { getDialogHome } from '../../config/index.js';

const WEB_PID_FILE = 'dialog-web.pid';

export function registerWebStatusCommand(program: Command): void {
  program
    .command('status')
    .description('Show Dialog web dashboard status')
    .action(() => {
      const pidPath = join(getDialogHome(), WEB_PID_FILE);

      if (!existsSync(pidPath)) {
        console.log(chalk.yellow('○ Dialog Web is not running'));
        console.log(chalk.dim('  Start with: dialog-web start'));
        return;
      }

      try {
        const pid = parseInt(readFileSync(pidPath, 'utf-8').trim(), 10);
        process.kill(pid, 0);
        console.log(chalk.green(`● Dialog Web is running (PID: ${pid})`));
        console.log(chalk.dim('  Dashboard: http://localhost:9999'));
        console.log(chalk.dim('  API:       http://localhost:9999/api/health'));
        console.log(chalk.dim('  Live logs: ws://localhost:9999/api/logs/live'));
      } catch {
        console.log(chalk.yellow('○ Dialog Web is not running (stale PID file)'));
      }
    });
}
