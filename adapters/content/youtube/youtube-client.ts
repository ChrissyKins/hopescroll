// YouTube API Client
// Handles raw API requests to YouTube Data API v3

import { ENV } from '@/lib/config';
import { ExternalApiError, RateLimitError } from '@/lib/errors';
import { createLogger } from '@/lib/logger';
import {
  YouTubeSearchResponse,
  YouTubeVideoResponse,
  YouTubeChannelResponse,
  YouTubeActivitiesResponse,
} from './youtube-types';

const log = createLogger('youtube-client');

export class YouTubeClient {
  private baseUrl = 'https://www.googleapis.com/youtube/v3';
  private apiKey: string;
  private accessToken?: string;

  constructor(apiKey?: string, accessToken?: string) {
    this.apiKey = apiKey || ENV.youtubeApiKey;
    this.accessToken = accessToken;
    if (!this.apiKey && !this.accessToken) {
      log.warn('YouTube API key or access token not configured');
    }
  }

  async searchChannelVideos(params: {
    channelId: string;
    publishedAfter?: Date;
    maxResults?: number;
    pageToken?: string;
  }): Promise<YouTubeSearchResponse> {
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

    return this.request<YouTubeSearchResponse>(
      `/search?${searchParams.toString()}`
    );
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
    const searchParams = new URLSearchParams({
      part: 'snippet,statistics,contentDetails',
      id: channelId,
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
    const searchParams = new URLSearchParams({
      part: 'snippet',
      playlistId: params.playlistId,
      maxResults: (params.maxResults || 50).toString(),
      key: this.apiKey,
    });

    if (params.pageToken) {
      searchParams.append('pageToken', params.pageToken);
    }

    return this.request<YouTubeSearchResponse>(
      `/playlistItems?${searchParams.toString()}`
    );
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

  async searchVideos(params: {
    query?: string;
    relatedToVideoId?: string;
    maxResults?: number;
    order?: 'date' | 'relevance' | 'viewCount' | 'rating';
  }): Promise<YouTubeSearchResponse> {
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

    return this.request<YouTubeSearchResponse>(
      `/search?${searchParams.toString()}`
    );
  }

  /**
   * Get user's YouTube watch history
   * Requires OAuth authentication with youtube.readonly scope
   */
  async getWatchHistory(params: {
    maxResults?: number;
    pageToken?: string;
  }): Promise<YouTubeActivitiesResponse> {
    if (!this.accessToken) {
      throw new ExternalApiError(
        'YouTube',
        'OAuth access token required for watch history',
        { requiresAuth: true }
      );
    }

    const searchParams = new URLSearchParams({
      part: 'snippet,contentDetails',
      mine: 'true',
      maxResults: (params.maxResults || 50).toString(),
    });

    if (params.pageToken) {
      searchParams.append('pageToken', params.pageToken);
    }

    return this.request<YouTubeActivitiesResponse>(
      `/activities?${searchParams.toString()}`,
      true // Use OAuth
    );
  }

  /**
   * Get video IDs from user's watch history
   * Returns array of video IDs that the user has watched
   */
  async getWatchedVideoIds(maxResults: number = 100): Promise<string[]> {
    const activities = await this.getWatchHistory({ maxResults });

    const videoIds: string[] = [];

    for (const activity of activities.items) {
      // YouTube activities include various types - we want uploads/watches
      if (activity.contentDetails.upload?.videoId) {
        videoIds.push(activity.contentDetails.upload.videoId);
      }
    }

    log.info({ count: videoIds.length }, 'Fetched watched video IDs from YouTube');

    return videoIds;
  }

  private async request<T>(path: string, useOAuth: boolean = false): Promise<T> {
    const url = `${this.baseUrl}${path}`;

    try {
      log.debug({ url, useOAuth }, 'YouTube API request');

      const headers: HeadersInit = {};

      // Use OAuth token if available and requested, otherwise fall back to API key
      if (useOAuth && this.accessToken) {
        headers['Authorization'] = `Bearer ${this.accessToken}`;
      }

      const response = await fetch(url, { headers });

      if (!response.ok) {
        if (response.status === 429) {
          throw new RateLimitError('YouTube API rate limit exceeded');
        }

        const error = await response.json().catch(() => ({}));
        throw new ExternalApiError(
          'YouTube',
          error.error?.message || response.statusText,
          { status: response.status, error }
        );
      }

      const data = await response.json();
      log.debug({ url, itemCount: data.items?.length }, 'YouTube API response');

      return data as T;
    } catch (error) {
      if (error instanceof ExternalApiError || error instanceof RateLimitError) {
        throw error;
      }

      log.error({ error, url }, 'YouTube API request failed');
      throw new ExternalApiError(
        'YouTube',
        error instanceof Error ? error.message : 'Unknown error',
        { originalError: error }
      );
    }
  }
}
