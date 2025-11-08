// YouTube API Client
// Handles raw API requests to YouTube Data API v3

import { ENV } from '@/lib/config';
import { ExternalApiError, RateLimitError } from '@/lib/errors';
import { createLogger } from '@/lib/logger';
import {
  YouTubeSearchResponse,
  YouTubeVideoResponse,
  YouTubeChannelResponse,
} from './youtube-types';
import { YouTubeCache } from './youtube-cache';

const log = createLogger('youtube-client');

// Add delay between requests to avoid bot detection (1-2 seconds)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const randomDelay = () => delay(1000 + Math.random() * 1000); // 1-2 seconds

// Exponential backoff retry configuration
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

export class YouTubeClient {
  private baseUrl = 'https://www.googleapis.com/youtube/v3';
  private apiKey: string;
  private cache?: YouTubeCache;
  private lastRequestTime = 0;

  constructor(apiKey?: string, cache?: YouTubeCache) {
    this.apiKey = apiKey || ENV.youtubeApiKey;
    this.cache = cache;
    if (!this.apiKey) {
      log.warn('YouTube API key not configured');
    }
  }

  async searchChannelVideos(params: {
    channelId: string;
    publishedAfter?: Date;
    maxResults?: number;
    pageToken?: string;
  }): Promise<YouTubeSearchResponse> {
    // Try cache first (only for recent fetches, not paginated)
    if (this.cache && !params.pageToken) {
      const cacheParams = {
        channelId: params.channelId,
        publishedAfter: params.publishedAfter?.toISOString(),
        maxResults: params.maxResults || 50,
      };
      const cached = await this.cache.get<YouTubeSearchResponse>('videos', cacheParams);
      if (cached) {
        return cached;
      }
    }

    const searchParams = new URLSearchParams({
      part: 'snippet',
      channelId: params.channelId,
      type: 'video',
      order: 'date',
      maxResults: (params.maxResults || 50).toString(),
      key: this.apiKey,
    });

    if (params.publishedAfter) {
      searchParams.append(
        'publishedAfter',
        params.publishedAfter.toISOString()
      );
    }

    if (params.pageToken) {
      searchParams.append('pageToken', params.pageToken);
    }

    const response = await this.request<YouTubeSearchResponse>(
      `/search?${searchParams.toString()}`
    );

    // Cache only non-paginated responses
    if (this.cache && !params.pageToken) {
      const cacheParams = {
        channelId: params.channelId,
        publishedAfter: params.publishedAfter?.toISOString(),
        maxResults: params.maxResults || 50,
      };
      await this.cache.set('videos', cacheParams, response);
    }

    return response;
  }

  async getVideos(videoIds: string[]): Promise<YouTubeVideoResponse> {
    if (!videoIds || videoIds.length === 0) {
      return { items: [] };
    }

    const searchParams = new URLSearchParams({
      part: 'snippet,contentDetails,statistics',
      id: videoIds.join(','),
      key: this.apiKey,
    });

    return this.request<YouTubeVideoResponse>(
      `/videos?${searchParams.toString()}`
    );
  }

  async getChannel(channelId: string): Promise<YouTubeChannelResponse> {
    // Try cache first
    if (this.cache) {
      const cached = await this.cache.get<YouTubeChannelResponse>('channel', { channelId });
      if (cached) {
        return cached;
      }
    }

    const searchParams = new URLSearchParams({
      part: 'snippet,statistics,contentDetails',
      id: channelId,
      key: this.apiKey,
    });

    const response = await this.request<YouTubeChannelResponse>(
      `/channels?${searchParams.toString()}`
    );

    // Cache the response
    if (this.cache) {
      await this.cache.set('channel', { channelId }, response);
    }

    return response;
  }

  /**
   * Get multiple channels in a single batch request
   * More efficient than calling getChannel multiple times
   * @param channelIds - Array of channel IDs (max 50)
   */
  async getChannels(channelIds: string[]): Promise<YouTubeChannelResponse> {
    if (!channelIds || channelIds.length === 0) {
      return { items: [] };
    }

    // YouTube API supports up to 50 IDs per request
    if (channelIds.length > 50) {
      log.warn({ count: channelIds.length }, 'getChannels called with >50 IDs, truncating to 50');
      channelIds = channelIds.slice(0, 50);
    }

    const searchParams = new URLSearchParams({
      part: 'snippet,statistics,contentDetails',
      id: channelIds.join(','), // Batch request with comma-separated IDs
      key: this.apiKey,
    });

    return this.request<YouTubeChannelResponse>(
      `/channels?${searchParams.toString()}`
    );
  }

  async getPlaylistItems(params: {
    playlistId: string;
    maxResults?: number;
    pageToken?: string;
  }): Promise<YouTubeSearchResponse> {
    // Try cache first (only for first page)
    if (this.cache && !params.pageToken) {
      const cacheParams = {
        playlistId: params.playlistId,
        maxResults: params.maxResults || 50,
      };
      const cached = await this.cache.get<YouTubeSearchResponse>('playlist', cacheParams);
      if (cached) {
        return cached;
      }
    }

    const searchParams = new URLSearchParams({
      part: 'snippet',
      playlistId: params.playlistId,
      maxResults: (params.maxResults || 50).toString(),
      key: this.apiKey,
    });

    if (params.pageToken) {
      searchParams.append('pageToken', params.pageToken);
    }

    const response = await this.request<YouTubeSearchResponse>(
      `/playlistItems?${searchParams.toString()}`
    );

    // Cache only first page
    if (this.cache && !params.pageToken) {
      const cacheParams = {
        playlistId: params.playlistId,
        maxResults: params.maxResults || 50,
      };
      await this.cache.set('playlist', cacheParams, response);
    }

    return response;
  }

  async getChannelByHandle(handle: string): Promise<YouTubeChannelResponse> {
    // Remove @ if present
    const cleanHandle = handle.startsWith('@') ? handle.slice(1) : handle;

    const searchParams = new URLSearchParams({
      part: 'snippet,statistics',
      forHandle: cleanHandle,
      key: this.apiKey,
    });

    return this.request<YouTubeChannelResponse>(
      `/channels?${searchParams.toString()}`
    );
  }

  async resolveChannelId(input: string): Promise<string | null> {
    // If it starts with @ or looks like a handle, use handle lookup
    if (input.startsWith('@') || !input.startsWith('UC')) {
      try {
        const response = await this.getChannelByHandle(input);
        if (response.items && response.items.length > 0) {
          return response.items[0].id;
        }
      } catch (error) {
        log.debug({ input, error }, 'Failed to resolve handle, will try as channel ID');
      }
    }

    // Try as channel ID
    try {
      const response = await this.getChannel(input);
      if (response.items && response.items.length > 0) {
        return response.items[0].id;
      }
    } catch (error) {
      log.debug({ input, error }, 'Failed to resolve as channel ID');
    }

    return null;
  }

  async searchChannels(params: {
    query: string;
    maxResults?: number;
  }): Promise<YouTubeSearchResponse> {
    // Try cache first
    if (this.cache) {
      const cacheParams = { query: params.query, maxResults: params.maxResults || 10, type: 'channel' };
      const cached = await this.cache.get<YouTubeSearchResponse>('search', cacheParams);
      if (cached) {
        return cached;
      }
    }

    const searchParams = new URLSearchParams({
      part: 'snippet',
      type: 'channel',
      maxResults: (params.maxResults || 10).toString(),
      order: 'relevance',
      q: params.query,
      key: this.apiKey,
    });

    const response = await this.request<YouTubeSearchResponse>(
      `/search?${searchParams.toString()}`
    );

    // Cache the response
    if (this.cache) {
      const cacheParams = { query: params.query, maxResults: params.maxResults || 10, type: 'channel' };
      await this.cache.set('search', cacheParams, response);
    }

    return response;
  }

  async searchVideos(params: {
    query?: string;
    relatedToVideoId?: string;
    maxResults?: number;
    order?: 'date' | 'relevance' | 'viewCount' | 'rating';
  }): Promise<YouTubeSearchResponse> {
    // Try cache first
    if (this.cache) {
      const cacheParams = {
        query: params.query,
        relatedToVideoId: params.relatedToVideoId,
        maxResults: params.maxResults || 25,
        order: params.order || 'relevance',
      };
      const cached = await this.cache.get<YouTubeSearchResponse>('videoSearch', cacheParams);
      if (cached) {
        return cached;
      }
    }

    const searchParams = new URLSearchParams({
      part: 'snippet',
      type: 'video',
      maxResults: (params.maxResults || 25).toString(),
      order: params.order || 'relevance',
      key: this.apiKey,
    });

    if (params.query) {
      searchParams.append('q', params.query);
    }

    if (params.relatedToVideoId) {
      searchParams.append('relatedToVideoId', params.relatedToVideoId);
    }

    const response = await this.request<YouTubeSearchResponse>(
      `/search?${searchParams.toString()}`
    );

    // Cache the response
    if (this.cache) {
      const cacheParams = {
        query: params.query,
        relatedToVideoId: params.relatedToVideoId,
        maxResults: params.maxResults || 25,
        order: params.order || 'relevance',
      };
      await this.cache.set('videoSearch', cacheParams, response);
    }

    return response;
  }

  private async request<T>(path: string, retryCount = 0): Promise<T> {
    const url = `${this.baseUrl}${path}`;

    // Extract API method from path for better logging
    const apiMethod = path.split('?')[0].replace(/^\//, '');

    // Add delay between requests to avoid bot detection
    const timeSinceLastRequest = Date.now() - this.lastRequestTime;
    if (timeSinceLastRequest < 1000) {
      // Ensure minimum 1 second between requests
      await randomDelay();
    }
    this.lastRequestTime = Date.now();

    try {
      log.info({ url, method: apiMethod, retryCount }, '→ YouTube API request');

      const response = await fetch(url);

      if (!response.ok) {
        if (response.status === 429) {
          log.warn({ method: apiMethod, status: 429, retryCount }, '⚠ YouTube API rate limit hit');

          // Exponential backoff retry for rate limits
          if (retryCount < MAX_RETRIES) {
            const retryDelay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
            log.info({ retryDelay, retryCount }, 'Retrying with exponential backoff');
            await delay(retryDelay);
            return this.request<T>(path, retryCount + 1);
          }

          log.error({ method: apiMethod, status: 429 }, '✗ YouTube API rate limit exceeded after retries');
          throw new RateLimitError('YouTube API rate limit exceeded');
        }

        const error = await response.json().catch(() => ({}));
        log.error(
          { method: apiMethod, status: response.status, error },
          '✗ YouTube API request failed'
        );
        throw new ExternalApiError(
          'YouTube',
          error.error?.message || response.statusText,
          { status: response.status, error }
        );
      }

      const data = await response.json();
      log.info(
        { method: apiMethod, itemCount: data.items?.length, pageInfo: data.pageInfo },
        '✓ YouTube API response'
      );

      return data as T;
    } catch (error) {
      if (error instanceof ExternalApiError || error instanceof RateLimitError) {
        throw error;
      }

      log.error({ error, method: apiMethod }, '✗ YouTube API request failed');
      throw new ExternalApiError(
        'YouTube',
        error instanceof Error ? error.message : 'Unknown error',
        { originalError: error }
      );
    }
  }
}
