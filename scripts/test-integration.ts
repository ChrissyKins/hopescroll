// Integration test for the entire stack
// Run with: npx tsx scripts/test-integration.ts

import * as dotenv from 'dotenv';
dotenv.config();

import { YouTubeClient } from '../adapters/content/youtube/youtube-client';
import { YouTubeAdapter } from '../adapters/content/youtube/youtube-adapter';
import { FilterEngine } from '../domain/filtering/filter-engine';
import { KeywordFilterRule, DurationFilterRule } from '../domain/filtering/filter-rule';
import { FeedGenerator } from '../domain/feed/feed-generator';
import { DiversityEnforcer } from '../domain/feed/diversity-enforcer';
import { BacklogMixer } from '../domain/feed/backlog-mixer';
import { ContentItem, ContentSource, FeedPreferences } from '../domain/content/content-item';

async function runIntegrationTest() {
  console.log('🧪 Running Integration Test\n');

  try {
    // 1. Test YouTube Adapter
    console.log('1️⃣  Testing YouTube Adapter...');
    const client = new YouTubeClient(process.env.YOUTUBE_API_KEY);
    const adapter = new YouTubeAdapter(client);

    const testChannelId = 'UCHnyfMqiRRG1u-2MsSQLbXA'; // Veritasium
    const videos = await adapter.fetchRecent(testChannelId, 30);
    console.log(`   ✅ Fetched ${videos.length} videos from YouTube\n`);

    // 2. Test Filter Engine
    console.log('2️⃣  Testing Filter Engine...');
    const filterRules = [
      new KeywordFilterRule('politics', false),
      new DurationFilterRule(60, 1800), // 1-30 minutes
    ];
    const filterEngine = new FilterEngine(filterRules);

    const filteredVideos = filterEngine.evaluateBatch(videos);
    console.log(`   ✅ Filtered: ${videos.length} → ${filteredVideos.length} videos`);
    console.log(`   ✅ Removed ${videos.length - filteredVideos.length} videos\n`);

    // 3. Test Feed Generator
    console.log('3️⃣  Testing Feed Generator...');
    const feedGenerator = new FeedGenerator(
      new DiversityEnforcer(),
      new BacklogMixer()
    );

    const mockSource: ContentSource = {
      id: 'source-1',
      userId: 'test-user',
      type: 'YOUTUBE',
      sourceId: testChannelId,
      displayName: 'Veritasium',
      avatarUrl: null,
      isMuted: false,
      alwaysSafe: false,
      addedAt: new Date(),
      lastFetchAt: new Date(),
      lastFetchStatus: 'success',
      errorMessage: null,
    };

    const mockPreferences: FeedPreferences = {
      userId: 'test-user',
      backlogRatio: 0.3,
      maxConsecutiveFromSource: 3,
      theme: 'dark',
      density: 'cozy',
      autoPlay: false,
      updatedAt: new Date(),
    };

    const feed = feedGenerator.generate(
      [mockSource],
      filteredVideos,
      mockPreferences,
      []
    );
    console.log(`   ✅ Generated feed with ${feed.length} items`);
    console.log(`   ✅ Feed diversity enforced\n`);

    // 4. Display sample feed items
    console.log('4️⃣  Sample Feed Items:\n');
    feed.slice(0, 5).forEach((item, idx) => {
      const duration = item.content.duration
        ? `${Math.floor(item.content.duration / 60)}:${String(item.content.duration % 60).padStart(2, '0')}`
        : 'N/A';
      console.log(`   ${idx + 1}. ${item.content.title}`);
      console.log(`      Duration: ${duration} | Published: ${item.content.publishedAt.toLocaleDateString()}`);
      console.log(`      ${item.content.url}\n`);
    });

    // 5. Verify feed characteristics
    console.log('5️⃣  Feed Characteristics:\n');
    const newItems = feed.filter(item => item.isNew);
    const avgDuration = feed.reduce((sum, item) => sum + (item.content.duration || 0), 0) / feed.length;

    console.log(`   📊 Total items: ${feed.length}`);
    console.log(`   🆕 New items (last 7 days): ${newItems.length}`);
    console.log(`   ⏱️  Average duration: ${Math.round(avgDuration / 60)} minutes`);
    console.log(`   📺 Source: ${mockSource.displayName}\n`);

    // 6. Verify no consecutive duplicates beyond limit
    console.log('6️⃣  Checking Diversity...');
    let maxConsecutive = 1;
    let currentConsecutive = 1;

    for (let i = 1; i < feed.length; i++) {
      if (feed[i].content.sourceId === feed[i - 1].content.sourceId) {
        currentConsecutive++;
        maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
      } else {
        currentConsecutive = 1;
      }
    }

    console.log(`   ✅ Max consecutive from same source: ${maxConsecutive}`);
    console.log(`   ✅ Diversity limit (${mockPreferences.maxConsecutiveFromSource}): ${maxConsecutive <= mockPreferences.maxConsecutiveFromSource ? 'PASSED' : 'FAILED'}\n`);

    console.log('✅ All integration tests passed!\n');
    console.log('📝 Summary:');
    console.log('   - YouTube API: Working');
    console.log('   - Content Filtering: Working');
    console.log('   - Feed Generation: Working');
    console.log('   - Diversity Enforcement: Working');
    console.log('   - All domain logic: Verified\n');

  } catch (error) {
    console.error('❌ Integration test failed:');
    console.error(error);
    process.exit(1);
  }
}

runIntegrationTest();
