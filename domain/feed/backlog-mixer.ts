// Backlog Mixer - Mixes recent and older content
// Pure business logic

import { ContentItem } from '../content/content-item';

export class BacklogMixer {
  mix(recent: ContentItem[], backlog: ContentItem[], ratio: number): ContentItem[] {
    const totalItems = recent.length + backlog.length;
    const backlogCount = Math.floor(totalItems * ratio);
    const recentCount = totalItems - backlogCount;

    const selectedRecent = this.shuffle(recent).slice(0, recentCount);
    const selectedBacklog = this.shuffle(backlog).slice(0, backlogCount);

    // Interleave them
    return this.interleave(selectedRecent, selectedBacklog);
  }

  private interleave(a: ContentItem[], b: ContentItem[]): ContentItem[] {
    const result: ContentItem[] = [];
    const maxLength = Math.max(a.length, b.length);

    for (let i = 0; i < maxLength; i++) {
      if (i < a.length) result.push(a[i]);
      if (i < b.length) result.push(b[i]);
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
