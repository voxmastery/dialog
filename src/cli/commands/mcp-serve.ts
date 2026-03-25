import { type Command } from 'commander';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { getDataDir, ensureDirectories, loadConfig } from '../../config/index.js';
import { DUCKDB_FILE, SQLITE_FILE } from '../../config/defaults.js';

export function registerMcpServeCommand(program: Command): void {
  program
    .command('mcp-serve')
    .description('Launch MCP server for AI assistant integration (stdio transport)')
    .action(async () => {
      // All output must go to stderr — stdout is reserved for MCP JSON-RPC
      const log = (msg: string) => process.stderr.write(`[dialog-mcp] ${msg}\n`);

      try {
        ensureDirectories();
        const config = loadConfig();
        const dataDir = getDataDir();
        const dbPath = join(dataDir, DUCKDB_FILE);
        const sqlitePath = join(dataDir, SQLITE_FILE);

        log('Initializing storage...');

        const { createStorage } = await import('../../storage/duckdb.js');
        const { createJourneyIndex } = await import('../../journey/index.js');
        const { createUnifiedAiClient } = await import('../../ai/providers.js');
        const { createEmbeddingStore } = await import('../../ai/embeddings.js');
        const { createAiRouter } = await import('../../ai/router.js');
        const { createMcpServer } = await import('../../mcp/server.js');

        const storage = await createStorage(dbPath);
        await storage.init();

        const journeyIndex = createJourneyIndex(sqlitePath);
        journeyIndex.init();

        const mistralClient = createUnifiedAiClient();
        const embeddingStore = createEmbeddingStore(mistralClient);
        await embeddingStore.init();

        const aiRouter = createAiRouter(mistralClient, embeddingStore, storage);

        const ctx = {
          storage,
          journeyIndex,
          mistralClient,
          embeddingStore,
          aiRouter,
          config,
        };

        const mcp = createMcpServer(ctx);

        log(`Registered ${mcp.toolCount} tools`);
        log('Starting MCP server on stdio...');

        // Graceful shutdown
        const shutdown = async () => {
          log('Shutting down...');
          journeyIndex.close();
          await storage.close();
          process.exit(0);
        };

        process.on('SIGTERM', shutdown);
        process.on('SIGINT', shutdown);

        await mcp.start();

        log('MCP server running. Waiting for requests...');
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        log(`Failed to start MCP server: ${msg}`);
        process.exit(1);
      }
    });
}
