# HopeScroll Integration Guide

Complete guide for integrating the YouTube-DLP service with your HopeScroll application.

## Overview

This guide shows you how to use the YouTube-DLP service to fetch YouTube content without API quotas for your HopeScroll content aggregation platform.

**Your YouTube-DLP Service:**
```
https://youtube-dlp-service-zti6ffx2nq-ey.a.run.app
```

---

## 🎯 Why Use This Service?

### Current HopeScroll YouTube Integration
- Uses YouTube Data API v3
- Has daily quota limits (10,000 units/day)
- Costs money for additional quota
- Limited to specific API endpoints

### With YouTube-DLP Service
- ✅ **No quota limits** - fetch as much as you need
- ✅ **No API key required** - uses web scraping
- ✅ **More data** - access to additional video metadata
- ✅ **Better for feed generation** - fetch entire channel histories
- ✅ **Backup option** - use when YouTube API quota is exhausted

---

## 📦 Installation

### Step 1: Add Environment Variable

Add to your HopeScroll `.env` file:

```bash
# YouTube-DLP Service
YOUTUBE_DLPSERVICE_URL="https://youtube-dlp-service-zti6ffx2nq-ey.a.run.app"
```

### Step 2: Create Service Client

Create a new file: `/lib/youtube-dlp-client.ts`

```typescript
/**
 * YouTube-DLP Service Client
 *
 * Alternative YouTube data source that doesn't use API quotas.
 * Use this when you need to fetch large amounts of data or when
 * YouTube API quota is exhausted.
 */

const YOUTUBE_DLPSERVICE_URL = process.env.YOUTUBE_DLPSERVICE_URL ||
  'https://youtube-dlp-service-zti6ffx2nq-ey.a.run.app';

export interface YoutubeDlpVideo {
  id: string;
  title: string;
  url: string;
  duration?: number;
  view_count?: number;
  channel_id: string;
  channel_name: string;
  description?: string;
  thumbnail?: string;
  like_count?: number;
  upload_date?: string;
}

export interface YoutubeDlpChannelResponse {
  channel_id: string;
  channel_name: string;
  video_count: number;
  videos: YoutubeDlpVideo[];
}

export interface YoutubeDlpSearchResponse {
  query: string;
  total_results: number;
  results: YoutubeDlpVideo[];
}

/**
 * Fetch videos from a YouTube channel
 *
 * @param channelId - YouTube channel ID (e.g., "UCBJycsmduvYEL83R_U4JriQ")
 * @param limit - Maximum number of videos to fetch (default: 50, max: 100)
 * @param useCache - Use cached results if available (default: true)
 */
export async function getChannelVideos(
  channelId: string,
  limit: number = 50,
  useCache: boolean = true
): Promise<YoutubeDlpChannelResponse> {
  const params = new URLSearchParams({
    limit: limit.toString(),
    use_cache: useCache.toString(),
  });

  const response = await fetch(
    `${YOUTUBE_DLPSERVICE_URL}/api/channel/${channelId}/videos?${params}`
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      error.detail || `Failed to fetch channel videos: ${response.statusText}`
    );
  }

  return response.json();
}

/**
 * Get detailed information about a single video
 *
 * @param videoId - YouTube video ID (e.g., "dQw4w9WgXcQ")
 * @param useCache - Use cached results if available (default: true)
 */
export async function getVideoInfo(
  videoId: string,
  useCache: boolean = true
): Promise<YoutubeDlpVideo> {
  const params = new URLSearchParams({
    use_cache: useCache.toString(),
  });

  const response = await fetch(
    `${YOUTUBE_DLPSERVICE_URL}/api/video/${videoId}?${params}`
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      error.detail || `Failed to fetch video info: ${response.statusText}`
    );
  }

  return response.json();
}

/**
 * Search for videos on YouTube
 *
 * @param query - Search query
 * @param channelId - Optional: limit search to specific channel
 * @param limit - Maximum number of results (default: 25, max: 50)
 */
export async function searchVideos(
  query: string,
  channelId?: string,
  limit: number = 25
): Promise<YoutubeDlpSearchResponse> {
  const params = new URLSearchParams({
    query,
    limit: limit.toString(),
  });

  if (channelId) {
    params.append('channel_id', channelId);
  }

  const response = await fetch(
    `${YOUTUBE_DLPSERVICE_URL}/api/search?${params}`
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      error.detail || `Search failed: ${response.statusText}`
    );
  }

  return response.json();
}

/**
 * Check if the YouTube-DLP service is healthy
 */
export async function checkServiceHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${YOUTUBE_DLPSERVICE_URL}/`);
    const data = await response.json();
    return data.status === 'healthy';
  } catch (error) {
    console.error('YouTube-DLP service health check failed:', error);
    return false;
  }
}

/**
 * Convert YouTube-DLP video format to HopeScroll content format
 *
 * Use this to transform the response into your existing Content type
 */
export function convertToHopeScrollContent(video: YoutubeDlpVideo) {
  return {
    id: video.id,
    title: video.title,
    url: video.url,
    thumbnailUrl: video.thumbnail,
    duration: video.duration,
    publishedAt: video.upload_date
      ? new Date(
          `${video.upload_date.substring(0, 4)}-${video.upload_date.substring(4, 6)}-${video.upload_date.substring(6, 8)}`
        )
      : undefined,
    viewCount: video.view_count,
    channelId: video.channel_id,
    channelTitle: video.channel_name,
    description: video.description,
    // Map to your HopeScroll Content type fields
  };
}
```

---

## 🔧 Usage Examples

### Example 1: Fetch Channel Videos for Feed

Update your content service to use the YouTube-DLP service:

```typescript
// In services/content-service.ts or similar

import { getChannelVideos, convertToHopeScrollContent } from '@/lib/youtube-dlp-client';

export async function fetchYouTubeChannelContent(channelId: string, limit: number = 50) {
  try {
    // Try YouTube-DLP service first (no quota usage)
    const response = await getChannelVideos(channelId, limit);

    // Convert to HopeScroll content format
    const content = response.videos.map(convertToHopeScrollContent);

    return {
      channelName: response.channel_name,
      videos: content,
      source: 'youtube-dlp',
    };
  } catch (error) {
    console.error('YouTube-DLP service failed, falling back to YouTube API:', error);

    // Fallback to your existing YouTube API implementation
    return fetchWithYouTubeAPI(channelId, limit);
  }
}
```

### Example 2: Backfill Historical Content

Get lots of historical content without worrying about quotas:

```typescript
// In a background job or admin script

import { getChannelVideos } from '@/lib/youtube-dlp-client';

export async function backfillChannelHistory(channelId: string) {
  try {
    // Fetch up to 100 videos (the max limit)
    const response = await getChannelVideos(channelId, 100, false);

    console.log(`Fetched ${response.video_count} videos from ${response.channel_name}`);

    // Store in your database
    for (const video of response.videos) {
      await storeVideoInDatabase({
        ...convertToHopeScrollContent(video),
        channelId,
      });
    }

    return response.video_count;
  } catch (error) {
    console.error('Backfill failed:', error);
    throw error;
  }
}
```

### Example 3: Search Without Quota

Implement search functionality without using YouTube API quota:

```typescript
// In app/api/search/route.ts or similar

import { searchVideos } from '@/lib/youtube-dlp-client';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    return Response.json({ error: 'Query required' }, { status: 400 });
  }

  try {
    const results = await searchVideos(query, undefined, 25);

    return Response.json({
      query: results.query,
      total: results.total_results,
      videos: results.results.map(convertToHopeScrollContent),
    });
  } catch (error) {
    console.error('Search failed:', error);
    return Response.json(
      { error: 'Search failed' },
      { status: 500 }
    );
  }
}
```

### Example 4: Enhanced Video Details

Get more detailed video information:

```typescript
// In your video detail page

import { getVideoInfo } from '@/lib/youtube-dlp-client';

export async function VideoDetailPage({ videoId }: { videoId: string }) {
  try {
    const video = await getVideoInfo(videoId);

    return (
      <div>
        <h1>{video.title}</h1>
        <p>{video.description}</p>
        <div>
          <span>{video.view_count?.toLocaleString()} views</span>
          <span>{video.like_count?.toLocaleString()} likes</span>
          <span>{video.channel_name}</span>
        </div>
      </div>
    );
  } catch (error) {
    return <div>Error loading video details</div>;
  }
}
```

---

## 🎨 Integration Patterns

### Pattern 1: Hybrid Approach (Recommended)

Use both YouTube API and YouTube-DLP service:

```typescript
export async function fetchChannelContent(channelId: string) {
  // Use YouTube-DLP for bulk operations
  if (needsLargeDataset) {
    return getChannelVideos(channelId, 100);
  }

  // Use YouTube API for real-time updates (has more metadata)
  if (needsRealtimeData) {
    return fetchWithYouTubeAPI(channelId);
  }

  // Use YouTube-DLP when quota is exhausted
  if (isQuotaExhausted()) {
    return getChannelVideos(channelId, 50);
  }
}
```

### Pattern 2: Quota-Aware Client

Smart client that switches based on quota:

```typescript
class SmartYouTubeClient {
  private quotaRemaining: number = 10000;

  async fetchChannelVideos(channelId: string, limit: number) {
    // Check quota before making API call
    const estimatedCost = this.estimateQuotaCost('channelVideos', limit);

    if (this.quotaRemaining < estimatedCost) {
      console.log('Quota low, using YouTube-DLP service');
      return getChannelVideos(channelId, limit);
    }

    // Use YouTube API and track quota
    const result = await fetchWithYouTubeAPI(channelId, limit);
    this.quotaRemaining -= estimatedCost;

    return result;
  }

  private estimateQuotaCost(operation: string, limit: number): number {
    // YouTube API quota costs
    const costs = {
      channelVideos: limit * 3, // Rough estimate
      videoDetails: 1,
      search: 100,
    };
    return costs[operation] || 1;
  }
}
```

### Pattern 3: Background Sync Job

Use YouTube-DLP for nightly content updates:

```typescript
// In app/api/cron/sync-content/route.ts

import { getChannelVideos } from '@/lib/youtube-dlp-client';

export async function GET(request: Request) {
  // Verify CRON_SECRET
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get all user YouTube sources
  const sources = await db.source.findMany({
    where: { platform: 'YOUTUBE' },
  });

  let synced = 0;

  for (const source of sources) {
    try {
      // Fetch latest 20 videos from each channel
      const response = await getChannelVideos(source.externalId, 20);

      // Store new videos
      for (const video of response.videos) {
        await storeOrUpdateVideo(video);
      }

      synced++;
    } catch (error) {
      console.error(`Failed to sync ${source.externalId}:`, error);
    }
  }

  return Response.json({ synced, total: sources.length });
}
```

---

## 🔍 API Reference

### Available Endpoints

#### 1. Health Check
```
GET https://youtube-dlp-service-zti6ffx2nq-ey.a.run.app/
```
**Response:**
```json
{
  "status": "healthy",
  "service": "youtube-dlp"
}
```

#### 2. Get Channel Videos
```
GET /api/channel/{channel_id}/videos?limit=50&use_cache=true
```
**Parameters:**
- `channel_id` (path): YouTube channel ID
- `limit` (query): Max videos (1-100, default: 50)
- `use_cache` (query): Use cache (default: true)

**Response:**
```json
{
  "channel_id": "UCBJycsmduvYEL83R_U4JriQ",
  "channel_name": "Marques Brownlee",
  "video_count": 5,
  "videos": [...]
}
```

#### 3. Get Video Info
```
GET /api/video/{video_id}?use_cache=true
```
**Parameters:**
- `video_id` (path): YouTube video ID
- `use_cache` (query): Use cache (default: true)

**Response:**
```json
{
  "id": "dQw4w9WgXcQ",
  "title": "Rick Astley - Never Gonna Give You Up",
  "description": "...",
  "thumbnail": "https://...",
  "duration": 213,
  "view_count": 1710427187,
  "like_count": 18621839,
  "upload_date": "20091025",
  "channel_id": "UCuAXFkgsw1L7xaCfnd5JJOw",
  "channel_name": "Rick Astley",
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
}
```

#### 4. Search Videos
```
GET /api/search?query=python&channel_id=UC...&limit=25
```
**Parameters:**
- `query` (query): Search query
- `channel_id` (query, optional): Limit to channel
- `limit` (query): Max results (1-50, default: 25)

**Response:**
```json
{
  "query": "python programming",
  "total_results": 3,
  "results": [...]
}
```

#### 5. Get Playlist Videos
```
GET /api/playlist/{playlist_id}?limit=50
```
**Parameters:**
- `playlist_id` (path): YouTube playlist ID
- `limit` (query): Max videos (1-200, default: 50)

**Response:**
```json
{
  "playlist_id": "PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf",
  "playlist_title": "Python Tutorial",
  "video_count": 50,
  "videos": [...]
}
```

---

## ⚡ Performance Tips

### 1. Enable Caching

The service has built-in caching (default TTL: 1 hour for channels, 2 hours for videos):

```typescript
// Use cache for repeated requests
await getChannelVideos(channelId, 50, true);

// Bypass cache for fresh data
await getChannelVideos(channelId, 50, false);
```

### 2. Batch Requests

Fetch multiple channels in parallel:

```typescript
const channels = ['UC...', 'UC...', 'UC...'];

const results = await Promise.allSettled(
  channels.map(channelId => getChannelVideos(channelId, 20))
);

results.forEach((result, i) => {
  if (result.status === 'fulfilled') {
    console.log(`Channel ${channels[i]}: ${result.value.video_count} videos`);
  } else {
    console.error(`Channel ${channels[i]} failed:`, result.reason);
  }
});
```

### 3. Implement Local Caching

Add Redis/Upstash caching in your HopeScroll app:

```typescript
import { redis } from '@/lib/upstash';
import { getChannelVideos as fetchFromService } from '@/lib/youtube-dlp-client';

export async function getChannelVideosWithCache(channelId: string, limit: number) {
  const cacheKey = `yt-dlp:channel:${channelId}:${limit}`;

  // Try local cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  // Fetch from service
  const result = await fetchFromService(channelId, limit);

  // Cache for 30 minutes
  await redis.setex(cacheKey, 1800, JSON.stringify(result));

  return result;
}
```

---

## 🛠️ Troubleshooting

### Error: "Failed to fetch channel videos"

**Possible causes:**
1. Invalid channel ID
2. YouTube rate limiting
3. Network issues

**Solution:**
```typescript
try {
  const result = await getChannelVideos(channelId, 50);
  return result;
} catch (error) {
  console.error('YouTube-DLP error:', error);

  // Retry with exponential backoff
  await new Promise(resolve => setTimeout(resolve, 2000));
  return getChannelVideos(channelId, 50);
}
```

### Service Returns 500 Error

**Check service health:**
```typescript
const isHealthy = await checkServiceHealth();
if (!isHealthy) {
  // Fall back to YouTube API
  return fetchWithYouTubeAPI(channelId);
}
```

### Slow Response Times

**Solutions:**
1. Enable caching (`use_cache=true`)
2. Reduce `limit` parameter
3. Implement local caching layer
4. Use background jobs for large datasets

---

## 📊 Monitoring

### Track Service Usage

```typescript
// In lib/youtube-dlp-client.ts

let requestCount = 0;
let errorCount = 0;

export async function getChannelVideos(...args) {
  requestCount++;

  try {
    const result = await fetch(...);
    return result;
  } catch (error) {
    errorCount++;
    throw error;
  }
}

export function getServiceStats() {
  return {
    requests: requestCount,
    errors: errorCount,
    errorRate: errorCount / requestCount,
  };
}
```

### Log to Your Logging System

```typescript
import { logger } from '@/lib/logger'; // Your pino logger

export async function getChannelVideos(channelId: string, limit: number) {
  const startTime = Date.now();

  try {
    const result = await fetch(...);

    logger.info({
      service: 'youtube-dlp',
      operation: 'getChannelVideos',
      channelId,
      videosReturned: result.video_count,
      duration: Date.now() - startTime,
    });

    return result;
  } catch (error) {
    logger.error({
      service: 'youtube-dlp',
      operation: 'getChannelVideos',
      channelId,
      error: error.message,
      duration: Date.now() - startTime,
    });

    throw error;
  }
}
```

---

## 🚀 Next Steps

1. **Add the client:** Copy `/lib/youtube-dlp-client.ts` to your HopeScroll project
2. **Update .env:** Add `YOUTUBE_DLPSERVICE_URL` environment variable
3. **Test integration:** Try fetching a channel in your dev environment
4. **Implement hybrid approach:** Use both YouTube API and YouTube-DLP
5. **Add monitoring:** Track usage and errors
6. **Set up cron job:** Automate daily content syncing

---

## 📚 Additional Resources

- **Service Documentation:** See `README.md` in this repository
- **API Docs:** https://youtube-dlp-service-zti6ffx2nq-ey.a.run.app/docs
- **HopeScroll Docs:** `/docs` in your HopeScroll project
- **yt-dlp Documentation:** https://github.com/yt-dlp/yt-dlp

---

## 💡 Best Practices

1. **Always handle errors gracefully** - have fallback to YouTube API
2. **Use caching** - reduce load on the service
3. **Batch requests when possible** - parallel fetching for multiple channels
4. **Monitor quota usage** - track when you switch between services
5. **Keep yt-dlp updated** - service uses latest version for best compatibility
6. **Rate limit your requests** - don't hammer the service
7. **Log everything** - track performance and errors

---

## 🤝 Support

If you encounter issues:
1. Check the service health endpoint
2. Review Cloud Run logs
3. Test locally with curl
4. Check for YouTube rate limiting

**Service URL:** https://youtube-dlp-service-zti6ffx2nq-ey.a.run.app
**Region:** europe-west3
**Project:** chrissysthings

---

**Happy integrating! 🎉**
