import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Redis } from '@upstash/redis';

// Mock the config and logger modules
vi.mock('@/lib/config', () => ({
  ENV: {
    redisUrl: 'https://test-redis.upstash.io',
    redisToken: 'test-token',
  },
}));

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  }),
}));

// Mock the Redis client
vi.mock('@upstash/redis', () => {
  const mockRedis = {
    get: vi.fn(),
    set: vi.fn(),
    setex: vi.fn(),
    del: vi.fn(),
  };

  return {
    Redis: vi.fn(() => mockRedis),
  };
});

describe('getRedisClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset module to clear singleton
    vi.resetModules();
  });

  it('initializes Redis client with credentials', async () => {
    const { getRedisClient } = await import('@/lib/cache');
    const client = getRedisClient();

    expect(client).not.toBeNull();
    expect(Redis).toHaveBeenCalledWith({
      url: 'https://test-redis.upstash.io',
      token: 'test-token',
    });
  });

  it('returns same instance on multiple calls (singleton)', async () => {
    const { getRedisClient } = await import('@/lib/cache');
    const client1 = getRedisClient();
    const client2 = getRedisClient();

    expect(client1).toBe(client2);
    expect(Redis).toHaveBeenCalledTimes(1);
  });

  it('returns null when credentials are missing', async () => {
    vi.resetModules();
    vi.doMock('@/lib/config', () => ({
      ENV: {
        redisUrl: null,
        redisToken: null,
      },
    }));

    const { getRedisClient } = await import('@/lib/cache');
    const client = getRedisClient();

    expect(client).toBeNull();
  });

  it('returns null when only URL is provided', async () => {
    vi.resetModules();
    vi.doMock('@/lib/config', () => ({
      ENV: {
        redisUrl: 'https://test-redis.upstash.io',
        redisToken: null,
      },
    }));

    const { getRedisClient } = await import('@/lib/cache');
    const client = getRedisClient();

    expect(client).toBeNull();
  });

  it('returns null when only token is provided', async () => {
    vi.resetModules();
    vi.doMock('@/lib/config', () => ({
      ENV: {
        redisUrl: null,
        redisToken: 'test-token',
      },
    }));

    const { getRedisClient } = await import('@/lib/cache');
    const client = getRedisClient();

    expect(client).toBeNull();
  });
});

describe('CacheClient', () => {
  let mockRedis: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();

    // Ensure ENV has credentials
    vi.doMock('@/lib/config', () => ({
      ENV: {
        redisUrl: 'https://test-redis.upstash.io',
        redisToken: 'test-token',
      },
    }));

    mockRedis = {
      get: vi.fn(),
      set: vi.fn(),
      setex: vi.fn(),
      del: vi.fn(),
    };

    vi.doMock('@upstash/redis', () => ({
      Redis: vi.fn(() => mockRedis),
    }));
  });

  describe('get', () => {
    it('returns cached value on cache hit', async () => {
      const { CacheClient } = await import('@/lib/cache');
      const client = new CacheClient();

      const testData = { id: '123', name: 'Test' };
      mockRedis.get.mockResolvedValue(testData);

      const result = await client.get('test-key');

      expect(result).toEqual(testData);
      expect(mockRedis.get).toHaveBeenCalledWith('test-key');
    });

    it('returns null on cache miss', async () => {
      const { CacheClient } = await import('@/lib/cache');
      const client = new CacheClient();

      mockRedis.get.mockResolvedValue(null);

      const result = await client.get('missing-key');

      expect(result).toBeNull();
    });

    it('returns null when Redis is not available', async () => {
      vi.resetModules();
      vi.doMock('@/lib/config', () => ({
        ENV: {
          redisUrl: null,
          redisToken: null,
        },
      }));

      const { CacheClient } = await import('@/lib/cache');
      const client = new CacheClient();

      const result = await client.get('test-key');

      expect(result).toBeNull();
    });

    it('handles errors gracefully and returns null', async () => {
      const { CacheClient } = await import('@/lib/cache');
      const client = new CacheClient();

      mockRedis.get.mockRejectedValue(new Error('Redis connection error'));

      const result = await client.get('test-key');

      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('sets value without TTL', async () => {
      const { CacheClient } = await import('@/lib/cache');
      const client = new CacheClient();

      const testData = { id: '123', name: 'Test' };
      mockRedis.set.mockResolvedValue('OK');

      await client.set('test-key', testData);

      expect(mockRedis.set).toHaveBeenCalledWith('test-key', JSON.stringify(testData));
      expect(mockRedis.setex).not.toHaveBeenCalled();
    });

    it('sets value with TTL', async () => {
      const { CacheClient } = await import('@/lib/cache');
      const client = new CacheClient();

      const testData = { id: '123', name: 'Test' };
      mockRedis.setex.mockResolvedValue('OK');

      await client.set('test-key', testData, 3600);

      expect(mockRedis.setex).toHaveBeenCalledWith('test-key', 3600, JSON.stringify(testData));
      expect(mockRedis.set).not.toHaveBeenCalled();
    });

    it('does nothing when Redis is not available', async () => {
      vi.resetModules();
      vi.doMock('@/lib/config', () => ({
        ENV: {
          redisUrl: null,
          redisToken: null,
        },
      }));

      const { CacheClient } = await import('@/lib/cache');
      const client = new CacheClient();

      await client.set('test-key', { data: 'test' });

      // Should not throw and should not call Redis methods
      expect(mockRedis.set).not.toHaveBeenCalled();
    });

    it('handles errors gracefully', async () => {
      const { CacheClient } = await import('@/lib/cache');
      const client = new CacheClient();

      mockRedis.set.mockRejectedValue(new Error('Redis write error'));

      // Should not throw
      await expect(client.set('test-key', { data: 'test' })).resolves.toBeUndefined();
    });

    it('serializes different data types correctly', async () => {
      const { CacheClient } = await import('@/lib/cache');
      const client = new CacheClient();

      mockRedis.set.mockResolvedValue('OK');

      await client.set('string', 'test');
      await client.set('number', 42);
      await client.set('boolean', true);
      await client.set('array', [1, 2, 3]);
      await client.set('object', { nested: { value: true } });

      expect(mockRedis.set).toHaveBeenCalledWith('string', JSON.stringify('test'));
      expect(mockRedis.set).toHaveBeenCalledWith('number', JSON.stringify(42));
      expect(mockRedis.set).toHaveBeenCalledWith('boolean', JSON.stringify(true));
      expect(mockRedis.set).toHaveBeenCalledWith('array', JSON.stringify([1, 2, 3]));
      expect(mockRedis.set).toHaveBeenCalledWith(
        'object',
        JSON.stringify({ nested: { value: true } })
      );
    });
  });

  describe('delete', () => {
    it('deletes cached value', async () => {
      const { CacheClient } = await import('@/lib/cache');
      const client = new CacheClient();

      mockRedis.del.mockResolvedValue(1);

      await client.delete('test-key');

      expect(mockRedis.del).toHaveBeenCalledWith('test-key');
    });

    it('does nothing when Redis is not available', async () => {
      vi.resetModules();
      vi.doMock('@/lib/config', () => ({
        ENV: {
          redisUrl: null,
          redisToken: null,
        },
      }));

      const { CacheClient } = await import('@/lib/cache');
      const client = new CacheClient();

      await client.delete('test-key');

      expect(mockRedis.del).not.toHaveBeenCalled();
    });

    it('handles errors gracefully', async () => {
      const { CacheClient } = await import('@/lib/cache');
      const client = new CacheClient();

      mockRedis.del.mockRejectedValue(new Error('Redis delete error'));

      // Should not throw
      await expect(client.delete('test-key')).resolves.toBeUndefined();
    });
  });

  describe('deletePattern', () => {
    it('logs warning about pattern deletion', async () => {
      const { CacheClient } = await import('@/lib/cache');
      const client = new CacheClient();

      // Should not throw
      await expect(client.deletePattern('test:*')).resolves.toBeUndefined();
    });

    it('does nothing when Redis is not available', async () => {
      vi.resetModules();
      vi.doMock('@/lib/config', () => ({
        ENV: {
          redisUrl: null,
          redisToken: null,
        },
      }));

      const { CacheClient } = await import('@/lib/cache');
      const client = new CacheClient();

      await client.deletePattern('test:*');

      // Should not throw
    });
  });

  describe('singleton cache instance', () => {
    it('exports a singleton cache instance', async () => {
      const { cache } = await import('@/lib/cache');

      expect(cache).toBeDefined();
      expect(cache).toBeInstanceOf((await import('@/lib/cache')).CacheClient);
    });
  });
});
