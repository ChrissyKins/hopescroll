# yt-dlp Integration Guide

This guide explains how to use and verify yt-dlp in HopeScroll.

## What is yt-dlp?

yt-dlp is a command-line tool for downloading and extracting metadata from YouTube videos. In HopeScroll, we use it as an **alternative to the YouTube Data API**, which:

- ✅ **No quota limits** - YouTube API has daily quota limits, yt-dlp doesn't
- ✅ **No API key needed** - Works without any authentication
- ✅ **More reliable** - Direct scraping, less likely to break
- ⚠️ **Slower** - Makes direct HTTP requests, so it's a bit slower than API
- ⚠️ **Not officially supported** - YouTube could change their site and break it

## Checking if yt-dlp is Working

### Quick Test

Run the test script:

```bash
npx tsx scripts/test-ytdlp.ts
```

You should see output like:
```
🧪 Testing yt-dlp integration...

Test 1: Fetching recent videos (limit: 5)...
✅ Retrieved 5 videos:
   1. Video Title 1
   2. Video Title 2
   3. Video Title 3

Test 2: Fetching channel metadata...
✅ Channel info retrieved:
   - Title: PewDiePie - Videos
   - Channel ID: UC-lHJZR3Gqxm24_Vd_AJ5Yw

Test 3: Resolving channel by handle...
✅ Handle @PewDiePie resolved to: UC-lHJZR3Gqxm24_Vd_AJ5Yw

🎉 All tests passed! yt-dlp is working correctly.
```

### Manual Test

You can also test yt-dlp directly from the command line:

```bash
# Check version
yt-dlp --version

# Test fetching a video
yt-dlp --dump-json --skip-download "https://www.youtube.com/watch?v=dQw4w9WgXcQ"

# Test fetching channel videos
yt-dlp --dump-json --flat-playlist --playlist-end 3 --skip-download "https://www.youtube.com/@PewDiePie/videos"
```

## Enabling yt-dlp in HopeScroll

### Option 1: Use yt-dlp Only (Recommended for development)

Add to your `.env` file:

```bash
USE_YT_DLP=true
# Remove or comment out YOUTUBE_API_KEY
# YOUTUBE_API_KEY=""
```

Restart your development server.

### Option 2: Hybrid Mode (Best of both worlds)

Keep both enabled for hybrid mode:

```bash
USE_YT_DLP=true
YOUTUBE_API_KEY="your-api-key"
```

In hybrid mode:
- YouTube API is used for **searching** channels (faster, more accurate)
- yt-dlp is used for **fetching videos** (no quota consumption)

### Option 3: API Only (Production default)

Just use the YouTube API:

```bash
YOUTUBE_API_KEY="your-api-key"
# Don't set USE_YT_DLP
```

## Verifying Configuration

Check which adapter is being used in your logs when the app starts:

```bash
npm run dev
```

Look for log messages:
- `"Using yt-dlp adapter for YouTube (quota-free)"` - yt-dlp only mode
- `"Enabling hybrid mode: YouTube API for search, yt-dlp for video fetching"` - hybrid mode
- `"Using YouTube API adapter (requires quota)"` - API only mode

## Installation

yt-dlp is already installed on your system. To update it:

```bash
# Using pip
pip install -U yt-dlp

# Or using pipx (recommended)
pipx upgrade yt-dlp

# Verify installation
yt-dlp --version
```

## Troubleshooting

### Error: "yt-dlp: command not found"

Install yt-dlp:

```bash
pip install yt-dlp
# or
pipx install yt-dlp
```

### Error: "Failed to fetch channel videos"

1. Check your internet connection
2. Try updating yt-dlp: `pip install -U yt-dlp`
3. Test manually: `yt-dlp --version`
4. Check if YouTube is accessible from your network

### Videos not showing up in feed

1. Make sure `USE_YT_DLP=true` is in your `.env` file
2. Restart your development server
3. Check logs for which adapter is being used
4. Run the test script: `npx tsx scripts/test-ytdlp.ts`

### Vercel/Production Deployment

**Note:** yt-dlp requires the yt-dlp binary to be installed on the server. It may not work on Vercel's serverless environment. For production, stick with the YouTube API.

If you need quota-free YouTube access in production, consider:
- Using a VPS or container-based hosting where you can install yt-dlp
- Setting up a separate microservice for YouTube scraping
- Using the YouTube API with proper quota management

## Performance Comparison

| Operation | YouTube API | yt-dlp | Winner |
|-----------|-------------|--------|--------|
| Fetch 50 videos | ~1s | ~3s | API |
| Search channels | ~0.5s | N/A | API |
| Get video metadata | ~0.8s | ~2s | API |
| Daily quota limit | 10,000 units | Unlimited | yt-dlp |
| API key required | Yes | No | yt-dlp |
| Reliability | High | Medium | API |
| Cost | Free (with limits) | Free | Tie |

**Recommendation:** Use hybrid mode for development (unlimited quota) and API-only for production (faster, more reliable).
