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

const log = createLogger('youtube-client');

export class YouTubeClient {
  private baseUrl = 'https://www.googleapis.com/youtube/v3';
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || ENV.youtubeApiKey;
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

  async searchChannels(params: {
    query: string;
    maxResults?: number;
  }): Promise<YouTubeSearchResponse> {
    const searchParams = new URLSearchParams({
      part: 'snippet',
      type: 'channel',
      maxResults: (params.maxResults || 10).toString(),
      order: 'relevance',
      q: params.query,
      key: this.apiKey,
    });

    return this.request<YouTubeSearchResponse>(
      `/search?${searchParams.toString()}`
    );
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

  private async request<T>(path: string): Promise<T> {
    const url = `${this.baseUrl}${path}`;

    try {
      log.debug({ url }, 'YouTube API request');

      const response = await fetch(url);

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
