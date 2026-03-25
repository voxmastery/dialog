#!/usr/bin/env node

import { program } from 'commander';
import { registerCommands } from './cli/index.js';

program
  .name('dialog-cli')
  .description(`Dialog — AI-Powered Log Analysis CLI

  Getting started:
    1. Start the daemon:  dialog-web start
    2. Use the CLI:       dialog-cli ask "your question"
    3. Open dashboard:    http://localhost:9999`)
  .version('1.0.0');

registerCommands(program);

program.parse();
