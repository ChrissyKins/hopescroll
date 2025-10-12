// Structured logging with Pino
import pino from 'pino';
import { ENV } from './config';

export const logger = pino({
  level: ENV.logLevel,
  transport: ENV.isDevelopment
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
  base: {
    env: ENV.nodeEnv,
  },
});

// Create child loggers for specific domains
export function createLogger(name: string) {
  return logger.child({ module: name });
}

// Usage:
// const log = createLogger('feed-service');
// log.info({ userId, contentCount }, 'Generated feed');
// log.warn({ sourceId, error }, 'Failed to fetch source');
// log.error({ error, context }, 'Critical error');
