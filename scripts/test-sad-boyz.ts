#!/usr/bin/env tsx
// Test script to debug the Sad Boyz channel fetch issue

import { YtDlpClient } from '../adapters/content/youtube/yt-dlp-client';
import { ENV } from '../lib/config';

const SAD_BOYZ_CHANNEL_ID = 'UCsv_tpDUp-atfn-zzcsGyIg';

async function test() {
  console.log('Testing Sad Boyz channel fetch...');
  console.log('Service URL:', ENV.ytDlpServiceUrl);
  console.log('Channel ID:', SAD_BOYZ_CHANNEL_ID);
  console.log('');

  const client = new YtDlpClient();

  try {
    console.log('1. Testing service health...');
    const isAvailable = await client.isServiceAvailable();
    console.log('   Service available:', isAvailable);
    console.log('');

    console.log('2. Fetching channel videos...');
    const videos = await client.getChannelVideos(SAD_BOYZ_CHANNEL_ID, { limit: 5 });
    console.log(`   ✅ Success! Got ${videos.length} videos`);
    console.log('');

    if (videos.length > 0) {
      console.log('   First video:');
      console.log('   - ID:', videos[0].id);
      console.log('   - Title:', videos[0].title);
      console.log('   - Duration:', videos[0].duration, 'seconds');
    }
  } catch (error) {
    console.error('❌ Error occurred:');
    console.error('   Type:', error?.constructor?.name);
    console.error('   Message:', error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      console.error('   Stack:', error.stack.split('\n').slice(0, 5).join('\n'));
    }
    console.error('   Full error object:', JSON.stringify(error, null, 2));
  }
}

test();
