// yt-dlp YouTube Adapter - Implements ContentAdapter interface
// Uses yt-dlp instead of YouTube API for fetching videos (no quota limits!)
// Hybrid approach: Uses YouTube API only for channel search (minimal quota usage)

import { ContentItem } from '@/domain/content/content-item';
import {
  ContentAdapter,
  SourceValidation,
  SourceMetadata,
} from '../base-adapter';
import { YtDlpClient, YtDlpVideo } from './yt-dlp-client';
import { YouTubeClient } from './youtube-client';
import { createLogger } from '@/lib/logger';

const log = createLogger('yt-dlp-adapter');

export class YtDlpAdapter implements ContentAdapter {
  readonly sourceType = 'YOUTUBE' as const;

  constructor(
    private client: YtDlpClient,
    private youtubeClient?: YouTubeClient
  ) {}

  async fetchRecent(channelId: string, days: number): Promise<ContentItem[]> {
    log.info({ channelId, days }, 'Fetching recent YouTube videos with yt-dlp');

    const publishedAfter = new Date();
    publishedAfter.setDate(publishedAfter.getDate() - days);

    try {
      // yt-dlp service has a max limit of 500 per request
      // Fetch recent videos with max limit
      const videos = await this.client.getChannelVideos(channelId, {
        dateAfter: publishedAfter,
        limit: 500, // Max limit supported by yt-dlp service
      });

      if (!videos || videos.length === 0) {
        return [];
      }

      // Get full video details for duration and other metadata
      const videoIds = videos.map((v) => v.id);
      const detailedVideos = await this.client.getVideoDetails(videoIds);

      return detailedVideos.map((video) =>
        this.mapToContentItem(video, channelId)
      );
    } catch (error) {
      log.error({ error, channelId, days }, 'Failed to fetch recent videos');
      throw error;
    }
  }

  /**
   * Fetch video IDs from a channel (lightweight - no full metadata)
   * Useful for checking which videos already exist in the database before fetching full details
   */
  async fetchVideoIds(
    channelId: string,
    limit: number,
    pageToken?: string
  ): Promise<{ videoIds: string[]; nextPageToken?: string; hasMore: boolean }> {
    log.info({ channelId, limit, pageToken }, 'Fetching video IDs (lightweight)');

    try {
      const offset = pageToken ? parseInt(pageToken, 10) : 0;

      // Fetch videos using --flat-playlist (lightweight)
      const videos = await this.client.getChannelVideos(channelId, {
        offset,
        limit,
      });

      if (!videos || videos.length === 0) {
        log.info({ channelId, offset }, 'No more videos found');
        return { videoIds: [], hasMore: false };
      }

      const videoIds = videos.map((v) => v.id).filter((id): id is string => !!id);
      const nextOffset = offset + videos.length;
      const hasMore = videos.length === limit;

      log.info(
        { channelId, videoCount: videoIds.length, nextOffset, hasMore },
        'Fetched video IDs'
      );

      return {
        videoIds,
        nextPageToken: hasMore ? nextOffset.toString() : undefined,
        hasMore,
      };
    } catch (error) {
      log.error({ error, channelId, limit }, 'Failed to fetch video IDs');
      throw error;
    }
  }

  /**
   * Fetch full content items for specific video IDs only
   * Used after deduplication to only fetch metadata for new videos
   */
  async fetchVideosByIds(
    videoIds: string[],
    channelId: string
  ): Promise<ContentItem[]> {
    if (videoIds.length === 0) {
      return [];
    }

    log.info({ channelId, videoCount: videoIds.length }, 'Fetching full metadata for specific videos');

    try {
      // Get full video details for the specified IDs
      const detailedVideos = await this.client.getVideoDetails(videoIds);

      const items = detailedVideos.map((video) =>
        this.mapToContentItem(video, channelId)
      );

      log.info({ channelId, fetchedCount: items.length }, 'Fetched full video metadata');

      return items;
    } catch (error) {
      log.error({ error, channelId, videoCount: videoIds.length }, 'Failed to fetch video metadata');
      throw error;
    }
  }

  async fetchBacklog(
    channelId: string,
    limit: number,
    pageToken?: string
  ): Promise<{ items: ContentItem[]; nextPageToken?: string; hasMore: boolean }> {
    log.info({ channelId, limit, pageToken }, 'Fetching YouTube backlog with yt-dlp (no limits)');

    try {
      // Parse pageToken as offset (we use offset-based pagination with yt-dlp)
      const offset = pageToken ? parseInt(pageToken, 10) : 0;

      // Fetch videos using --flat-playlist with pagination
      // Use the provided limit as the batch size
      const videos = await this.client.getChannelVideos(channelId, {
        offset,
        limit,
      });

      if (!videos || videos.length === 0) {
        log.info({ channelId, offset }, 'No more videos in backlog');
        return { items: [], hasMore: false };
      }

      // Get full video details
      const videoIds = videos.map((v) => v.id);
      const detailedVideos = await this.client.getVideoDetails(videoIds);

      const items = detailedVideos.map((video) =>
        this.mapToContentItem(video, channelId)
      );

      // Calculate next page token (new offset)
      const nextOffset = offset + videos.length;
      const hasMore = videos.length === limit; // If we got the full limit, there may be more

      log.info(
        { channelId, fetchedCount: items.length, nextOffset, hasMore },
        'Fetched backlog batch'
      );

      return {
        items,
        nextPageToken: hasMore ? nextOffset.toString() : undefined,
        hasMore,
      };
    } catch (error) {
      log.error({ error, channelId, limit }, 'Failed to fetch backlog');
      throw error;
    }
  }

  async validateSource(channelIdOrHandle: string): Promise<SourceValidation> {
    try {
      log.debug({ input: channelIdOrHandle }, 'Validating YouTube channel with yt-dlp');

      // First, try to resolve the input to a channel ID
      let channelId = await this.client.resolveChannelId(channelIdOrHandle);

      // If yt-dlp couldn't resolve it (e.g., @handle), try YouTube API as fallback
      if (!channelId && this.youtubeClient) {
        log.info({ input: channelIdOrHandle }, 'yt-dlp resolution failed, trying YouTube API fallback');

        try {
          // Try to resolve using YouTube API search
          const searchResponse = await this.youtubeClient.searchChannels({
            query: channelIdOrHandle.replace('@', ''),
            maxResults: 1,
          });

          if (searchResponse?.items && searchResponse.items.length > 0) {
            const resolvedId = searchResponse.items[0].id.channelId;
            if (resolvedId) {
              channelId = resolvedId;
              log.info({ input: channelIdOrHandle, channelId }, 'Resolved channel ID via YouTube API');
            }
          }
        } catch (apiError) {
          log.warn({ error: apiError, input: channelIdOrHandle }, 'YouTube API resolution also failed');
        }
      }

      if (!channelId) {
        return {
          isValid: false,
          errorMessage: 'Channel not found. Please check the channel ID or handle.',
        };
      }

      // Get channel metadata from yt-dlp service
      try {
        const metadata = await this.client.getChannelMetadata(channelId);

        // Extract thumbnail URL (prefer high quality)
        const thumbnail = this.extractBestThumbnail(metadata.thumbnails) || metadata.thumbnail;

        return {
          isValid: true,
          displayName: metadata.title || metadata.uploader || 'Unknown Channel',
          avatarUrl: thumbnail || '',
          resolvedId: channelId,
        };
      } catch (metadataError) {
        // If yt-dlp metadata fetch fails, try YouTube API as fallback
        if (this.youtubeClient) {
          log.info({ channelId }, 'yt-dlp metadata fetch failed, trying YouTube API fallback');

          const channelResponse = await this.youtubeClient.getChannel(channelId);

          if (channelResponse?.items && channelResponse.items.length > 0) {
            const channel = channelResponse.items[0];
            return {
              isValid: true,
              displayName: channel.snippet.title,
              avatarUrl: channel.snippet.thumbnails.high?.url || channel.snippet.thumbnails.default.url,
              resolvedId: channelId,
            };
          }
        }

        // Re-throw if both failed
        throw metadataError;
      }
    } catch (error) {
      log.error({ error, input: channelIdOrHandle }, 'Failed to validate YouTube channel');
      return {
        isValid: false,
        errorMessage:
          error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async getSourceMetadata(channelId: string): Promise<SourceMetadata> {
    log.debug({ channelId }, 'Getting YouTube channel metadata with yt-dlp');

    try {
      const metadata = await this.client.getChannelMetadata(channelId);

      // Extract thumbnail URL (prefer high quality)
      const thumbnail = this.extractBestThumbnail(metadata.thumbnails) || metadata.thumbnail;

      return {
        displayName: metadata.title || metadata.uploader || 'Unknown Channel',
        description: metadata.description || '',
        avatarUrl: thumbnail || '',
        subscriberCount: metadata.subscriber_count || metadata.channel_follower_count,
        totalContent: metadata.playlist_count,
      };
    } catch (error) {
      log.error({ error, channelId }, 'Failed to get channel metadata');
      throw new Error(
        `Failed to get channel metadata: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private mapToContentItem(
    video: YtDlpVideo,
    channelId: string
  ): ContentItem {
    // Extract thumbnail URL (prefer medium or high quality)
    const thumbnailUrl = this.extractBestThumbnail(video.thumbnails) || video.thumbnail || '';

    // Parse published date from upload_date (YYYYMMDD) or timestamp
    const publishedAt = this.parsePublishedDate(video);

    return {
      id: this.generateId(),
      sourceType: this.sourceType,
      sourceId: channelId,
      originalId: video.id,
      title: video.title,
      description: video.description || '',
      thumbnailUrl,
      url: video.webpage_url || `https://youtube.com/watch?v=${video.id}`,
      duration: video.duration || null, // yt-dlp returns duration in seconds directly
      publishedAt,
      fetchedAt: new Date(),
      lastSeenInFeed: new Date(),
    };
  }

  /**
   * Extract the best quality thumbnail from thumbnails array
   * Prefers medium/high quality thumbnails (around 320x180 or higher)
   */
  private extractBestThumbnail(
    thumbnails?: Array<{ url: string; height?: number; width?: number }>
  ): string | undefined {
    if (!thumbnails || thumbnails.length === 0) {
      return undefined;
    }

    // Sort by height (descending) and pick a reasonable quality
    const sorted = [...thumbnails].sort((a, b) => {
      const heightA = a.height || 0;
      const heightB = b.height || 0;
      return heightB - heightA;
    });

    // Prefer medium quality (around 180-360 height)
    const medium = sorted.find((t) => (t.height || 0) >= 180 && (t.height || 0) <= 360);
    if (medium) return medium.url;

    // Fallback to highest quality
    return sorted[0].url;
  }

  /**
   * Parse published date from yt-dlp video metadata
   * Tries timestamp first, then falls back to upload_date (YYYYMMDD format)
   */
  private parsePublishedDate(video: YtDlpVideo): Date {
    // Prefer timestamp (Unix timestamp in seconds)
    if (video.timestamp) {
      return new Date(video.timestamp * 1000);
    }

    // Fallback to upload_date (YYYYMMDD string)
    if (video.upload_date) {
      const year = parseInt(video.upload_date.substring(0, 4), 10);
      const month = parseInt(video.upload_date.substring(4, 6), 10) - 1; // JS months are 0-indexed
      const day = parseInt(video.upload_date.substring(6, 8), 10);
      return new Date(year, month, day);
    }

    // Fallback to current date if no date info available
    log.warn({ videoId: video.id }, 'No date information available, using current date');
    return new Date();
  }

  private generateId(): string {
    // Generate a proper UUID using Node.js crypto
    // Note: In production, this will be replaced by database-generated IDs (cuid)
    return crypto.randomUUID();
  }

  /**
   * Search for channels by name (HYBRID: uses YouTube API for minimal quota usage)
   * This is the only method that uses YouTube API - all other methods use yt-dlp
   * @param query - Search query
   * @returns Array of channel search results
   */
  async searchChannels(query: string): Promise<{
    channelId: string;
    displayName: string;
    description: string;
    avatarUrl: string;
    subscriberCount?: number;
  }[]> {
    // If no YouTube client is provided, we can't search
    if (!this.youtubeClient) {
      log.warn(
        { query },
        'YouTube API client not configured for channel search - returning empty results'
      );
      return [];
    }

    log.debug({ query }, 'Searching YouTube channels via API (hybrid approach)');

    try {
      const searchResponse = await this.youtubeClient.searchChannels({
        query,
        maxResults: 10,
      });

      if (!searchResponse || !searchResponse.items || searchResponse.items.length === 0) {
        return [];
      }

      // Get full channel details for subscriber counts
      const channelIds = searchResponse.items
        .map((item) => item.id.channelId)
        .filter((id): id is string => id !== undefined);

      if (channelIds.length === 0) {
        return [];
      }

      // Batch fetch all channels in one API request
      log.debug({ channelIds, count: channelIds.length }, 'Batch fetching channel details');
      const channelsResponse = await this.youtubeClient.getChannels(channelIds);

      if (!channelsResponse || !channelsResponse.items || channelsResponse.items.length === 0) {
        log.warn({ channelIds }, 'No channel details returned from batch request');
        return [];
      }

      // Map the results
      return channelsResponse.items.map((channel) => ({
        channelId: channel.id,
        displayName: channel.snippet.title,
        description: channel.snippet.description,
        avatarUrl: channel.snippet.thumbnails.high?.url || channel.snippet.thumbnails.default.url,
        subscriberCount: channel.statistics
          ? parseInt(channel.statistics.subscriberCount, 10)
          : undefined,
      }));
    } catch (error) {
      log.error({ error, query }, 'Failed to search channels');
      throw error;
    }
  }
}
