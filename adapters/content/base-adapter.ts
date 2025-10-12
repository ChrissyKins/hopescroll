// Base adapter interface - Port definition in hexagonal architecture
// All content adapters must implement this interface

import { ContentItem, SourceType } from '@/domain/content/content-item';

export interface ContentAdapter {
  readonly sourceType: SourceType;

  // Fetch recent content (last N days)
  fetchRecent(sourceId: string, days: number): Promise<ContentItem[]>;

  // Fetch older backlog content
  fetchBacklog(
    sourceId: string,
    limit: number,
    offset: number
  ): Promise<ContentItem[]>;

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
}

export interface SourceMetadata {
  displayName: string;
  description: string;
  avatarUrl: string;
  subscriberCount?: number;
  totalContent?: number;
}
