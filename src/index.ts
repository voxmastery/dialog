#!/usr/bin/env node

// Legacy entry point — redirects to dialog-cli
import { program } from 'commander';
import { registerCommands } from './cli/index.js';

program
  .name('dialog-cli')
  .description('Dialog — Local-first AI-powered log analysis CLI')
  .version('0.1.0');

registerCommands(program);

program.parse();
