import { type Command } from 'commander';
import { writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import chalk from 'chalk';
import { getDataDir } from '../../config/index.js';
import { DUCKDB_FILE, SQLITE_FILE } from '../../config/defaults.js';
import type { LogLevel } from '../../types.js';

export function registerExportCommand(program: Command): void {
  program
    .command('export')
    .description('Export errors/journeys as Markdown, JSON, CSV')
    .option('--format <format>', 'Output format (md, json, csv)', 'md')
    .option('--last <duration>', 'Time range', '1h')
    .option('--user <id>', 'Export journey for user')
    .option('--service <name>', 'Filter by service')
    .option('--output <file>', 'Write to file instead of stdout')
    .action(async (options) => {
      let output = '';

      try {
        if (options.user) {
          // Export journey
          const dbPath = join(getDataDir(), SQLITE_FILE);
          if (!existsSync(dbPath)) {
            console.log(chalk.yellow('No journey data.'));
            return;
          }

          const { createJourneyIndex } = await import('../../journey/index.js');
          const { reconstructJourney } = await import('../../journey/reconstruct.js');
          const idx = createJourneyIndex(dbPath);
          idx.init();
          const events = idx.getJourneyByUser(options.user);
          idx.close();

          if (events.length === 0) {
            console.log(chalk.yellow(`No journey for user: ${options.user}`));
            return;
          }

          const journey = reconstructJourney(events);

          if (options.format === 'json') {
            output = JSON.stringify(journey, null, 2);
          } else if (options.format === 'csv') {
            output = 'timestamp,method,path,status,duration_ms\n';
            output += journey.events.map(e =>
              `${e.timestamp},${e.method ?? ''},${e.path ?? ''},${e.status ?? ''},${e.duration_ms ?? ''}`
            ).join('\n');
          } else {
            output = `# Journey Report — User: ${options.user}\n\n`;
            output += `**Events:** ${events.length}\n`;
            output += `**Has Errors:** ${journey.hasErrors ? 'Yes' : 'No'}\n\n`;
            output += '## Timeline\n\n';
            output += '| Time | Method | Path | Status | Duration |\n';
            output += '|------|--------|------|--------|----------|\n';
            for (let i = 0; i < journey.events.length; i++) {
              const e = journey.events[i]!;
              const marker = i === journey.rootCauseIndex ? ' **ROOT CAUSE**' : '';
              output += `| ${e.timestamp} | ${e.method ?? '-'} | ${e.path ?? '-'} | ${e.status ?? '-'} | ${e.duration_ms ?? '-'}ms |${marker}\n`;
            }
          }
        } else {
          // Export errors
          const dbPath = join(getDataDir(), DUCKDB_FILE);
          if (!existsSync(dbPath)) {
            console.log(chalk.yellow('No log data.'));
            return;
          }

          const { createStorage } = await import('../../storage/duckdb.js');
          const storage = await createStorage(dbPath);
          await storage.init();
          const errors = await storage.queryErrors({
            last: options.last,
            service: options.service,
            level: 'ERROR' as LogLevel,
          });
          await storage.close();

          if (options.format === 'json') {
            output = JSON.stringify(errors, null, 2);
          } else if (options.format === 'csv') {
            output = 'error_message,count,first_seen,last_seen,affected_paths\n';
            output += errors.map(e =>
              `"${e.error_message.replace(/"/g, '""')}",${e.count},${e.first_seen},${e.last_seen},"${e.affected_paths.join('; ')}"`
            ).join('\n');
          } else {
            output = `# Error Report\n\n`;
            output += `**Time Range:** Last ${options.last}\n`;
            output += `**Total Groups:** ${errors.length}\n\n`;
            for (const err of errors) {
              output += `## ${err.error_message}\n\n`;
              output += `- **Count:** ${err.count}\n`;
              output += `- **First seen:** ${err.first_seen}\n`;
              output += `- **Last seen:** ${err.last_seen}\n`;
              output += `- **Endpoints:** ${err.affected_paths.join(', ') || 'N/A'}\n\n`;
            }
          }
        }

        if (options.output) {
          writeFileSync(options.output, output);
          console.log(chalk.green(`Exported to ${options.output}`));
        } else {
          console.log(output);
        }
      } catch (err) {
        console.log(chalk.red('Export failed.'), err instanceof Error ? err.message : '');
      }
    });
}
