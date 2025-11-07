# yt-dlp Integration Guide

This guide explains how to use yt-dlp in HopeScroll via a self-hosted HTTP service.

## What is yt-dlp?

yt-dlp is a tool for downloading and extracting metadata from YouTube videos. In HopeScroll, we use a **self-hosted yt-dlp HTTP service** as an **alternative to the YouTube Data API**, which:

- ✅ **No quota limits** - YouTube API has daily quota limits, yt-dlp doesn't
- ✅ **Works on Vercel** - HTTP service runs on Google Cloud Run, accessible from Vercel serverless functions
- ✅ **Better for large datasets** - Fetch entire channel histories without quota concerns
- ✅ **Fallback support** - Automatically falls back to YouTube API when needed
- ⚠️ **Network latency** - External HTTP calls are slower than local CLI execution
- ⚠️ **Not officially supported** - YouTube could change their site and break it

## Checking if yt-dlp Service is Working

### Quick Test

Run the test script:

```bash
npx tsx scripts/test-yt-dlp-service.ts
```

You should see output like:
```
🧪 Testing self-hosted yt-dlp service integration...

Service URL: https://youtube-dlp-service-zti6ffx2nq-ey.a.run.app

Test 1: Health Check
✅ Service is healthy and available

Test 2: Fetching channel videos (limit: 5)
✅ Retrieved 5 videos:
   1. Video Title 1
   2. Video Title 2
   ...

🎉 All tests passed! Self-hosted yt-dlp service is working correctly.
```

### Manual Test

You can also test the service directly with curl:

```bash
# Health check
curl "https://youtube-dlp-service-zti6ffx2nq-ey.a.run.app/"

# Test fetching a video
curl "https://youtube-dlp-service-zti6ffx2nq-ey.a.run.app/api/video/dQw4w9WgXcQ"

# Test fetching channel videos
curl "https://youtube-dlp-service-zti6ffx2nq-ey.a.run.app/api/channel/UCBJycsmduvYEL83R_U4JriQ/videos?limit=5"
```

## Enabling yt-dlp in HopeScroll

### Option 1: Hybrid Mode (Recommended for production)

Add to your `.env` file:

```bash
# Self-hosted yt-dlp service
YOUTUBE_DLP_SERVICE_URL="https://youtube-dlp-service-zti6ffx2nq-ey.a.run.app"
USE_YT_DLP=true

# YouTube API for fallback and search
YOUTUBE_API_KEY="your-api-key"
```

In hybrid mode:
- yt-dlp service is used for **fetching videos** (no quota consumption)
- YouTube API is used for **searching** channels and as **fallback** (minimal quota)
- Automatic fallback when yt-dlp service is unavailable

### Option 2: yt-dlp Only (Maximum savings, limited functionality)

If you want to eliminate YouTube API usage entirely:

```bash
YOUTUBE_DLP_SERVICE_URL="https://youtube-dlp-service-zti6ffx2nq-ey.a.run.app"
USE_YT_DLP=true
# Don't set YOUTUBE_API_KEY
```

**Note:** Without YouTube API, channel search and @handle resolution will not work.

### Option 3: API Only (Traditional mode)

Use only the YouTube API (no yt-dlp):

```bash
YOUTUBE_API_KEY="your-api-key"
# Don't set USE_YT_DLP or YOUTUBE_DLP_SERVICE_URL
```

## Verifying Configuration

Check which adapter is being used in your logs when the app starts:

```bash
npm run dev
```

Look for log messages:
- `"Using yt-dlp adapter for YouTube (quota-free)"` - yt-dlp service enabled
- `"Enabling hybrid mode: YouTube API for search, yt-dlp for video fetching"` - hybrid mode (recommended)
- `"Using YouTube API adapter (requires quota)"` - API only mode

## Self-Hosted Service Details

The yt-dlp HTTP service is hosted on Google Cloud Run:

- **URL:** `https://youtube-dlp-service-zti6ffx2nq-ey.a.run.app`
- **Region:** europe-west3
- **Features:**
  - Built-in caching (1 hour for channels, 2 hours for videos)
  - Handles up to 100 videos per channel request
  - Automatic retry with exponential backoff
  - Health check endpoint at `/`

**Note:** The service is maintained separately. If you need to update or troubleshoot it, check the HOPESCROLL_INTEGRATION_GUIDE.md file.

## Troubleshooting

### Error: "yt-dlp service URL not configured"

Make sure you've set the environment variable:

```bash
YOUTUBE_DLP_SERVICE_URL="https://youtube-dlp-service-zti6ffx2nq-ey.a.run.app"
```

### Error: "Service is not healthy or unavailable"

1. Check if the service is running: `curl https://youtube-dlp-service-zti6ffx2nq-ey.a.run.app/`
2. Verify your internet connection
3. The service might be cold-starting (first request can take 10-15 seconds)
4. Check Cloud Run logs for any issues

### Error: "Failed to fetch channel videos"

1. Verify the channel ID is correct
2. Try the test script: `npx tsx scripts/test-yt-dlp-service.ts`
3. Check if YouTube is accessible from the service's region
4. If using hybrid mode, it should automatically fall back to YouTube API

### Videos not showing up in feed

1. Make sure both `USE_YT_DLP=true` and `YOUTUBE_DLP_SERVICE_URL` are set in your `.env` file
2. Restart your development server
3. Check logs for which adapter is being used
4. Run the test script: `npx tsx scripts/test-yt-dlp-service.ts`

### Vercel/Production Deployment

✅ **The self-hosted HTTP service works on Vercel!** Unlike the CLI version, the HTTP service can be accessed from Vercel's serverless functions.

To deploy:
1. Set `YOUTUBE_DLP_SERVICE_URL` in Vercel environment variables
2. Set `USE_YT_DLP=true` in Vercel environment variables
3. Optionally set `YOUTUBE_API_KEY` for hybrid mode (recommended)
4. Deploy normally - the service will be called via HTTP

## Performance Comparison

| Operation | YouTube API | Self-hosted yt-dlp | Winner |
|-----------|-------------|-------------------|--------|
| Fetch 50 videos | ~1s | ~2-3s | API |
| Search channels | ~0.5s | N/A (fallback to API) | API |
| Get video metadata | ~0.8s | ~1-2s | API |
| Daily quota limit | 10,000 units | Unlimited | yt-dlp |
| API key required | Yes | No | yt-dlp |
| Works on Vercel | Yes | Yes | Tie |
| Reliability | High | Medium-High | API |
| Cost | Free (with limits) | Free | Tie |

**Recommendation:** Use hybrid mode in production (unlimited quota + best performance) with YouTube API as fallback.
