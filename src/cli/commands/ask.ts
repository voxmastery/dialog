import { type Command } from 'commander';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import chalk from 'chalk';
import { getDataDir } from '../../config/index.js';
import { DUCKDB_FILE } from '../../config/defaults.js';
import { isWebRunning, apiPost } from '../api-proxy.js';

async function askViaApi(question: string): Promise<void> {
  const response = await apiPost<{ success: boolean; answer: string | null; error: string | null }>(
    '/api/ask',
    { question }
  );

  if (response.success && response.answer) {
    console.log('');
    console.log(response.answer);
  } else {
    console.log(chalk.red(response.error ?? 'Failed to get answer.'));
  }
}

async function askDirect(question: string): Promise<void> {
  const dbPath = join(getDataDir(), DUCKDB_FILE);
  if (!existsSync(dbPath)) {
    console.log(chalk.yellow('No log data yet. Start monitoring with: dialog-cli start'));
    return;
  }

  const { createUnifiedAiClient } = await import('../../ai/providers.js');
  const { createEmbeddingStore } = await import('../../ai/embeddings.js');
  const { createAiRouter } = await import('../../ai/router.js');
  const { createStorage } = await import('../../storage/duckdb.js');

  const storage = await createStorage(dbPath);
  await storage.init();
  const client = createUnifiedAiClient();
  const embeddings = createEmbeddingStore(client);
  await embeddings.init();
  const router = createAiRouter(client, embeddings, storage);
  const response = await router.handleQuestion(question);
  await storage.close();

  if (response.success && response.answer) {
    console.log('');
    console.log(response.answer);
  } else {
    console.log(chalk.red(response.error ?? 'Failed to get answer.'));
  }
}

async function askQuestion(question: string, useApi: boolean): Promise<void> {
  process.stdout.write(chalk.dim('\n  Thinking...\r'));
  try {
    if (useApi) {
      await askViaApi(question);
    } else {
      await askDirect(question);
    }
  } catch (err) {
    console.log(chalk.red('  Failed.'), err instanceof Error ? err.message : '');
  }
}

async function startRepl(useApi: boolean): Promise<void> {
  console.log('');
  console.log(chalk.bold('  Dialog AI') + chalk.dim(' — ask anything about your logs'));
  console.log(chalk.dim('  Type your question and press Enter. Type "exit" to quit.'));
  console.log('');

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: chalk.blue('  dialog > '),
    terminal: true,
  });

  rl.prompt();

  rl.on('line', async (line) => {
    const input = line.trim();
    if (!input) { rl.prompt(); return; }
    if (input === 'exit' || input === 'quit' || input === '.exit') {
      console.log(chalk.dim('\n  Goodbye.\n'));
      rl.close();
      process.exit(0);
    }

    await askQuestion(input, useApi);
    console.log('');
    rl.prompt();
  });

  rl.on('close', () => process.exit(0));
}

export function registerAskCommand(program: Command): void {
  program
    .command('ask [question]')
    .description('Ask a question in plain English (interactive mode if no question given)')
    .option('-i, --interactive', 'Start interactive chat mode')
    .action(async (question: string | undefined, options: { interactive?: boolean }) => {
      const useApi = await isWebRunning();

      if (useApi) {
        console.log(chalk.dim('  Connected to dialog-web API'));
      }

      // Interactive mode: no question given, or --interactive flag
      if (!question || options.interactive) {
        await startRepl(useApi);
        return;
      }

      await askQuestion(question, useApi);
      console.log('');
    });
}
