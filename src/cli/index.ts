import type { Command } from 'commander';
import { registerStartCommand } from './commands/start.js';
import { registerStopCommand } from './commands/stop.js';
import { registerStatusCommand } from './commands/status.js';
import { registerErrorsCommand } from './commands/errors.js';
import { registerJourneyCommand } from './commands/journey.js';
import { registerAskCommand } from './commands/ask.js';
import { registerLogsCommand } from './commands/logs.js';
import { registerConfigCommand } from './commands/config.js';
import { registerExportCommand } from './commands/export.js';
import { registerAttachCommand } from './commands/attach.js';
import { registerMcpServeCommand } from './commands/mcp-serve.js';
import { registerSeedCommand } from './commands/seed.js';

export function registerCommands(program: Command): void {
  registerStartCommand(program);
  registerStopCommand(program);
  registerStatusCommand(program);
  registerErrorsCommand(program);
  registerJourneyCommand(program);
  registerAskCommand(program);
  registerLogsCommand(program);
  registerConfigCommand(program);
  registerExportCommand(program);
  registerAttachCommand(program);
  registerMcpServeCommand(program);
  registerSeedCommand(program);
}
