import { useState, useEffect, useCallback, useRef } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// Simple in-memory cache shared across all instances
const cache = new Map<string, CacheEntry<any>>();

interface UseCachedFetchOptions<T> {
  /**
   * Unique cache key for this data
   */
  cacheKey: string;

  /**
   * Function that fetches the data
   */
  fetcher: () => Promise<T>;

  /**
   * Cache time-to-live in milliseconds (default: 30 seconds)
   */
  ttl?: number;

  /**
   * Dependencies that trigger a refetch when changed
   */
  deps?: any[];

  /**
   * Whether to fetch on mount (default: true)
   */
  fetchOnMount?: boolean;
}

export function useCachedFetch<T>({
  cacheKey,
  fetcher,
  ttl = 30000, // 30 seconds default
  deps = [],
  fetchOnMount = true,
}: UseCachedFetchOptions<T>) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMounted, setHasMounted] = useState(false);

  // Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchData = useCallback(async (force = false, silent = false) => {
    try {
      // Check cache first unless forcing a refresh
      if (!force) {
        const cached = cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < ttl) {
          if (isMountedRef.current) {
            setData(cached.data);
            setIsLoading(false);
            setError(null);
          }
          return cached.data;
        }
      }

      if (isMountedRef.current && !silent) {
        setIsLoading(true);
        setError(null);
      }

      const result = await fetcher();

      // Update cache
      cache.set(cacheKey, {
        data: result,
        timestamp: Date.now(),
      });

      if (isMountedRef.current) {
        setData(result);
        if (!silent) {
          setIsLoading(false);
        }
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch data';
      if (isMountedRef.current) {
        setError(errorMessage);
        if (!silent) {
          setIsLoading(false);
        }
      }
      throw err;
    }
  }, [cacheKey, fetcher, ttl]);

  useEffect(() => {
    setHasMounted(true);

    // Check cache immediately after mount
    const cached = cache.get(cacheKey);
    const hasCached = cached && Date.now() - cached.timestamp < ttl;

    if (hasCached) {
      // Instant load from cache
      setData(cached.data);
      setIsLoading(false);
    } else if (fetchOnMount) {
      // Fetch in next tick to avoid blocking
      const timeoutId = setTimeout(() => {
        fetchData();
      }, 0);
      return () => clearTimeout(timeoutId);
    } else {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchOnMount, cacheKey, ttl, ...deps]);

  const invalidateCache = useCallback(() => {
    cache.delete(cacheKey);
  }, [cacheKey]);

  const refetch = useCallback((silent = false) => {
    return fetchData(true, silent);
  }, [fetchData]);

  return {
    data,
    isLoading,
    error,
    refetch,
    invalidateCache,
  };
}

/**
 * Clear all cached data
 */
export function clearAllCache() {
  cache.clear();
}

/**
 * Clear specific cache entry
 */
export function clearCache(cacheKey: string) {
  cache.delete(cacheKey);
}
