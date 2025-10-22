# Design Decisions - HopeScroll
**Date:** 2025-10-22
**Status:** Active decisions for MVP

---

## Core Design Decisions

### ✅ 1. Article Expansion: Inline (Not Full-Screen)
**Decision:** Articles expand inline within the feed, not full-screen takeover

**Why:**
- More ADHD-friendly - can peek at next item without committing
- Less context switching - feels like natural scroll continuation
- Can collapse easily if not interested
- Maintains feed context

**Implementation:**
- Click "Read" → card smoothly expands in place
- Scroll past expanded article → auto-collapse
- "Collapse" button always visible at top
- Next card visible below expanded article (encourages continued scrolling)

---

### ✅ 2. Paywalled Content: Exclude Entirely
**Decision:** Do not show paywalled articles in feed

**Why:**
- No outlinks = can't handle paywalls gracefully
- Showing teaser then blocking is frustrating
- Better to focus on freely available content
- Reduces complexity for MVP

**Implementation:**
- Article scraper detects paywalls during fetch
- Mark content as "paywalled" in database
- Exclude from feed generation
- Optional: User setting to "attempt paywalled content anyway"

**Detection strategies:**
- Check for paywall indicators in HTML (class names, meta tags)
- Check content length (suspiciously short = likely paywalled)
- Known paywall domains (NYTimes, WSJ, Medium members-only)

---

### ✅ 3. Onboarding: Require Source Setup
**Decision:** New users must add sources before seeing feed

**Why:**
- Empty feed is confusing
- Forces intentional curation from day one
- Reinforces "you control what you see" philosophy
- Prevents accidental empty state

**Onboarding Flow:**
```
1. Sign up / Log in
2. Welcome screen: "Let's set up your feed!"
3. Source selection:
   - Preset packs (one-click to add multiple)
     • "Tech News" (Ars Technica, The Verge, etc.)
     • "Science" (Quanta, ScienceDaily, etc.)
     • "General Interest" (Longform, Aeon, etc.)
   - Or: Add custom sources (YouTube, RSS)
   - Require minimum: 3 sources
4. Optional: Filter setup
   - Preset filter packs (optional)
     • "No Politics"
     • "Calm Mode" (filter violence, death, tragedy)
   - Or: Skip for now
5. Generate first feed → "Your feed is ready!"
```

**Preset Source Packs (Curated):**
```
Tech News:
- Ars Technica (RSS)
- The Verge (RSS)
- Hacker News (RSS)
- Daring Fireball (RSS)

Science:
- Quanta Magazine (RSS)
- ScienceDaily (RSS)
- Veritasium (YouTube)
- Kurzgesagt (YouTube)

General Interest:
- Aeon (RSS)
- Longform (RSS)
- Wait But Why (RSS)
- Brain Pickings (RSS)

Calm/Wholesome:
- Cozy YouTube channels
- Positive news sources
- Nature/travel blogs
```

---

### ✅ 4. Content Filtering: Title + Excerpt Only
**Decision:** Filter on title and excerpt, NOT full article text

**Why:**
- Performance: Don't need to fetch/parse full article until user clicks
- Speed: Can filter immediately when content is fetched
- Good enough: Most topics appear in title/excerpt
- Edge cases acceptable: Occasional false negative is okay

**Implementation:**
```typescript
// Filter at feed generation time
function shouldIncludeInFeed(content: ContentItem, filters: FilterKeyword[]): boolean {
  const searchText = `${content.title} ${content.excerpt || ''}`.toLowerCase();

  for (const filter of filters) {
    if (filter.isWildcard) {
      // Wildcard: *keyword* matches anywhere
      if (searchText.includes(filter.keyword.toLowerCase())) {
        return false; // Filtered out
      }
    } else {
      // Exact word match
      const regex = new RegExp(`\\b${filter.keyword.toLowerCase()}\\b`, 'i');
      if (regex.test(searchText)) {
        return false; // Filtered out
      }
    }
  }

  return true; // Not filtered
}
```

**User can add filters via:**
- Manual keyword entry
- "Filter this word" quick action from feed
- Preset filter packs (Politics, Drama, etc.)

---

### ✅ 5. Mobile Design: Desktop First, Mobile Later
**Decision:** Design and build for desktop first, adapt to mobile after MVP

**Why:**
- Desktop is primary development environment
- Easier to test/iterate on desktop
- Mobile brings complexity (gestures, smaller screen, performance)
- Can use responsive CSS for basic mobile support initially
- Full mobile optimization (gestures, PWA, etc.) is Phase 3

**MVP Mobile Support:**
- Responsive layout (Tailwind breakpoints)
- Touch-friendly buttons (larger tap targets)
- No custom gestures (swipe-to-dismiss, etc.)
- Inline reading works on mobile (might need scroll adjustments)

**Future Mobile Features (Post-MVP):**
- Swipe gestures (left = dismiss, right = save)
- Pull-to-refresh
- PWA support (offline, home screen icon)
- Push notifications
- Native-feeling animations

---

## Deferred Decisions (Not for MVP)

### ⏸️ 6. Touch Gestures
**Status:** Post-MVP
**Why:** Desktop first, gestures add complexity

### ⏸️ 7. Push Notifications
**Status:** Post-MVP
**Why:** Potentially annoying, not critical for engagement

### ⏸️ 8. Offline Support
**Status:** Post-MVP
**Why:** Adds complexity, online-only is fine for MVP

### ⏸️ 9. Highlight/Annotate
**Status:** Post-MVP (Nice to Have)
**Why:** Power user feature, not core to experience

### ⏸️ 10. AI Sentiment Analysis
**Status:** Future consideration
**Why:** Keyword filtering is good enough for MVP, AI adds cost/complexity

---

## Implementation Priorities

### Phase 1 (Now - MVP):
1. ✅ Inline article expansion
2. ✅ Paywall detection & exclusion
3. ✅ Onboarding with preset source packs
4. ✅ Title/excerpt filtering
5. ✅ Desktop-optimized UI
6. Basic mobile responsive support (CSS only)

### Phase 2 (Post-MVP):
7. Mobile gesture support
8. PWA setup
9. Advanced filtering (full text optional)
10. Offline caching

### Phase 3 (Future):
11. AI sentiment detection
12. Highlight/annotate
13. Push notifications
14. Native mobile apps

---

## Open Questions (Still to Decide)

### Content Mix Strategy
**Question:** How do we balance videos vs articles in the feed?

**Options:**
- A) 50/50 mix
- B) User preference slider (0-100% articles)
- C) Auto-adjust based on engagement patterns
- D) Time-of-day aware (articles in morning, videos in evening)

**Recommendation:** Start with (A) 50/50, add (B) user slider in Phase 2

---

### New Content Notifications
**Question:** How do we notify users about new content?

**Options:**
- A) In-app badge only ("12 new items")
- B) Email digest (daily/weekly)
- C) Push notifications (PWA)
- D) All of the above (user configurable)

**Recommendation:** Start with (A) badge only, add (B) email digest in Phase 2

---

### Feed Algorithm Transparency
**Question:** Do we show users WHY each item is in their feed?

**Options:**
- A) No indicators (clean feed)
- B) Subtle badges ("New", "Recommended", "Backlog")
- C) Detailed reasons ("From Source X • Published today")

**Recommendation:** Start with (B) subtle badges, users can hide in settings

---

### Failed Article Parsing
**Question:** What happens when article scraper fails?

**Options:**
- A) Fallback to RSS excerpt only (no full text)
- B) Fallback to "Open in browser" link
- C) Skip entirely (don't show in feed)
- D) User choice in settings

**Recommendation:** Start with (A) fallback to excerpt, add setting in Phase 2

---

## Technical Constraints

### Article Scraping Limitations
- Some sites block scrapers (detect headless browsers)
- JavaScript-heavy sites may not render properly
- Rate limiting on frequent fetches
- Legal/ethical: respect robots.txt

**Mitigation:**
- Use reputable parser (`@extractus/article-extractor`)
- Respect robots.txt directives
- Cache aggressively (fetch once, serve many times)
- Focus on RSS-friendly sources for MVP

### Performance Targets
- Feed load: < 2 seconds
- Article expand: < 1 second (if content cached)
- Article parse (background): < 5 seconds
- Scroll fps: 60fps (smooth infinite scroll)

### Database Considerations
- Full article content can be large (50KB - 500KB per article)
- Need strategy for cleanup (delete old articles?)
- Consider separate storage for large blobs (S3, Vercel Blob)

**Recommendation for MVP:**
- Store full content in PostgreSQL text field
- Monitor database size
- Add cleanup cron later (delete articles > 90 days old)

---

## Design References

### Article Card Mockup
See `FEATURE_ROADMAP.md` Appendix A for detailed mockups

**Collapsed:**
- Hero image (16:9 ratio)
- Title (2 lines max)
- Excerpt (3 lines max)
- Metadata: Source • Time • Read time
- Actions: [Read] [Save] [Not Now] [Dismiss]

**Expanded:**
- Collapse button (top sticky)
- Hero image
- Title
- Metadata + Progress bar
- TL;DR section
- Full article content (parsed, cleaned)
- Actions: [Continue Scrolling] [More like this]

---

## Success Criteria

### User can onboard in < 3 minutes
- Select sources from preset packs
- Optional filter setup
- See first feed

### Feed feels smooth
- No jank during scroll
- Article expansion is seamless
- Progress indicators are clear

### Filtering works
- Obvious topics (politics, etc.) are filtered
- Few false positives (good content hidden)
- Easy to adjust filters

### Reading experience is pleasant
- No ads, no clutter
- Good typography
- Progress tracking works
- Can resume later

---

**Document Version:** 1.0
**Last Updated:** 2025-10-22
**Next Review:** After MVP implementation
