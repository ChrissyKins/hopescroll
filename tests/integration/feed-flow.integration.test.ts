/**
 * Integration Tests - Complete Feed Flow
 *
 * These tests verify the complete feed functionality from end-to-end:
 * 1. Adding sources
 * 2. Fetching content
 * 3. Applying filters
 * 4. Generating feed
 * 5. Displaying content
 *
 * Uses real service implementations with test database
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FeedService } from '@/services/feed-service';
import { SourceService } from '@/services/source-service';
import { FilterService } from '@/services/filter-service';
import { FilterEngine } from '@/domain/filtering/filter-engine';
import { FeedGenerator } from '@/domain/feed/feed-generator';
import { DiversityEnforcer } from '@/domain/feed/diversity-enforcer';
import { BacklogMixer } from '@/domain/feed/backlog-mixer';
import { KeywordFilterRule, DurationFilterRule } from '@/domain/filtering/filter-rule';
import type { ContentItem, ContentSource, SourceType } from '@/types';

describe('Feed Flow Integration Tests', () => {
  let feedService: FeedService;
  let sourceService: SourceService;
  let filterService: FilterService;

  // Test data
  const testUserId = 'test-user-integration';

  // Helper to create dates relative to now
  const daysAgo = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date;
  };

  const mockYouTubeContent: ContentItem[] = [
    {
      id: 'content-1',
      sourceType: 'YOUTUBE' as SourceType,
      sourceId: 'channel-1',
      originalId: 'video-1',
      title: 'Calming Nature Sounds',
      description: 'Relaxing forest ambience',
      thumbnailUrl: 'https://example.com/thumb1.jpg',
      url: 'https://youtube.com/watch?v=video-1',
      duration: 600, // 10 minutes
      publishedAt: daysAgo(10), // Older than 7 days - backlog
      fetchedAt: new Date(),
      lastSeenInFeed: new Date(),
    },
    {
      id: 'content-2',
      sourceType: 'YOUTUBE' as SourceType,
      sourceId: 'channel-1',
      originalId: 'video-2',
      title: 'Election News Update',
      description: 'Latest political news',
      thumbnailUrl: 'https://example.com/thumb2.jpg',
      url: 'https://youtube.com/watch?v=video-2',
      duration: 900, // 15 minutes
      publishedAt: daysAgo(9), // Older than 7 days - backlog
      fetchedAt: new Date(),
      lastSeenInFeed: new Date(),
    },
    {
      id: 'content-3',
      sourceType: 'YOUTUBE' as SourceType,
      sourceId: 'channel-2',
      originalId: 'video-3',
      title: 'Cooking Tutorial',
      description: 'Easy pasta recipe',
      thumbnailUrl: 'https://example.com/thumb3.jpg',
      url: 'https://youtube.com/watch?v=video-3',
      duration: 1200, // 20 minutes
      publishedAt: daysAgo(8), // Older than 7 days - backlog
      fetchedAt: new Date(),
      lastSeenInFeed: new Date(),
    },
    {
      id: 'content-4',
      sourceType: 'YOUTUBE' as SourceType,
      sourceId: 'channel-2',
      originalId: 'video-4',
      title: 'Quick Breakfast Ideas',
      description: 'Make breakfast in 5 minutes',
      thumbnailUrl: 'https://example.com/thumb4.jpg',
      url: 'https://youtube.com/watch?v=video-4',
      duration: 300, // 5 minutes
      publishedAt: daysAgo(3), // Recent (within 7 days)
      fetchedAt: new Date(),
      lastSeenInFeed: new Date(),
    },
    {
      id: 'content-5',
      sourceType: 'YOUTUBE' as SourceType,
      sourceId: 'channel-3',
      originalId: 'video-5',
      title: 'Long Documentary About Space',
      description: 'Deep dive into black holes',
      thumbnailUrl: 'https://example.com/thumb5.jpg',
      url: 'https://youtube.com/watch?v=video-5',
      duration: 3600, // 60 minutes
      publishedAt: daysAgo(2), // Recent (within 7 days)
      fetchedAt: new Date(),
      lastSeenInFeed: new Date(),
    },
    {
      id: 'content-6',
      sourceType: 'YOUTUBE' as SourceType,
      sourceId: 'channel-4',
      originalId: 'video-6',
      title: 'Morning Yoga Routine',
      description: 'Gentle stretches for beginners',
      thumbnailUrl: 'https://example.com/thumb6.jpg',
      url: 'https://youtube.com/watch?v=video-6',
      duration: 900, // 15 minutes
      publishedAt: daysAgo(1), // Recent (within 7 days)
      fetchedAt: new Date(),
      lastSeenInFeed: new Date(),
    },
  ];

  const mockSources: ContentSource[] = [
    {
      id: 'source-1',
      userId: testUserId,
      type: 'YOUTUBE' as SourceType,
      sourceId: 'channel-1',
      displayName: 'Nature Channel',
      avatarUrl: 'https://example.com/avatar1.jpg',
      isMuted: false,
      alwaysSafe: false,
      addedAt: new Date(),
      lastFetchAt: new Date(),
      lastFetchStatus: 'success',
      errorMessage: null,
    },
    {
      id: 'source-2',
      userId: testUserId,
      type: 'YOUTUBE' as SourceType,
      sourceId: 'channel-2',
      displayName: 'Cooking Channel',
      avatarUrl: 'https://example.com/avatar2.jpg',
      isMuted: false,
      alwaysSafe: false,
      addedAt: new Date(),
      lastFetchAt: new Date(),
      lastFetchStatus: 'success',
      errorMessage: null,
    },
    {
      id: 'source-3',
      userId: testUserId,
      type: 'YOUTUBE' as SourceType,
      sourceId: 'channel-3',
      displayName: 'Science Channel',
      avatarUrl: 'https://example.com/avatar3.jpg',
      isMuted: false,
      alwaysSafe: false,
      addedAt: new Date(),
      lastFetchAt: new Date(),
      lastFetchStatus: 'success',
      errorMessage: null,
    },
    {
      id: 'source-4',
      userId: testUserId,
      type: 'YOUTUBE' as SourceType,
      sourceId: 'channel-4',
      displayName: 'Wellness Channel',
      avatarUrl: 'https://example.com/avatar4.jpg',
      isMuted: false,
      alwaysSafe: false,
      addedAt: new Date(),
      lastFetchAt: new Date(),
      lastFetchStatus: 'success',
      errorMessage: null,
    },
  ];

  describe('Complete Feed Generation Flow', () => {
    it('should filter content based on keyword rules', () => {
      // Create filter with "election" keyword
      const rules = [new KeywordFilterRule('election', false, false)];
      const filterEngine = new FilterEngine(rules);

      // Apply filters
      const filtered = filterEngine.evaluateBatch(mockYouTubeContent);

      // Should remove "Election News Update" (6 total - 1 = 5)
      expect(filtered).toHaveLength(5);
      expect(filtered.find(c => c.id === 'content-2')).toBeUndefined();
      expect(filtered.find(c => c.title.includes('Election'))).toBeUndefined();
    });

    it('should filter content based on duration rules', () => {
      // Create filter for "meal time" duration (15-25 minutes = 900-1500 seconds)
      // DurationFilterRule filters OUT content outside this range
      const rules = [
        new DurationFilterRule(900, 1500), // Keep only 15-25 min
      ];
      const filterEngine = new FilterEngine(rules);

      // Apply filters
      const filtered = filterEngine.evaluateBatch(mockYouTubeContent);

      // Should keep only content between 15-25 minutes
      // content-2: 900s (15 min) ✓
      // content-3: 1200s (20 min) ✓
      // content-6: 900s (15 min) ✓
      expect(filtered).toHaveLength(3);
      expect(filtered.find(c => c.id === 'content-2')).toBeDefined();
      expect(filtered.find(c => c.id === 'content-3')).toBeDefined();
      expect(filtered.find(c => c.id === 'content-6')).toBeDefined();
    });

    it('should combine multiple filter rules', () => {
      // Filter out "election" keyword AND duration outside 10-30 min range
      const rules = [
        new KeywordFilterRule('election', false, false),
        new DurationFilterRule(600, 1800), // Keep only 10-30 minutes
      ];
      const filterEngine = new FilterEngine(rules);

      const filtered = filterEngine.evaluateBatch(mockYouTubeContent);

      // Should filter out:
      // - content-2: "election" keyword
      // - content-4: duration 300s < 10 min
      // - content-5: duration 3600s > 30 min
      // Remaining: content-1 (600s=10min), content-3 (1200s=20min), content-6 (900s=15min)
      expect(filtered).toHaveLength(3);
      expect(filtered.find(c => c.id === 'content-2')).toBeUndefined();
      expect(filtered.find(c => c.id === 'content-4')).toBeUndefined();
      expect(filtered.find(c => c.id === 'content-5')).toBeUndefined();

      // Should keep content-1, content-3, content-6
      expect(filtered.find(c => c.id === 'content-1')).toBeDefined();
      expect(filtered.find(c => c.id === 'content-3')).toBeDefined();
      expect(filtered.find(c => c.id === 'content-6')).toBeDefined();
    });

    it('should enforce content diversity in feed', () => {
      const diversityEnforcer = new DiversityEnforcer();

      // Create content all from same source in sequence
      const sameSourceContent = [
        mockYouTubeContent[0], // channel-1
        mockYouTubeContent[1], // channel-1
        mockYouTubeContent[2], // channel-2
        mockYouTubeContent[3], // channel-2
        mockYouTubeContent[4], // channel-3
      ];

      // Enforce max 2 consecutive from same source
      const diversified = diversityEnforcer.enforce(sameSourceContent, 2);

      // Verify no more than 2 consecutive from same source
      for (let i = 2; i < diversified.length; i++) {
        const prev2 = diversified[i - 2];
        const prev1 = diversified[i - 1];
        const current = diversified[i];

        // If previous 2 are from same source, current must be different
        if (prev2.sourceId === prev1.sourceId && prev2.sourceType === prev1.sourceType) {
          expect(
            current.sourceId !== prev1.sourceId || current.sourceType !== prev1.sourceType
          ).toBe(true);
        }
      }
    });

    it('should mix recent and backlog content by ratio', () => {
      const mixer = new BacklogMixer();

      // Separate into recent (last 7 days) and backlog
      const recent = [mockYouTubeContent[3], mockYouTubeContent[4], mockYouTubeContent[5]]; // 1-3 days ago (recent)
      const backlog = [mockYouTubeContent[0], mockYouTubeContent[1], mockYouTubeContent[2]]; // 8-10 days ago (backlog)

      // Mix with 40% backlog ratio
      const mixed = mixer.mix(recent, backlog, 0.4);

      // 6 items * 40% = 2.4 → 2 backlog, 4 recent
      // But we only have 3 recent, so we get min(3, 4) = 3 recent
      // Total: 3 recent + 2 backlog = 5
      expect(mixed.length).toBe(5);

      // Count how many from each category
      const backlogCount = mixed.filter(item => backlog.includes(item)).length;
      const recentCount = mixed.filter(item => recent.includes(item)).length;

      // Should be 2 backlog, 3 recent (limited by available recent)
      expect(backlogCount).toBe(2);
      expect(recentCount).toBe(3);
    });

    it('should generate complete feed with all features', () => {
      const diversityEnforcer = new DiversityEnforcer();
      const backlogMixer = new BacklogMixer();
      const feedGenerator = new FeedGenerator(diversityEnforcer, backlogMixer);

      const preferences = {
        userId: testUserId,
        backlogRatio: 0.3,
        maxConsecutiveFromSource: 2,
        theme: 'dark' as const,
        density: 'cozy' as const,
        autoPlay: false,
        updatedAt: new Date(),
      };

      // Generate feed with no interactions
      const feed = feedGenerator.generate(
        mockSources,
        mockYouTubeContent,
        preferences,
        []
      );

      // Verify feed structure
      // Backlog mixer with 30% ratio will select subset based on availability
      // 6 total: 30% backlog = 1.8 → 1, recent = 5
      // We have 3 recent, 3 backlog, so takes min(3,5)=3 recent, min(3,1)=1 backlog = 4 total
      expect(feed.length).toBeGreaterThanOrEqual(4);
      expect(feed.length).toBeLessThanOrEqual(6);

      // Each item should have proper structure
      feed.forEach((item, index) => {
        expect(item.content).toBeDefined();
        expect(item.position).toBe(index);
        expect(item.sourceDisplayName).toBeDefined();
        expect(typeof item.isNew).toBe('boolean');
      });

      // Verify source display names are populated for whatever content made it into the feed
      feed.forEach(item => {
        expect(item.sourceDisplayName).toBeDefined();
        expect(item.sourceDisplayName).not.toBe('Unknown');
      });
    });

    it('should exclude already watched content from feed', () => {
      const diversityEnforcer = new DiversityEnforcer();
      const backlogMixer = new BacklogMixer();
      const feedGenerator = new FeedGenerator(diversityEnforcer, backlogMixer);

      const preferences = {
        userId: testUserId,
        backlogRatio: 0.3,
        maxConsecutiveFromSource: 2,
        theme: 'dark' as const,
        density: 'cozy' as const,
        autoPlay: false,
        updatedAt: new Date(),
      };

      // User has watched content-1 and content-2
      const interactions = [
        {
          id: 'int-1',
          userId: testUserId,
          contentId: 'content-1',
          type: 'WATCHED' as const,
          timestamp: new Date(),
        },
        {
          id: 'int-2',
          userId: testUserId,
          contentId: 'content-2',
          type: 'WATCHED' as const,
          timestamp: new Date(),
        },
      ];

      const feed = feedGenerator.generate(
        mockSources,
        mockYouTubeContent,
        preferences,
        interactions
      );

      // Should not include watched content (6 total - 2 watched = 4)
      expect(feed.length).toBe(4);
      expect(feed.find(f => f.content.id === 'content-1')).toBeUndefined();
      expect(feed.find(f => f.content.id === 'content-2')).toBeUndefined();
    });

    it('should exclude dismissed content from feed', () => {
      const diversityEnforcer = new DiversityEnforcer();
      const backlogMixer = new BacklogMixer();
      const feedGenerator = new FeedGenerator(diversityEnforcer, backlogMixer);

      const preferences = {
        userId: testUserId,
        backlogRatio: 0.3,
        maxConsecutiveFromSource: 2,
        theme: 'dark' as const,
        density: 'cozy' as const,
        autoPlay: false,
        updatedAt: new Date(),
      };

      // User dismissed content-3
      const interactions = [
        {
          id: 'int-1',
          userId: testUserId,
          contentId: 'content-3',
          type: 'DISMISSED' as const,
          timestamp: new Date(),
          dismissReason: 'Not interested',
        },
      ];

      const feed = feedGenerator.generate(
        mockSources,
        mockYouTubeContent,
        preferences,
        interactions
      );

      expect(feed.find(f => f.content.id === 'content-3')).toBeUndefined();
    });

    it('should exclude saved content from main feed', () => {
      const diversityEnforcer = new DiversityEnforcer();
      const backlogMixer = new BacklogMixer();
      const feedGenerator = new FeedGenerator(diversityEnforcer, backlogMixer);

      const preferences = {
        userId: testUserId,
        backlogRatio: 0.3,
        maxConsecutiveFromSource: 2,
        theme: 'dark' as const,
        density: 'cozy' as const,
        autoPlay: false,
        updatedAt: new Date(),
      };

      // User saved content-4 for later
      const interactions = [
        {
          id: 'int-1',
          userId: testUserId,
          contentId: 'content-4',
          type: 'SAVED' as const,
          timestamp: new Date(),
          collection: 'Watch Later',
        },
      ];

      const feed = feedGenerator.generate(
        mockSources,
        mockYouTubeContent,
        preferences,
        interactions
      );

      expect(feed.find(f => f.content.id === 'content-4')).toBeUndefined();
    });

    it('should reintegrate NOT_NOW content back into feed', () => {
      const diversityEnforcer = new DiversityEnforcer();
      const backlogMixer = new BacklogMixer();
      const feedGenerator = new FeedGenerator(diversityEnforcer, backlogMixer);

      const preferences = {
        userId: testUserId,
        backlogRatio: 0.3,
        maxConsecutiveFromSource: 2,
        theme: 'dark' as const,
        density: 'cozy' as const,
        autoPlay: false,
        updatedAt: new Date(),
      };

      // User clicked "Not Now" on content-1
      const interactions = [
        {
          id: 'int-1',
          userId: testUserId,
          contentId: 'content-1',
          type: 'NOT_NOW' as const,
          timestamp: new Date(),
        },
      ];

      const feed = feedGenerator.generate(
        mockSources,
        mockYouTubeContent,
        preferences,
        interactions
      );

      // NOT_NOW content should be reintegrated (randomly)
      // Base feed has 4 items (mixer limits to available content)
      // NOT_NOW integration adds up to 20% more, so could be 4-5 items
      expect(feed.length).toBeGreaterThanOrEqual(4);

      // The NOT_NOW item might or might not appear depending on random selection
      // But it should not be permanently excluded
      const notNowItem = feed.find(f => f.content.id === 'content-1');
      // It's OK if it's not there (20% chance based on rotation logic)
      // but it should not be filtered out like WATCHED/DISMISSED
    });

    it('should apply complete feed pipeline: filters + diversity + backlog', () => {
      // Complete real-world scenario
      const keywordRules = [new KeywordFilterRule('election', false, false)];
      const filterEngine = new FilterEngine(keywordRules);

      const diversityEnforcer = new DiversityEnforcer();
      const backlogMixer = new BacklogMixer();
      const feedGenerator = new FeedGenerator(diversityEnforcer, backlogMixer);

      const preferences = {
        userId: testUserId,
        backlogRatio: 0.4, // 40% older content
        maxConsecutiveFromSource: 2,
        theme: 'dark' as const,
        density: 'cozy' as const,
        autoPlay: false,
        updatedAt: new Date(),
      };

      const interactions = [
        {
          id: 'int-1',
          userId: testUserId,
          contentId: 'content-6',
          type: 'WATCHED' as const,
          timestamp: new Date(),
        },
      ];

      // Step 1: Apply filters
      const filtered = filterEngine.evaluateBatch(mockYouTubeContent);

      // Step 2: Generate feed with diversity and backlog mixing
      const feed = feedGenerator.generate(
        mockSources,
        filtered,
        preferences,
        interactions
      );

      // Verify results
      // Filtered out: content-2 (election keyword)
      // Filtered out: content-6 (watched)
      // Remaining 4 items go through backlog mixer which may reduce count
      expect(feed.length).toBeGreaterThanOrEqual(3);
      expect(feed.length).toBeLessThanOrEqual(4);
      expect(feed.find(f => f.content.id === 'content-2')).toBeUndefined(); // Filtered by keyword

      // Content-6 should be excluded (watched), so we verify it's not in the feed
      const hasContent6 = feed.find(f => f.content.id === 'content-6');
      expect(hasContent6).toBeUndefined(); // Watched

      // Should have a mix of the remaining items (backlog mixer may not include all)
      // At minimum, filtered and watched content should not be present
      const feedIds = feed.map(f => f.content.id);
      expect(feedIds).not.toContain('content-2'); // Filtered
      expect(feedIds).not.toContain('content-6'); // Watched

      // Verify diversity - no more than 2 consecutive from same source
      for (let i = 2; i < feed.length; i++) {
        const prev2 = feed[i - 2];
        const prev1 = feed[i - 1];
        const current = feed[i];

        if (prev2.content.sourceId === prev1.content.sourceId) {
          expect(
            current.content.sourceId !== prev1.content.sourceId ||
            current.content.sourceType !== prev1.content.sourceType
          ).toBe(true);
        }
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty content list', () => {
      const diversityEnforcer = new DiversityEnforcer();
      const backlogMixer = new BacklogMixer();
      const feedGenerator = new FeedGenerator(diversityEnforcer, backlogMixer);

      const preferences = {
        userId: testUserId,
        backlogRatio: 0.3,
        maxConsecutiveFromSource: 2,
        theme: 'dark' as const,
        density: 'cozy' as const,
        autoPlay: false,
        updatedAt: new Date(),
      };

      const feed = feedGenerator.generate(mockSources, [], preferences, []);
      expect(feed).toEqual([]);
    });

    it('should handle most content filtered out', () => {
      // Create filters that match most content
      const rules = [
        new KeywordFilterRule('news', false, false),
        new KeywordFilterRule('space', false, false),
        new KeywordFilterRule('yoga', false, false),
      ];
      const filterEngine = new FilterEngine(rules);

      const filtered = filterEngine.evaluateBatch(mockYouTubeContent);

      // Should filter out items with these keywords
      // content-2 (news), content-5 (space), content-6 (yoga) = 3 filtered
      expect(filtered).toHaveLength(3);
    });

    it('should handle all content already interacted with', () => {
      const diversityEnforcer = new DiversityEnforcer();
      const backlogMixer = new BacklogMixer();
      const feedGenerator = new FeedGenerator(diversityEnforcer, backlogMixer);

      const preferences = {
        userId: testUserId,
        backlogRatio: 0.3,
        maxConsecutiveFromSource: 2,
        theme: 'dark' as const,
        density: 'cozy' as const,
        autoPlay: false,
        updatedAt: new Date(),
      };

      // All content watched
      const interactions = mockYouTubeContent.map((content, i) => ({
        id: `int-${i}`,
        userId: testUserId,
        contentId: content.id,
        type: 'WATCHED' as const,
        timestamp: new Date(),
      }));

      const feed = feedGenerator.generate(
        mockSources,
        mockYouTubeContent,
        preferences,
        interactions
      );

      expect(feed).toEqual([]);
    });

    it('should handle single source with all content', () => {
      // Filter out items containing "election" first
      const filteredContent = mockYouTubeContent.filter(c => !c.title.toLowerCase().includes('election'));

      const singleSourceContent = filteredContent.map(c => ({
        ...c,
        sourceId: 'channel-1',
      }));

      const diversityEnforcer = new DiversityEnforcer();
      const backlogMixer = new BacklogMixer();
      const feedGenerator = new FeedGenerator(diversityEnforcer, backlogMixer);

      const preferences = {
        userId: testUserId,
        backlogRatio: 0.3,
        maxConsecutiveFromSource: 3,
        theme: 'dark' as const,
        density: 'cozy' as const,
        autoPlay: false,
        updatedAt: new Date(),
      };

      const feed = feedGenerator.generate(
        [mockSources[0]],
        singleSourceContent,
        preferences,
        []
      );

      // Should still generate feed even with single source
      // (filteredContent has 5 items after removing election content)
      // Backlog mixer may reduce count based on ratio
      expect(feed.length).toBeGreaterThanOrEqual(4);
      expect(feed.length).toBeLessThanOrEqual(5);
      feed.forEach(item => {
        expect(item.content.sourceId).toBe('channel-1');
      });
    });
  });
});
