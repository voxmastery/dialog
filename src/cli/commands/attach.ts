import { type Command } from 'commander';
import chalk from 'chalk';
import { logger } from '../../lib/logger.js';

export function registerAttachCommand(program: Command): void {
  program
    .command('attach')
    .description('Manually attach to a port, Docker container, or URL')
    .option('--port <port>', 'Port to monitor', parseInt)
    .option('--docker <container>', 'Docker container name or ID')
    .option('--url <url>', 'WebSocket URL for remote forwarding')
    .action(async (options) => {
      if (!options.port && !options.docker && !options.url) {
        console.log(chalk.red('Provide --port, --docker, or --url'));
        return;
      }

      if (options.port) {
        console.log(chalk.blue(`Attaching to port ${options.port}...`));
        try {
          const { scanPort } = await import('../../daemon/detector.js');
          const service = await scanPort(options.port);
          if (service) {
            console.log(chalk.green(`Attached to localhost:${options.port} (${service.framework})`));
          } else {
            console.log(chalk.yellow(`No process found on port ${options.port}`));
          }
        } catch (err) {
          console.log(chalk.red('Failed to attach.'), err instanceof Error ? err.message : '');
        }
      }

      if (options.docker) {
        console.log(chalk.blue(`Attaching to Docker container: ${options.docker}...`));
        // Docker support - basic implementation
        try {
          const { exec } = await import('node:child_process');
          const { promisify } = await import('node:util');
          const execAsync = promisify(exec);
          const { stdout } = await execAsync(`docker logs --tail 10 ${options.docker}`);
          console.log(chalk.green(`Connected to container: ${options.docker}`));
          console.log(chalk.dim('Recent logs:'));
          console.log(stdout);
        } catch (err) {
          logger.debug({ err, container: options.docker }, 'Docker attach failed');
          console.log(chalk.red(`Failed to connect to Docker container: ${options.docker}`));
          console.log(chalk.dim('Make sure Docker is running and the container exists.'));
        }
      }

      if (options.url) {
        console.log(chalk.yellow('WebSocket remote forwarding is planned for a future release.'));
        console.log(chalk.dim(`URL: ${options.url}`));
      }
    });
}
