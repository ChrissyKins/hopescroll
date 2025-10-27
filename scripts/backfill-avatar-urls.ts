#!/usr/bin/env tsx
// Backfill missing avatarUrl values for existing content sources
// This script fetches channel metadata for sources that don't have an avatarUrl

import { db } from '../lib/db';
import { getAdapters } from '../lib/adapters';
import { createLogger } from '../lib/logger';

const log = createLogger('backfill-avatars');

async function backfillAvatarUrls() {
  log.info('Starting avatarUrl backfill...');

  try {
    // Get all sources without an avatarUrl
    const sourcesWithoutAvatar = await db.contentSource.findMany({
      where: {
        avatarUrl: null,
      },
    });

    if (sourcesWithoutAvatar.length === 0) {
      log.info('No sources need avatarUrl backfill');
      return;
    }

    log.info({ count: sourcesWithoutAvatar.length }, 'Found sources without avatarUrl');

    const adapters = getAdapters();
    let updated = 0;
    let failed = 0;

    for (const source of sourcesWithoutAvatar) {
      try {
        const adapter = adapters.get(source.type as any);
        if (!adapter) {
          log.warn({ sourceId: source.id, type: source.type }, 'No adapter for source type');
          failed++;
          continue;
        }

        // Validate source to get metadata including avatarUrl
        const validation = await adapter.validateSource(source.sourceId);

        if (!validation.isValid || !validation.avatarUrl) {
          log.warn(
            { sourceId: source.id, displayName: source.displayName },
            'Could not fetch avatarUrl for source'
          );
          failed++;
          continue;
        }

        // Update source with avatarUrl
        await db.contentSource.update({
          where: { id: source.id },
          data: { avatarUrl: validation.avatarUrl },
        });

        log.info(
          { sourceId: source.id, displayName: source.displayName },
          'Updated avatarUrl'
        );
        updated++;
      } catch (error) {
        log.error(
          { error, sourceId: source.id, displayName: source.displayName },
          'Failed to update avatarUrl'
        );
        failed++;
      }
    }

    log.info({ updated, failed, total: sourcesWithoutAvatar.length }, 'Backfill complete');
  } catch (error) {
    log.error({ error }, 'Backfill failed');
    throw error;
  } finally {
    await db.$disconnect();
  }
}

// Run the script
backfillAvatarUrls()
  .then(() => {
    log.info('Backfill script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    log.error({ error }, 'Backfill script failed');
    process.exit(1);
  });
