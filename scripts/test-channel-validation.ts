#!/usr/bin/env tsx
// Test channel validation to debug "Channel not found" error

import { getAdapters } from '../lib/adapters';

async function testChannelValidation() {
  console.log('🧪 Testing channel validation...\n');

  const adapters = getAdapters();
  const youtubeAdapter = adapters.get('YOUTUBE');

  if (!youtubeAdapter) {
    console.error('❌ YouTube adapter not available');
    console.error('   Make sure YOUTUBE_API_KEY or USE_YT_DLP=true is set in .env');
    process.exit(1);
  }

  // Test 1: Search for a channel
  console.log('Test 1: Searching for "PewDiePie"...');
  const searchResults = await (youtubeAdapter as any).searchChannels('PewDiePie');

  if (searchResults.length === 0) {
    console.error('❌ No search results found');
    process.exit(1);
  }

  const firstResult = searchResults[0];
  console.log(`✅ Found channel: ${firstResult.displayName}`);
  console.log(`   Channel ID: ${firstResult.channelId}`);
  console.log(`   Subscribers: ${firstResult.subscriberCount?.toLocaleString() || 'N/A'}\n`);

  // Test 2: Validate the channel ID from search results
  console.log('Test 2: Validating channel ID from search results...');
  console.log(`   Validating: ${firstResult.channelId}`);

  const validation = await youtubeAdapter.validateSource(firstResult.channelId);

  if (validation.isValid) {
    console.log(`✅ Channel validation successful!`);
    console.log(`   Display Name: ${validation.displayName}`);
    console.log(`   Resolved ID: ${validation.resolvedId}`);
    console.log(`   Avatar URL: ${validation.avatarUrl?.substring(0, 50)}...\n`);
  } else {
    console.error(`❌ Channel validation failed!`);
    console.error(`   Error: ${validation.errorMessage}\n`);

    // Additional debugging
    console.log('🔍 Debugging info:');
    console.log(`   Input starts with 'UC': ${firstResult.channelId.startsWith('UC')}`);
    console.log(`   Input length: ${firstResult.channelId.length}`);
    console.log(`   Input value: "${firstResult.channelId}"`);

    process.exit(1);
  }

  // Test 3: Try with a handle
  console.log('Test 3: Validating with @handle...');
  const handleValidation = await youtubeAdapter.validateSource('@PewDiePie');

  if (handleValidation.isValid) {
    console.log(`✅ Handle validation successful!`);
    console.log(`   Display Name: ${handleValidation.displayName}`);
    console.log(`   Resolved ID: ${handleValidation.resolvedId}\n`);
  } else {
    console.error(`❌ Handle validation failed: ${handleValidation.errorMessage}\n`);
  }

  console.log('🎉 All validation tests passed!');
}

testChannelValidation().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
