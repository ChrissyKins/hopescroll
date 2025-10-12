import { describe, it, expect } from 'vitest';
import { DiversityEnforcer } from '@/domain/feed/diversity-enforcer';
import { ContentItem } from '@/domain/content/content-item';

describe('DiversityEnforcer', () => {
  it('enforces maximum consecutive items from same source', () => {
    const enforcer = new DiversityEnforcer();

    const content: ContentItem[] = [
      { id: '1', sourceId: 'source1', sourceType: 'YOUTUBE' } as ContentItem,
      { id: '2', sourceId: 'source1', sourceType: 'YOUTUBE' } as ContentItem,
      { id: '3', sourceId: 'source1', sourceType: 'YOUTUBE' } as ContentItem,
      { id: '4', sourceId: 'source1', sourceType: 'YOUTUBE' } as ContentItem,
      { id: '5', sourceId: 'source2', sourceType: 'YOUTUBE' } as ContentItem,
    ];

    const result = enforcer.enforce(content, 3);

    // After 3 consecutive from source1, should insert source2
    const consecutiveSource1 = result.reduce((acc, item, index) => {
      if (index === 0) return 1;
      if (
        item.sourceId === result[index - 1].sourceId &&
        item.sourceType === result[index - 1].sourceType
      ) {
        const count = acc + 1;
        expect(count).toBeLessThanOrEqual(3);
        return count;
      }
      return 1;
    }, 0);

    expect(result).toHaveLength(5);
  });

  it('handles content from single source', () => {
    const enforcer = new DiversityEnforcer();

    const content: ContentItem[] = [
      { id: '1', sourceId: 'source1', sourceType: 'YOUTUBE' } as ContentItem,
      { id: '2', sourceId: 'source1', sourceType: 'YOUTUBE' } as ContentItem,
      { id: '3', sourceId: 'source1', sourceType: 'YOUTUBE' } as ContentItem,
    ];

    const result = enforcer.enforce(content, 2);

    // Can't diversify if only one source
    expect(result).toHaveLength(3);
  });

  it('handles empty content array', () => {
    const enforcer = new DiversityEnforcer();
    const result = enforcer.enforce([], 3);
    expect(result).toEqual([]);
  });

  it('handles mixed source types correctly', () => {
    const enforcer = new DiversityEnforcer();

    const content: ContentItem[] = [
      { id: '1', sourceId: 'source1', sourceType: 'YOUTUBE' } as ContentItem,
      { id: '2', sourceId: 'source1', sourceType: 'YOUTUBE' } as ContentItem,
      { id: '3', sourceId: 'source1', sourceType: 'YOUTUBE' } as ContentItem,
      { id: '4', sourceId: 'source1', sourceType: 'TWITCH' } as ContentItem, // Different type
    ];

    const result = enforcer.enforce(content, 2);

    // source1 TWITCH is different from source1 YOUTUBE
    expect(result).toHaveLength(4);
  });
});
