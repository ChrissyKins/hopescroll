// YouTube Adapter - Implements ContentAdapter interface
// Normalizes YouTube data to our domain model

import { ContentItem } from '@/domain/content/content-item';
import {
  ContentAdapter,
  SourceValidation,
  SourceMetadata,
} from '../base-adapter';
import { YouTubeClient } from './youtube-client';
import { YouTubeVideo, YouTubeSearchItem } from './youtube-types';
import { createLogger } from '@/lib/logger';

const log = createLogger('youtube-adapter');

export class YouTubeAdapter implements ContentAdapter {
  readonly sourceType = 'YOUTUBE' as const;

  constructor(private client: YouTubeClient) {}

  async fetchRecent(channelId: string, days: number): Promise<ContentItem[]> {
    log.info({ channelId, days }, 'Fetching recent YouTube videos');

    const publishedAfter = new Date();
    publishedAfter.setDate(publishedAfter.getDate() - days);

    // Search for videos from channel
    const searchResponse = await this.client.searchChannelVideos({
      channelId,
      publishedAfter,
      maxResults: 50,
    });

    if (!searchResponse || !searchResponse.items || searchResponse.items.length === 0) {
      return [];
    }

    // Get full video details (including duration)
    const videoIds = searchResponse.items
      .map((item) => item.id.videoId)
      .filter((id): id is string => id !== undefined);

    const videosResponse = await this.client.getVideos(videoIds);

    if (!videosResponse || !videosResponse.items) {
      return [];
    }

    return videosResponse.items.map((video) =>
      this.mapToContentItem(video, channelId)
    );
  }

  async fetchBacklog(
    channelId: string,
    limit: number,
    pageToken?: string
  ): Promise<{ items: ContentItem[]; nextPageToken?: string; hasMore: boolean }> {
    log.info({ channelId, limit, pageToken }, 'Fetching YouTube backlog incrementally');

    // Get the channel's uploads playlist ID
    const channelResponse = await this.client.getChannel(channelId);
    if (!channelResponse || !channelResponse.items || channelResponse.items.length === 0) {
      log.warn({ channelId }, 'Channel not found for backlog fetch');
      return { items: [], hasMore: false };
    }

    const uploadsPlaylistId = channelResponse.items[0].contentDetails?.relatedPlaylists?.uploads;
    if (!uploadsPlaylistId) {
      log.warn({ channelId }, 'No uploads playlist found for channel');
      return { items: [], hasMore: false };
    }

    log.info({ channelId, uploadsPlaylistId, limit }, 'Fetching backlog page from uploads playlist');

    // Fetch videos in batches of 50 until we hit the limit
    const allItems: ContentItem[] = [];
    let currentPageToken = pageToken;
    let videosRemaining = limit;

    while (videosRemaining > 0) {
      const batchSize = Math.min(50, videosRemaining);

      const playlistResponse = await this.client.getPlaylistItems({
        playlistId: uploadsPlaylistId,
        maxResults: batchSize,
        pageToken: currentPageToken,
      });

      if (!playlistResponse || !playlistResponse.items || playlistResponse.items.length === 0) {
        // No more results
        return { items: allItems, hasMore: false };
      }

      const videoIds = playlistResponse.items
        .map((item) => item.snippet?.resourceId?.videoId || item.id?.videoId)
        .filter((id): id is string => id !== undefined);

      if (videoIds.length === 0) {
        break;
      }

      const videosResponse = await this.client.getVideos(videoIds);

      if (videosResponse && videosResponse.items) {
        const items = videosResponse.items.map((video) =>
          this.mapToContentItem(video, channelId)
        );
        allItems.push(...items);
      }

      videosRemaining -= videoIds.length;

      // Check if there are more pages
      if (!playlistResponse.nextPageToken) {
        // No more pages available
        return { items: allItems, hasMore: false };
      }

      currentPageToken = playlistResponse.nextPageToken;

      // If we've fetched enough, return with the next page token
      if (videosRemaining <= 0) {
        return {
          items: allItems,
          nextPageToken: currentPageToken,
          hasMore: true
        };
      }
    }

    log.info({ channelId, fetchedCount: allItems.length }, 'Fetched backlog batch');

    return {
      items: allItems,
      nextPageToken: currentPageToken,
      hasMore: !!currentPageToken
    };
  }

  async validateSource(channelIdOrHandle: string): Promise<SourceValidation> {
    try {
      log.debug({ input: channelIdOrHandle }, 'Validating YouTube channel');

      // First, resolve the input to a channel ID (handles @username or channel IDs)
      const channelId = await this.client.resolveChannelId(channelIdOrHandle);

      if (!channelId) {
        return {
          isValid: false,
          errorMessage: 'Channel not found. Please check the channel ID or handle.',
        };
      }

      // Get the channel details
      const channelResponse = await this.client.getChannel(channelId);

      if (!channelResponse || !channelResponse.items || channelResponse.items.length === 0) {
        return {
          isValid: false,
          errorMessage: 'Channel not found',
        };
      }

      const channel = channelResponse.items[0];

      return {
        isValid: true,
        displayName: channel.snippet.title,
        avatarUrl: channel.snippet.thumbnails.high.url,
        // Return the resolved channel ID so it can be stored
        resolvedId: channelId,
      };
    } catch (error) {
      log.error({ error, input: channelIdOrHandle }, 'Failed to validate YouTube channel');
      return {
        isValid: false,
        errorMessage:
          error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async searchChannels(query: string): Promise<{
    channelId: string;
    displayName: string;
    description: string;
    avatarUrl: string;
    subscriberCount?: number;
  }[]> {
    log.debug({ query }, 'Searching YouTube channels');

    const searchResponse = await this.client.searchChannels({
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

    // Batch fetch all channels in one API request (much more efficient!)
    log.debug({ channelIds, count: channelIds.length }, 'Batch fetching channel details');
    const channelsResponse = await this.client.getChannels(channelIds);

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
  }

  async getSourceMetadata(channelId: string): Promise<SourceMetadata> {
    log.debug({ channelId }, 'Getting YouTube channel metadata');

    const channelResponse = await this.client.getChannel(channelId);

    if (!channelResponse || !channelResponse.items || channelResponse.items.length === 0) {
      throw new Error('Channel not found');
    }

    const channel = channelResponse.items[0];

    return {
      displayName: channel.snippet.title,
      description: channel.snippet.description,
      avatarUrl: channel.snippet.thumbnails.high.url,
      subscriberCount: channel.statistics
        ? parseInt(channel.statistics.subscriberCount, 10)
        : undefined,
      totalContent: channel.statistics
        ? parseInt(channel.statistics.videoCount, 10)
        : undefined,
    };
  }

  private mapToContentItem(
    video: YouTubeVideo,
    channelId: string
  ): ContentItem {
    return {
      id: this.generateId(),
      sourceType: this.sourceType,
      sourceId: channelId,
      originalId: video.id,
      title: video.snippet.title,
      description: video.snippet.description,
      thumbnailUrl: video.snippet.thumbnails.medium.url,
      url: `https://youtube.com/watch?v=${video.id}`,
      duration: this.parseDuration(video.contentDetails.duration),
      publishedAt: new Date(video.snippet.publishedAt),
      fetchedAt: new Date(),
      lastSeenInFeed: new Date(),
    };
  }

  private parseDuration(isoDuration: string): number | null {
    // Parse ISO 8601 duration (PT15M33S) to seconds
    // Format: PT[hours]H[minutes]M[seconds]S
    try {
      const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
      if (!match) return null;

      const hours = parseInt(match[1] || '0', 10);
      const minutes = parseInt(match[2] || '0', 10);
      const seconds = parseInt(match[3] || '0', 10);

      return hours * 3600 + minutes * 60 + seconds;
    } catch (error) {
      log.warn({ isoDuration, error }, 'Failed to parse duration');
      return null;
    }
  }

  private generateId(): string {
    // Generate a proper UUID using Node.js crypto
    // Note: In production, this will be replaced by database-generated IDs (cuid)
    return crypto.randomUUID();
  }
}
