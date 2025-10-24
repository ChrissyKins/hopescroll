/**
 * Integration Tests - Filter System
 *
 * These tests verify the complete filtering functionality:
 * 1. Adding/removing keyword filters
 * 2. Setting duration filters
 * 3. Filter application across content
 * 4. Filter edge cases (wildcards, whole words, case sensitivity)
 * 5. Combined filter scenarios
 *
 * Tests real filtering behavior that users would experience
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FilterService } from '@/services/filter-service';
import { FilterEngine } from '@/domain/filtering/filter-engine';
import { KeywordFilterRule, DurationFilterRule } from '@/domain/filtering/filter-rule';
import type { PrismaClient } from '@prisma/client';
import type { Logger } from 'pino';
import type { ContentItem, SourceType } from '@/types';

describe('Filter System Integration Tests', () => {
  let filterService: FilterService;
  let mockDb: any;
  let mockCache: any;
  let mockLogger: Logger;

  const testUserId = 'test-user-filters';

  beforeEach(() => {
    // Mock database
    mockDb = {
      filterKeyword: {
        create: vi.fn(),
        delete: vi.fn(),
        findMany: vi.fn(),
        findFirst: vi.fn(),
      },
      userPreferences: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        upsert: vi.fn(),
      },
    } as unknown as PrismaClient;

    // Mock cache
    mockCache = {
      delete: vi.fn().mockResolvedValue(true),
    };

    // Mock logger
    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    } as unknown as Logger;

    filterService = new FilterService(mockDb);
  });

  // Test content pool
  const testContent: ContentItem[] = [
    {
      id: 'c1',
      sourceType: 'YOUTUBE' as SourceType,
      sourceId: 'ch1',
      originalId: 'v1',
      title: 'Election Results 2025',
      description: 'Breaking news about the election',
      thumbnailUrl: null,
      url: 'https://youtube.com/v1',
      duration: 900,
      publishedAt: new Date(),
      fetchedAt: new Date(),
      lastSeenInFeed: new Date(),
    },
    {
      id: 'c2',
      sourceType: 'YOUTUBE' as SourceType,
      sourceId: 'ch1',
      originalId: 'v2',
      title: 'Peaceful Nature Walk',
      description: 'Calming forest sounds',
      thumbnailUrl: null,
      url: 'https://youtube.com/v2',
      duration: 1200,
      publishedAt: new Date(),
      fetchedAt: new Date(),
      lastSeenInFeed: new Date(),
    },
    {
      id: 'c3',
      sourceType: 'YOUTUBE' as SourceType,
      sourceId: 'ch2',
      originalId: 'v3',
      title: 'Political Debate Highlights',
      description: 'Watch the full political debate',
      thumbnailUrl: null,
      url: 'https://youtube.com/v3',
      duration: 600,
      publishedAt: new Date(),
      fetchedAt: new Date(),
      lastSeenInFeed: new Date(),
    },
    {
      id: 'c4',
      sourceType: 'YOUTUBE' as SourceType,
      sourceId: 'ch3',
      originalId: 'v4',
      title: 'Star Wars Movie Review',
      description: 'Analysis of the latest Star Wars film',
      thumbnailUrl: null,
      url: 'https://youtube.com/v4',
      duration: 1800,
      publishedAt: new Date(),
      fetchedAt: new Date(),
      lastSeenInFeed: new Date(),
    },
    {
      id: 'c5',
      sourceType: 'YOUTUBE' as SourceType,
      sourceId: 'ch4',
      originalId: 'v5',
      title: 'Ukraine War Update',
      description: 'Latest news from the war',
      thumbnailUrl: null,
      url: 'https://youtube.com/v5',
      duration: 450,
      publishedAt: new Date(),
      fetchedAt: new Date(),
      lastSeenInFeed: new Date(),
    },
    {
      id: 'c6',
      sourceType: 'YOUTUBE' as SourceType,
      sourceId: 'ch5',
      originalId: 'v6',
      title: 'Quick Breakfast Recipe',
      description: '5-minute healthy breakfast',
      thumbnailUrl: null,
      url: 'https://youtube.com/v6',
      duration: 300,
      publishedAt: new Date(),
      fetchedAt: new Date(),
      lastSeenInFeed: new Date(),
    },
  ];

  describe('Keyword Filter Management', () => {
    it('should add a keyword filter', async () => {
      vi.mocked(mockDb.filterKeyword.create).mockResolvedValue({
        id: 'filter-1',
        userId: testUserId,
        keyword: 'election',
        isWildcard: false,
        createdAt: new Date(),
      });

      const result = await filterService.addKeyword(testUserId, 'election', false);

      expect(result).toEqual({
        id: 'filter-1',
      });

      expect(mockDb.filterKeyword.create).toHaveBeenCalledWith({
        data: {
          userId: testUserId,
          keyword: 'election',
          isWildcard: false,
        },
      });
    });

    it('should add a wildcard keyword filter', async () => {
      vi.mocked(mockDb.filterKeyword.create).mockResolvedValue({
        id: 'filter-2',
        userId: testUserId,
        keyword: '*politic*',
        isWildcard: true,
        createdAt: new Date(),
      });

      const result = await filterService.addKeyword(testUserId, '*politic*', true);

      expect(result).toEqual({
        id: 'filter-2',
      });
      expect(mockDb.filterKeyword.create).toHaveBeenCalledWith({
        data: {
          userId: testUserId,
          keyword: '*politic*',
          isWildcard: true,
        },
      });
    });

    it('should trim whitespace from keyword', async () => {
      vi.mocked(mockDb.filterKeyword.create).mockResolvedValue({
        id: 'filter-3',
        userId: testUserId,
        keyword: 'trimmed',
        isWildcard: false,
        createdAt: new Date(),
      });

      await filterService.addKeyword(testUserId, '  trimmed  ', false);

      expect(mockDb.filterKeyword.create).toHaveBeenCalledWith({
        data: {
          userId: testUserId,
          keyword: 'trimmed',
          isWildcard: false,
        },
      });
    });

    it('should remove a keyword filter', async () => {
      const mockFilter = {
        id: 'filter-1',
        userId: testUserId,
        keyword: 'test',
        isWildcard: false,
        createdAt: new Date(),
      };

      vi.mocked(mockDb.filterKeyword.findFirst).mockResolvedValue(mockFilter);
      vi.mocked(mockDb.filterKeyword.delete).mockResolvedValue(mockFilter);

      await filterService.removeKeyword(testUserId, 'filter-1');

      expect(mockDb.filterKeyword.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'filter-1',
          userId: testUserId,
        },
      });

      expect(mockDb.filterKeyword.delete).toHaveBeenCalledWith({
        where: { id: 'filter-1' },
      });
    });

    it('should list all keyword filters for user', async () => {
      const mockFilters = [
        {
          id: 'f1',
          userId: testUserId,
          keyword: 'election',
          isWildcard: false,
          createdAt: new Date('2025-10-14'),
        },
        {
          id: 'f2',
          userId: testUserId,
          keyword: 'war',
          isWildcard: false,
          createdAt: new Date('2025-10-13'),
        },
      ];

      vi.mocked(mockDb.filterKeyword.findMany).mockResolvedValue(mockFilters);

      const result = await filterService.listKeywords(testUserId);

      expect(result).toEqual(mockFilters);
      expect(mockDb.filterKeyword.findMany).toHaveBeenCalledWith({
        where: { userId: testUserId },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('Duration Filter Management', () => {
    it('should set duration filter range', async () => {
      const mockPreferences = {
        userId: testUserId,
        minDuration: 600, // 10 min
        maxDuration: 1800, // 30 min
        backlogRatio: 0.3,
        diversityLimit: 3,
        theme: 'dark',
        density: 'cozy',
        autoPlay: false,
        updatedAt: new Date(),
      };

      vi.mocked(mockDb.userPreferences.upsert).mockResolvedValue(mockPreferences);

      await filterService.updateDurationFilter(testUserId, 600, 1800);

      expect(mockDb.userPreferences.upsert).toHaveBeenCalledWith({
        where: { userId: testUserId },
        create: {
          userId: testUserId,
          minDuration: 600,
          maxDuration: 1800,
        },
        update: {
          minDuration: 600,
          maxDuration: 1800,
        },
      });
    });

    it('should allow null for unlimited duration', async () => {
      const mockPreferences = {
        userId: testUserId,
        minDuration: null,
        maxDuration: null,
        backlogRatio: 0.3,
        diversityLimit: 3,
        theme: 'dark',
        density: 'cozy',
        autoPlay: false,
        updatedAt: new Date(),
      };

      vi.mocked(mockDb.userPreferences.upsert).mockResolvedValue(mockPreferences);

      await filterService.updateDurationFilter(testUserId, null, null);

      expect(mockDb.userPreferences.upsert).toHaveBeenCalledWith({
        where: { userId: testUserId },
        create: {
          userId: testUserId,
          minDuration: null,
          maxDuration: null,
        },
        update: {
          minDuration: null,
          maxDuration: null,
        },
      });
    });

    it('should set only minimum duration', async () => {
      const mockPreferences = {
        userId: testUserId,
        minDuration: 900,
        maxDuration: null,
        backlogRatio: 0.3,
        diversityLimit: 3,
        theme: 'dark',
        density: 'cozy',
        autoPlay: false,
        updatedAt: new Date(),
      };

      vi.mocked(mockDb.userPreferences.upsert).mockResolvedValue(mockPreferences);

      await filterService.updateDurationFilter(testUserId, 900, null);

      expect(mockDb.userPreferences.upsert).toHaveBeenCalledWith({
        where: { userId: testUserId },
        create: {
          userId: testUserId,
          minDuration: 900,
          maxDuration: null,
        },
        update: {
          minDuration: 900,
          maxDuration: null,
        },
      });
    });

    it('should set only maximum duration', async () => {
      const mockPreferences = {
        userId: testUserId,
        minDuration: null,
        maxDuration: 1200,
        backlogRatio: 0.3,
        diversityLimit: 3,
        theme: 'dark',
        density: 'cozy',
        autoPlay: false,
        updatedAt: new Date(),
      };

      vi.mocked(mockDb.userPreferences.upsert).mockResolvedValue(mockPreferences);

      await filterService.updateDurationFilter(testUserId, null, 1200);

      expect(mockDb.userPreferences.upsert).toHaveBeenCalledWith({
        where: { userId: testUserId },
        create: {
          userId: testUserId,
          minDuration: null,
          maxDuration: 1200,
        },
        update: {
          minDuration: null,
          maxDuration: 1200,
        },
      });
    });
  });

  describe('Real-World Filter Scenarios', () => {
    it('should filter out political content using "election" keyword', () => {
      const rules = [new KeywordFilterRule('election', false, false)];
      const engine = new FilterEngine(rules);

      const filtered = engine.evaluateBatch(testContent);

      // Should filter out c1 (Election Results 2025)
      expect(filtered.length).toBe(5);
      expect(filtered.find(c => c.id === 'c1')).toBeUndefined();
      expect(filtered.find(c => c.title.includes('Election'))).toBeUndefined();
    });

    it('should filter out political content using wildcard "*politic*"', () => {
      const rules = [new KeywordFilterRule('*politic*', true, false)];
      const engine = new FilterEngine(rules);

      const filtered = engine.evaluateBatch(testContent);

      // Should filter out c3 (Political Debate Highlights)
      expect(filtered.length).toBe(5);
      expect(filtered.find(c => c.id === 'c3')).toBeUndefined();
    });

    it('should not filter "Star Wars" when filtering "war" as whole word', () => {
      const rules = [new KeywordFilterRule('war', false, false)];
      const engine = new FilterEngine(rules);

      const filtered = engine.evaluateBatch(testContent);

      // Should filter out c5 (Ukraine War Update) but NOT c4 (Star Wars)
      expect(filtered.length).toBe(5);
      expect(filtered.find(c => c.id === 'c5')).toBeUndefined(); // "War" filtered
      expect(filtered.find(c => c.id === 'c4')).toBeDefined(); // "Star Wars" kept
    });

    it('should filter multiple keywords simultaneously', () => {
      const rules = [
        new KeywordFilterRule('election', false, false),
        new KeywordFilterRule('*politic*', true, false),
        new KeywordFilterRule('war', false, false),
      ];
      const engine = new FilterEngine(rules);

      const filtered = engine.evaluateBatch(testContent);

      // Should filter out c1 (election), c3 (political), c5 (war)
      expect(filtered.length).toBe(3);
      expect(filtered.find(c => c.id === 'c1')).toBeUndefined();
      expect(filtered.find(c => c.id === 'c3')).toBeUndefined();
      expect(filtered.find(c => c.id === 'c5')).toBeUndefined();

      // Remaining should be c2, c4, c6
      expect(filtered.find(c => c.id === 'c2')).toBeDefined(); // Nature
      expect(filtered.find(c => c.id === 'c4')).toBeDefined(); // Star Wars
      expect(filtered.find(c => c.id === 'c6')).toBeDefined(); // Breakfast
    });

    it('should apply "coffee break" duration preset (5-10 minutes)', () => {
      // Coffee break: 5-10 min = 300-600 seconds
      // Filter OUT content that's < 5 min or > 10 min
      const rules = [
        new DurationFilterRule(300, 600), // Keep items between 5-10 min
      ];
      const engine = new FilterEngine(rules);

      const filtered = engine.evaluateBatch(testContent);

      // Expected to keep only:
      // c5: 450s (7.5 min) ✓
      // c3: 600s (10 min) ✓
      // c6: 300s (5 min) ✓
      expect(filtered.length).toBe(3);
      expect(filtered.find(c => c.id === 'c5')).toBeDefined();
      expect(filtered.find(c => c.id === 'c3')).toBeDefined();
      expect(filtered.find(c => c.id === 'c6')).toBeDefined();
    });

    it('should apply "meal time" duration preset (15-25 minutes)', () => {
      // Meal time: 15-25 min = 900-1500 seconds
      const rules = [
        new DurationFilterRule(900, 1500), // Keep items between 15-25 min
      ];
      const engine = new FilterEngine(rules);

      const filtered = engine.evaluateBatch(testContent);

      // Expected to keep only:
      // c1: 900s (15 min) ✓
      // c2: 1200s (20 min) ✓
      expect(filtered.length).toBe(2);
      expect(filtered.find(c => c.id === 'c1')).toBeDefined();
      expect(filtered.find(c => c.id === 'c2')).toBeDefined();
    });

    it('should combine keyword and duration filters', () => {
      // UK user avoiding politics, wanting 10-20 minute videos
      const rules = [
        new KeywordFilterRule('election', false, false),
        new KeywordFilterRule('*politic*', true, false),
        new DurationFilterRule(600, 1200), // Keep items between 10-20 min
      ];
      const engine = new FilterEngine(rules);

      const filtered = engine.evaluateBatch(testContent);

      // Should filter out:
      // c1: has "election" keyword
      // c3: has "political" keyword
      // c5: duration 450s < 10 min
      // c6: duration 300s < 10 min
      // c4: duration 1800s > 20 min

      // Should keep only:
      // c2: 1200s (20 min), no political keywords ✓
      expect(filtered.length).toBe(1);
      expect(filtered[0].id).toBe('c2');
      expect(filtered[0].title).toBe('Peaceful Nature Walk');
    });
  });

  describe('Filter Configuration Retrieval', () => {
    it('should retrieve complete filter configuration', async () => {
      const mockKeywords = [
        { id: 'f1', userId: testUserId, keyword: 'election', isWildcard: false, createdAt: new Date() },
        { id: 'f2', userId: testUserId, keyword: 'war', isWildcard: false, createdAt: new Date() },
      ];

      const mockPreferences = {
        userId: testUserId,
        minDuration: 600,
        maxDuration: 1800,
        backlogRatio: 0.3,
        diversityLimit: 3,
        theme: 'dark',
        density: 'cozy',
        autoPlay: false,
        updatedAt: new Date(),
      };

      vi.mocked(mockDb.filterKeyword.findMany).mockResolvedValue(mockKeywords);
      vi.mocked(mockDb.userPreferences.findUnique).mockResolvedValue(mockPreferences);

      const config = await filterService.getFilterConfiguration(testUserId);

      expect(config.userId).toBe(testUserId);
      expect(config.keywords).toHaveLength(2);
      expect(config.keywords[0].keyword).toBe('election');
      expect(config.durationRange).toEqual({
        min: 600,
        max: 1800,
      });
    });

    it('should handle missing preferences gracefully', async () => {
      vi.mocked(mockDb.filterKeyword.findMany).mockResolvedValue([]);
      vi.mocked(mockDb.userPreferences.findUnique).mockResolvedValue(null);

      const config = await filterService.getFilterConfiguration(testUserId);

      expect(config.keywords).toEqual([]);
      expect(config.durationRange).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty keyword list', () => {
      const rules: KeywordFilterRule[] = [];
      const engine = new FilterEngine(rules);

      const filtered = engine.evaluateBatch(testContent);

      expect(filtered.length).toBe(testContent.length);
    });

    it('should handle content with null description', () => {
      const contentWithNullDesc = {
        ...testContent[0],
        description: null,
      };

      const rules = [new KeywordFilterRule('election', false, false)];
      const engine = new FilterEngine(rules);

      const result = engine.evaluate(contentWithNullDesc);

      // Should still match on title
      expect(result.isFiltered).toBe(true);
    });

    it('should handle content with null duration for duration filter', () => {
      const contentWithNullDuration = {
        ...testContent[0],
        duration: null,
      };

      const rules = [new DurationFilterRule(600, 1800)];
      const engine = new FilterEngine(rules);

      const result = engine.evaluate(contentWithNullDuration);

      // Content with null duration should not match duration filter
      expect(result.isFiltered).toBe(false);
    });

    it('should be case-insensitive by default', () => {
      const rules = [new KeywordFilterRule('ELECTION', false, false)];
      const engine = new FilterEngine(rules);

      const filtered = engine.evaluateBatch(testContent);

      // Should filter despite case difference
      expect(filtered.find(c => c.id === 'c1')).toBeUndefined();
    });
  });

});
