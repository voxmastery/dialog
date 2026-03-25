import { type Command } from 'commander';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import chalk from 'chalk';
import { getDialogHome, loadConfig, ensureDirectories } from '../../config/index.js';
import { CONFIG_FILE } from '../../config/defaults.js';

function configToToml(config: Record<string, unknown>): string {
  const lines: string[] = [];
  for (const [key, value] of Object.entries(config)) {
    if (Array.isArray(value)) {
      lines.push(`${key} = [${value.join(', ')}]`);
    } else if (typeof value === 'string') {
      lines.push(`${key} = "${value}"`);
    } else {
      lines.push(`${key} = ${value}`);
    }
  }
  return lines.join('\n') + '\n';
}

export function registerConfigCommand(program: Command): void {
  program
    .command('config')
    .description('Configure alerts, ports, retention')
    .option('--show', 'Show current configuration')
    .option('--set <key=value>', 'Set a configuration value')
    .option('--reset', 'Reset to defaults')
    .action((options) => {
      ensureDirectories();
      const config = loadConfig();
      const configPath = join(getDialogHome(), CONFIG_FILE);

      if (options.show || (!options.set && !options.reset)) {
        console.log(chalk.bold('Dialog Configuration'));
        console.log('');
        console.log(`  ${chalk.cyan('Ports:')} ${[...config.ports].join(', ')}`);
        console.log(`  ${chalk.cyan('Retention:')} ${config.retention_hours} hours`);
        console.log(`  ${chalk.cyan('Alert severity:')} ${config.alert_severity}`);
        console.log(`  ${chalk.cyan('Alert cooldown:')} ${config.alert_cooldown_seconds}s`);
        console.log(`  ${chalk.cyan('Scan interval:')} ${config.scan_interval_ms}ms`);
        console.log('');
        console.log(chalk.dim(`Config file: ${configPath}`));
        return;
      }

      if (options.reset) {
        if (existsSync(configPath)) {
          writeFileSync(configPath, '# Dialog configuration\n# Reset to defaults\n');
          console.log(chalk.green('Configuration reset to defaults.'));
        }
        return;
      }

      if (options.set) {
        const [key, value] = (options.set as string).split('=');
        if (!key || value === undefined) {
          console.log(chalk.red('Usage: dialog config --set key=value'));
          return;
        }

        const current: Record<string, unknown> = { ...config };

        if (key === 'ports') {
          current['ports'] = value.split(',').map(p => parseInt(p.trim(), 10));
        } else if (['retention_hours', 'alert_cooldown_seconds', 'scan_interval_ms', 'batch_flush_ms', 'batch_flush_count', 'embed_interval_ms'].includes(key)) {
          current[key] = parseInt(value, 10);
        } else {
          current[key] = value;
        }

        writeFileSync(configPath, configToToml(current));
        console.log(chalk.green(`Set ${key} = ${value}`));
      }
    });
}
