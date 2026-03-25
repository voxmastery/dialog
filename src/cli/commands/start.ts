import { type Command } from 'commander';
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fork } from 'node:child_process';
import chalk from 'chalk';
import { getDialogHome, ensureDirectories, loadConfig } from '../../config/index.js';
import { PID_FILE } from '../../config/defaults.js';
import { scanAllPorts } from '../../daemon/detector.js';
import { logger } from '../../lib/logger.js';

function isDaemonRunning(): { running: boolean; pid: number | null } {
  const pidPath = join(getDialogHome(), PID_FILE);
  if (!existsSync(pidPath)) return { running: false, pid: null };

  try {
    const pid = parseInt(readFileSync(pidPath, 'utf-8').trim(), 10);
    process.kill(pid, 0); // Check if alive
    return { running: true, pid };
  } catch (err) {
    logger.debug({ err }, 'PID check failed, daemon not running');
    return { running: false, pid: null };
  }
}

export function registerStartCommand(program: Command): void {
  program
    .command('start')
    .description('Start daemon, auto-detect projects, monitor logs')
    .option('--foreground', 'Run in foreground instead of daemonizing')
    .option('--port <port>', 'Only monitor specific port', parseInt)
    .option('--no-dashboard', 'Do not start dashboard server')
    .action(async (options) => {
      const { running, pid } = isDaemonRunning();
      if (running) {
        console.log(chalk.yellow(`Dialog is already running (PID: ${pid}). Use 'dialog stop' first.`));
        return;
      }

      ensureDirectories();
      const config = loadConfig();
      const ports = options.port ? [options.port] : [...config.ports];

      console.log(chalk.blue('Starting Dialog...'));

      // Scan for services
      const services = await scanAllPorts(ports);

      if (services.length === 0) {
        console.log(chalk.yellow('No running services detected on monitored ports.'));
        console.log(chalk.dim(`Scanned ports: ${ports.join(', ')}`));
        console.log(chalk.dim('Start your dev server, then run dialog start again.'));
      } else {
        console.log(chalk.green(`Detected ${services.length} service(s):`));
        for (const svc of services) {
          const icon = svc.status === 'active' ? chalk.green('●') : chalk.red('●');
          console.log(`  ${icon} localhost:${svc.port} ${chalk.cyan(`(${svc.framework})`)} PID ${svc.pid}`);
        }
      }

      if (options.foreground) {
        // Run in foreground
        const pidPath = join(getDialogHome(), PID_FILE);
        writeFileSync(pidPath, String(process.pid));
        console.log(chalk.green(`Dialog running in foreground (PID: ${process.pid})`));
        console.log(chalk.dim('Press Ctrl+C to stop.'));

        // Import and start daemon
        const { createDaemon } = await import('../../daemon/index.js');
        const daemon = createDaemon(config);
        await daemon.start();

        const shutdown = () => {
          daemon.stop();
          process.exit(0);
        };
        process.on('SIGTERM', shutdown);
        process.on('SIGINT', shutdown);
      } else {
        // Fork as background daemon
        const daemonScript = new URL('../../daemon/worker.js', import.meta.url).pathname;
        try {
          const child = fork(daemonScript, [], {
            detached: true,
            stdio: 'ignore',
            env: { ...process.env, DIALOG_DAEMON: '1' },
          });

          if (child.pid) {
            const pidPath = join(getDialogHome(), PID_FILE);
            writeFileSync(pidPath, String(child.pid));
            child.unref();
            console.log(chalk.green(`Dialog started (PID: ${child.pid})`));
          }
        } catch (err) {
          logger.warn({ err }, 'Failed to fork daemon process');
          console.log(chalk.yellow('Could not daemonize. Running in foreground...'));
          const pidPath = join(getDialogHome(), PID_FILE);
          writeFileSync(pidPath, String(process.pid));

          const { createDaemon } = await import('../../daemon/index.js');
          const daemon = createDaemon(config);
          await daemon.start();
        }
      }
    });
}
