// Base adapter interface - Port definition in hexagonal architecture
// All content adapters must implement this interface

import { ContentItem, SourceType } from '@/domain/content/content-item';

export interface ContentAdapter {
  readonly sourceType: SourceType;

  // Fetch recent content (last N days)
  fetchRecent(sourceId: string, days: number): Promise<ContentItem[]>;

  // Fetch older backlog content (incremental with pagination)
  fetchBacklog(
    sourceId: string,
    limit: number,
    pageToken?: string
  ): Promise<{ items: ContentItem[]; nextPageToken?: string; hasMore: boolean }>;

  // Validate source exists and is accessible
  validateSource(sourceId: string): Promise<SourceValidation>;

  // Get source metadata
  getSourceMetadata(sourceId: string): Promise<SourceMetadata>;
}

export interface SourceValidation {
  isValid: boolean;
  displayName?: string;
  avatarUrl?: string;
  errorMessage?: string;
  // For cases where the input needs to be resolved (e.g., @handle -> channel ID)
  resolvedId?: string;
}

export interface SourceMetadata {
  displayName: string;
  description: string;
  avatarUrl: string;
  subscriberCount?: number;
  totalContent?: number;
}
