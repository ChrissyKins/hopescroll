// Test script for yt-dlp hybrid search integration
// Run with: npx tsx scripts/test-yt-dlp-search.ts

import { YtDlpClient } from '../adapters/content/youtube/yt-dlp-client';
import { YtDlpAdapter } from '../adapters/content/youtube/yt-dlp-adapter';
import { YouTubeClient } from '../adapters/content/youtube/youtube-client';
import { ENV } from '../lib/config';

async function main() {
  console.log('🧪 Testing yt-dlp hybrid search integration...\n');

  const ytDlpClient = new YtDlpClient();

  // Test with YouTube API key if available
  if (!ENV.youtubeApiKey) {
    console.log('⚠️  YOUTUBE_API_KEY not set - skipping search test');
    console.log('   Set YOUTUBE_API_KEY environment variable to test search functionality\n');
    return;
  }

  const youtubeClient = new YouTubeClient(ENV.youtubeApiKey);
  const adapter = new YtDlpAdapter(ytDlpClient, youtubeClient);

  // Test: Search for channels
  console.log('📍 Test: Search for channels (hybrid mode)');
  const searchQuery = 'Fireship';
  console.log(`   Query: "${searchQuery}"`);

  const results = await adapter.searchChannels(searchQuery);
  console.log(`   Results: ${results.length} channels found\n`);

  if (results.length > 0) {
    console.log('   Top 3 results:');
    results.slice(0, 3).forEach((channel, index) => {
      console.log(`   ${index + 1}. ${channel.displayName}`);
      console.log(`      Channel ID: ${channel.channelId}`);
      console.log(`      Subscribers: ${channel.subscriberCount?.toLocaleString() || 'N/A'}`);
      console.log(`      Description: ${channel.description.substring(0, 80)}...`);
      console.log('');
    });
  }

  console.log('✅ Search test completed!');
  console.log('\n📊 Hybrid Mode Benefits:');
  console.log('   - Channel search: YouTube API (~100 quota units/search)');
  console.log('   - Video fetching: yt-dlp (0 quota units)');
  console.log('   - Best of both worlds! 🎉');
}

main().catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
