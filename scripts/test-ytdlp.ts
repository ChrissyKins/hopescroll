#!/usr/bin/env tsx
// Quick test to verify yt-dlp is working properly
// Usage: npx tsx scripts/test-ytdlp.ts

import { YtDlpClient } from '../adapters/content/youtube/yt-dlp-client';

async function testYtDlp() {
  console.log('🧪 Testing yt-dlp integration...\n');

  const client = new YtDlpClient();

  try {
    // Test 1: Fetch recent videos first (faster)
    console.log('Test 1: Fetching recent videos (limit: 5)...');
    const channelId = 'UC-lHJZR3Gqxm24_Vd_AJ5Yw'; // PewDiePie (large, stable channel)
    const videos = await client.getChannelVideos(channelId, { limit: 5 });
    console.log(`✅ Retrieved ${videos.length} videos:`);
    videos.slice(0, 3).forEach((video, i) => {
      console.log(`   ${i + 1}. ${video.title}`);
    });
    console.log('');

    // Test 2: Fetch channel metadata
    console.log('Test 2: Fetching channel metadata...');
    const channelInfo = await client.getChannelMetadata(channelId);
    console.log('✅ Channel info retrieved:');
    console.log(`   - Title: ${channelInfo.title}`);
    console.log(`   - Channel ID: ${channelInfo.channel_id}`);
    console.log(`   - Subscriber count: ${channelInfo.subscriber_count?.toLocaleString() || 'N/A'}\n`);

    // Test 3: Validate channel by handle
    console.log('Test 3: Resolving channel by handle...');
    const validatedId = await client.resolveChannelId('@PewDiePie');
    console.log(`✅ Handle @PewDiePie resolved to: ${validatedId}\n`);

    console.log('🎉 All tests passed! yt-dlp is working correctly.\n');
    console.log('💡 To use yt-dlp in production:');
    console.log('   1. Set USE_YT_DLP=true in your .env file');
    console.log('   2. Optionally remove YOUTUBE_API_KEY to force yt-dlp usage');
    console.log('   3. Restart your development server\n');

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('\n🔧 Troubleshooting:');
    console.error('   1. Check yt-dlp is installed: yt-dlp --version');
    console.error('   2. Try updating yt-dlp: pip install -U yt-dlp');
    console.error('   3. Check network connectivity');
    process.exit(1);
  }
}

testYtDlp();
