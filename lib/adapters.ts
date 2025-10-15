// Adapter Registry - Central place to initialize all content adapters

import { ContentAdapter } from '@/adapters/content/base-adapter';
import { YouTubeAdapter } from '@/adapters/content/youtube/youtube-adapter';
import { YouTubeClient } from '@/adapters/content/youtube/youtube-client';
import { SourceType } from '@/domain/content/content-item';
import { ENV } from './config';

/**
 * Get all configured content adapters
 * Returns a Map of SourceType to ContentAdapter instances
 */
export function getAdapters(): Map<SourceType, ContentAdapter> {
  const adapters = new Map<SourceType, ContentAdapter>();

  // YouTube adapter
  if (ENV.youtubeApiKey) {
    const youtubeClient = new YouTubeClient(ENV.youtubeApiKey);
    const youtubeAdapter = new YouTubeAdapter(youtubeClient);
    adapters.set('YOUTUBE', youtubeAdapter);
  }

  // TODO: Add other adapters as they are implemented
  // - RSS
  // - Twitch
  // - Podcast

  return adapters;
}
