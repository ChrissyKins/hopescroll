import { describe, it, expect, vi, beforeEach } from 'vitest';
import { YouTubeAdapter } from '@/adapters/content/youtube/youtube-adapter';
import { YouTubeClient } from '@/adapters/content/youtube/youtube-client';

describe('YouTubeAdapter', () => {
  let mockClient: YouTubeClient;
  let adapter: YouTubeAdapter;

  beforeEach(() => {
    // Create a mock client
    mockClient = {
      searchChannelVideos: vi.fn(),
      getVideos: vi.fn(),
      getChannel: vi.fn(),
      resolveChannelId: vi.fn(),
    } as any;

    adapter = new YouTubeAdapter(mockClient);
  });

  describe('fetchRecent', () => {
    it('fetches and normalizes recent videos', async () => {
      const mockSearchResponse = {
        items: [
          {
            id: { kind: 'youtube#video', videoId: 'video123' },
            snippet: {
              title: 'Test Video',
              channelId: 'channel123',
            } as any,
          },
        ],
        pageInfo: { totalResults: 1, resultsPerPage: 1 },
      };

      const mockVideosResponse = {
        items: [
          {
            id: 'video123',
            snippet: {
              title: 'Test Video',
              description: 'Test description',
              channelId: 'channel123',
              channelTitle: 'Test Channel',
              publishedAt: '2024-01-01T00:00:00Z',
              thumbnails: {
                default: { url: 'thumb1.jpg', width: 120, height: 90 },
                medium: { url: 'thumb2.jpg', width: 320, height: 180 },
                high: { url: 'thumb3.jpg', width: 480, height: 360 },
              },
            },
            contentDetails: {
              duration: 'PT10M30S', // 10 minutes 30 seconds
              dimension: '2d',
              definition: 'hd',
            },
          },
        ],
      };

      vi.mocked(mockClient.searchChannelVideos).mockResolvedValue(
        mockSearchResponse
      );
      vi.mocked(mockClient.getVideos).mockResolvedValue(mockVideosResponse);

      const results = await adapter.fetchRecent('channel123', 7);

      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        sourceType: 'YOUTUBE',
        sourceId: 'channel123',
        originalId: 'video123',
        title: 'Test Video',
        description: 'Test description',
        duration: 630, // 10*60 + 30
        url: 'https://youtube.com/watch?v=video123',
      });
      expect(results[0].publishedAt).toBeInstanceOf(Date);
    });

    it('returns empty array when no videos found', async () => {
      vi.mocked(mockClient.searchChannelVideos).mockResolvedValue({
        items: [],
        pageInfo: { totalResults: 0, resultsPerPage: 0 },
      });

      const results = await adapter.fetchRecent('channel123', 7);
      expect(results).toEqual([]);
    });
  });

  describe('validateSource', () => {
    it('validates existing channel', async () => {
      vi.mocked(mockClient.resolveChannelId).mockResolvedValue('channel123');
      vi.mocked(mockClient.getChannel).mockResolvedValue({
        items: [
          {
            id: 'channel123',
            snippet: {
              title: 'Test Channel',
              description: 'Test description',
              thumbnails: {
                default: { url: 'thumb1.jpg', width: 88, height: 88 },
                medium: { url: 'thumb2.jpg', width: 240, height: 240 },
                high: { url: 'thumb3.jpg', width: 800, height: 800 },
              },
            },
          },
        ],
      });

      const result = await adapter.validateSource('channel123');

      expect(result).toEqual({
        isValid: true,
        displayName: 'Test Channel',
        avatarUrl: 'thumb3.jpg',
        resolvedId: 'channel123',
      });
    });

    it('returns invalid for non-existent channel', async () => {
      vi.mocked(mockClient.resolveChannelId).mockResolvedValue(null);

      const result = await adapter.validateSource('invalid123');

      expect(result).toEqual({
        isValid: false,
        errorMessage: 'Channel not found. Please check the channel ID or handle.',
      });
    });

    it('handles API errors gracefully', async () => {
      vi.mocked(mockClient.resolveChannelId).mockRejectedValue(
        new Error('API Error')
      );

      const result = await adapter.validateSource('channel123');

      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('API Error');
    });
  });

  describe('getSourceMetadata', () => {
    it('returns complete channel metadata', async () => {
      vi.mocked(mockClient.getChannel).mockResolvedValue({
        items: [
          {
            id: 'channel123',
            snippet: {
              title: 'Test Channel',
              description: 'Channel description',
              thumbnails: {
                default: { url: 'thumb1.jpg', width: 88, height: 88 },
                medium: { url: 'thumb2.jpg', width: 240, height: 240 },
                high: { url: 'thumb3.jpg', width: 800, height: 800 },
              },
            },
            statistics: {
              subscriberCount: '100000',
              videoCount: '500',
            },
          },
        ],
      });

      const metadata = await adapter.getSourceMetadata('channel123');

      expect(metadata).toEqual({
        displayName: 'Test Channel',
        description: 'Channel description',
        avatarUrl: 'thumb3.jpg',
        subscriberCount: 100000,
        totalContent: 500,
      });
    });
  });

  describe('duration parsing', () => {
    it('parses various ISO 8601 duration formats', async () => {
      const testCases = [
        { duration: 'PT15M33S', expected: 933 }, // 15:33
        { duration: 'PT1H30M', expected: 5400 }, // 1:30:00
        { duration: 'PT45S', expected: 45 }, // 0:45
        { duration: 'PT2H', expected: 7200 }, // 2:00:00
      ];

      for (const testCase of testCases) {
        const mockSearchResponse = {
          items: [{ id: { kind: 'youtube#video', videoId: 'video123' }, snippet: {} as any }],
          pageInfo: { totalResults: 1, resultsPerPage: 1 },
        };

        const mockVideosResponse = {
          items: [
            {
              id: 'video123',
              snippet: {
                title: 'Test',
                description: '',
                channelId: 'ch1',
                channelTitle: 'Test',
                publishedAt: '2024-01-01T00:00:00Z',
                thumbnails: {
                  default: { url: '', width: 0, height: 0 },
                  medium: { url: '', width: 0, height: 0 },
                  high: { url: '', width: 0, height: 0 },
                },
              },
              contentDetails: {
                duration: testCase.duration,
                dimension: '2d',
                definition: 'hd',
              },
            },
          ],
        };

        vi.mocked(mockClient.searchChannelVideos).mockResolvedValue(
          mockSearchResponse
        );
        vi.mocked(mockClient.getVideos).mockResolvedValue(mockVideosResponse);

        const results = await adapter.fetchRecent('ch1', 7);
        expect(results[0].duration).toBe(testCase.expected);
      }
    });
  });
});
