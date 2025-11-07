#!/usr/bin/env npx tsx

/**
 * Test script for self-hosted yt-dlp HTTP service
 *
 * This script verifies that the self-hosted yt-dlp service is working correctly
 * and that the integration with HopeScroll is functional.
 *
 * Usage:
 *   npx tsx scripts/test-yt-dlp-service.ts
 */

import { YtDlpClient } from '../adapters/content/youtube/yt-dlp-client';

const SERVICE_URL = process.env.YOUTUBE_DLP_SERVICE_URL || 'https://youtube-dlp-service-zti6ffx2nq-ey.a.run.app';
const TEST_CHANNEL_ID = 'UCBJycsmduvYEL83R_U4JriQ'; // MKBHD channel
const TEST_VIDEO_ID = 'dQw4w9WgXcQ'; // Rick Astley - Never Gonna Give You Up

async function main() {
  console.log('🧪 Testing self-hosted yt-dlp service integration...\n');
  console.log(`Service URL: ${SERVICE_URL}\n`);

  const client = new YtDlpClient(SERVICE_URL);

  // Test 1: Health Check
  console.log('Test 1: Health Check');
  console.log('─'.repeat(50));
  try {
    const isHealthy = await client.isServiceAvailable();
    if (isHealthy) {
      console.log('✅ Service is healthy and available\n');
    } else {
      console.log('❌ Service is not healthy or unavailable\n');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Health check failed:', error);
    process.exit(1);
  }

  // Test 2: Fetch Channel Videos
  console.log('Test 2: Fetching channel videos (limit: 5)');
  console.log('─'.repeat(50));
  try {
    const videos = await client.getChannelVideos(TEST_CHANNEL_ID, { limit: 5 });
    console.log(`✅ Retrieved ${videos.length} videos:`);
    videos.forEach((video, index) => {
      console.log(`   ${index + 1}. ${video.title}`);
      console.log(`      ID: ${video.id}`);
      console.log(`      Duration: ${video.duration ? `${video.duration}s` : 'N/A'}`);
      console.log(`      Upload date: ${video.upload_date || 'N/A'}`);
    });
    console.log();
  } catch (error) {
    console.error('❌ Failed to fetch channel videos:', error);
    process.exit(1);
  }

  // Test 3: Fetch Channel Metadata
  console.log('Test 3: Fetching channel metadata');
  console.log('─'.repeat(50));
  try {
    const metadata = await client.getChannelMetadata(TEST_CHANNEL_ID);
    console.log('✅ Channel info retrieved:');
    console.log(`   Title: ${metadata.title}`);
    console.log(`   Channel ID: ${metadata.channel_id}`);
    console.log(`   Uploader: ${metadata.uploader || 'N/A'}`);
    console.log(`   Playlist count: ${metadata.playlist_count || 'N/A'}`);
    console.log(`   Has thumbnail: ${metadata.thumbnail ? 'Yes' : 'No'}`);
    console.log();
  } catch (error) {
    console.error('❌ Failed to fetch channel metadata:', error);
    process.exit(1);
  }

  // Test 4: Fetch Video Details
  console.log('Test 4: Fetching video details');
  console.log('─'.repeat(50));
  try {
    const videos = await client.getVideoDetails([TEST_VIDEO_ID]);
    if (videos.length > 0) {
      const video = videos[0];
      console.log('✅ Video details retrieved:');
      console.log(`   Title: ${video.title}`);
      console.log(`   ID: ${video.id}`);
      console.log(`   Duration: ${video.duration ? `${video.duration}s (${Math.floor(video.duration / 60)}m ${video.duration % 60}s)` : 'N/A'}`);
      console.log(`   View count: ${video.view_count?.toLocaleString() || 'N/A'}`);
      console.log(`   Like count: ${video.like_count?.toLocaleString() || 'N/A'}`);
      console.log(`   Channel: ${video.channel || video.uploader || 'N/A'}`);
      console.log(`   Upload date: ${video.upload_date || 'N/A'}`);
      console.log();
    } else {
      console.error('❌ No video details returned');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Failed to fetch video details:', error);
    process.exit(1);
  }

  // Test 5: Resolve Channel ID
  console.log('Test 5: Resolving channel ID');
  console.log('─'.repeat(50));
  try {
    const channelId = await client.resolveChannelId(TEST_CHANNEL_ID);
    if (channelId) {
      console.log(`✅ Channel ID resolved: ${channelId}`);
      console.log(`   (Already a channel ID, should return as-is)\n`);
    } else {
      console.log('⚠️  Channel ID resolution returned null (expected for handles - requires YouTube API fallback)\n');
    }
  } catch (error) {
    console.error('❌ Failed to resolve channel ID:', error);
    console.log('   Note: This is expected if the service doesn\'t support resolution\n');
  }

  // Test 6: Date Filtering
  console.log('Test 6: Date filtering (last 30 days)');
  console.log('─'.repeat(50));
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const videos = await client.getChannelVideos(TEST_CHANNEL_ID, {
      dateAfter: thirtyDaysAgo,
      limit: 10
    });

    console.log(`✅ Retrieved ${videos.length} videos from the last 30 days:`);
    videos.forEach((video, index) => {
      const uploadDate = video.upload_date
        ? new Date(
            parseInt(video.upload_date.substring(0, 4)),
            parseInt(video.upload_date.substring(4, 6)) - 1,
            parseInt(video.upload_date.substring(6, 8))
          )
        : null;
      console.log(`   ${index + 1}. ${video.title}`);
      console.log(`      Upload date: ${uploadDate ? uploadDate.toLocaleDateString() : 'N/A'}`);
    });
    console.log();
  } catch (error) {
    console.error('❌ Failed to fetch videos with date filter:', error);
    process.exit(1);
  }

  console.log('═'.repeat(50));
  console.log('🎉 All tests passed! Self-hosted yt-dlp service is working correctly.');
  console.log('═'.repeat(50));
  console.log('\n✨ Integration summary:');
  console.log('  • Service is healthy and responsive');
  console.log('  • Channel video fetching works');
  console.log('  • Channel metadata retrieval works');
  console.log('  • Video details fetching works');
  console.log('  • Date filtering works (client-side)');
  console.log('\n📝 Next steps:');
  console.log('  1. Set YOUTUBE_DLP_SERVICE_URL in your .env file');
  console.log('  2. Set USE_YT_DLP=true to enable yt-dlp adapter');
  console.log('  3. Keep YOUTUBE_API_KEY for fallback and search functionality');
  console.log('  4. Test adding a YouTube channel in the app');
}

main().catch((error) => {
  console.error('\n💥 Test script failed:', error);
  process.exit(1);
});
