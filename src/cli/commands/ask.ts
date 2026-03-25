import { type Command } from 'commander';
import { createInterface } from 'node:readline';
import chalk from 'chalk';
import { isWebRunning, apiPost, apiGet } from '../api-proxy.js';

// ─── UI Constants ───────────────────────────────────────────────
const LOGO = `
  ${chalk.blue('╔═══════════════════════════════════════╗')}
  ${chalk.blue('║')}  ${chalk.bold.white('◆ Dialog')} ${chalk.dim('— AI Log Analysis')}          ${chalk.blue('║')}
  ${chalk.blue('╚═══════════════════════════════════════╝')}`;

const SEPARATOR = chalk.dim('─'.repeat(50));

const TIPS = [
  '"why did checkout fail?"',
  '"show errors in the last 30 minutes"',
  '"what did user-101 do before the crash?"',
  '"is my app healthy right now?"',
  '"which endpoints are slowest?"',
  '"how many 500 errors today?"',
];

// ─── Helpers ────────────────────────────────────────────────────

async function askViaApi(question: string): Promise<string> {
  const response = await apiPost<{ success: boolean; answer: string | null; error: string | null }>(
    '/api/ask', { question }
  );
  if (response.success && response.answer) return response.answer;
  throw new Error(response.error ?? 'No answer');
}

function formatResponse(text: string): string {
  return text
    .split('\n')
    .map(line => {
      if (line.startsWith('```')) return chalk.dim('  ' + line);
      if (line.startsWith('  ') || line.startsWith('\t')) return chalk.dim('  ') + chalk.white(line);
      if (line.startsWith('*') || line.startsWith('-')) return '  ' + chalk.gray('›') + ' ' + line.slice(1).trim();
      if (/^\d+\./.test(line)) return '  ' + line;
      return '  ' + line;
    })
    .join('\n');
}

function randomTip(): string {
  return TIPS[Math.floor(Math.random() * TIPS.length)]!;
}

// ─── Interactive REPL ───────────────────────────────────────────

async function startRepl(): Promise<void> {
  console.log(LOGO);
  console.log('');

  try {
    const health = await apiGet<{ services: number }>('/api/health');
    console.log(`  ${chalk.green('●')} Connected to dialog-web ${chalk.dim(`(${health.services} service${health.services !== 1 ? 's' : ''} monitored)`)}`);
  } catch {
    console.log(`  ${chalk.green('●')} Connected to dialog-web`);
  }

  console.log(`  ${chalk.dim('Type a question, or')} ${chalk.white('/errors')} ${chalk.white('/logs')} ${chalk.white('/status')} ${chalk.white('/help')} ${chalk.white('/exit')}`);
  console.log(`  ${chalk.dim(`Try: ${randomTip()}`)}`);
  console.log('');
  console.log(SEPARATOR);

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: `\n  ${chalk.blue('◆')} `,
    terminal: true,
  });

  rl.prompt();

  rl.on('line', async (line) => {
    const input = line.trim();
    if (!input) { rl.prompt(); return; }

    if (input === '/exit' || input === '/quit' || input === 'exit' || input === 'quit') {
      console.log(`\n  ${chalk.dim('Goodbye.')}\n`);
      rl.close();
      process.exit(0);
    }

    if (input === '/help') {
      console.log('');
      console.log(`  ${chalk.bold('Commands:')}`);
      console.log(`    ${chalk.cyan('/errors')}    ${chalk.dim('Show recent errors')}`);
      console.log(`    ${chalk.cyan('/logs')}      ${chalk.dim('Show recent logs')}`);
      console.log(`    ${chalk.cyan('/status')}    ${chalk.dim('Show service health')}`);
      console.log(`    ${chalk.cyan('/clear')}     ${chalk.dim('Clear screen')}`);
      console.log(`    ${chalk.cyan('/exit')}      ${chalk.dim('Quit Dialog')}`);
      console.log('');
      console.log(`  ${chalk.bold('Ask anything:')}`);
      console.log(`    ${chalk.dim(`Example: ${randomTip()}`)}`);
      console.log('');
      console.log(SEPARATOR);
      rl.prompt();
      return;
    }

    if (input === '/clear') {
      console.clear();
      console.log(LOGO);
      console.log(SEPARATOR);
      rl.prompt();
      return;
    }

    if (input === '/errors') {
      try {
        const data = await apiGet<{ errors: { error_message: string; count: number; last_seen: string }[] }>('/api/errors?last=1h');
        console.log('');
        if (data.errors.length === 0) {
          console.log(`  ${chalk.green('✓')} No errors in the last hour`);
        } else {
          console.log(`  ${chalk.bold('Recent Errors')} ${chalk.dim('(last 1h)')}`);
          console.log('');
          for (const err of data.errors) {
            console.log(`  ${chalk.red(`${err.count}x`)} ${err.error_message.length > 60 ? err.error_message.slice(0, 57) + '...' : err.error_message}`);
            console.log(`    ${chalk.dim(`Last: ${err.last_seen}`)}`);
          }
        }
      } catch {
        console.log(`  ${chalk.red('Failed to fetch errors')}`);
      }
      console.log('');
      console.log(SEPARATOR);
      rl.prompt();
      return;
    }

    if (input === '/logs') {
      try {
        const data = await apiGet<{ logs: { timestamp: string; level: string | null; service: string; message: string }[]; total: number }>('/api/logs?last=5m&limit=10');
        console.log('');
        if (data.logs.length === 0) {
          console.log(`  ${chalk.dim('No logs in the last 5 minutes')}`);
        } else {
          console.log(`  ${chalk.bold('Recent Logs')} ${chalk.dim('(last 5m, showing 10)')}`);
          console.log('');
          for (const log of data.logs) {
            const ts = chalk.dim(String(log.timestamp).slice(11, 19));
            const lvl = log.level === 'ERROR' ? chalk.red(log.level) : log.level === 'WARN' ? chalk.yellow(log.level) : chalk.dim(log.level ?? 'INFO');
            console.log(`  ${ts} ${lvl} ${log.message.slice(0, 70)}`);
          }
        }
      } catch {
        console.log(`  ${chalk.red('Failed to fetch logs')}`);
      }
      console.log('');
      console.log(SEPARATOR);
      rl.prompt();
      return;
    }

    if (input === '/status') {
      try {
        const data = await apiGet<{ services: { service: string; framework: string; status: string; error_count_5m: number }[] }>('/api/services');
        console.log('');
        console.log(`  ${chalk.bold('Services')}`);
        console.log('');
        for (const svc of data.services) {
          const icon = svc.status === 'OK' ? chalk.green('●') : svc.status === 'WARN' ? chalk.yellow('●') : chalk.red('●');
          console.log(`  ${icon} ${chalk.white(svc.service)} ${chalk.cyan(svc.framework)} ${svc.error_count_5m > 0 ? chalk.red(`${svc.error_count_5m} errors`) : chalk.green('OK')}`);
        }
        if (data.services.length === 0) {
          console.log(`  ${chalk.dim('No services detected')}`);
        }
      } catch {
        console.log(`  ${chalk.red('Failed to fetch status')}`);
      }
      console.log('');
      console.log(SEPARATOR);
      rl.prompt();
      return;
    }

    // AI question
    const spinner = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    let spinIdx = 0;
    const spinTimer = setInterval(() => {
      process.stdout.write(`\r  ${chalk.blue(spinner[spinIdx++ % spinner.length]!)} ${chalk.dim('Thinking...')}`);
    }, 80);

    try {
      const answer = await askViaApi(input);
      clearInterval(spinTimer);
      process.stdout.write('\r' + ' '.repeat(30) + '\r');
      console.log('');
      console.log(`  ${chalk.blue('◇')} ${chalk.bold('Dialog')}`);
      console.log('');
      console.log(formatResponse(answer));
      console.log('');
    } catch (err) {
      clearInterval(spinTimer);
      process.stdout.write('\r' + ' '.repeat(30) + '\r');
      console.log(`\n  ${chalk.red('✗')} ${err instanceof Error ? err.message : 'Failed to get answer'}\n`);
    }

    console.log(SEPARATOR);
    rl.prompt();
  });

  rl.on('close', () => process.exit(0));
}

// ─── Single question mode ───────────────────────────────────────

async function askOnce(question: string): Promise<void> {
  const spinner = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let spinIdx = 0;
  const spinTimer = setInterval(() => {
    process.stdout.write(`\r  ${chalk.blue(spinner[spinIdx++ % spinner.length]!)} ${chalk.dim('Thinking...')}`);
  }, 80);

  try {
    const answer = await askViaApi(question);
    clearInterval(spinTimer);
    process.stdout.write('\r' + ' '.repeat(30) + '\r');
    console.log('');
    console.log(`  ${chalk.blue('◇')} ${chalk.bold('Dialog')}`);
    console.log('');
    console.log(formatResponse(answer));
    console.log('');
  } catch (err) {
    clearInterval(spinTimer);
    process.stdout.write('\r' + ' '.repeat(30) + '\r');
    console.log(`\n  ${chalk.red('✗')} ${err instanceof Error ? err.message : 'Failed to get answer'}\n`);
  }
}

// ─── Command Registration ───────────────────────────────────────

export function registerAskCommand(program: Command): void {
  program
    .command('ask [question]')
    .description('AI-powered log analysis (interactive mode if no question given)')
    .option('-i, --interactive', 'Start interactive chat mode')
    .action(async (question: string | undefined, options: { interactive?: boolean }) => {
      if (!(await isWebRunning())) {
        console.log(chalk.yellow('  dialog-web is not running. Start it first:'));
        console.log(chalk.dim('  $ dialog-web start'));
        return;
      }

      if (!question || options.interactive) {
        await startRepl();
        return;
      }

      await askOnce(question);
    });
}
