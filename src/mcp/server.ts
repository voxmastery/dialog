import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { ToolContext } from './types.js';
import { toMcpContent } from './types.js';

import * as getErrors from './tools/get-errors.js';
import * as queryLogs from './tools/query-logs.js';
import * as replayJourney from './tools/replay-journey.js';
import * as getHealth from './tools/get-health.js';
import * as explainError from './tools/explain-error.js';
import * as compareDeploys from './tools/compare-deploys.js';
import * as getSlowQueries from './tools/get-slow-queries.js';
import * as listServices from './tools/list-services.js';

const TOOLS = [
  getErrors,
  queryLogs,
  replayJourney,
  getHealth,
  explainError,
  compareDeploys,
  getSlowQueries,
  listServices,
] as const;

/**
 * Create and configure the Dialog MCP server with all 8 tools registered.
 * Does not start the transport — call `start()` on the returned object.
 */
export function createMcpServer(ctx: ToolContext) {
  const server = new McpServer(
    {
      name: 'dialog',
      version: '0.1.0',
    },
    {
      capabilities: {
        logging: {},
      },
    }
  );

  // T-31: dialog_get_errors
  server.tool(
    getErrors.TOOL_NAME,
    getErrors.TOOL_DESCRIPTION,
    getErrors.inputSchema,
    async (args) => {
      const response = await getErrors.handler(args, ctx);
      return { content: toMcpContent(response) };
    }
  );

  // T-32: dialog_query_logs
  server.tool(
    queryLogs.TOOL_NAME,
    queryLogs.TOOL_DESCRIPTION,
    queryLogs.inputSchema,
    async (args) => {
      const response = await queryLogs.handler(args, ctx);
      return { content: toMcpContent(response) };
    }
  );

  // T-33: dialog_replay_journey
  server.tool(
    replayJourney.TOOL_NAME,
    replayJourney.TOOL_DESCRIPTION,
    replayJourney.inputSchema,
    async (args) => {
      const response = await replayJourney.handler(args, ctx);
      return { content: toMcpContent(response) };
    }
  );

  // T-34: dialog_get_health
  server.tool(
    getHealth.TOOL_NAME,
    getHealth.TOOL_DESCRIPTION,
    getHealth.inputSchema,
    async (args) => {
      const response = await getHealth.handler(args, ctx);
      return { content: toMcpContent(response) };
    }
  );

  // T-35: dialog_explain_error
  server.tool(
    explainError.TOOL_NAME,
    explainError.TOOL_DESCRIPTION,
    explainError.inputSchema,
    async (args) => {
      const response = await explainError.handler(args, ctx);
      return { content: toMcpContent(response) };
    }
  );

  // T-36: dialog_compare_deploys
  server.tool(
    compareDeploys.TOOL_NAME,
    compareDeploys.TOOL_DESCRIPTION,
    compareDeploys.inputSchema,
    async (args) => {
      const response = await compareDeploys.handler(args, ctx);
      return { content: toMcpContent(response) };
    }
  );

  // T-37: dialog_get_slow_queries
  server.tool(
    getSlowQueries.TOOL_NAME,
    getSlowQueries.TOOL_DESCRIPTION,
    getSlowQueries.inputSchema,
    async (args) => {
      const response = await getSlowQueries.handler(args, ctx);
      return { content: toMcpContent(response) };
    }
  );

  // T-38: dialog_list_services
  server.tool(
    listServices.TOOL_NAME,
    listServices.TOOL_DESCRIPTION,
    listServices.inputSchema,
    async (args) => {
      const response = await listServices.handler(args as any, ctx);
      return { content: toMcpContent(response) };
    }
  );

  return {
    server,
    async start(): Promise<void> {
      const transport = new StdioServerTransport();
      await server.connect(transport);
    },
    toolCount: TOOLS.length,
  };
}
