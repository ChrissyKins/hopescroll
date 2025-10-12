// Feed Generator - Core feed generation algorithm
// Pure business logic, orchestrates diversity and backlog mixing

import {
  ContentItem,
  ContentSource,
  ContentInteraction,
  FeedPreferences,
} from '../content/content-item';
import { FeedItem } from './feed-item';
import { DiversityEnforcer } from './diversity-enforcer';
import { BacklogMixer } from './backlog-mixer';

// Re-export FeedItem for convenience
export type { FeedItem } from './feed-item';

export class FeedGenerator {
  constructor(
    private diversityEnforcer: DiversityEnforcer,
    private backlogMixer: BacklogMixer
  ) {}

  generate(
    sources: ContentSource[],
    allContent: ContentItem[],
    preferences: FeedPreferences,
    previousInteractions: ContentInteraction[]
  ): FeedItem[] {
    // 1. Filter out content already interacted with (except NOT_NOW)
    const unseenContent = this.filterSeen(allContent, previousInteractions);

    // 2. Separate recent and backlog content
    const { recent, backlog } = this.categorizeByAge(unseenContent);

    // 3. Mix according to backlog ratio
    const mixed = this.backlogMixer.mix(recent, backlog, preferences.backlogRatio);

    // 4. Enforce diversity (no more than N consecutive from same source)
    const diversified = this.diversityEnforcer.enforce(
      mixed,
      preferences.maxConsecutiveFromSource
    );

    // 5. Add "Not Now" items back into rotation (random positions)
    const withReturning = this.integrateReturningItems(
      diversified,
      allContent,
      previousInteractions
    );

    // 6. Enrich with metadata and position
    return withReturning.map((content, index) =>
      this.toFeedItem(content, index, sources)
    );
  }

  private filterSeen(
    content: ContentItem[],
    interactions: ContentInteraction[]
  ): ContentItem[] {
    const seenIds = new Set(
      interactions
        .filter((i) => ['WATCHED', 'DISMISSED', 'SAVED', 'BLOCKED'].includes(i.type))
        .map((i) => i.contentId)
    );

    return content.filter((item) => !seenIds.has(item.id));
  }

  private categorizeByAge(content: ContentItem[]): {
    recent: ContentItem[];
    backlog: ContentItem[];
  } {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recent: ContentItem[] = [];
    const backlog: ContentItem[] = [];

    for (const item of content) {
      if (item.publishedAt > sevenDaysAgo) {
        recent.push(item);
      } else {
        backlog.push(item);
      }
    }

    return { recent, backlog };
  }

  private toFeedItem(
    content: ContentItem,
    position: number,
    sources: ContentSource[]
  ): FeedItem {
    const source = sources.find(
      (s) => s.sourceId === content.sourceId && s.type === content.sourceType
    );

    return {
      content,
      position,
      isNew: this.isNew(content),
      sourceDisplayName: source?.displayName || 'Unknown',
      interactionState: null,
    };
  }

  private isNew(content: ContentItem): boolean {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return content.publishedAt > sevenDaysAgo;
  }

  private integrateReturningItems(
    feed: ContentItem[],
    allContent: ContentItem[],
    interactions: ContentInteraction[]
  ): ContentItem[] {
    // Find content marked as NOT_NOW that should return
    const notNowIds = new Set(
      interactions.filter((i) => i.type === 'NOT_NOW').map((i) => i.contentId)
    );

    const returningContent = allContent.filter((item) => notNowIds.has(item.id));

    // Randomly insert returning items (max 20% of feed)
    const maxReturning = Math.floor(feed.length * 0.2);
    const toReturn = this.shuffle(returningContent).slice(0, maxReturning);

    // Insert at random positions
    const result = [...feed];
    for (const item of toReturn) {
      const position = Math.floor(Math.random() * result.length);
      result.splice(position, 0, item);
    }

    return result;
  }

  private shuffle<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}
