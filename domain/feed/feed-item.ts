// Feed item value objects
// Transient representation of content in the feed (projection)

import { ContentItem, InteractionType } from '../content/content-item';

export interface FeedItem {
  content: ContentItem;
  position: number; // Feed order
  isNew: boolean; // Published in last 7 days
  sourceDisplayName: string;
  interactionState: InteractionState | null;
  isRecommended?: boolean; // From outside user's sources
}

export type InteractionState =
  | { type: 'never-seen' }
  | { type: 'dismissed-temp'; willReturnAt: Date }
  | { type: 'saved'; collection?: string }
  | { type: 'watched'; at: Date };

export function createInteractionState(
  type: InteractionType,
  timestamp: Date,
  collection?: string
): InteractionState {
  switch (type) {
    case 'WATCHED':
      return { type: 'watched', at: timestamp };
    case 'SAVED':
      return { type: 'saved', collection };
    case 'NOT_NOW':
      // Calculate when it should return (after 50 items or 1 day)
      const returnAt = new Date(timestamp);
      returnAt.setDate(returnAt.getDate() + 1);
      return { type: 'dismissed-temp', willReturnAt: returnAt };
    case 'DISMISSED':
    case 'BLOCKED':
      // These don't appear in feed at all
      return { type: 'never-seen' };
    default:
      return { type: 'never-seen' };
  }
}
