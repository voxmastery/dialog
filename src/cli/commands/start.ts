import { type Command } from 'commander';
import chalk from 'chalk';

export function registerStartCommand(program: Command): void {
  program
    .command('start')
    .description('Start monitoring (use dialog-web start instead)')
    .action(() => {
      console.log('');
      console.log(chalk.yellow('  dialog-cli start has been replaced.'));
      console.log('');
      console.log(`  Use ${chalk.bold('dialog-web start')} to start the daemon + dashboard.`);
      console.log(`  Then use ${chalk.bold('dialog-cli ask')} to query from the terminal.`);
      console.log('');
      console.log(chalk.dim('  dialog-web start     Start daemon + dashboard on :9999'));
      console.log(chalk.dim('  dialog-cli ask       Interactive AI log analysis'));
      console.log(chalk.dim('  dialog-cli errors    Show recent errors'));
      console.log('');
    });
}
