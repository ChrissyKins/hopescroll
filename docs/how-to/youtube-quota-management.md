# YouTube API Quota Management

**Version:** 1.1
**Last Updated:** 2025-10-27

This guide explains how HopeScroll manages YouTube API quota usage through caching and incremental backlog fetching to avoid hitting daily limits.

---

## Overview

YouTube Data API v3 has a default quota of **10,000 units per day**. Different operations cost different amounts:

- **Search**: 100 units per request (most expensive!)
- **Video details**: 1 unit per request
- **Channel details**: 1 unit per request
- **Playlist items**: 1 unit per request

Without caching, a user with 10 YouTube channels could easily exhaust the quota in a single day.

---

## Caching Strategy

HopeScroll implements database-backed caching for all YouTube API responses to dramatically reduce quota usage.

### Cache Types & TTLs

| Cache Type | TTL | Rationale |
|------------|-----|-----------|
| **Channel metadata** | 24 hours | Channel info (name, avatar, stats) changes rarely |
| **Videos** | 6 hours | Balance between freshness and quota savings |
| **Search results** | 1 hour | Channel search results can change quickly |
| **Playlists** | 6 hours | Playlist updates are relatively infrequent |

### How It Works

1. **First request**: Fetches from YouTube API, stores response in `YouTubeCache` table
2. **Subsequent requests**: Serves from cache if not expired
3. **Expired entries**: Automatically deleted and refetched on next request
4. **Cache keys**: Deterministic SHA-256 hash of request parameters

### Cache Invalidation

Caches automatically expire based on TTL. For manual invalidation:

```typescript
import { YouTubeCache } from '@/adapters/content/youtube/youtube-cache';
import { db } from '@/lib/db';

const cache = new YouTubeCache(db);

// Invalidate specific cache entry
await cache.invalidate('channel', { channelId: 'UC_...' });

// Invalidate all entries of a type
await cache.invalidateType('search');

// Clean up all expired entries
await cache.cleanExpired();
```

---

## Quota Estimation

With caching enabled, here's the expected quota usage:

### Initial Source Addition (Cold Cache)
- Search for channel: **100 units** (cached 1 hour)
- Get channel details: **1 unit** × 10 results = **10 units** (cached 24 hours)
- Validate selected channel: **1 unit** (from cache if recent)
- Fetch recent videos: **100 units** (search) + **1 unit** (video details) (cached 6 hours)

**Total per new source: ~210 units** (first time only)

### Daily Content Refresh (Warm Cache)
- Fetch recent videos per source: **101 units** (once per 6 hours)
- With 10 sources: **1,010 units** per refresh cycle
- **Max 9 refresh cycles per day** with caching (vs. 1 without)

### User Search/Autocomplete (Warm Cache)
- Channel search: **0 units** (served from cache for 1 hour)
- Channel details for results: **0 units** (served from cache for 24 hours)

**With caching, you can support hundreds of searches per day at near-zero quota cost.**

---

## Monitoring Quota Usage

### Check Current Quota
```bash
curl -s "https://www.googleapis.com/youtube/v3/channels?part=snippet&id=UC_x5XG1OV2P6uZZ5FSM9Ttw&key=$YOUTUBE_API_KEY"
```

If you see a `403 quotaExceeded` error, you've hit the daily limit.

### Google Cloud Console
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to **APIs & Services > Dashboard**
3. Click **YouTube Data API v3**
4. View quota usage under **Quotas**

### Request Quota Increase
If you need more than 10,000 units/day:
1. Go to **APIs & Services > Quotas**
2. Find **YouTube Data API v3**
3. Click **EDIT QUOTAS**
4. Request increase with justification

---

## Cache Database Schema

```prisma
model YouTubeCache {
  id          String   @id @default(cuid())
  cacheKey    String   @unique // SHA-256 hash of request params
  cacheType   String   // 'channel', 'videos', 'search', 'playlist'
  response    String   @db.Text // JSON response from YouTube API

  createdAt   DateTime @default(now())
  expiresAt   DateTime // When cache expires

  @@index([cacheKey, expiresAt])
  @@index([expiresAt])
}
```

---

## Maintenance

### Cleanup Expired Entries

Add a cron job to periodically clean up expired cache entries:

```typescript
// app/api/cron/cleanup-cache/route.ts
import { YouTubeCache } from '@/adapters/content/youtube/youtube-cache';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const cache = new YouTubeCache(db);
  const deletedCount = await cache.cleanExpired();

  return Response.json({
    success: true,
    deletedCount,
    timestamp: new Date().toISOString(),
  });
}
```

### Cache Size Monitoring

Monitor the `YouTubeCache` table size:

```sql
SELECT
  cache_type,
  COUNT(*) as entries,
  SUM(LENGTH(response)) as total_bytes
FROM "YouTubeCache"
GROUP BY cache_type;
```

---

## Troubleshooting

### Cache Not Working

1. **Check database connection**: Ensure Prisma client is properly initialized
2. **Verify cache is passed to client**: Check `lib/adapters.ts` includes cache
3. **Check logs**: Look for `youtube-cache` log entries

### Quota Still Exhausted

1. **Check TTLs**: May need to increase cache TTLs
2. **Identify hot paths**: Use logging to find uncached endpoints
3. **Consider request deduplication**: Multiple simultaneous requests bypass cache

### Stale Data

If cache is too aggressive:
1. **Reduce TTLs**: Lower cache duration for specific types
2. **Manual invalidation**: Add admin endpoint to clear cache
3. **Version cache keys**: Include timestamp in cache key for time-sensitive data

---

## Incremental Backlog Fetching

To avoid exhausting quota when adding channels with thousands of videos, HopeScroll uses **incremental backlog fetching**.

### How It Works

1. **Initial add**: Fetch recent videos (last 7 days) + first 200 backlog videos
2. **Daily cron job**: Fetch 100 more videos per channel per day
3. **Track progress**: Store page token and completion status
4. **Continue from last position**: Resume where left off each day

### Database Fields

```typescript
backlogPageToken    // Next page to fetch
backlogFetchedAt    // Last backlog fetch time
backlogComplete     // All videos fetched?
backlogVideoCount   // Total backlog videos fetched
```

### Configuration

```typescript
// lib/config.ts
content: {
  dailyBacklogLimit: 100,  // Videos per channel per day
  backlogBatchSize: 200,   // Initial fetch on source add
}
```

### How Backlog Fetching Runs

**Automatic (Local Development & Production):**
The app automatically checks for daily backlog fetches on startup via middleware:
- Runs when you start your dev server (`npm run dev`)
- Runs on every authenticated request (debounced to max once per minute)
- Fetches 100 videos per channel if it's been 24+ hours since last fetch
- Runs in background - doesn't block page loads

**Production Cron (Optional):**
For production deployments, you can also set up a Vercel Cron job:

```json
// vercel.json
{
  "crons": [{
    "path": "/api/cron/fetch-backlog",
    "schedule": "0 2 * * *"
  }]
}
```

**Manual Trigger (For Testing):**
```bash
# Cron endpoint (requires secret)
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://your-domain.com/api/cron/fetch-backlog

# Admin endpoint (requires login)
curl -H "Cookie: your-session-cookie" \
  https://your-domain.com/api/admin/fetch-backlog
```

**Response example**:
```json
{
  "success": true,
  "processed": 4,
  "totalFetched": 380,
  "completed": 0,
  "results": [
    {
      "sourceId": "UC...",
      "displayName": "Channel Name",
      "fetched": 100,
      "total": 300,
      "complete": false
    }
  ]
}
```

### Timeline Example

**Channel with 1,500 videos:**

| Day | Videos Fetched | Total | Quota Used |
|-----|----------------|-------|------------|
| 1 | 200 (initial) | 200 | ~4 units |
| 2 | 100 (cron) | 300 | ~2 units |
| 3 | 100 (cron) | 400 | ~2 units |
| ... | 100 per day | ... | ~2 units/day |
| 15 | 100 (final) | 1,500 | ~2 units |

**Total: ~34 units over 15 days** vs. **~30 units in one day** (old approach)

### Benefits

- **Spreads quota usage** over weeks instead of hours
- **Handles large channels** (1,000+ videos) without quota issues
- **Automatic and transparent** - no user intervention needed
- **Resilient** - resumes from last position if interrupted

---

## Best Practices

1. **Background fetching**: Fetch content in background jobs, not during user requests
2. **Incremental backlog**: Let the cron job handle large channel histories
3. **Batch operations**: Fetch multiple items at once when possible (50 per page)
4. **Graceful degradation**: Handle quota errors gracefully, don't block user actions
5. **Monitor usage**: Set up alerts for approaching quota limits
6. **Cache warmup**: Pre-populate cache during low-traffic periods

---

## Related Documentation

- [Add Content Sources](./add-content-sources.md) - How to add new content adapters
- [Database Schema](../reference/database-schema.md) - Complete database reference
- [YouTube Adapter](../reference/architecture.md#adapters) - YouTube adapter architecture

---

**Next Steps:**
- Set up cron job for cache cleanup
- Monitor quota usage in production
- Consider Redis cache for even better performance
