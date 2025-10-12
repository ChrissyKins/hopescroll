// Manual test script for YouTube adapter
// Run with: npx tsx scripts/test-youtube.ts

import * as dotenv from 'dotenv';
dotenv.config();

import { YouTubeClient } from '../adapters/content/youtube/youtube-client';
import { YouTubeAdapter } from '../adapters/content/youtube/youtube-adapter';
import { ENV } from '../lib/config';

async function testYouTubeIntegration() {
  console.log('Testing YouTube API integration...\n');

  // Debug: check what we're getting
  const apiKey = process.env.YOUTUBE_API_KEY || ENV.youtubeApiKey;
  console.log('API Key found:', apiKey ? 'Yes' : 'No');

  if (!apiKey) {
    console.error('❌ YOUTUBE_API_KEY not configured in .env');
    console.log('Add your YouTube API key to .env:');
    console.log('YOUTUBE_API_KEY=your_api_key_here');
    process.exit(1);
  }

  const client = new YouTubeClient(apiKey);
  const adapter = new YouTubeAdapter(client);

  // Test with a known channel (Veritasium - educational science channel)
  const testChannelId = 'UCHnyfMqiRRG1u-2MsSQLbXA';

  try {
    console.log('1. Validating channel...');
    const validation = await adapter.validateSource(testChannelId);
    console.log('✅ Validation result:', validation);

    if (!validation.isValid) {
      console.error('❌ Channel validation failed');
      process.exit(1);
    }

    console.log('\n2. Fetching channel metadata...');
    const metadata = await adapter.getSourceMetadata(testChannelId);
    console.log('✅ Metadata:', {
      displayName: metadata.displayName,
      subscriberCount: metadata.subscriberCount,
      totalContent: metadata.totalContent,
    });

    console.log('\n3. Fetching recent videos (last 7 days)...');
    const recentVideos = await adapter.fetchRecent(testChannelId, 7);
    console.log(`✅ Found ${recentVideos.length} recent videos`);

    if (recentVideos.length > 0) {
      const video = recentVideos[0];
      console.log('\nFirst video:');
      console.log('  Title:', video.title);
      console.log('  Duration:', video.duration, 'seconds');
      console.log('  Published:', video.publishedAt.toISOString());
      console.log('  URL:', video.url);
    }

    console.log('\n✅ All YouTube integration tests passed!');
  } catch (error) {
    console.error('\n❌ YouTube integration test failed:');
    console.error(error);
    process.exit(1);
  }
}

testYouTubeIntegration();
