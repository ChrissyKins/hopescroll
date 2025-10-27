# Logging and Monitoring

**Version:** 1.0
**Last Updated:** 2025-10-27

This guide explains HopeScroll's logging system, how to monitor API usage, and troubleshoot issues using logs.

---

## Overview

HopeScroll uses **Pino** for structured logging with file output and console logging. Logs are automatically written to files for analysis and debugging.

### Log Files

All logs are written to the `/logs` directory (ignored by git):

| File | Contents | Use Case |
|------|----------|----------|
| `app.log` | All application logs (info level+) | General debugging |
| `youtube-api.log` | YouTube API requests only | Quota tracking |
| `error.log` | Errors only | Troubleshooting |

---

## Quick Start

### View Real-time Logs

```bash
# Watch YouTube API logs in real-time
npm run logs:tail

# Or manually:
tail -f logs/youtube-api.log
```

### Analyze YouTube Quota Usage

```bash
npm run logs:analyze
```

**Example output:**
```
📊 YouTube API Usage Report
════════════════════════════════════════════════════════════

🔢 Total API Calls: 15
⚡ Total Quota Units Used: 215 / 10,000 daily limit
📈 Percentage of Daily Quota: 2.15%

📋 Calls by API Method:
────────────────────────────────────────────────────────────
  search                  2 calls    200 units (100 each)
  channels                4 calls      4 units (1 each)
                                    → Fetched 10 items
  videos                  5 calls      5 units (1 each)
                                    → Fetched 250 items
  playlistItems           4 calls      4 units (1 each)
                                    → Fetched 200 items
```

### Rotate Logs

```bash
# Manually rotate logs (compresses and archives)
npm run logs:rotate

# Clean all logs (fresh start)
npm run logs:clean
```

---

## Log Format

Logs are JSON-formatted for easy parsing:

```json
{
  "level": "info",
  "time": "2025-10-27T10:30:00.000Z",
  "pid": 12345,
  "env": "development",
  "module": "youtube-client",
  "method": "channels",
  "itemCount": 10,
  "msg": "✓ YouTube API response"
}
```

---

## YouTube API Logging

YouTube API requests are logged with detailed information to help track quota usage.

### Request Logging

Every API request logs:
- **Method**: Which API endpoint (search, videos, channels, etc.)
- **Timestamp**: When the request was made
- **Result**: Success (✓) or failure (✗)
- **Items**: How many items were returned

**Example logs:**
```
→ YouTube API request method=search
✓ YouTube API response method=search itemCount=10

→ YouTube API request method=channels
✓ YouTube API response method=channels itemCount=10

→ YouTube API request method=videos
✓ YouTube API response method=videos itemCount=50
```

### Tracking Batch Optimizations

The logs clearly show when batch requests are used:

**Before optimization:**
```
→ YouTube API request method=channels  # Individual request
✓ YouTube API response method=channels itemCount=1
→ YouTube API request method=channels  # Individual request
✓ YouTube API response method=channels itemCount=1
→ YouTube API request method=channels  # Individual request
✓ YouTube API response method=channels itemCount=1
```
(10 requests for 10 channels = 10 API calls)

**After optimization:**
```
→ YouTube API request method=channels  # Batch request
✓ YouTube API response method=channels itemCount=10
```
(1 request for 10 channels = 1 API call)

---

## Log Analysis

### Quota Usage Patterns

Use the analyzer to identify patterns:

```bash
npm run logs:analyze
```

The analyzer shows:
1. **Total quota consumed** vs. daily limit
2. **Breakdown by API method** (which endpoints are used most)
3. **Hourly usage** (when quota is being consumed)
4. **Optimization tips** (potential improvements)

### Manual Analysis

You can also analyze logs manually:

```bash
# Count API calls by method
cat logs/youtube-api.log | grep "✓ YouTube API response" | \
  jq -r '.method' | sort | uniq -c

# Calculate total quota units
cat logs/youtube-api.log | grep "✓ YouTube API response" | \
  jq -r '.method' | awk '
    /search/ { total += 100 }
    /videos|channels|playlistItems/ { total += 1 }
    END { print "Total quota:", total }'

# Find requests in last hour
cat logs/youtube-api.log | grep "✓ YouTube API response" | \
  jq -r 'select(.time > (now - 3600 | strftime("%Y-%m-%dT%H:%M:%S")))'
```

---

## Log Rotation

Logs automatically rotate when they exceed 10MB.

### Automatic Rotation

Set up a cron job to rotate logs daily:

```bash
# Add to crontab
0 2 * * * cd /path/to/hopescroll && npm run logs:rotate
```

### Manual Rotation

```bash
npm run logs:rotate
```

This will:
1. Archive current logs with timestamp (`app-2025-10-27.log`)
2. Compress archives (`app-2025-10-27.log.gz`)
3. Delete archives older than 30 days
4. Create fresh log files

---

## Monitoring in Production

### Vercel Logs

In production on Vercel, logs are available via:

```bash
# View real-time logs
vercel logs

# View logs for specific function
vercel logs --function=api/feed
```

### Log Aggregation Services

For production monitoring, integrate with:

- **Datadog**: Set up Pino→Datadog integration
- **Logtail**: Use Pino transport for Logtail
- **New Relic**: Configure Pino logs export

### Alerts

Set up alerts for:
- High quota usage (>8,000 units/day)
- API errors (status 429, 403, 500)
- Slow response times (>2 seconds)

---

## Troubleshooting

### No Logs Generated

**Problem**: `logs/` directory is empty

**Solutions:**
1. Check that you've started the app: `npm run dev`
2. Verify logging is enabled: `LOG_LEVEL=info` in `.env`
3. Check console for "Failed to create logs directory" errors
4. Ensure you have write permissions for the project directory

### Logs Too Large

**Problem**: Log files growing rapidly

**Solutions:**
1. Run log rotation: `npm run logs:rotate`
2. Reduce log level: `LOG_LEVEL=warn` in `.env`
3. Set up automatic rotation (cron job)
4. Adjust rotation threshold in `scripts/rotate-logs.ts`

### Quota Exceeded

**Problem**: Hitting YouTube API quota limit

**Solutions:**
1. Analyze usage: `npm run logs:analyze`
2. Check for repeated requests (should be cached)
3. Verify batch optimization is working (10 channel requests → 1 batch request)
4. Review hourly breakdown to find usage spikes
5. Increase cache TTLs in `adapters/content/youtube/youtube-cache.ts`

### Missing YouTube Logs

**Problem**: `youtube-api.log` is empty

**Solutions:**
1. Ensure you've made YouTube API requests (add a channel or search)
2. Check `app.log` for any errors
3. Verify logger module name matches: `youtube-client` or `youtube-adapter`
4. Check log level is at least `info`

---

## Best Practices

1. **Regular monitoring**: Check quota usage weekly with `npm run logs:analyze`
2. **Log rotation**: Set up automatic rotation to prevent disk space issues
3. **Keep production logs**: Archive logs before cleaning for audit trail
4. **Use structured logging**: Always log with context objects, not just strings
5. **Avoid logging sensitive data**: Never log API keys, passwords, or user tokens
6. **Test locally**: Use logs to debug issues before deploying to production

---

## Log Configuration

### Environment Variables

```bash
# .env
LOG_LEVEL=info  # Options: debug, info, warn, error
```

### Custom Log Levels

You can adjust logging granularity per module:

```typescript
// lib/logger.ts
export function createLogger(name: string) {
  return logger.child({
    module: name,
    level: name === 'youtube-client' ? 'debug' : 'info',
  });
}
```

---

## Related Documentation

- [YouTube Quota Management](./youtube-quota-management.md) - API quota optimization strategies
- [Architecture](../reference/architecture.md) - System architecture overview
- [Configuration](../reference/configuration.md) - Environment variables

---

## NPM Scripts Reference

| Command | Description |
|---------|-------------|
| `npm run logs:analyze` | Analyze YouTube API quota usage |
| `npm run logs:rotate` | Rotate and compress logs |
| `npm run logs:clean` | Delete all log files |
| `npm run logs:tail` | Watch YouTube API logs in real-time |

---

**Next Steps:**
- Run `npm run dev` to start generating logs
- Add a YouTube channel and watch the logs with `npm run logs:tail`
- Analyze your API usage with `npm run logs:analyze`
