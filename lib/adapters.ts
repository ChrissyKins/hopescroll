// Adapter Registry - Central place to initialize all content adapters

import { ContentAdapter } from '@/adapters/content/base-adapter';
import { YouTubeAdapter } from '@/adapters/content/youtube/youtube-adapter';
import { YouTubeClient } from '@/adapters/content/youtube/youtube-client';
import { YouTubeCache } from '@/adapters/content/youtube/youtube-cache';
import { SourceType } from '@/domain/content/content-item';
import { ENV } from './config';
import { db } from './db';

/**
 * Get all configured content adapters
 * Returns a Map of SourceType to ContentAdapter instances
 */
export function getAdapters(): Map<SourceType, ContentAdapter> {
  const adapters = new Map<SourceType, ContentAdapter>();

  // YouTube adapter with caching
  if (ENV.youtubeApiKey) {
    const youtubeCache = new YouTubeCache(db);
    const youtubeClient = new YouTubeClient(ENV.youtubeApiKey, youtubeCache);
    const youtubeAdapter = new YouTubeAdapter(youtubeClient);
    adapters.set('YOUTUBE', youtubeAdapter);
  }

  // TODO: Add other adapters as they are implemented
  // - RSS
  // - Twitch
  // - Podcast

  return adapters;
}
