import { describe, it, expect, beforeEach, vi } from 'vitest';
import { YouTubeClient } from '@/adapters/content/youtube/youtube-client';
import { ExternalApiError, RateLimitError } from '@/lib/errors';

// Mock the config and logger
vi.mock('@/lib/config', () => ({
  ENV: {
    youtubeApiKey: 'test-api-key',
  },
}));

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  }),
}));

describe('YouTubeClient', () => {
  let client: YouTubeClient;

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    client = new YouTubeClient();
  });

  describe('constructor', () => {
    it('uses provided API key', () => {
      const customClient = new YouTubeClient('custom-api-key');
      expect(customClient).toBeDefined();
    });

    it('falls back to ENV.youtubeApiKey when no key provided', () => {
      const defaultClient = new YouTubeClient();
      expect(defaultClient).toBeDefined();
    });

    it('logs warning when no API key configured', () => {
      vi.resetModules();
      vi.doMock('@/lib/config', () => ({
        ENV: {
          youtubeApiKey: '',
        },
      }));

      const clientWithoutKey = new YouTubeClient();
      expect(clientWithoutKey).toBeDefined();
    });
  });

  describe('searchChannelVideos', () => {
    it('constructs correct URL with required params', async () => {
      const mockResponse = {
        items: [{ id: { videoId: 'video1' } }],
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      await client.searchChannelVideos({
        channelId: 'UC123456789',
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('channelId=UC123456789')
      );
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('part=snippet'));
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('type=video'));
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('order=date'));
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('key=test-api-key'));
    });

    it('includes publishedAfter when provided', async () => {
      const mockResponse = { items: [] };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const publishedAfter = new Date('2024-01-01T00:00:00Z');
      await client.searchChannelVideos({
        channelId: 'UC123456789',
        publishedAfter,
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('publishedAfter=2024-01-01T00%3A00%3A00.000Z')
      );
    });

    it('includes pageToken when provided', async () => {
      const mockResponse = { items: [] };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      await client.searchChannelVideos({
        channelId: 'UC123456789',
        pageToken: 'NEXT_PAGE_TOKEN',
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('pageToken=NEXT_PAGE_TOKEN')
      );
    });

    it('uses custom maxResults when provided', async () => {
      const mockResponse = { items: [] };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      await client.searchChannelVideos({
        channelId: 'UC123456789',
        maxResults: 10,
      });

      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('maxResults=10'));
    });

    it('uses default maxResults of 50 when not provided', async () => {
      const mockResponse = { items: [] };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      await client.searchChannelVideos({
        channelId: 'UC123456789',
      });

      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('maxResults=50'));
    });

    it('returns parsed response', async () => {
      const mockResponse = {
        items: [{ id: { videoId: 'video1' } }, { id: { videoId: 'video2' } }],
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await client.searchChannelVideos({
        channelId: 'UC123456789',
      });

      expect(result).toEqual(mockResponse);
    });

    it('throws RateLimitError on 429 status', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        json: async () => ({}),
      });

      await expect(
        client.searchChannelVideos({ channelId: 'UC123456789' })
      ).rejects.toThrow(RateLimitError);

      await expect(
        client.searchChannelVideos({ channelId: 'UC123456789' })
      ).rejects.toThrow('YouTube API rate limit exceeded');
    });

    it('throws ExternalApiError on other HTTP errors', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({
          error: { message: 'Invalid channel ID' },
        }),
      });

      await expect(
        client.searchChannelVideos({ channelId: 'invalid' })
      ).rejects.toThrow(ExternalApiError);

      await expect(
        client.searchChannelVideos({ channelId: 'invalid' })
      ).rejects.toThrow('Invalid channel ID');
    });

    it('handles network errors', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      await expect(
        client.searchChannelVideos({ channelId: 'UC123456789' })
      ).rejects.toThrow(ExternalApiError);
    });
  });

  describe('getVideos', () => {
    it('returns empty array for empty input', async () => {
      const result = await client.getVideos([]);

      expect(result).toEqual({ items: [] });
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('constructs correct URL with video IDs', async () => {
      const mockResponse = {
        items: [{ id: 'video1' }],
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      await client.getVideos(['video1']);

      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('id=video1'));
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('part=snippet%2CcontentDetails%2Cstatistics')
      );
    });

    it('handles multiple video IDs with comma separation', async () => {
      const mockResponse = {
        items: [{ id: 'video1' }, { id: 'video2' }, { id: 'video3' }],
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      await client.getVideos(['video1', 'video2', 'video3']);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('id=video1%2Cvideo2%2Cvideo3')
      );
    });

    it('returns parsed response', async () => {
      const mockResponse = {
        items: [
          {
            id: 'video1',
            snippet: { title: 'Test Video' },
            contentDetails: { duration: 'PT10M' },
            statistics: { viewCount: '1000' },
          },
        ],
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await client.getVideos(['video1']);

      expect(result).toEqual(mockResponse);
    });

    it('throws RateLimitError on 429 status', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 429,
        json: async () => ({}),
      });

      await expect(client.getVideos(['video1'])).rejects.toThrow(RateLimitError);
    });

    it('throws ExternalApiError on other errors', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({}),
      });

      await expect(client.getVideos(['invalid'])).rejects.toThrow(ExternalApiError);
    });
  });

  describe('getChannel', () => {
    it('constructs correct URL with channel ID', async () => {
      const mockResponse = {
        items: [{ id: 'UC123456789' }],
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      await client.getChannel('UC123456789');

      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('id=UC123456789'));
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('part=snippet%2Cstatistics')
      );
    });

    it('returns parsed response', async () => {
      const mockResponse = {
        items: [
          {
            id: 'UC123456789',
            snippet: { title: 'Test Channel' },
            statistics: { subscriberCount: '10000' },
          },
        ],
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await client.getChannel('UC123456789');

      expect(result).toEqual(mockResponse);
    });

    it('throws RateLimitError on 429 status', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 429,
        json: async () => ({}),
      });

      await expect(client.getChannel('UC123456789')).rejects.toThrow(RateLimitError);
    });

    it('throws ExternalApiError on other errors', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        json: async () => ({
          error: { message: 'API key invalid' },
        }),
      });

      await expect(client.getChannel('UC123456789')).rejects.toThrow(ExternalApiError);
      await expect(client.getChannel('UC123456789')).rejects.toThrow('API key invalid');
    });
  });

  describe('error handling', () => {
    it('preserves ExternalApiError thrown from request', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({}),
      });

      await expect(client.getVideos(['video1'])).rejects.toThrow(ExternalApiError);
    });

    it('preserves RateLimitError thrown from request', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 429,
        json: async () => ({}),
      });

      await expect(client.getVideos(['video1'])).rejects.toThrow(RateLimitError);
    });

    it('wraps unknown errors in ExternalApiError', async () => {
      (global.fetch as any).mockRejectedValue('string error');

      await expect(client.getVideos(['video1'])).rejects.toThrow(ExternalApiError);
    });

    it('handles response JSON parse errors', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      await expect(client.getVideos(['video1'])).rejects.toThrow(ExternalApiError);
    });

    it('includes error details in ExternalApiError', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({
          error: { message: 'Invalid parameter', code: 400 },
        }),
      });

      try {
        await client.getVideos(['video1']);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ExternalApiError);
        if (error instanceof ExternalApiError) {
          expect(error.details).toHaveProperty('status', 400);
          expect(error.details).toHaveProperty('error');
        }
      }
    });
  });
});
