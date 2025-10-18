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
    offset: number
  ): Promise<ContentItem[]> {
    log.info({ channelId, limit, offset }, 'Fetching YouTube backlog');

    // Get the channel's uploads playlist ID
    const channelResponse = await this.client.getChannel(channelId);
    if (!channelResponse || !channelResponse.items || channelResponse.items.length === 0) {
      log.warn({ channelId }, 'Channel not found for backlog fetch');
      return [];
    }

    const uploadsPlaylistId = channelResponse.items[0].contentDetails?.relatedPlaylists?.uploads;
    if (!uploadsPlaylistId) {
      log.warn({ channelId }, 'No uploads playlist found for channel');
      return [];
    }

    log.info({ channelId, uploadsPlaylistId }, 'Using uploads playlist for backlog');

    // YouTube API uses page tokens instead of offset
    // We'll fetch multiple pages from the uploads playlist to get more historic content
    const allItems: ContentItem[] = [];
    let pageToken: string | undefined = undefined;
    const maxPages = Math.ceil(limit / 50); // YouTube API max per request is 50

    for (let page = 0; page < maxPages && allItems.length < limit; page++) {
      const playlistResponse = await this.client.getPlaylistItems({
        playlistId: uploadsPlaylistId,
        maxResults: 50, // Always request max to get as much as possible
        pageToken,
      });

      if (!playlistResponse || !playlistResponse.items || playlistResponse.items.length === 0) {
        break; // No more results
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

      // Check if there are more pages
      if (!playlistResponse.nextPageToken) {
        break; // No more pages
      }

      pageToken = playlistResponse.nextPageToken;
    }

    log.info({ channelId, fetchedCount: allItems.length, limit }, 'Fetched backlog items');

    // Return up to the requested limit
    return allItems.slice(0, limit);
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
