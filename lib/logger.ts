// Structured logging with Pino
import pino from 'pino';
import { ENV } from './config';

// Check if we're running in Edge Runtime (middleware)
// Edge runtime doesn't have process.cwd or has EdgeRuntime in globalThis
const isEdgeRuntime = typeof process === 'undefined' || !process.cwd || typeof (globalThis as any).EdgeRuntime !== 'undefined';

// Only setup file logging in Node.js runtime (not Edge)
let logsDir: string | undefined;
let streams: pino.StreamEntry[] = [];

if (!isEdgeRuntime) {
  // Only import fs and path in Node.js runtime
  const fs = require('fs');
  const path = require('path');

  // Ensure logs directory exists
  logsDir = path.join(process.cwd(), 'logs');
  if (!fs.existsSync(logsDir)) {
    try {
      fs.mkdirSync(logsDir, { recursive: true });
    } catch (error) {
      console.warn('Failed to create logs directory:', error);
    }
  }

  // Console output (always enabled in development)
  if (ENV.isDevelopment) {
    streams.push({
      level: ENV.logLevel,
      stream: pino.destination({
        sync: false,
        dest: 1, // stdout
      }),
    });
  }

  // File output: All logs
  try {
    streams.push({
      level: 'info',
      stream: pino.destination({
        dest: path.join(logsDir, 'app.log'),
        sync: false,
        mkdir: true,
      }),
    });

    // File output: YouTube API logs only (for quota tracking)
    streams.push({
      level: 'info',
      stream: pino.destination({
        dest: path.join(logsDir, 'youtube-api.log'),
        sync: false,
        mkdir: true,
      }),
    });

    // File output: Errors only
    streams.push({
      level: 'error',
      stream: pino.destination({
        dest: path.join(logsDir, 'error.log'),
        sync: false,
        mkdir: true,
      }),
    });
  } catch (error) {
    console.warn('Failed to setup file logging:', error);
  }
}

export const logger = pino(
  {
    level: ENV.logLevel,
    formatters: {
      level: (label: string) => {
        return { level: label };
      },
    },
    base: {
      env: ENV.nodeEnv,
      ...(isEdgeRuntime ? {} : { pid: process.pid }),
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  },
  streams.length > 0 ? pino.multistream(streams) : undefined
);

// Special logger for YouTube API that only logs to youtube-api.log
export function createYouTubeApiLogger(name: string) {
  // In Edge Runtime, just use the base logger
  if (isEdgeRuntime || !logsDir) {
    return logger.child({ module: name });
  }

  const path = require('path');
  const youtubeApiStream = pino.destination({
    dest: path.join(logsDir, 'youtube-api.log'),
    sync: false,
    mkdir: true,
  });

  const youtubeLogger = pino(
    {
      level: 'info',
      formatters: {
        level: (label: string) => ({ level: label }),
      },
      base: {
        env: ENV.nodeEnv,
        module: name,
      },
      timestamp: pino.stdTimeFunctions.isoTime,
    },
    pino.multistream([
      { level: 'info', stream: youtubeApiStream },
      ...(ENV.isDevelopment
        ? [{ level: 'info', stream: pino.destination({ sync: false, dest: 1 }) }]
        : []),
    ])
  );

  return youtubeLogger;
}

// Create child loggers for specific domains
export function createLogger(name: string) {
  // Use special YouTube API logger for YouTube-related modules
  if (name === 'youtube-client' || name === 'youtube-adapter') {
    return createYouTubeApiLogger(name);
  }
  return logger.child({ module: name });
}

// Usage:
// const log = createLogger('feed-service');
// log.info({ userId, contentCount }, 'Generated feed');
// log.warn({ sourceId, error }, 'Failed to fetch source');
// log.error({ error, context }, 'Critical error');
