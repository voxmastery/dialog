import { type Command } from 'commander';
import { join } from 'node:path';
import { getDataDir, ensureDirectories, loadConfig } from '../../config/index.js';
import { DUCKDB_FILE, SQLITE_FILE } from '../../config/defaults.js';
import { isWebRunning } from '../api-proxy.js';
import type { LogStorage } from '../../storage/duckdb.js';
import type { JourneyIndex } from '../../journey/index.js';

export function registerMcpServeCommand(program: Command): void {
  program
    .command('mcp-serve')
    .description('Launch MCP server for AI assistant integration (stdio transport)')
    .action(async () => {
      const log = (msg: string) => process.stderr.write(`[dialog-mcp] ${msg}\n`);

      try {
        ensureDirectories();
        const config = loadConfig();
        const dataDir = getDataDir();

        log('Initializing...');

        const { createUnifiedAiClient } = await import('../../ai/providers.js');
        const { createEmbeddingStore } = await import('../../ai/embeddings.js');
        const { createAiRouter } = await import('../../ai/router.js');
        const { createMcpServer } = await import('../../mcp/server.js');

        const webRunning = await isWebRunning();
        let storage: LogStorage;
        let journeyIndex: JourneyIndex;

        if (webRunning) {
          log('Using dialog-web API (proxy mode)');
          const { createApiStorage } = await import('../../storage/api-storage.js');
          storage = createApiStorage();
          journeyIndex = {
            init() {}, indexEvent() {},
            getJourneyByUser: () => [], getJourneyBySession: () => [],
            close() {},
          };
        } else {
          log('Direct database mode');
          const { createStorage } = await import('../../storage/duckdb.js');
          const { createJourneyIndex } = await import('../../journey/index.js');
          storage = await createStorage(join(dataDir, DUCKDB_FILE));
          await storage.init();
          journeyIndex = createJourneyIndex(join(dataDir, SQLITE_FILE));
          journeyIndex.init();
        }

        const aiClient = createUnifiedAiClient();
        const embeddingStore = createEmbeddingStore(aiClient);
        await embeddingStore.init();
        const aiRouter = createAiRouter(aiClient, embeddingStore, storage);

        const ctx = { storage, journeyIndex, mistralClient: aiClient, embeddingStore, aiRouter, config };
        const mcp = createMcpServer(ctx);

        log(`Registered ${mcp.toolCount} tools`);

        const shutdown = async () => {
          log('Shutting down...');
          journeyIndex.close();
          if (storage.close) await storage.close();
          process.exit(0);
        };
        process.on('SIGTERM', shutdown);
        process.on('SIGINT', shutdown);

        await mcp.start();
        log('MCP server running.');
      } catch (err) {
        log(`Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
        process.exit(1);
      }
    });
}
