import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET } from '@/app/api/sources/search/route';
import { NextRequest } from 'next/server';

// Mock auth
const mockAuth = vi.fn();
vi.mock('@/lib/auth', () => ({
  auth: () => mockAuth(),
}));

// Mock YouTube adapter and client
const mockSearchChannels = vi.fn();
vi.mock('@/adapters/content/youtube/youtube-adapter', () => ({
  YouTubeAdapter: class {
    async searchChannels(query: string) {
      return mockSearchChannels(query);
    }
  },
}));

vi.mock('@/adapters/content/youtube/youtube-client', () => ({
  YouTubeClient: class {
    constructor() {}
  },
}));

describe('GET /api/sources/search', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Authentication', () => {
    it('should require authentication', async () => {
      mockAuth.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/sources/search?q=test');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should require user ID in session', async () => {
      mockAuth.mockResolvedValue({ user: {} });

      const request = new NextRequest('http://localhost:3000/api/sources/search?q=test');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('Validation', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({ user: { id: 'user-123' } });
    });

    it('should require query parameter', async () => {
      const request = new NextRequest('http://localhost:3000/api/sources/search');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Query parameter "q" is required');
    });

    it('should require at least 2 characters', async () => {
      const request = new NextRequest('http://localhost:3000/api/sources/search?q=a');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('at least 2 characters');
    });

    it('should only support YOUTUBE type', async () => {
      const request = new NextRequest('http://localhost:3000/api/sources/search?q=test&type=RSS');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Only YOUTUBE source type');
    });
  });

  describe('Success Cases', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({ user: { id: 'user-123' } });
    });

    it('should return search results', async () => {
      const mockResults = [
        {
          channelId: 'UC1234',
          displayName: 'Test Channel',
          description: 'A test channel',
          avatarUrl: 'https://example.com/avatar.jpg',
          subscriberCount: 1000000,
        },
      ];
      mockSearchChannels.mockResolvedValue(mockResults);

      const request = new NextRequest('http://localhost:3000/api/sources/search?q=test');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.results).toEqual(mockResults);
      expect(mockSearchChannels).toHaveBeenCalledWith('test');
    });

    it('should return empty array for no results', async () => {
      mockSearchChannels.mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/sources/search?q=nonexistent');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.results).toEqual([]);
    });

    it('should trim query whitespace', async () => {
      mockSearchChannels.mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/sources/search?q=%20test%20');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockSearchChannels).toHaveBeenCalledWith('test');
    });

    it('should default to YOUTUBE type when not specified', async () => {
      mockSearchChannels.mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/sources/search?q=test');
      const response = await GET(request);

      expect(response.status).toBe(200);
      // Should not error for missing type (defaults to YOUTUBE)
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({ user: { id: 'user-123' } });
    });

    it('should handle search errors gracefully', async () => {
      mockSearchChannels.mockRejectedValue(new Error('YouTube API error'));

      const request = new NextRequest('http://localhost:3000/api/sources/search?q=test');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to search channels');
      expect(data.details).toBe('YouTube API error');
    });

    it('should handle unknown errors', async () => {
      mockSearchChannels.mockRejectedValue('Unknown error');

      const request = new NextRequest('http://localhost:3000/api/sources/search?q=test');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to search channels');
      expect(data.details).toBe('Unknown error');
    });
  });
});
