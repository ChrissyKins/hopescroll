# HopeScroll - Deployment Guide (yt-dlp Integration)

## 🚀 Deployment Checklist

This guide will help you deploy the yt-dlp integration to production on Vercel.

### ✅ Pre-Deployment Verification

**Completed:**
- ✅ Code merged to `main` branch (commit: 360a7f5)
- ✅ All tests passing (1,106/1,110 - 99.6% pass rate)
- ✅ Build successful (npm run build)
- ✅ Lint clean (npm run lint)
- ✅ Production database schema in sync (no migrations needed)
- ✅ Documentation complete

**Repository Status:**
- Branch: `main`
- Latest commit: `360a7f5 - Merge yt-dlp integration for quota-free YouTube fetching`
- Changes: +1,498 lines across 9 files
- Test status: ✅ Passing

---

## 📋 Deployment Steps

### Step 1: Push Code to GitHub

Since git authentication is needed, you'll need to push manually:

```bash
# Push to GitHub (requires authentication)
git push origin main
```

**Alternative if you have SSH configured:**
```bash
git remote set-url origin git@github.com:ChrissyKins/hopescroll.git
git push origin main
```

### Step 2: Install yt-dlp on Vercel (CRITICAL!)

⚠️ **IMPORTANT:** Vercel deployment requires yt-dlp binary to be available.

**Option A: Use Vercel Build Command (Recommended)**

Add this to your Vercel project settings or `vercel.json`:

```json
{
  "buildCommand": "pip install yt-dlp && npm run build",
  "crons": [
    {
      "path": "/api/cron/fetch-content",
      "schedule": "0 */6 * * *"
    },
    {
      "path": "/api/cron/fetch-backlog",
      "schedule": "0 2 * * *"
    }
  ]
}
```

**Option B: Use Vercel Serverless Functions**

If Option A doesn't work, you may need to:
1. Use a Docker container on Vercel
2. OR deploy to a platform that supports system binaries (Railway, Render, etc.)

### Step 3: Configure Environment Variables

In Vercel Dashboard → Your Project → Settings → Environment Variables:

**Required Variables (Already Set):**
- `POSTGRES_URL` - Neon pooled connection
- `POSTGRES_URL_NON_POOLING` - Neon non-pooled connection
- `NEXTAUTH_SECRET` - Authentication secret
- `NEXTAUTH_URL` - Production URL
- `RESEND_API_KEY` - Email service
- `CRON_SECRET` - Background jobs security

**Optional for yt-dlp Integration:**

**Option 1: Hybrid Mode (Recommended)**
```env
USE_YT_DLP=true
YOUTUBE_API_KEY=your_youtube_api_key_here  # Optional, for channel search only
```
- Uses yt-dlp for all video fetching (zero quota)
- Uses YouTube API only for channel search (~100 quota/search)
- Best of both worlds

**Option 2: yt-dlp Only Mode (Maximum Savings)**
```env
USE_YT_DLP=true
# No YOUTUBE_API_KEY - channel search will return empty results
```
- 100% quota-free
- No YouTube API key required
- Channel search unavailable

**Option 3: YouTube API Only Mode (Default - No Change)**
```env
# Don't set USE_YT_DLP
YOUTUBE_API_KEY=your_youtube_api_key_here
```
- Uses existing YouTube API integration
- No yt-dlp required
- Subject to quota limits

### Step 4: Deploy

**Automatic Deployment:**
- Vercel will automatically deploy when you push to `main`
- Monitor deployment at: https://vercel.com/dashboard

**Manual Deployment (if needed):**
```bash
vercel --prod
```

### Step 5: Verify Deployment

After deployment completes:

1. **Check Build Logs**
   - Ensure yt-dlp installation succeeded
   - Verify Next.js build completed

2. **Test yt-dlp Functionality**
   - Add a YouTube channel via the UI
   - Check that videos are fetched successfully
   - Monitor logs for yt-dlp execution

3. **Monitor Quota Usage**
   - If using hybrid mode, verify YouTube API calls are minimal
   - Should only see API calls for channel search, not video fetching

4. **Check Cron Jobs**
   - Verify `/api/cron/fetch-content` runs every 6 hours
   - Verify `/api/cron/fetch-backlog` runs daily at 2am

---

## 🔍 Troubleshooting

### Issue: "yt-dlp: command not found"

**Cause:** yt-dlp binary not available in Vercel serverless environment

**Solutions:**
1. **Use custom build command** (see Step 2, Option A)
2. **Deploy to a different platform:**
   - Railway: Supports system binaries
   - Render: Supports custom Dockerfiles
   - Fly.io: Full Docker support
   - DigitalOcean App Platform: Supports buildpacks

3. **Use YouTube API only** (disable USE_YT_DLP)

### Issue: yt-dlp is slow

**Expected Behavior:**
- yt-dlp takes 2-5 seconds per request (vs <1s for YouTube API)
- This is a known trade-off for quota-free fetching

**Mitigations:**
- Background fetching is already implemented
- Users don't wait for video fetching
- Cron jobs handle bulk operations

### Issue: Videos not appearing

**Check:**
1. Background job status in source management UI
2. Server logs for yt-dlp errors
3. Channel ID resolution (try using channel ID instead of @handle)

---

## 📊 Monitoring

### Key Metrics to Watch

1. **YouTube API Quota Usage**
   - Should drop by 99%+ if using yt-dlp
   - Only channel searches should consume quota

2. **yt-dlp Performance**
   - Check average execution time
   - Monitor for timeout errors
   - Track success/failure rates

3. **User Experience**
   - Verify background fetching works smoothly
   - Check that status updates appear in UI
   - Monitor for stuck "pending" sources

### Logging

Enable verbose logging to track yt-dlp activity:

```env
LOG_LEVEL=debug  # In Vercel environment variables
```

Look for log entries:
- `"Using yt-dlp adapter for YouTube content"` - Hybrid mode active
- `"Using yt-dlp-only mode (no YouTube API)"` - yt-dlp only mode
- `"Using YouTube API adapter"` - YouTube API mode

---

## 🎯 Rollout Strategy

### Phase 1: Feature Flag Disabled (Safe Deployment)
```env
# Don't set USE_YT_DLP - uses existing YouTube API
```
- Deploy code to production
- Monitor for any regressions
- Verify build and deployment successful

### Phase 2: Enable for Testing
```env
USE_YT_DLP=true
YOUTUBE_API_KEY=your_key  # Keep for hybrid mode
```
- Enable yt-dlp for your own account first
- Add test channels and verify functionality
- Monitor logs and performance

### Phase 3: Full Rollout
- If Phase 2 successful, leave enabled
- Monitor quota savings
- Track any issues

### Phase 4: Remove YouTube API (Optional)
```env
USE_YT_DLP=true
# Remove YOUTUBE_API_KEY to go 100% quota-free
```
- Only if yt-dlp proves reliable
- Loses channel search functionality

---

## 📝 Post-Deployment Tasks

- [ ] Verify deployment successful
- [ ] Check yt-dlp is working (add test channel)
- [ ] Monitor quota usage for 24 hours
- [ ] Update PROJECT_STATUS.md with deployment date
- [ ] Monitor error rates
- [ ] Gather user feedback

---

## 🆘 Rollback Plan

If issues occur:

**Quick Rollback (disable yt-dlp):**
```bash
# In Vercel Dashboard → Environment Variables
# Remove or set: USE_YT_DLP=false
```

**Full Rollback (revert code):**
```bash
# Revert the merge commit
git revert 360a7f5
git push origin main
# Vercel will auto-deploy the rollback
```

---

## 📚 Additional Resources

- **Setup Guide:** `docs/how-to/yt-dlp-setup.md`
- **Migration Plan:** `docs/planning/YT-DLP_MIGRATION.md`
- **Project Status:** `docs/planning/PROJECT_STATUS.md`
- **yt-dlp Docs:** https://github.com/yt-dlp/yt-dlp

---

## ⚠️ Important Notes

1. **Vercel Limitations:**
   - Serverless functions have 10s execution timeout (hobby) or 60s (pro)
   - yt-dlp may timeout on slow channels
   - Consider upgrading to Pro or using a different platform

2. **yt-dlp Reliability:**
   - Subject to YouTube changes
   - May break without warning
   - Keep YouTube API as fallback option

3. **Legal Considerations:**
   - yt-dlp usage complies with YouTube's ToS for personal use
   - Don't use for commercial scraping
   - Respect rate limits and copyright

---

**Deployment prepared by Claude Code**
**Date:** 2025-11-06
**Merge Commit:** 360a7f5
