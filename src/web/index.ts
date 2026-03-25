import type { Command } from 'commander';
import { registerWebStartCommand } from './commands/start.js';
import { registerWebStopCommand } from './commands/stop.js';
import { registerWebStatusCommand } from './commands/status.js';

export function registerWebCommands(program: Command): void {
  registerWebStartCommand(program);
  registerWebStopCommand(program);
  registerWebStatusCommand(program);
}
