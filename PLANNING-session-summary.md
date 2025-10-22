# Planning Session Summary - HopeScroll Roadmap
**Date:** 2025-10-22

## What We Accomplished

Created a comprehensive feature roadmap (`docs/planning/FEATURE_ROADMAP.md`) that outlines the future of HopeScroll with a focus on ADHD-friendly design.

## Key Decisions Made

### 1. **In-App Reading Only** ✅
- **No outlinks as primary action** - everything readable in-app
- Articles expand inline in the feed (no modals, no new tabs)
- Goal: Keep the scroll/dopamine loop going without context switching
- Reason: Context switching kills ADHD focus, need to scratch the same itch as Reddit/X

### 2. **Full Content Scraping** ✅
- Scrape full article content using readability parser
- Store in database for fast access
- Don't just show RSS summaries
- Respect paywalls/robots.txt but prioritize in-app experience

### 3. **ADHD-First Design Principles**
1. **No context switching** - Everything in-app
2. **Fast dopamine hits** - Quick content, easy actions
3. **Visual variety** - Mix videos, images, text
4. **Clear progress** - "2 min left", completion bars
5. **Frictionless** - One tap actions
6. **Gentle boundaries** - Time nudges, not hard stops
7. **Hyperfocus friendly** - Deep dives without losing place
8. **Easy re-engagement** - Resume where you left off

## Current State (What's Built)

✅ TikTok-style video player (`/watch`)
✅ Reddit-style scroll feed (`/scroll`)
✅ YouTube integration
✅ Duration/recency filtering
✅ Source management
✅ Keyword filtering
✅ Save/dismiss/not-now actions
✅ History tracking
✅ Auth & user management

## Next Phase (What We're Building)

### Phase 2A: RSS/Article Feed (4-5 weeks)
1. Add RSS feed sources
2. Parse and scrape full article content
3. Create article cards (collapsed + expanded)
4. Inline article reader with progress tracking
5. Mix videos and articles in feed

### Phase 2B: ADHD Optimizations (4 weeks)
1. Inline expansion/collapse
2. TL;DR extraction
3. Progress indicators ("2 min left")
4. Resume reading badges
5. Quick reactions (👍 👎)
6. Gentle time boundaries
7. Completion celebrations

## Article Card Design

### Collapsed (in feed):
- Hero image
- Title + excerpt
- Source, time ago, read time
- [Read] [Save] [Not Now] [Dismiss]

### Expanded (inline):
- Full article text (scraped + cleaned)
- TL;DR at top
- Progress bar (% complete, time left)
- Auto-collapse when scrolled past
- [Continue Scrolling] [More like this]

## Technical Stack for Articles

- **RSS Parser:** `rss-parser` or `fast-xml-parser`
- **Article Scraper:** `@extractus/article-extractor` (readability-based)
- **Content Type:** Add enum `VIDEO | ARTICLE | PODCAST`
- **New Fields:** `readTime`, `excerpt`, `fullContent`, `author`
- **Progress Tracking:** New table for reading progress

## Immediate Next Steps

### This Week:
1. ✅ Finalize roadmap (DONE)
2. Spike: Test article scrapers with 10 real URLs
3. Spike: Test RSS parsers with 10 real feeds
4. Design article card mockups
5. Plan database schema changes

### Next 2 Weeks:
- Implement RSS parsing backend
- Implement article scraping backend
- Create ArticleCard component
- Create ArticleReader component
- Update feed API to mix content types

### Weeks 3-4:
- Add ADHD optimizations (TL;DR, progress, resume)
- Add read time filtering
- Add quick reactions
- Polish and test with 20+ sources

## Success Metrics

- Can add RSS feeds easily
- Articles appear in feed alongside videos
- Can read full articles inline (no outlinks)
- Progress tracked and saved
- Feed feels smooth and engaging
- Load/expand time < 2 seconds

## Open Questions (Still to Decide)

2. **Monetization:** Free forever? Freemium? Premium subscription?
3. **Content types:** Start with RSS only or add Substack/Medium APIs?
4. **Podcasts:** Audio player support? (Future phase)
5. **Social:** Keep private or light social features?

## Why This Approach Works

Reddit and X are addictive because:
- ✅ Endless scroll (we have this)
- ✅ Visual variety (we'll have video + articles + images)
- ✅ Fast dopamine hits (one-tap actions, quick content)
- ✅ No friction (everything in-app, no loading new pages)

But they're toxic because:
- ❌ Algorithmic rage-bait (we fix with curated sources)
- ❌ Politics/drama (we fix with heavy filtering)
- ❌ Infinite spiral (we fix with gentle boundaries)
- ❌ Comparison/FOMO (we fix with no social features)

**HopeScroll = Addictive engagement WITHOUT the toxicity**

## References

- Full roadmap: `docs/planning/FEATURE_ROADMAP.md`
- UI improvements: `docs/planning/ui-improvements-features.md`
- Database schema: `prisma/schema.prisma`

---

**Status:** Ready to start implementation
**Next Review:** After Milestone 1A (2 weeks)
