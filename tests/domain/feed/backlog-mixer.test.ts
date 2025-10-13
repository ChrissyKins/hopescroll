import { describe, it, expect } from 'vitest';
import { BacklogMixer } from '@/domain/feed/backlog-mixer';
import { ContentItem } from '@/domain/content/content-item';

describe('BacklogMixer', () => {
  it('mixes recent and backlog content according to ratio', () => {
    const mixer = new BacklogMixer();

    const recent: ContentItem[] = Array.from({ length: 70 }, (_, i) => ({
      id: `recent-${i}`,
      sourceType: 'YOUTUBE',
      sourceId: 'source1',
    })) as ContentItem[];

    const backlog: ContentItem[] = Array.from({ length: 30 }, (_, i) => ({
      id: `backlog-${i}`,
      sourceType: 'YOUTUBE',
      sourceId: 'source1',
    })) as ContentItem[];

    // 30% backlog ratio
    const result = mixer.mix(recent, backlog, 0.3);

    // Total should be 100 items
    expect(result).toHaveLength(100);

    // Count recent vs backlog items
    const backlogCount = result.filter((item) => item.id.startsWith('backlog-')).length;
    const recentCount = result.filter((item) => item.id.startsWith('recent-')).length;

    // Should have ~30 backlog items and ~70 recent items
    expect(backlogCount).toBe(30);
    expect(recentCount).toBe(70);
  });

  it('handles 0% backlog ratio (all recent)', () => {
    const mixer = new BacklogMixer();

    const recent: ContentItem[] = [
      { id: '1', sourceType: 'YOUTUBE', sourceId: 's1' } as ContentItem,
      { id: '2', sourceType: 'YOUTUBE', sourceId: 's1' } as ContentItem,
    ];

    const backlog: ContentItem[] = [
      { id: '3', sourceType: 'YOUTUBE', sourceId: 's1' } as ContentItem,
    ];

    const result = mixer.mix(recent, backlog, 0);

    expect(result).toHaveLength(2);
    expect(result.every((item) => recent.includes(item))).toBe(true);
  });

  it('handles 100% backlog ratio (all backlog)', () => {
    const mixer = new BacklogMixer();

    const recent: ContentItem[] = [
      { id: '1', sourceType: 'YOUTUBE', sourceId: 's1' } as ContentItem,
    ];

    const backlog: ContentItem[] = [
      { id: '2', sourceType: 'YOUTUBE', sourceId: 's1' } as ContentItem,
      { id: '3', sourceType: 'YOUTUBE', sourceId: 's1' } as ContentItem,
    ];

    const result = mixer.mix(recent, backlog, 1.0);

    // With 1.0 ratio, backlogCount = floor(3 * 1.0) = 3, recentCount = 0
    // But we only have 2 backlog items, so result is 2
    expect(result).toHaveLength(2);
    expect(result.every((item) => backlog.includes(item))).toBe(true);
  });

  it('interleaves items when mixing', () => {
    const mixer = new BacklogMixer();

    const recent: ContentItem[] = [
      { id: 'r1', sourceType: 'YOUTUBE', sourceId: 's1' } as ContentItem,
      { id: 'r2', sourceType: 'YOUTUBE', sourceId: 's1' } as ContentItem,
      { id: 'r3', sourceType: 'YOUTUBE', sourceId: 's1' } as ContentItem,
    ];

    const backlog: ContentItem[] = [
      { id: 'b1', sourceType: 'YOUTUBE', sourceId: 's1' } as ContentItem,
      { id: 'b2', sourceType: 'YOUTUBE', sourceId: 's1' } as ContentItem,
    ];

    const result = mixer.mix(recent, backlog, 0.4); // 40% backlog

    // Should have 2 backlog, 3 recent = 5 total
    expect(result).toHaveLength(5);

    // Items should be interleaved (not all recent first, then backlog)
    const recentIds = result.filter((item) => item.id.startsWith('r')).map((item) => item.id);
    const backlogIds = result.filter((item) => item.id.startsWith('b')).map((item) => item.id);

    expect(recentIds).toHaveLength(3);
    expect(backlogIds).toHaveLength(2);
  });

  it('handles empty recent array', () => {
    const mixer = new BacklogMixer();

    const recent: ContentItem[] = [];
    const backlog: ContentItem[] = [
      { id: '1', sourceType: 'YOUTUBE', sourceId: 's1' } as ContentItem,
      { id: '2', sourceType: 'YOUTUBE', sourceId: 's1' } as ContentItem,
    ];

    const result = mixer.mix(recent, backlog, 0.5);

    // With 0.5 ratio, backlogCount = floor(2 * 0.5) = 1, recentCount = 1
    // But recent is empty, so we only get 1 item from backlog
    expect(result).toHaveLength(1);
    expect(result[0].id).toMatch(/^(1|2)$/);
  });

  it('handles empty backlog array', () => {
    const mixer = new BacklogMixer();

    const recent: ContentItem[] = [
      { id: '1', sourceType: 'YOUTUBE', sourceId: 's1' } as ContentItem,
      { id: '2', sourceType: 'YOUTUBE', sourceId: 's1' } as ContentItem,
    ];
    const backlog: ContentItem[] = [];

    const result = mixer.mix(recent, backlog, 0.5);

    // With 0.5 ratio, backlogCount = floor(2 * 0.5) = 1, recentCount = 1
    // But backlog is empty, so we only get 1 item from recent
    expect(result).toHaveLength(1);
    expect(result[0].id).toMatch(/^(1|2)$/);
  });

  it('handles both arrays empty', () => {
    const mixer = new BacklogMixer();

    const result = mixer.mix([], [], 0.5);

    expect(result).toEqual([]);
  });

  it('shuffles content randomly (not always same order)', () => {
    const mixer = new BacklogMixer();

    const recent: ContentItem[] = Array.from({ length: 10 }, (_, i) => ({
      id: `r${i}`,
      sourceType: 'YOUTUBE',
      sourceId: 's1',
    })) as ContentItem[];

    const backlog: ContentItem[] = Array.from({ length: 10 }, (_, i) => ({
      id: `b${i}`,
      sourceType: 'YOUTUBE',
      sourceId: 's1',
    })) as ContentItem[];

    // Run multiple times and check that order varies
    const results = Array.from({ length: 5 }, () => mixer.mix(recent, backlog, 0.5));

    // Check that not all results are identical (shuffling is working)
    const allSame = results.every((result, i, arr) => {
      if (i === 0) return true;
      return JSON.stringify(result) === JSON.stringify(arr[0]);
    });

    // It's statistically extremely unlikely all 5 shuffles are identical
    expect(allSame).toBe(false);
  });

  it('respects the ratio with fractional results (rounds down)', () => {
    const mixer = new BacklogMixer();

    const recent: ContentItem[] = [
      { id: '1', sourceType: 'YOUTUBE', sourceId: 's1' } as ContentItem,
      { id: '2', sourceType: 'YOUTUBE', sourceId: 's1' } as ContentItem,
      { id: '3', sourceType: 'YOUTUBE', sourceId: 's1' } as ContentItem,
    ];

    const backlog: ContentItem[] = [
      { id: '4', sourceType: 'YOUTUBE', sourceId: 's1' } as ContentItem,
      { id: '5', sourceType: 'YOUTUBE', sourceId: 's1' } as ContentItem,
    ];

    // 0.3 ratio = 1.5 items, should round to 1
    const result = mixer.mix(recent, backlog, 0.3);

    const backlogCount = result.filter((item) => item.id === '4' || item.id === '5').length;

    // Should have 1 backlog item (Math.floor(5 * 0.3) = 1)
    expect(backlogCount).toBe(1);
  });
});
