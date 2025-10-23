# Implementation Notes

**Version:** 1.0
**Last Updated:** 2025-10-23

This document captures implementation decisions, patterns, and technical details that aren't obvious from the code alone.

---

## Table of Contents
- [Feed Generation](#feed-generation)
- [Content Filtering](#content-filtering)
- [Database Patterns](#database-patterns)
- [API Route Patterns](#api-route-patterns)
- [Service Layer Organization](#service-layer-organization)
- [Content Adapters](#content-adapters)
- [Testing Strategies](#testing-strategies)

---

## Feed Generation

### Algorithm Overview
The feed generation algorithm lives in `/domain/feed/feed-generator.ts` and follows this sequence:

1. **Filter seen content** - Remove items already watched/dismissed/saved/blocked (keep NOT_NOW)
2. **Categorize by age** - Split into "recent" (last 7 days) and "backlog" (older)
3. **Mix by ratio** - Combine according to `backlogRatio` preference (default: 30% backlog)
4. **Enforce diversity** - Limit consecutive items from same source (default: max 2)
5. **Reintegrate "Not Now"** - Randomly insert NOT_NOW items back into feed
6. **Enrich metadata** - Add feed position, source info, "new" badges

### Diversity Algorithm
Located in `/domain/feed/diversity-enforcer.ts`:

```typescript
// Ensures no more than N consecutive items from same source
// Uses weighted shuffle to maintain order while spreading sources
maxConsecutiveFromSource: number (default: 2)
```

**Why this approach:**
- Prevents feed monotony (5 videos in a row from same channel)
- Maintains chronological preference (recent items still prioritized)
- Allows controlled clustering (2 consecutive is okay, 5 is not)

### Backlog Mixing
Located in `/domain/feed/backlog-mixer.ts`:

```typescript
// Mixes recent and backlog content
backlogRatio: number (0.0 - 1.0, default: 0.3)
// 0.3 = 30% backlog, 70% recent
```

**Why this approach:**
- Prevents missed content (older items resurface)
- Balances freshness with completeness
- User-configurable (some want 0% backlog, others 50%)

### "Not Now" Reintegration
- NOT_NOW items are excluded initially
- After 24 hours, randomly reinserted at ~30% chance per feed generation
- Prevents "dismissed forever" without explicit dismiss
- Respects user's "I'll watch later" intent

**Implementation note:** See `integrateReturningItems()` in feed-generator.ts:712

---

## Content Filtering

### Filter Execution
Keyword filtering happens at **feed generation time** (not fetch time):

**Location:** `/domain/filtering/keyword-filter.ts`

**Strategy:**
```typescript
// Filters on title + excerpt ONLY (not full content)
const searchText = `${content.title} ${content.excerpt || ''}`.toLowerCase();
```

**Why title + excerpt only:**
- Performance: Don't need full content until user clicks
- Speed: Can filter immediately when content is fetched
- Good enough: Most topics appear in title/excerpt
- Acceptable false negatives: Occasional misses are okay for MVP

### Filter Types

#### 1. Wildcard Filters (`*keyword*`)
```typescript
// Matches anywhere in text
if (searchText.includes(filter.keyword.toLowerCase())) {
  return false; // Filtered out
}
```

#### 2. Exact Word Filters (`keyword`)
```typescript
// Must match word boundaries
const regex = new RegExp(`\\b${filter.keyword.toLowerCase()}\\b`, 'i');
if (regex.test(searchText)) {
  return false; // Filtered out
}
```

**Common patterns:**
- `*trump*` - Matches "Trump", "Trumpism", "trumps"
- `election` - Matches "election" but not "elections" or "reelection"
- Use wildcards for broad topics, exact words for precision

### Duration Filtering
Handled in feed service before generation:

```typescript
// Filter by min/max duration
if (preferences.minDuration && item.duration < preferences.minDuration) {
  exclude();
}
if (preferences.maxDuration && item.duration > preferences.maxDuration) {
  exclude();
}
```

**Note:** Duration is in seconds in database, converted to minutes in UI

---

## Database Patterns

### Schema Organization
See `/prisma/schema.prisma` and `/docs/reference/database-schema.md` for full schema.

**Key patterns:**

#### 1. Soft Delete Pattern
We DON'T use soft deletes. When user deletes, we actually delete (with CASCADE).

**Why:** Simpler, cleaner, respects user intent. History is in `ContentInteraction` table.

#### 2. Interaction Tracking
All user actions go through `ContentInteraction` table:

```typescript
enum InteractionType {
  WATCHED    // User watched video (>3 seconds)
  SAVED      // User saved for later
  DISMISSED  // User dismissed (won't show again)
  NOT_NOW    // User skipped (show again later)
  BLOCKED    // Source blocked (all content filtered)
}
```

**Why this pattern:**
- Single source of truth for user actions
- Easy to query history
- Enables undo/replay functionality
- Feed generation uses this to filter seen content

#### 3. Collection Relationships
```typescript
SavedContent {
  collectionId: string?  // Nullable (default collection)
  collection: Collection?
  notes: string?         // User's notes
}
```

**Implementation notes:**
- Default collection is `null` (means "Unsorted")
- Collections have color coding (8 preset colors)
- Cascade delete when collection deleted (items go to default)

### Index Strategy
Optimized for common queries:

```prisma
@@index([userId, type, sourceId])  // Feed generation
@@index([sourceType, publishedAt]) // Content fetching
@@index([duration])                // Duration filtering
@@index([userId, contentId])       // Interaction lookups
```

**Performance targets:**
- Feed generation: < 500ms (tested with 1000+ items)
- Content fetch: < 2s (tested with 50 sources)
- Interaction write: < 100ms

---

## API Route Patterns

### Standard Pattern
All API routes follow this structure:

```typescript
export async function POST(request: Request) {
  try {
    // 1. Authentication
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Input validation (Zod)
    const body = await request.json();
    const data = schema.parse(body);

    // 3. Business logic (via service layer)
    const result = await service.doSomething(session.user.id, data);

    // 4. Success response
    return Response.json({ success: true, data: result });
  } catch (error) {
    // 5. Error handling
    if (error instanceof z.ZodError) {
      return Response.json({ error: error.errors }, { status: 400 });
    }
    console.error('Error:', error);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

**Why this pattern:**
- Consistent error handling across all routes
- Auth check at top (fail fast)
- Service layer keeps routes thin
- Zod validation catches bad input early

### Error Response Format
```typescript
// Success
{ success: true, data: T }

// Validation error
{ error: [{ field: string, message: string }], status: 400 }

// Auth error
{ error: 'Unauthorized', status: 401 }

// Internal error
{ error: 'Internal error', status: 500 }
```

---

## Service Layer Organization

### Service Responsibilities

**Location:** `/services/`

#### 1. `content-service.ts`
- Fetches content from all adapters
- Orchestrates content fetch cron job
- Handles deduplication
- Updates fetch status

**Key methods:**
- `fetchAllUserContent(userId)` - Fetch from all sources
- `fetchContentForSource(sourceId)` - Single source fetch
- `getContentItems(filters)` - Query with filters

#### 2. `feed-service.ts`
- Generates feed using domain logic
- Applies filters
- Enriches with metadata
- Handles pagination

**Key methods:**
- `generateFeed(userId, filters)` - Main feed generation
- `getFeedPreferences(userId)` - Get user's feed settings

#### 3. `source-service.ts`
- Manages content sources (add/remove/update)
- Validates source credentials
- Tracks fetch status

**Key methods:**
- `addSource(userId, sourceData)` - Add new source
- `removeSource(userId, sourceId)` - Remove source
- `updateSourceStatus(sourceId, status)` - Update fetch status

#### 4. `interaction-service.ts`
- Records user interactions
- Provides interaction history
- Handles bulk operations

**Key methods:**
- `recordInteraction(userId, contentId, type)` - Track action
- `getInteractionHistory(userId, filters)` - Query history
- `bulkDismiss(userId, contentIds)` - Bulk operations

#### 5. `filter-service.ts`
- Manages keyword filters
- Applies filters to content
- Validates filter patterns

**Key methods:**
- `addFilter(userId, keyword)` - Add filter
- `applyFilters(content, filters)` - Filter content

#### 6. `collection-service.ts`
- Manages collections
- Moves items between collections
- Handles collection deletion

**Key methods:**
- `createCollection(userId, name, color)` - New collection
- `moveToCollection(savedItemId, collectionId)` - Move item
- `deleteCollection(collectionId)` - Delete (items → default)

### Service Layer Rules
1. **No direct database access** - Use adapters/repositories
2. **No HTTP logic** - That belongs in API routes
3. **Pure orchestration** - Coordinate domain logic + adapters
4. **Transaction boundaries** - Services manage transactions

---

## Content Adapters

### Adapter Pattern
Each content source implements `ContentAdapter` interface:

```typescript
interface ContentAdapter {
  fetchContent(sourceId: string): Promise<ContentItem[]>;
  validateSource(sourceId: string): Promise<boolean>;
  getSourceMetadata(sourceId: string): Promise<SourceMetadata>;
}
```

### YouTube Adapter
**Location:** `/adapters/content/youtube/youtube-adapter.ts`

**Implementation notes:**
- Uses YouTube Data API v3
- Fetches last 50 videos per channel
- Handles quota limits gracefully
- Caches channel metadata (avatar, name)

**Known limitations:**
- 10,000 quota units/day (shared across all users)
- No access to unlisted videos
- Premiere videos handled as normal videos

### RSS Adapter (Not Implemented Yet!)
**Planned location:** `/adapters/content/rss/rss-adapter.ts`

**Todo:**
- [ ] Implement RSS parser (use `rss-parser`)
- [ ] Article content extraction (`@extractus/article-extractor`)
- [ ] Paywall detection
- [ ] Support RSS 2.0 and Atom formats

See FEATURE_ROADMAP.md Epic 2A.1 for details.

---

## Testing Strategies

### Domain Layer Tests
**Location:** `/tests/domain/`

**Strategy:** 100% unit test coverage required

```typescript
// Example: feed-generator.test.ts
describe('FeedGenerator', () => {
  it('should filter seen content', () => {
    const generator = new FeedGenerator(/*...*/);
    const feed = generator.generate(sources, content, prefs, interactions);
    expect(feed).not.toContainSeenItems();
  });
});
```

**Why pure unit tests:**
- Domain layer has no external deps
- Fast execution (milliseconds)
- Easy to test edge cases
- Documents behavior

### Integration Tests
**Location:** `/tests/integration/` (future)

**Todo:**
- [ ] API route tests (with test database)
- [ ] Service layer tests (with mocked adapters)
- [ ] End-to-end feed generation tests

**Current state:** No integration tests yet (technical debt)

### Manual Testing Checklist
Before merging features:

- [ ] Test with empty state (no sources, no content)
- [ ] Test with 50+ sources (performance)
- [ ] Test with 1000+ content items (pagination)
- [ ] Test filter edge cases (wildcards, special chars)
- [ ] Test on mobile viewport
- [ ] Test with slow network (loading states)

---

## Common Patterns

### Adding a New Content Type

When adding support for articles (or podcasts, etc.):

1. **Update database schema:**
   ```prisma
   model ContentItem {
     contentType ContentType @default(VIDEO)
     readTime    Int?         // For articles
     author      String?      // For articles
   }

   enum ContentType {
     VIDEO
     ARTICLE
     PODCAST
   }
   ```

2. **Create adapter:**
   ```typescript
   // adapters/content/rss/rss-adapter.ts
   export class RSSAdapter implements ContentAdapter {
     async fetchContent(sourceId: string): Promise<ContentItem[]> {
       // Implementation
     }
   }
   ```

3. **Register in service:**
   ```typescript
   // services/content-service.ts
   const adapters = {
     YOUTUBE: youtubeAdapter,
     RSS: rssAdapter,  // Add here
   };
   ```

4. **Update UI components:**
   - Create `ArticleCard` component
   - Update feed to handle mixed content types
   - Add content type filter

5. **Write tests:**
   - Unit tests for domain logic
   - Integration tests for adapter
   - E2E tests for UI

---

## Configuration

### Environment Variables
See `/docs/reference/configuration.md` for full list.

**Required:**
- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_SECRET` - NextAuth session secret
- `YOUTUBE_API_KEY` - YouTube Data API key
- `RESEND_API_KEY` - Email API key

**Optional:**
- `NODE_ENV` - production/development
- `LOG_LEVEL` - debug/info/error

### Runtime Configuration
User preferences stored in `UserPreferences` table:

```typescript
interface UserPreferences {
  backlogRatio: number (0.0 - 1.0)
  maxConsecutiveFromSource: number
  minDuration: number (seconds)
  maxDuration: number (seconds)
}
```

**Defaults:**
- `backlogRatio`: 0.3 (30% older content)
- `maxConsecutiveFromSource`: 2
- `minDuration`: 0 (no minimum)
- `maxDuration`: null (no maximum)

---

## Performance Considerations

### Feed Generation
- **Target:** < 500ms for 1000 items
- **Bottlenecks:**
  - Database queries (use indexes!)
  - Filter application (title + excerpt only)
  - Diversity enforcement (O(n) algorithm)
- **Optimization:**
  - Paginate results (50 items at a time)
  - Cache user preferences
  - Pre-filter at database level when possible

### Content Fetching
- **Target:** < 2s for 50 sources
- **Bottlenecks:**
  - YouTube API rate limits
  - Network latency
  - Database writes
- **Optimization:**
  - Batch API calls
  - Parallel fetching (Promise.all)
  - Incremental updates (only new content)

### Database Queries
- **Use indexes** - All common queries indexed
- **Batch operations** - Use `createMany`, `updateMany`
- **Pagination** - Never load all content at once
- **Select specific fields** - Don't fetch unnecessary data

---

## Known Technical Debt

### High Priority
1. **No integration tests** - Only unit tests exist
2. **No E2E tests** - Manual testing only
3. **RSS adapter not implemented** - Blocks Phase 2A
4. **No deployment documentation** - Manual deploy only

### Medium Priority
1. **No error monitoring** - Crashes go unnoticed
2. **No performance monitoring** - Slow queries undetected
3. **No rate limiting** - API routes unprotected
4. **No caching layer** - Repeated DB queries

### Low Priority
1. **No database migrations rollback** - Can only go forward
2. **No audit logging** - Can't track who changed what
3. **No feature flags** - Can't toggle features without deploy

---

## Debugging Tips

### Feed Generation Issues
```typescript
// Add logging in feed-generator.ts
console.log('Unseen content:', unseenContent.length);
console.log('Recent:', recent.length, 'Backlog:', backlog.length);
console.log('After diversity:', diversified.length);
```

### Filter Not Working
```typescript
// Check filter execution in keyword-filter.ts
console.log('Filtering:', content.title);
console.log('Against:', filters.map(f => f.keyword));
console.log('Result:', isFiltered);
```

### Content Not Fetching
```typescript
// Check adapter execution
console.log('Fetching from:', sourceId);
console.log('Adapter response:', items.length, 'items');
console.log('Errors:', errors);
```

### Performance Profiling
```typescript
// Wrap expensive operations
const start = Date.now();
const result = await expensiveOperation();
console.log('Duration:', Date.now() - start, 'ms');
```

---

## Questions & Clarifications

**Q: Why no full-text search for filtering?**
A: Performance and simplicity. Title + excerpt covers 90% of cases. Full-text search can come in Phase 3.

**Q: Why not use Redis for caching?**
A: Premature optimization. PostgreSQL is fast enough for current scale. Add Redis when needed.

**Q: Why hexagonal architecture?**
A: Clean separation of concerns, testability, flexibility to swap adapters. Worth the upfront complexity.

**Q: Why Prisma over raw SQL?**
A: Type safety, migrations, better DX. Performance is good enough. Can optimize queries if needed.

---

**Version:** 1.0
**Status:** Living Document
**Next Review:** After Phase 2A implementation

For questions or clarifications, see [CLAUDE-SESSION-GUIDE.md](../../CLAUDE-SESSION-GUIDE.md).
