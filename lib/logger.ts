// Structured logging with Pino
import pino from 'pino';
import { ENV } from './config';

export const logger = pino({
  level: ENV.logLevel,
  // Use simple console logger in development to avoid worker thread issues in Next.js
  // pino-pretty with worker threads causes MODULE_NOT_FOUND errors in Next.js build
  ...(ENV.isDevelopment
    ? {
        formatters: {
          level: (label: string) => {
            return { level: label };
          },
        },
      }
    : {}),
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
