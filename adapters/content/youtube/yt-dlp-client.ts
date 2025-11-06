// yt-dlp CLI Client
// Wraps yt-dlp command-line tool for YouTube video/channel fetching
// Provides methods for fetching channel videos, video details, and channel metadata

import { execFile } from 'child_process';
import { promisify } from 'util';
import { createLogger } from '@/lib/logger';

const execFileAsync = promisify(execFile);
const log = createLogger('yt-dlp-client');

// yt-dlp JSON output types
export interface YtDlpVideo {
  id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  thumbnails?: Array<{ url: string; height?: number; width?: number }>;
  duration?: number; // seconds
  upload_date?: string; // YYYYMMDD format
  timestamp?: number; // Unix timestamp
  url?: string;
  webpage_url?: string;
  channel?: string;
  channel_id?: string;
  channel_url?: string;
  uploader?: string;
  uploader_id?: string;
  uploader_url?: string;
  view_count?: number;
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
  limit?: number;
  offset?: number;
}

export class YtDlpClient {
  private ytDlpPath: string;

  constructor(ytDlpPath = 'yt-dlp') {
    this.ytDlpPath = ytDlpPath;
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
    const { dateAfter, limit, offset } = options;

    const args = [
      '--dump-json',
      '--flat-playlist',
      '--skip-download',
      `https://www.youtube.com/channel/${channelId}/videos`,
    ];

    // Add date filter if specified
    if (dateAfter) {
      const dateStr = this.formatDate(dateAfter);
      args.push('--dateafter', dateStr);
    }

    // Add pagination (offset-based using playlist indices)
    if (offset !== undefined || limit !== undefined) {
      const start = (offset || 0) + 1; // yt-dlp uses 1-based indexing
      const end = limit ? start + limit - 1 : undefined;

      args.push('--playlist-start', start.toString());
      if (end) {
        args.push('--playlist-end', end.toString());
      }
    }

    log.info({ channelId, options }, 'Fetching channel videos with yt-dlp');

    try {
      const { stdout } = await execFileAsync(this.ytDlpPath, args, {
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large responses
      });

      // Parse newline-delimited JSON output
      const videos = this.parseJsonLines<YtDlpVideo>(stdout);

      log.info(
        { channelId, count: videos.length, options },
        'Successfully fetched channel videos'
      );

      return videos;
    } catch (error) {
      log.error({ error, channelId, options }, 'Failed to fetch channel videos');
      throw new Error(
        `Failed to fetch channel videos: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get full video details (without --flat-playlist for complete metadata)
   * @param videoIds - Array of video IDs
   * @returns Array of full video metadata
   */
  async getVideoDetails(videoIds: string[]): Promise<YtDlpVideo[]> {
    if (!videoIds || videoIds.length === 0) {
      return [];
    }

    // Process in batches of 10 to avoid buffer overflow
    const batchSize = 10;
    const allVideos: YtDlpVideo[] = [];

    for (let i = 0; i < videoIds.length; i += batchSize) {
      const batch = videoIds.slice(i, i + batchSize);
      const urls = batch.map((id) => `https://www.youtube.com/watch?v=${id}`);

      const args = [
        '--dump-json',
        '--skip-download',
        ...urls,
      ];

      log.info({ count: batch.length, total: videoIds.length }, 'Fetching video details batch');

      try {
        const { stdout } = await execFileAsync(this.ytDlpPath, args, {
          maxBuffer: 50 * 1024 * 1024, // 50MB buffer
        });

        const videos = this.parseJsonLines<YtDlpVideo>(stdout);
        allVideos.push(...videos);

        log.info({ count: videos.length }, 'Successfully fetched video details batch');
      } catch (error) {
        log.error({ error, count: batch.length }, 'Failed to fetch video details batch');
        throw new Error(
          `Failed to fetch video details: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    log.info({ total: allVideos.length }, 'Successfully fetched all video details');

    return allVideos;
  }

  /**
   * Get channel metadata
   * @param channelId - YouTube channel ID
   * @returns Channel metadata
   */
  async getChannelMetadata(channelId: string): Promise<YtDlpChannelInfo> {
    // Fetch first video to get channel metadata from playlist info
    const args = [
      '--dump-json',
      '--flat-playlist',
      '--playlist-end', '1', // Just fetch first video for metadata
      '--skip-download',
      `https://www.youtube.com/channel/${channelId}/videos`,
    ];

    log.info({ channelId }, 'Fetching channel metadata with yt-dlp');

    try {
      const { stdout } = await execFileAsync(this.ytDlpPath, args, {
        maxBuffer: 10 * 1024 * 1024,
      });

      // Parse the first video JSON to extract channel metadata
      const videos = this.parseJsonLines<YtDlpVideo>(stdout);

      if (!videos || videos.length === 0) {
        throw new Error('No videos found in channel');
      }

      // Extract channel info from the video's playlist metadata
      const video = videos[0] as any; // Contains playlist_* fields
      const channelInfo: YtDlpChannelInfo = {
        id: video.playlist_channel_id || channelId,
        title: video.playlist_title || video.playlist_channel || '',
        description: '',
        channel_id: video.playlist_channel_id || channelId,
        channel_url: video.playlist_webpage_url || `https://www.youtube.com/channel/${channelId}`,
        uploader: video.playlist_uploader || video.playlist_channel,
        thumbnail: video.thumbnails?.[0]?.url,
        thumbnails: video.thumbnails,
      };

      log.info({ channelId, title: channelInfo.title }, 'Successfully fetched channel metadata');

      return channelInfo;
    } catch (error) {
      log.error({ error, channelId }, 'Failed to fetch channel metadata');
      throw new Error(
        `Failed to fetch channel metadata: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Resolve a channel identifier (handle, username, or URL) to a channel ID
   * @param input - Channel handle (@username), username, or URL
   * @returns Channel ID or null if not found
   */
  async resolveChannelId(input: string): Promise<string | null> {
    // Normalize input to a URL format that yt-dlp can handle
    let url: string;

    if (input.startsWith('http://') || input.startsWith('https://')) {
      url = input;
    } else if (input.startsWith('@')) {
      url = `https://www.youtube.com/${input}/videos`;
    } else if (input.startsWith('UC')) {
      // Already a channel ID
      url = `https://www.youtube.com/channel/${input}/videos`;
    } else {
      // Try as username
      url = `https://www.youtube.com/user/${input}/videos`;
    }

    const args = [
      '--dump-json',
      '--flat-playlist',
      '--playlist-end', '1', // Just get first video to extract channel ID
      '--skip-download',
      url,
    ];

    log.info({ input, url }, 'Resolving channel ID with yt-dlp');

    try {
      const { stdout } = await execFileAsync(this.ytDlpPath, args, {
        maxBuffer: 10 * 1024 * 1024,
      });

      const videos = this.parseJsonLines<any>(stdout);

      if (!videos || videos.length === 0) {
        return null;
      }

      // Extract channel ID from playlist metadata
      const channelId = videos[0].playlist_channel_id || videos[0].channel_id;

      log.info({ input, channelId }, 'Successfully resolved channel ID');

      return channelId;
    } catch (error) {
      log.warn({ error, input }, 'Failed to resolve channel ID');
      return null;
    }
  }

  /**
   * Parse newline-delimited JSON output from yt-dlp
   * yt-dlp outputs one JSON object per line when using --dump-json with multiple items
   */
  private parseJsonLines<T>(output: string): T[] {
    const lines = output.trim().split('\n').filter((line) => line.trim());
    const results: T[] = [];

    for (const line of lines) {
      try {
        results.push(JSON.parse(line) as T);
      } catch (error) {
        log.warn({ error, line: line.substring(0, 100) }, 'Failed to parse JSON line');
      }
    }

    return results;
  }

  /**
   * Format Date object to YYYYMMDD string for yt-dlp --dateafter
   */
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }
}
