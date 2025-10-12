// Core domain types for content items
// Pure TypeScript - no external dependencies

export type SourceType = 'YOUTUBE' | 'TWITCH' | 'RSS' | 'PODCAST';

export interface ContentItem {
  id: string; // Internal UUID

  // Source identification
  sourceType: SourceType;
  sourceId: string; // Channel ID, username, feed URL
  originalId: string; // Platform-specific ID

  // Metadata
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  url: string; // Link to original content
  duration: number | null; // Seconds (null for articles)
  publishedAt: Date;

  // System metadata
  fetchedAt: Date;
  lastSeenInFeed: Date;

  // Computed (populated by FilterEngine)
  isFiltered?: boolean;
  filterReason?: string[];
}

export interface ContentSource {
  id: string;
  userId: string;

  type: SourceType;
  sourceId: string; // Platform-specific identifier
  displayName: string;
  avatarUrl: string | null;

  // Behavior flags
  isMuted: boolean; // Temporarily hidden
  alwaysSafe: boolean; // Skip filtering for this source

  // State
  addedAt: Date;
  lastFetchAt: Date | null;
  lastFetchStatus: 'success' | 'error' | 'pending';
  errorMessage: string | null;
}

export type InteractionType = 'WATCHED' | 'SAVED' | 'DISMISSED' | 'NOT_NOW' | 'BLOCKED';

export interface ContentInteraction {
  id: string;
  userId: string;
  contentId: string;

  type: InteractionType;
  timestamp: Date;

  // Context (type-specific)
  watchDuration?: number; // For WATCHED
  completionRate?: number; // For WATCHED (0.0-1.0)
  dismissReason?: string; // For DISMISSED
  collection?: string; // For SAVED
}

export interface FilterConfiguration {
  userId: string;
  keywords: FilterKeyword[];
  durationRange: DurationRange | null;
  contentTypePreferences: SourceType[];
}

export interface FilterKeyword {
  id: string;
  keyword: string;
  isWildcard: boolean;
  createdAt: Date;
}

export interface DurationRange {
  min: number | null; // seconds
  max: number | null; // seconds
}

export interface FeedPreferences {
  userId: string;

  // Content mix
  backlogRatio: number; // 0.0-1.0, proportion of older content
  maxConsecutiveFromSource: number; // Diversity enforcement

  // UI preferences
  theme: 'light' | 'dark';
  density: 'compact' | 'cozy' | 'comfortable';
  autoPlay: boolean;

  updatedAt: Date;
}
