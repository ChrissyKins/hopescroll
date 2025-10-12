import { describe, it, expect } from 'vitest';
import { FilterEngine } from '@/domain/filtering/filter-engine';
import { KeywordFilterRule, DurationFilterRule } from '@/domain/filtering/filter-rule';
import { ContentItem } from '@/domain/content/content-item';

describe('FilterEngine', () => {
  describe('keyword filtering', () => {
    it('filters exact keyword match', () => {
      const rules = [new KeywordFilterRule('election', false)];
      const engine = new FilterEngine(rules);

      const content = {
        id: '1',
        title: 'Election Results 2024',
        description: 'Full coverage',
        sourceType: 'YOUTUBE',
        sourceId: 'channel1',
        originalId: 'video1',
        thumbnailUrl: null,
        url: 'https://youtube.com/watch?v=1',
        duration: 600,
        publishedAt: new Date(),
        fetchedAt: new Date(),
        lastSeenInFeed: new Date(),
      } as ContentItem;

      const result = engine.evaluate(content);

      expect(result.isFiltered).toBe(true);
      expect(result.reasons).toContain('Keyword: election');
    });

    it('filters wildcard keyword', () => {
      const rules = [new KeywordFilterRule('*politic*', true)];
      const engine = new FilterEngine(rules);

      const content = {
        title: 'Political Debate Tonight',
        description: null,
      } as ContentItem;

      expect(engine.evaluate(content).isFiltered).toBe(true);
    });

    it('respects whole-word boundaries', () => {
      const rules = [new KeywordFilterRule('war', false)];
      const engine = new FilterEngine(rules);

      const shouldFilter = {
        title: 'War in Ukraine',
        description: null,
      } as ContentItem;
      const shouldNotFilter = {
        title: 'Star Wars Review',
        description: null,
      } as ContentItem;

      expect(engine.evaluate(shouldFilter).isFiltered).toBe(true);
      expect(engine.evaluate(shouldNotFilter).isFiltered).toBe(false);
    });

    it('is case insensitive by default', () => {
      const rules = [new KeywordFilterRule('ELECTION', false)];
      const engine = new FilterEngine(rules);

      const content = {
        title: 'election results',
        description: null,
      } as ContentItem;

      expect(engine.evaluate(content).isFiltered).toBe(true);
    });
  });

  describe('duration filtering', () => {
    it('filters content outside duration range', () => {
      const rules = [new DurationFilterRule(300, 1800)]; // 5-30 min
      const engine = new FilterEngine(rules);

      const tooShort = {
        duration: 120,
        title: 'Short video',
        description: null,
      } as ContentItem; // 2 min
      const justRight = {
        duration: 900,
        title: 'Perfect video',
        description: null,
      } as ContentItem; // 15 min
      const tooLong = {
        duration: 3600,
        title: 'Long video',
        description: null,
      } as ContentItem; // 60 min

      expect(engine.evaluate(tooShort).isFiltered).toBe(true);
      expect(engine.evaluate(justRight).isFiltered).toBe(false);
      expect(engine.evaluate(tooLong).isFiltered).toBe(true);
    });

    it('handles null duration', () => {
      const rules = [new DurationFilterRule(300, 1800)];
      const engine = new FilterEngine(rules);

      const content = {
        duration: null,
        title: 'Article',
        description: null,
      } as ContentItem;

      expect(engine.evaluate(content).isFiltered).toBe(false);
    });
  });

  describe('evaluateBatch', () => {
    it('filters multiple items and returns only unfiltered', () => {
      const rules = [new KeywordFilterRule('politics', false)];
      const engine = new FilterEngine(rules);

      const items: ContentItem[] = [
        {
          id: '1',
          title: 'Cooking Tutorial',
          description: null,
        } as ContentItem,
        {
          id: '2',
          title: 'Politics Today',
          description: null,
        } as ContentItem,
        {
          id: '3',
          title: 'Nature Documentary',
          description: null,
        } as ContentItem,
      ];

      const filtered = engine.evaluateBatch(items);

      expect(filtered).toHaveLength(2);
      expect(filtered.map((i) => i.id)).toEqual(['1', '3']);
    });
  });

  describe('multiple rules', () => {
    it('filters if any rule matches', () => {
      const rules = [
        new KeywordFilterRule('election', false),
        new DurationFilterRule(null, 300), // Max 5 min
      ];
      const engine = new FilterEngine(rules);

      const matchesKeyword = {
        title: 'Election news',
        duration: 600,
        description: null,
      } as ContentItem;

      const matchesDuration = {
        title: 'Long documentary',
        duration: 7200,
        description: null,
      } as ContentItem;

      const matchesBoth = {
        title: 'Election documentary',
        duration: 7200,
        description: null,
      } as ContentItem;

      const matchesNeither = {
        title: 'Cooking video',
        duration: 240, // 4 minutes - within max 5 min limit
        description: null,
      } as ContentItem;

      expect(engine.evaluate(matchesKeyword).isFiltered).toBe(true);
      expect(engine.evaluate(matchesDuration).isFiltered).toBe(true);
      expect(engine.evaluate(matchesBoth).isFiltered).toBe(true);
      expect(engine.evaluate(matchesNeither).isFiltered).toBe(false);
    });
  });
});
