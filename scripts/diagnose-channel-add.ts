#!/usr/bin/env tsx
// Diagnostic script to trace through the full channel add flow

import { PrismaClient } from '@prisma/client';
import { YtDlpClient } from '../adapters/content/youtube/yt-dlp-client';
import { YtDlpAdapter } from '../adapters/content/youtube/yt-dlp-adapter';
import { ContentService } from '../services/content-service';
import { ENV } from '../lib/config';
import { createLogger } from '../lib/logger';

const log = createLogger('diagnose-channel-add');
const SAD_BOYZ_CHANNEL_ID = 'UCsv_tpDUp-atfn-zzcsGyIg';
const TEST_USER_ID = 'test-user-diagnostic';

async function main() {
  const db = new PrismaClient();

  try {
    console.log('=== CHANNEL ADD DIAGNOSTIC ===\n');
    console.log(`Channel: Sad Boyz (${SAD_BOYZ_CHANNEL_ID})`);
    console.log(`yt-dlp Service URL: ${ENV.ytDlpServiceUrl}`);
    console.log('');

    // Step 1: Test service health
    console.log('1. Testing yt-dlp service health...');
    const ytDlpClient = new YtDlpClient();
    const isAvailable = await ytDlpClient.isServiceAvailable();
    console.log(`   ✓ Service available: ${isAvailable}`);
    if (!isAvailable) {
      throw new Error('yt-dlp service is not available');
    }
    console.log('');

    // Step 2: Validate the channel
    console.log('2. Validating channel...');
    const adapter = new YtDlpAdapter(ytDlpClient);
    const validation = await adapter.validateSource(SAD_BOYZ_CHANNEL_ID);
    console.log(`   ✓ Valid: ${validation.isValid}`);
    if (validation.isValid) {
      console.log(`   ✓ Display name: ${validation.displayName}`);
      console.log(`   ✓ Resolved ID: ${validation.resolvedId}`);
    } else {
      console.log(`   ✗ Error: ${validation.errorMessage}`);
      throw new Error('Channel validation failed');
    }
    console.log('');

    // Step 3: Get or create test user
    console.log('3. Getting or creating test user...');
    let testUser = await db.user.findFirst({
      where: { email: 'test@hopescroll.com' },
    });

    if (!testUser) {
      testUser = await db.user.create({
        data: {
          email: 'test@hopescroll.com',
          password: 'test-password-hash',
        },
      });
      console.log(`   ✓ Created test user: ${testUser.id}`);
    } else {
      console.log(`   ✓ Using existing test user: ${testUser.id}`);
    }
    console.log('');

    // Step 4: Create test source
    console.log('4. Creating test source in database...');

    // Clean up any existing test source for this channel
    await db.contentSource.deleteMany({
      where: {
        userId: testUser.id,
        sourceId: SAD_BOYZ_CHANNEL_ID,
      },
    });

    const source = await db.contentSource.create({
      data: {
        userId: testUser.id,
        type: 'YOUTUBE',
        sourceId: SAD_BOYZ_CHANNEL_ID,
        displayName: validation.displayName || 'Sad Boyz',
        avatarUrl: validation.avatarUrl,
        isMuted: false,
        alwaysSafe: false,
        lastFetchStatus: 'pending',
      },
    });
    console.log(`   ✓ Source created: ${source.id}`);
    console.log('');

    // Step 5: Simulate background fetch
    console.log('5. Starting background content fetch...');
    const adapters = new Map();
    adapters.set('YOUTUBE', adapter);
    const contentService = new ContentService(db, adapters);

    try {
      const newItemsCount = await contentService.fetchSource(source.id);
      console.log(`   ✓ Fetch completed successfully!`);
      console.log(`   ✓ New items: ${newItemsCount}`);
    } catch (error) {
      console.error(`   ✗ Fetch failed:`, error);
      throw error;
    }
    console.log('');

    // Step 6: Check final source state
    console.log('6. Checking final source state...');
    const finalSource = await db.contentSource.findUnique({
      where: { id: source.id },
    });

    if (finalSource) {
      console.log(`   Status: ${finalSource.lastFetchStatus}`);
      console.log(`   Error message: ${finalSource.errorMessage || 'none'}`);
      console.log(`   Backlog complete: ${finalSource.backlogComplete}`);
      console.log(`   Backlog video count: ${finalSource.backlogVideoCount}`);
      console.log(`   Backlog page token: ${finalSource.backlogPageToken || 'none'}`);
    }
    console.log('');

    // Step 7: Check videos in database
    console.log('7. Checking videos in database...');
    const videoCount = await db.contentItem.count({
      where: {
        sourceType: 'YOUTUBE',
        sourceId: SAD_BOYZ_CHANNEL_ID,
      },
    });
    console.log(`   ✓ Total videos in DB: ${videoCount}`);
    console.log('');

    // Cleanup
    console.log('8. Cleaning up test data...');
    await db.contentItem.deleteMany({
      where: {
        sourceType: 'YOUTUBE',
        sourceId: SAD_BOYZ_CHANNEL_ID,
      },
    });
    await db.contentSource.delete({
      where: { id: source.id },
    });
    console.log('   ✓ Cleanup complete');
    console.log('');

    console.log('=== DIAGNOSTIC COMPLETE ===');
    console.log('All steps passed successfully!');
  } catch (error) {
    console.error('\n❌ DIAGNOSTIC FAILED:');
    console.error(error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

main();
