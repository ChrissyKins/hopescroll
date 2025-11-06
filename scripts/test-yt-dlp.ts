// Test script for yt-dlp integration
// Run with: npx tsx scripts/test-yt-dlp.ts

import { YtDlpClient } from '../adapters/content/youtube/yt-dlp-client';
import { YtDlpAdapter } from '../adapters/content/youtube/yt-dlp-adapter';

async function main() {
  console.log('🧪 Testing yt-dlp integration...\n');

  // Test channel: Fireship (UCsBjURrPoezykLs9EqgamOA)
  const testChannelId = 'UCsBjURrPoezykLs9EqgamOA';
  const testChannelHandle = '@Fireship';

  const client = new YtDlpClient();
  const adapter = new YtDlpAdapter(client);

  // Test 1: Resolve channel ID from handle
  console.log('📍 Test 1: Resolve channel ID from handle');
  console.log(`   Input: ${testChannelHandle}`);
  const resolvedId = await client.resolveChannelId(testChannelHandle);
  console.log(`   Resolved ID: ${resolvedId}`);
  console.log(`   ✓ Pass: ${resolvedId === testChannelId}\n`);

  // Test 2: Get channel metadata
  console.log('📍 Test 2: Get channel metadata');
  const metadata = await adapter.getSourceMetadata(testChannelId);
  console.log(`   Display Name: ${metadata.displayName}`);
  console.log(`   Subscriber Count: ${metadata.subscriberCount?.toLocaleString() || 'N/A'}`);
  console.log(`   Has Avatar: ${!!metadata.avatarUrl}`);
  console.log(`   ✓ Pass\n`);

  // Test 3: Validate source
  console.log('📍 Test 3: Validate source');
  const validation = await adapter.validateSource(testChannelHandle);
  console.log(`   Is Valid: ${validation.isValid}`);
  console.log(`   Display Name: ${validation.displayName}`);
  console.log(`   Resolved ID: ${validation.resolvedId}`);
  console.log(`   ✓ Pass\n`);

  // Test 4: Fetch recent videos (last 7 days)
  console.log('📍 Test 4: Fetch recent videos (last 7 days)');
  const recentVideos = await adapter.fetchRecent(testChannelId, 7);
  console.log(`   Fetched: ${recentVideos.length} videos`);
  if (recentVideos.length > 0) {
    const video = recentVideos[0];
    console.log(`   Example video:`);
    console.log(`     - Title: ${video.title}`);
    console.log(`     - Duration: ${video.duration ? `${video.duration}s` : 'N/A'}`);
    console.log(`     - Published: ${video.publishedAt.toLocaleDateString()}`);
    console.log(`     - URL: ${video.url}`);
  }
  console.log(`   ✓ Pass\n`);

  // Test 5: Fetch backlog (first page)
  console.log('📍 Test 5: Fetch backlog (first page, limit 10)');
  const backlog = await adapter.fetchBacklog(testChannelId, 10);
  console.log(`   Fetched: ${backlog.items.length} videos`);
  console.log(`   Has More: ${backlog.hasMore}`);
  console.log(`   Next Page Token: ${backlog.nextPageToken || 'N/A'}`);
  if (backlog.items.length > 0) {
    const video = backlog.items[0];
    console.log(`   Example video:`);
    console.log(`     - Title: ${video.title}`);
    console.log(`     - Duration: ${video.duration ? `${video.duration}s` : 'N/A'}`);
    console.log(`     - Published: ${video.publishedAt.toLocaleDateString()}`);
  }
  console.log(`   ✓ Pass\n`);

  console.log('✅ All tests passed!');
}

main().catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
