import pino from 'pino';

// Default to 'warn' — silent during normal CLI use.
// Users opt into verbose logging with LOG_LEVEL=debug
const level = process.env['LOG_LEVEL'] ?? 'warn';

export const logger = pino({
  level,
  transport: { target: 'pino/file', options: { destination: 2 } }, // stderr only
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  name: 'dialog',
});

export type Logger = typeof logger;
