// Adapter Registry - Central place to initialize all content adapters

import { ContentAdapter } from '@/adapters/content/base-adapter';
import { YouTubeAdapter } from '@/adapters/content/youtube/youtube-adapter';
import { YouTubeClient } from '@/adapters/content/youtube/youtube-client';
import { YouTubeCache } from '@/adapters/content/youtube/youtube-cache';
import { YtDlpAdapter } from '@/adapters/content/youtube/yt-dlp-adapter';
import { YtDlpClient } from '@/adapters/content/youtube/yt-dlp-client';
import { SourceType } from '@/domain/content/content-item';
import { ENV } from './config';
import { db } from './db';
import { createLogger } from './logger';

const log = createLogger('adapters');

/**
 * Get all configured content adapters
 * Returns a Map of SourceType to ContentAdapter instances
 */
export function getAdapters(): Map<SourceType, ContentAdapter> {
  const adapters = new Map<SourceType, ContentAdapter>();

  // YouTube adapter - choose between yt-dlp (no quota) or YouTube API
  if (ENV.useYtDlp) {
    log.info('Using yt-dlp adapter for YouTube (quota-free)');
    const ytDlpClient = new YtDlpClient();
    const ytDlpAdapter = new YtDlpAdapter(ytDlpClient);
    adapters.set('YOUTUBE', ytDlpAdapter);
  } else if (ENV.youtubeApiKey) {
    log.info('Using YouTube API adapter (requires quota)');
    const youtubeCache = new YouTubeCache(db);
    const youtubeClient = new YouTubeClient(ENV.youtubeApiKey, youtubeCache);
    const youtubeAdapter = new YouTubeAdapter(youtubeClient);
    adapters.set('YOUTUBE', youtubeAdapter);
  } else {
    log.warn('No YouTube adapter configured (set YOUTUBE_API_KEY or USE_YT_DLP=true)');
  }

  // TODO: Add other adapters as they are implemented
  // - RSS
  // - Twitch
  // - Podcast

  return adapters;
}
