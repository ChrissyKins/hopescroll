// Diversity Enforcer - Prevents too many items from same source consecutively
// Pure business logic

import { ContentItem } from '../content/content-item';

export class DiversityEnforcer {
  enforce(content: ContentItem[], maxConsecutive: number): ContentItem[] {
    if (content.length === 0) return [];

    const result: ContentItem[] = [content[0]];
    const remaining = [...content.slice(1)];

    while (remaining.length > 0) {
      const lastN = result.slice(-maxConsecutive);
      const lastSource = lastN[0]?.sourceId;

      // Check if all last N items are from same source
      const allSameSource = lastN.every(
        (item) =>
          item.sourceId === lastSource && item.sourceType === lastN[0].sourceType
      );

      if (allSameSource && lastN.length === maxConsecutive) {
        // Find item from different source
        const differentSourceIndex = remaining.findIndex(
          (item) =>
            item.sourceId !== lastSource || item.sourceType !== lastN[0].sourceType
        );

        if (differentSourceIndex >= 0) {
          result.push(remaining[differentSourceIndex]);
          remaining.splice(differentSourceIndex, 1);
        } else {
          // No different source available, add anyway
          result.push(remaining.shift()!);
        }
      } else {
        result.push(remaining.shift()!);
      }
    }

    return result;
  }
}
