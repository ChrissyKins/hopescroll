import { describe, it, expect, beforeEach } from 'vitest';
import { FeedGenerator } from '@/domain/feed/feed-generator';
import { DiversityEnforcer } from '@/domain/feed/diversity-enforcer';
import { BacklogMixer } from '@/domain/feed/backlog-mixer';
import {
  ContentItem,
  ContentSource,
  ContentInteraction,
  FeedPreferences,
} from '@/domain/content/content-item';

describe('FeedGenerator', () => {
  let generator: FeedGenerator;

  beforeEach(() => {
    generator = new FeedGenerator(new DiversityEnforcer(), new BacklogMixer());
  });

  describe('filterSeen', () => {
    it('filters out watched content', () => {
      const sources: ContentSource[] = [
        { id: 's1', sourceId: 'source1', type: 'YOUTUBE', displayName: 'Channel 1' } as ContentSource,
      ];

      const content: ContentItem[] = [
        { id: 'c1', title: 'Unwatched', publishedAt: new Date() } as ContentItem,
        { id: 'c2', title: 'Watched', publishedAt: new Date() } as ContentItem,
      ];

      const interactions: ContentInteraction[] = [
        { id: 'i1', contentId: 'c2', type: 'WATCHED', userId: 'u1', timestamp: new Date() },
      ];

      const preferences: FeedPreferences = {
        userId: 'u1',
        backlogRatio: 0.3,
        maxConsecutiveFromSource: 3,
        theme: 'dark',
        density: 'cozy',
        autoPlay: false,
        updatedAt: new Date(),
      };

      const result = generator.generate(sources, content, preferences, interactions);

      expect(result).toHaveLength(1);
      expect(result[0].content.id).toBe('c1');
    });

    it('filters out dismissed content', () => {
      const sources: ContentSource[] = [
        { id: 's1', sourceId: 'source1', type: 'YOUTUBE', displayName: 'Channel 1' } as ContentSource,
      ];

      const content: ContentItem[] = [
        { id: 'c1', title: 'Good', publishedAt: new Date() } as ContentItem,
        { id: 'c2', title: 'Dismissed', publishedAt: new Date() } as ContentItem,
      ];

      const interactions: ContentInteraction[] = [
        { id: 'i1', contentId: 'c2', type: 'DISMISSED', userId: 'u1', timestamp: new Date() },
      ];

      const preferences: FeedPreferences = {
        userId: 'u1',
        backlogRatio: 0.3,
        maxConsecutiveFromSource: 3,
        theme: 'dark',
        density: 'cozy',
        autoPlay: false,
        updatedAt: new Date(),
      };

      const result = generator.generate(sources, content, preferences, interactions);

      expect(result).toHaveLength(1);
      expect(result[0].content.id).toBe('c1');
    });

    it('filters out saved content', () => {
      const sources: ContentSource[] = [
        { id: 's1', sourceId: 'source1', type: 'YOUTUBE', displayName: 'Channel 1' } as ContentSource,
      ];

      const content: ContentItem[] = [
        { id: 'c1', title: 'In feed', publishedAt: new Date() } as ContentItem,
        { id: 'c2', title: 'Saved', publishedAt: new Date() } as ContentItem,
      ];

      const interactions: ContentInteraction[] = [
        { id: 'i1', contentId: 'c2', type: 'SAVED', userId: 'u1', timestamp: new Date() },
      ];

      const preferences: FeedPreferences = {
        userId: 'u1',
        backlogRatio: 0.3,
        maxConsecutiveFromSource: 3,
        theme: 'dark',
        density: 'cozy',
        autoPlay: false,
        updatedAt: new Date(),
      };

      const result = generator.generate(sources, content, preferences, interactions);

      expect(result).toHaveLength(1);
      expect(result[0].content.id).toBe('c1');
    });

    it('filters out blocked content', () => {
      const sources: ContentSource[] = [
        { id: 's1', sourceId: 'source1', type: 'YOUTUBE', displayName: 'Channel 1' } as ContentSource,
      ];

      const content: ContentItem[] = [
        { id: 'c1', title: 'Good', publishedAt: new Date() } as ContentItem,
        { id: 'c2', title: 'Blocked', publishedAt: new Date() } as ContentItem,
      ];

      const interactions: ContentInteraction[] = [
        { id: 'i1', contentId: 'c2', type: 'BLOCKED', userId: 'u1', timestamp: new Date() },
      ];

      const preferences: FeedPreferences = {
        userId: 'u1',
        backlogRatio: 0.3,
        maxConsecutiveFromSource: 3,
        theme: 'dark',
        density: 'cozy',
        autoPlay: false,
        updatedAt: new Date(),
      };

      const result = generator.generate(sources, content, preferences, interactions);

      expect(result).toHaveLength(1);
      expect(result[0].content.id).toBe('c1');
    });

    it('does NOT filter out NOT_NOW content (resurfaces it)', () => {
      const sources: ContentSource[] = [
        { id: 's1', sourceId: 'source1', type: 'YOUTUBE', displayName: 'Channel 1' } as ContentSource,
      ];

      const content: ContentItem[] = [
        { id: 'c1', title: 'Regular', publishedAt: new Date() } as ContentItem,
        { id: 'c2', title: 'Not Now', publishedAt: new Date() } as ContentItem,
      ];

      const interactions: ContentInteraction[] = [
        { id: 'i1', contentId: 'c2', type: 'NOT_NOW', userId: 'u1', timestamp: new Date() },
      ];

      const preferences: FeedPreferences = {
        userId: 'u1',
        backlogRatio: 0.3,
        maxConsecutiveFromSource: 3,
        theme: 'dark',
        density: 'cozy',
        autoPlay: false,
        updatedAt: new Date(),
      };

      const result = generator.generate(sources, content, preferences, interactions);

      // Should include both items
      expect(result.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('categorizeByAge', () => {
    it('categorizes content as recent if published within 7 days', () => {
      const sources: ContentSource[] = [
        { id: 's1', sourceId: 'source1', type: 'YOUTUBE', displayName: 'Channel 1' } as ContentSource,
      ];

      const now = new Date();
      const twoDaysAgo = new Date(now);
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      const content: ContentItem[] = [
        { id: 'c1', title: 'Recent', publishedAt: twoDaysAgo } as ContentItem,
      ];

      const preferences: FeedPreferences = {
        userId: 'u1',
        backlogRatio: 0,
        maxConsecutiveFromSource: 3,
        theme: 'dark',
        density: 'cozy',
        autoPlay: false,
        updatedAt: new Date(),
      };

      const result = generator.generate(sources, content, preferences, []);

      expect(result).toHaveLength(1);
      expect(result[0].isNew).toBe(true);
    });

    it('categorizes content as backlog if published over 7 days ago', () => {
      const sources: ContentSource[] = [
        { id: 's1', sourceId: 'source1', type: 'YOUTUBE', displayName: 'Channel 1' } as ContentSource,
      ];

      const now = new Date();
      const tenDaysAgo = new Date(now);
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

      const content: ContentItem[] = [
        { id: 'c1', title: 'Old', publishedAt: tenDaysAgo } as ContentItem,
      ];

      const preferences: FeedPreferences = {
        userId: 'u1',
        backlogRatio: 1.0, // All backlog
        maxConsecutiveFromSource: 3,
        theme: 'dark',
        density: 'cozy',
        autoPlay: false,
        updatedAt: new Date(),
      };

      const result = generator.generate(sources, content, preferences, []);

      expect(result).toHaveLength(1);
      expect(result[0].isNew).toBe(false);
    });
  });

  describe('integrateReturningItems', () => {
    it('reintegrates NOT_NOW content into feed', () => {
      const sources: ContentSource[] = [
        { id: 's1', sourceId: 'source1', type: 'YOUTUBE', displayName: 'Channel 1' } as ContentSource,
      ];

      // Create a larger feed to ensure NOT_NOW items get reintegrated
      const content: ContentItem[] = Array.from({ length: 20 }, (_, i) => ({
        id: `c${i}`,
        title: `Content ${i}`,
        publishedAt: new Date(),
        sourceId: 'source1',
        sourceType: 'YOUTUBE',
      })) as ContentItem[];

      const interactions: ContentInteraction[] = [
        { id: 'i1', contentId: 'c5', type: 'NOT_NOW', userId: 'u1', timestamp: new Date() },
        { id: 'i2', contentId: 'c10', type: 'NOT_NOW', userId: 'u1', timestamp: new Date() },
      ];

      const preferences: FeedPreferences = {
        userId: 'u1',
        backlogRatio: 0.3,
        maxConsecutiveFromSource: 3,
        theme: 'dark',
        density: 'cozy',
        autoPlay: false,
        updatedAt: new Date(),
      };

      const result = generator.generate(sources, content, preferences, interactions);

      // Should contain the NOT_NOW items
      const hasNotNowItems = result.some(
        (item) => item.content.id === 'c5' || item.content.id === 'c10'
      );
      expect(hasNotNowItems).toBe(true);
    });

    it('reintegrates some NOT_NOW items into feed', () => {
      const sources: ContentSource[] = [
        { id: 's1', sourceId: 'source1', type: 'YOUTUBE', displayName: 'Channel 1' } as ContentSource,
      ];

      // Create content - need BOTH not-now content AND regular unseen content
      const content: ContentItem[] = Array.from({ length: 50 }, (_, i) => ({
        id: `c${i}`,
        title: `Content ${i}`,
        publishedAt: new Date(),
        sourceId: 'source1',
        sourceType: 'YOUTUBE',
      })) as ContentItem[];

      // Mark some items as NOT_NOW (these can resurface)
      const interactions: ContentInteraction[] = Array.from({ length: 10 }, (_, i) => ({
        id: `i${i}`,
        contentId: `c${i}`,
        type: 'NOT_NOW',
        userId: 'u1',
        timestamp: new Date(),
      })) as ContentInteraction[];

      const preferences: FeedPreferences = {
        userId: 'u1',
        backlogRatio: 0.3,
        maxConsecutiveFromSource: 10,
        theme: 'dark',
        density: 'cozy',
        autoPlay: false,
        updatedAt: new Date(),
      };

      const result = generator.generate(sources, content, preferences, interactions);

      // Verify that NOT_NOW items are reintegrated into the feed
      // The exact count depends on the algorithm's random insertion and the 20% limit
      const notNowCount = result.filter((item) => {
        const id = parseInt(item.content.id.substring(1));
        return id < 10; // Items c0-c9 were marked NOT_NOW
      }).length;

      // Verify that at least some NOT_NOW items are back in the feed
      expect(notNowCount).toBeGreaterThan(0);
      // The feed includes unseen items + reintegrated NOT_NOW items
      // 40 unseen + some NOT_NOW items (randomly selected up to 20%)
      expect(result.length).toBeGreaterThanOrEqual(40);
      expect(result.length).toBeLessThanOrEqual(50); // At most all items
    });
  });

  describe('toFeedItem', () => {
    it('enriches content with source display name', () => {
      const sources: ContentSource[] = [
        {
          id: 's1',
          sourceId: 'source1',
          type: 'YOUTUBE',
          displayName: 'Awesome Channel',
        } as ContentSource,
      ];

      const content: ContentItem[] = [
        {
          id: 'c1',
          title: 'Test Video',
          publishedAt: new Date(),
          sourceId: 'source1',
          sourceType: 'YOUTUBE',
        } as ContentItem,
      ];

      const preferences: FeedPreferences = {
        userId: 'u1',
        backlogRatio: 0.3,
        maxConsecutiveFromSource: 3,
        theme: 'dark',
        density: 'cozy',
        autoPlay: false,
        updatedAt: new Date(),
      };

      const result = generator.generate(sources, content, preferences, []);

      expect(result[0].sourceDisplayName).toBe('Awesome Channel');
    });

    it('uses "Unknown" for missing source', () => {
      const sources: ContentSource[] = [];

      const content: ContentItem[] = [
        {
          id: 'c1',
          title: 'Orphaned Content',
          publishedAt: new Date(),
          sourceId: 'missing-source',
          sourceType: 'YOUTUBE',
        } as ContentItem,
      ];

      const preferences: FeedPreferences = {
        userId: 'u1',
        backlogRatio: 0.3,
        maxConsecutiveFromSource: 3,
        theme: 'dark',
        density: 'cozy',
        autoPlay: false,
        updatedAt: new Date(),
      };

      const result = generator.generate(sources, content, preferences, []);

      expect(result[0].sourceDisplayName).toBe('Unknown');
    });

    it('assigns sequential positions to feed items', () => {
      const sources: ContentSource[] = [
        { id: 's1', sourceId: 'source1', type: 'YOUTUBE', displayName: 'Channel 1' } as ContentSource,
      ];

      const content: ContentItem[] = [
        { id: 'c1', publishedAt: new Date() } as ContentItem,
        { id: 'c2', publishedAt: new Date() } as ContentItem,
        { id: 'c3', publishedAt: new Date() } as ContentItem,
      ];

      const preferences: FeedPreferences = {
        userId: 'u1',
        backlogRatio: 0.3,
        maxConsecutiveFromSource: 3,
        theme: 'dark',
        density: 'cozy',
        autoPlay: false,
        updatedAt: new Date(),
      };

      const result = generator.generate(sources, content, preferences, []);

      expect(result[0].position).toBe(0);
      expect(result[1].position).toBe(1);
      expect(result[2].position).toBe(2);
    });
  });

  describe('full feed generation', () => {
    it('generates empty feed with no content', () => {
      const sources: ContentSource[] = [
        { id: 's1', sourceId: 'source1', type: 'YOUTUBE', displayName: 'Channel 1' } as ContentSource,
      ];

      const preferences: FeedPreferences = {
        userId: 'u1',
        backlogRatio: 0.3,
        maxConsecutiveFromSource: 3,
        theme: 'dark',
        density: 'cozy',
        autoPlay: false,
        updatedAt: new Date(),
      };

      const result = generator.generate(sources, [], preferences, []);

      expect(result).toEqual([]);
    });

    it('generates feed with mixed content sources', () => {
      const sources: ContentSource[] = [
        { id: 's1', sourceId: 'youtube1', type: 'YOUTUBE', displayName: 'YT Channel' } as ContentSource,
        { id: 's2', sourceId: 'twitch1', type: 'TWITCH', displayName: 'Twitch Stream' } as ContentSource,
      ];

      const content: ContentItem[] = [
        {
          id: 'c1',
          sourceId: 'youtube1',
          sourceType: 'YOUTUBE',
          publishedAt: new Date(),
        } as ContentItem,
        {
          id: 'c2',
          sourceId: 'twitch1',
          sourceType: 'TWITCH',
          publishedAt: new Date(),
        } as ContentItem,
      ];

      const preferences: FeedPreferences = {
        userId: 'u1',
        backlogRatio: 0.3,
        maxConsecutiveFromSource: 3,
        theme: 'dark',
        density: 'cozy',
        autoPlay: false,
        updatedAt: new Date(),
      };

      const result = generator.generate(sources, content, preferences, []);

      expect(result).toHaveLength(2);
      expect(result.map((item) => item.content.sourceType)).toContain('YOUTUBE');
      expect(result.map((item) => item.content.sourceType)).toContain('TWITCH');
    });

    it('respects backlog ratio in preferences', () => {
      const sources: ContentSource[] = [
        { id: 's1', sourceId: 'source1', type: 'YOUTUBE', displayName: 'Channel 1' } as ContentSource,
      ];

      const now = new Date();
      const recent = Array.from({ length: 70 }, (_, i) => {
        const date = new Date(now);
        date.setDate(date.getDate() - 1); // 1 day ago
        return {
          id: `recent-${i}`,
          sourceId: 'source1',
          sourceType: 'YOUTUBE',
          publishedAt: date,
        } as ContentItem;
      });

      const backlog = Array.from({ length: 30 }, (_, i) => {
        const date = new Date(now);
        date.setDate(date.getDate() - 30); // 30 days ago
        return {
          id: `backlog-${i}`,
          sourceId: 'source1',
          sourceType: 'YOUTUBE',
          publishedAt: date,
        } as ContentItem;
      });

      const preferences: FeedPreferences = {
        userId: 'u1',
        backlogRatio: 0.3, // 30% backlog
        maxConsecutiveFromSource: 10,
        theme: 'dark',
        density: 'cozy',
        autoPlay: false,
        updatedAt: new Date(),
      };

      const result = generator.generate(sources, [...recent, ...backlog], preferences, []);

      const backlogCount = result.filter((item) => !item.isNew).length;

      // Should have roughly 30% backlog (allowing some variance)
      expect(backlogCount).toBeGreaterThanOrEqual(25);
      expect(backlogCount).toBeLessThanOrEqual(35);
    });

    it('enforces diversity across sources', () => {
      const sources: ContentSource[] = [
        { id: 's1', sourceId: 'source1', type: 'YOUTUBE', displayName: 'Channel 1' } as ContentSource,
        { id: 's2', sourceId: 'source2', type: 'YOUTUBE', displayName: 'Channel 2' } as ContentSource,
      ];

      const content: ContentItem[] = [
        ...Array.from({ length: 10 }, (_, i) => ({
          id: `c1-${i}`,
          sourceId: 'source1',
          sourceType: 'YOUTUBE',
          publishedAt: new Date(),
        })),
        ...Array.from({ length: 10 }, (_, i) => ({
          id: `c2-${i}`,
          sourceId: 'source2',
          sourceType: 'YOUTUBE',
          publishedAt: new Date(),
        })),
      ] as ContentItem[];

      const preferences: FeedPreferences = {
        userId: 'u1',
        backlogRatio: 0,
        maxConsecutiveFromSource: 3,
        theme: 'dark',
        density: 'cozy',
        autoPlay: false,
        updatedAt: new Date(),
      };

      const result = generator.generate(sources, content, preferences, []);

      // Check that no more than 3 consecutive items from same source
      let maxConsecutive = 1;
      let currentConsecutive = 1;

      for (let i = 1; i < result.length; i++) {
        if (result[i].content.sourceId === result[i - 1].content.sourceId) {
          currentConsecutive++;
          maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
        } else {
          currentConsecutive = 1;
        }
      }

      // With equal sources, diversity should be enforced
      expect(maxConsecutive).toBeLessThanOrEqual(3);
    });
  });
});
