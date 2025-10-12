// Filter Engine - Core filtering logic
// Pure business logic, no external dependencies

import { ContentItem } from '../content/content-item';
import { FilterRule } from './filter-rule';

export interface FilterResult {
  isFiltered: boolean;
  matchedRules: FilterRule[];
  reasons: string[];
}

export class FilterEngine {
  constructor(private rules: FilterRule[]) {}

  evaluate(content: ContentItem): FilterResult {
    const matchedRules: FilterRule[] = [];

    for (const rule of this.rules) {
      if (rule.matches(content)) {
        matchedRules.push(rule);
      }
    }

    return {
      isFiltered: matchedRules.length > 0,
      matchedRules,
      reasons: matchedRules.map((r) => r.getReason()),
    };
  }

  evaluateBatch(items: ContentItem[]): ContentItem[] {
    return items
      .map((item) => {
        const result = this.evaluate(item);
        return {
          ...item,
          isFiltered: result.isFiltered,
          filterReason: result.reasons,
        };
      })
      .filter((item) => !item.isFiltered);
  }

  // Test a single item without filtering it out
  test(content: ContentItem): FilterResult {
    return this.evaluate(content);
  }
}
