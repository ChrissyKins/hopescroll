// yt-dlp HTTP Client
// Wraps self-hosted yt-dlp HTTP API for YouTube video/channel fetching
// Provides methods for fetching channel videos, video details, and channel metadata
// Falls back to YouTube Data API when yt-dlp service is unavailable

import { createLogger } from '@/lib/logger';
import { ENV } from '@/lib/config';

const log = createLogger('yt-dlp-client');

// yt-dlp JSON output types
export interface YtDlpVideo {
  id: string;
  title: string;
  description?: string;
  thumbnail?: string; // Available in both flat and full extract
  thumbnails?: Array<{ url: string; height?: number; width?: number }>; // Available in both flat and full extract
  duration?: number; // seconds - Available in flat extract
  upload_date?: string; // YYYYMMDD format - Only in full extract
  timestamp?: number; // Unix timestamp - Only in full extract
  url?: string;
  webpage_url?: string;
  channel?: string;
  channel_id?: string;
  channel_url?: string;
  uploader?: string;
  uploader_id?: string;
  uploader_url?: string;
  view_count?: number; // Available in flat extract
  like_count?: number;
  comment_count?: number;
}

export interface YtDlpChannelInfo {
  id: string;
  title: string;
  description?: string;
  channel_id: string;
  channel_url: string;
  thumbnail?: string;
  thumbnails?: Array<{ url: string; height?: number; width?: number }>;
  uploader?: string;
  channel_follower_count?: number;
  subscriber_count?: number;
  playlist_count?: number;
  entries?: YtDlpVideo[]; // For playlist responses
}

export interface GetChannelVideosOptions {
  dateAfter?: Date;
  limit?: number; // No hard limit when using yt-dlp (unlike YouTube API)
  offset?: number;
}

export class YtDlpClient {
  private serviceUrl: string;
  private useCache: boolean;

  constructor(serviceUrl?: string, useCache = true) {
    this.serviceUrl = serviceUrl || ENV.ytDlpServiceUrl || '';
    this.useCache = useCache;

    if (!this.serviceUrl) {
      log.warn('No yt-dlp service URL configured. Set YOUTUBE_DLP_SERVICE_URL environment variable.');
    }
  }

  /**
   * Check if the yt-dlp service is available
   */
  async isServiceAvailable(): Promise<boolean> {
    if (!this.serviceUrl) {
      return false;
    }

    try {
      const response = await fetch(this.serviceUrl, {
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      const data = await response.json();
      return data.status === 'healthy';
    } catch (error) {
      log.warn({ error }, 'yt-dlp service health check failed');
      return false;
    }
  }

  /**
   * Get videos from a channel
   * @param channelId - YouTube channel ID (e.g., 'UCxxxxxx')
   * @param options - Filtering and pagination options
   * @returns Array of video metadata
   */
  async getChannelVideos(
    channelId: string,
    options: GetChannelVideosOptions = {}
  ): Promise<YtDlpVideo[]> {
    const { dateAfter, limit = 50, offset = 0 } = options;

    if (!this.serviceUrl) {
      throw new Error('yt-dlp service URL not configured');
    }

    // No artificial limits for yt-dlp - it can fetch as many as needed without quota concerns
    // Only limit is what the yt-dlp service can handle (configured server-side)
    const params = new URLSearchParams({
      limit: limit.toString(),
      use_cache: this.useCache.toString(),
    });

    log.info({ channelId, options }, 'Fetching channel videos from yt-dlp service');

    try {
      const response = await fetch(
        `${this.serviceUrl}/api/channel/${channelId}/videos?${params}`,
        {
          signal: AbortSignal.timeout(30000), // 30 second timeout
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: response.statusText }));
        throw new Error(error.detail || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      let videos = data.videos || [];

      // Apply date filter if specified (API doesn't support date filtering directly)
      if (dateAfter && videos.length > 0) {
        videos = videos.filter((video: YtDlpVideo) => {
          if (!video.upload_date && !video.timestamp) return true;

          const videoDate = video.timestamp
            ? new Date(video.timestamp * 1000)
            : this.parseDateString(video.upload_date!);

          return videoDate >= dateAfter;
        });
      }

      // Apply offset (API doesn't support offset directly, so we slice)
      if (offset > 0) {
        videos = videos.slice(offset);
      }

      // Apply limit after filtering
      if (limit && videos.length > limit) {
        videos = videos.slice(0, limit);
      }

      log.info(
        { channelId, count: videos.length, options },
        'Successfully fetched channel videos from service'
      );

      return videos;
    } catch (error) {
      log.error({ error, channelId, options }, 'Failed to fetch channel videos from service');

      // Better error message handling
      let errorMessage = 'Unknown error';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error && typeof error === 'object') {
        // Try to extract useful info from error object
        errorMessage = JSON.stringify(error);
      }

      throw new Error(`Failed to fetch channel videos: ${errorMessage}`);
    }
  }

  /**
   * Get full video details
   * @param videoIds - Array of video IDs
   * @returns Array of full video metadata
   */
  async getVideoDetails(videoIds: string[]): Promise<YtDlpVideo[]> {
    if (!videoIds || videoIds.length === 0) {
      return [];
    }

    if (!this.serviceUrl) {
      throw new Error('yt-dlp service URL not configured');
    }

    // Process in batches of 10 to avoid overwhelming the service
    const batchSize = 10;
    const allVideos: YtDlpVideo[] = [];

    for (let i = 0; i < videoIds.length; i += batchSize) {
      const batch = videoIds.slice(i, i + batchSize);

      log.info({ count: batch.length, total: videoIds.length }, 'Fetching video details batch from service');

      // Fetch videos in parallel
      const videoPromises = batch.map(async (videoId) => {
        const params = new URLSearchParams({
          use_cache: this.useCache.toString(),
        });

        try {
          const response = await fetch(
            `${this.serviceUrl}/api/video/${videoId}?${params}`,
            {
              signal: AbortSignal.timeout(20000), // 20 second timeout per video
            }
          );

          if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: response.statusText }));
            throw new Error(error.detail || `HTTP ${response.status}`);
          }

          return await response.json();
        } catch (error) {
          log.warn({ error, videoId }, 'Failed to fetch video details, skipping');
          return null;
        }
      });

      const videos = await Promise.all(videoPromises);
      const validVideos = videos.filter((v): v is YtDlpVideo => v !== null);
      allVideos.push(...validVideos);

      log.info({ count: validVideos.length }, 'Successfully fetched video details batch');
    }

    log.info({ total: allVideos.length }, 'Successfully fetched all video details from service');

    return allVideos;
  }

  /**
   * Get channel metadata
   * @param channelId - YouTube channel ID
   * @returns Channel metadata
   */
  async getChannelMetadata(channelId: string): Promise<YtDlpChannelInfo> {
    if (!this.serviceUrl) {
      throw new Error('yt-dlp service URL not configured');
    }

    log.info({ channelId }, 'Fetching channel metadata from yt-dlp service');

    try {
      // Fetch just 1 video to get channel metadata
      const params = new URLSearchParams({
        limit: '1',
        use_cache: this.useCache.toString(),
      });

      const response = await fetch(
        `${this.serviceUrl}/api/channel/${channelId}/videos?${params}`,
        {
          signal: AbortSignal.timeout(20000), // 20 second timeout
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: response.statusText }));
        throw new Error(error.detail || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.videos || data.videos.length === 0) {
        throw new Error('No videos found in channel');
      }

      // Extract channel info from response
      const video = data.videos[0];
      const channelInfo: YtDlpChannelInfo = {
        id: data.channel_id || video.channel_id || channelId,
        title: data.channel_name || video.channel_name || video.uploader || '',
        description: '',
        channel_id: data.channel_id || video.channel_id || channelId,
        channel_url: `https://www.youtube.com/channel/${channelId}`,
        uploader: data.channel_name || video.channel_name || video.uploader,
        thumbnail: video.thumbnail,
        thumbnails: video.thumbnails,
        playlist_count: data.video_count,
      };

      log.info({ channelId, title: channelInfo.title }, 'Successfully fetched channel metadata from service');

      return channelInfo;
    } catch (error) {
      log.error({ error, channelId }, 'Failed to fetch channel metadata from service');

      // Better error message handling
      let errorMessage = 'Unknown error';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error && typeof error === 'object') {
        errorMessage = JSON.stringify(error);
      }

      throw new Error(`Failed to fetch channel metadata: ${errorMessage}`);
    }
  }

  /**
   * Resolve a channel identifier (handle, username, or URL) to a channel ID
   * @param input - Channel handle (@username), username, or URL
   * @returns Channel ID or null if not found
   */
  async resolveChannelId(input: string): Promise<string | null> {
    if (!this.serviceUrl) {
      throw new Error('yt-dlp service URL not configured');
    }

    // If already a channel ID, return it
    if (input.startsWith('UC') && input.length === 24) {
      return input;
    }

    log.info({ input }, 'Resolving channel ID with yt-dlp service');

    try {
      // For handles or usernames, try fetching directly and extract channel ID from response
      // The API expects channel IDs, so we'll need to use a different approach

      // Try searching for the channel if it's a handle or username
      if (input.startsWith('@') || !input.startsWith('UC')) {
        // Note: The service might not have a direct resolve endpoint
        // As a workaround, we can try to fetch using the input as-is
        // and extract the channel ID from the response

        // For now, return null as the service doesn't support resolution
        // This will fall back to YouTube API in the adapter
        log.warn({ input }, 'Channel ID resolution requires YouTube API - service does not support handles/usernames directly');
        return null;
      }

      return null;
    } catch (error) {
      log.warn({ error, input }, 'Failed to resolve channel ID');
      return null;
    }
  }

  /**
   * Parse date string in YYYYMMDD format to Date object
   */
  private parseDateString(dateStr: string): Date {
    const year = parseInt(dateStr.substring(0, 4), 10);
    const month = parseInt(dateStr.substring(4, 6), 10) - 1; // JS months are 0-indexed
    const day = parseInt(dateStr.substring(6, 8), 10);
    return new Date(year, month, day);
  }
}
