// Filter rules - Strategy pattern implementation
// Pure business logic, no external dependencies

import { ContentItem } from '../content/content-item';

export interface FilterRule {
  matches(content: ContentItem): boolean;
  getReason(): string;
}

export class KeywordFilterRule implements FilterRule {
  constructor(
    private keyword: string,
    private isWildcard: boolean,
    private caseSensitive: boolean = false
  ) {}

  matches(content: ContentItem): boolean {
    const searchText = `${content.title} ${content.description || ''}`;
    const text = this.caseSensitive ? searchText : searchText.toLowerCase();
    const keyword = this.caseSensitive ? this.keyword : this.keyword.toLowerCase();

    if (this.isWildcard) {
      // Remove * from keyword for matching
      const pattern = keyword.replace(/\*/g, '');
      return text.includes(pattern);
    } else {
      // Whole word matching
      const regex = new RegExp(`\\b${this.escapeRegex(keyword)}\\b`, 'i');
      return regex.test(text);
    }
  }

  getReason(): string {
    return `Keyword: ${this.keyword}`;
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

export class DurationFilterRule implements FilterRule {
  constructor(
    private min: number | null,
    private max: number | null
  ) {}

  matches(content: ContentItem): boolean {
    if (!content.duration) return false;

    if (this.min !== null && content.duration < this.min) {
      return true;
    }

    if (this.max !== null && content.duration > this.max) {
      return true;
    }

    return false;
  }

  getReason(): string {
    if (this.min && this.max) {
      return `Duration not between ${this.formatDuration(this.min)} and ${this.formatDuration(this.max)}`;
    } else if (this.min) {
      return `Duration less than ${this.formatDuration(this.min)}`;
    } else {
      return `Duration more than ${this.formatDuration(this.max!)}`;
    }
  }

  private formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    return `${mins}m`;
  }
}

export class SourceTypeFilterRule implements FilterRule {
  constructor(private allowedTypes: Set<string>) {}

  matches(content: ContentItem): boolean {
    return !this.allowedTypes.has(content.sourceType);
  }

  getReason(): string {
    return `Content type not in allowed list`;
  }
}
