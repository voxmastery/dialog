import { type Command } from 'commander';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import chalk from 'chalk';
import { getDataDir } from '../../config/index.js';
import { DUCKDB_FILE } from '../../config/defaults.js';

export function registerAskCommand(program: Command): void {
  program
    .command('ask <question>')
    .description('Ask a question in plain English')
    .action(async (question: string) => {
      if (!question.trim()) {
        console.log(chalk.red('Please provide a question.'));
        return;
      }

      const dbPath = join(getDataDir(), DUCKDB_FILE);

      if (!existsSync(dbPath)) {
        console.log(chalk.yellow('No log data yet. Start monitoring with: dialog start'));
        return;
      }

      console.log(chalk.dim('Thinking...'));

      try {
        const { createUnifiedAiClient } = await import('../../ai/providers.js');
        const { createEmbeddingStore } = await import('../../ai/embeddings.js');
        const { createAiRouter } = await import('../../ai/router.js');
        const { createStorage } = await import('../../storage/duckdb.js');

        const storage = await createStorage(dbPath);
        await storage.init();

        const mistral = createUnifiedAiClient();
        const embeddings = createEmbeddingStore(mistral);
        await embeddings.init();

        const router = createAiRouter(mistral, embeddings, storage);
        const response = await router.handleQuestion(question);

        await storage.close();

        if (response.success && response.answer) {
          console.log('');
          console.log(response.answer);

          if (response.citations.length > 0) {
            console.log('');
            console.log(chalk.dim('Citations:'));
            for (const cite of response.citations) {
              console.log(chalk.dim(`  [${cite.timestamp}] ${cite.service}: ${cite.message}`));
            }
          }
        } else {
          console.log(chalk.red(response.error ?? 'Failed to get answer.'));
        }
      } catch (err) {
        console.log(chalk.red('Failed to process question.'), err instanceof Error ? err.message : '');
      }
    });
}
