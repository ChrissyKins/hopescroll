#!/usr/bin/env tsx
// Test yt-dlp validation specifically

import { YtDlpClient } from '../adapters/content/youtube/yt-dlp-client';

async function testYtDlpValidation() {
  console.log('🧪 Testing yt-dlp channel validation...\n');

  const client = new YtDlpClient();

  // Test with a channel ID from YouTube API search results
  const testChannelId = 'UCIrJAHqF8XMlpeQGGarknoQ'; // PewDiePie. (from search)

  console.log('Test 1: Resolving channel ID from search results...');
  console.log(`   Input: ${testChannelId}`);

  const resolvedId = await client.resolveChannelId(testChannelId);

  if (resolvedId) {
    console.log(`✅ Resolved to: ${resolvedId}\n`);
  } else {
    console.error(`❌ Failed to resolve channel ID\n`);
    process.exit(1);
  }

  console.log('Test 2: Getting channel metadata...');
  try {
    const metadata = await client.getChannelMetadata(resolvedId);
    console.log(`✅ Channel metadata retrieved:`);
    console.log(`   Title: ${metadata.title}`);
    console.log(`   Channel ID: ${metadata.channel_id}\n`);
  } catch (error) {
    console.error(`❌ Failed to get metadata:`, error);
    process.exit(1);
  }

  console.log('🎉 All yt-dlp validation tests passed!');
}

testYtDlpValidation().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
