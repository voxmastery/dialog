#!/usr/bin/env node

import { program } from 'commander';
import { registerWebCommands } from './web/index.js';

program
  .name('dialog-web')
  .description('Dialog — Local-first AI-powered log analysis dashboard')
  .version('0.1.0');

registerWebCommands(program);

program.parse();
