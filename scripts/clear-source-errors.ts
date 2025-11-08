#!/usr/bin/env tsx
// Script to clear error messages from sources
// Useful after fixing configuration issues

import { db } from '../lib/db';
import { createLogger } from '../lib/logger';

const log = createLogger('clear-source-errors');

async function clearSourceErrors() {
  try {
    log.info('Clearing error messages from all sources');

    const result = await db.contentSource.updateMany({
      where: {
        lastFetchStatus: 'error',
      },
      data: {
        errorMessage: null,
        lastFetchStatus: 'idle',
      },
    });

    log.info({ count: result.count }, 'Cleared error messages from sources');
    console.log(`✅ Cleared errors from ${result.count} source(s)`);
  } catch (error) {
    log.error({ error }, 'Failed to clear source errors');
    console.error('❌ Failed to clear errors:', error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

clearSourceErrors();
