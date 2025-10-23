# How to Debug Feed Generation

**Version:** 1.0
**Last Updated:** 2025-10-23

Quick guide for debugging feed generation issues in HopeScroll.

---

## Common Issues

### Issue 1: Feed is Empty

**Symptoms:**
- `/scroll` page shows "No content yet"
- User has sources added

**Debug steps:**

1. **Check if content exists:**
   ```typescript
   // In browser console or API route
   const response = await fetch('/api/content?userId=USER_ID');
   console.log(await response.json());
   ```

2. **Check if sources have content:**
   ```sql
   -- In database
   SELECT cs.*, COUNT(ci.id) as content_count
   FROM "ContentSource" cs
   LEFT JOIN "ContentItem" ci ON ci."sourceId" = cs."sourceId"
   WHERE cs."userId" = 'USER_ID'
   GROUP BY cs.id;
   ```

3. **Check filters:**
   ```typescript
   // Temporarily disable filters in feed-service.ts
   const filters = []; // Instead of await getFilters(userId)
   ```

4. **Check interactions:**
   ```typescript
   // See if all content was dismissed/watched
   const interactions = await fetch('/api/interactions?userId=USER_ID');
   console.log(await interactions.json());
   ```

**Common causes:**
- All content filtered out (keyword filters too aggressive)
- All content already watched/dismissed
- Content fetch failed (check source fetch status)
- Time filters too restrictive

---

### Issue 2: Same Content Repeating

**Symptoms:**
- Feed shows same videos over and over
- "Not Now" items keep appearing

**Debug steps:**

1. **Check interaction recording:**
   ```typescript
   // Verify interactions are being saved
   console.log('Recording interaction:', {
     userId,
     contentId,
     type
   });
   ```

2. **Check feed generator logic:**
   ```typescript
   // Add logging in feed-generator.ts
   console.log('Seen IDs:', seenIds.size);
   console.log('Unseen content:', unseenContent.length);
   ```

**Common causes:**
- Interactions not being saved (API error)
- Feed generator not filtering seen content
- NOT_NOW items reintegrating too frequently

---

### Issue 3: No Diversity (Too Many from Same Source)

**Symptoms:**
- Feed shows 10+ items from same channel
- Other sources not appearing

**Debug steps:**

1. **Check diversity enforcer:**
   ```typescript
   // In diversity-enforcer.ts
   console.log('Max consecutive:', maxConsecutive);
   console.log('Before enforcement:', items.length);
   console.log('After enforcement:', diversified.length);
   ```

2. **Check user preferences:**
   ```typescript
   const prefs = await fetch('/api/preferences');
   console.log('maxConsecutiveFromSource:', prefs.maxConsecutiveFromSource);
   ```

**Common causes:**
- `maxConsecutiveFromSource` set too high (default: 2)
- One source has way more content than others
- Diversity enforcer disabled

---

### Issue 4: No New Content

**Symptoms:**
- Feed never updates
- Only shows old content

**Debug steps:**

1. **Check cron job:**
   ```bash
   # Test cron endpoint manually
   curl https://your-domain.com/api/cron/fetch-content
   ```

2. **Check last fetch time:**
   ```sql
   SELECT "sourceId", "lastFetchAt", "lastFetchStatus"
   FROM "ContentSource"
   WHERE "userId" = 'USER_ID'
   ORDER BY "lastFetchAt" DESC;
   ```

3. **Check YouTube API quota:**
   ```typescript
   // Check API response for quota errors
   console.error('YouTube API error:', error);
   ```

**Common causes:**
- Cron job not configured
- YouTube API quota exceeded
- Network errors during fetch
- Source adapter failing silently

---

## Debugging Tools

### 1. Add Logging to Feed Generator

```typescript
// domain/feed/feed-generator.ts
generate(sources, allContent, preferences, interactions) {
  console.log('=== Feed Generation Debug ===');
  console.log('Total content:', allContent.length);
  console.log('Total interactions:', interactions.length);

  const unseenContent = this.filterSeen(allContent, interactions);
  console.log('Unseen content:', unseenContent.length);

  const { recent, backlog } = this.categorizeByAge(unseenContent);
  console.log('Recent:', recent.length, 'Backlog:', backlog.length);

  const mixed = this.backlogMixer.mix(recent, backlog, preferences.backlogRatio);
  console.log('After mixing:', mixed.length);

  const diversified = this.diversityEnforcer.enforce(mixed, preferences.maxConsecutiveFromSource);
  console.log('After diversity:', diversified.length);

  return diversified;
}
```

### 2. Feed Debug API Route

Create `/app/api/debug/feed/route.ts`:

```typescript
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;

  const sources = await prisma.contentSource.count({ where: { userId } });
  const content = await prisma.contentItem.count();
  const interactions = await prisma.contentInteraction.count({ where: { userId } });
  const filters = await prisma.filterKeyword.count({ where: { userId } });

  return Response.json({
    sources,
    content,
    interactions,
    filters,
    lastFetch: await prisma.contentSource.findFirst({
      where: { userId },
      orderBy: { lastFetchAt: 'desc' },
      select: { lastFetchAt: true, lastFetchStatus: true }
    })
  });
}
```

### 3. Test Feed Generation Locally

```typescript
// scripts/test-feed-generation.ts
import { FeedGenerator } from '@/domain/feed/feed-generator';

async function testFeedGeneration() {
  const generator = new FeedGenerator(/* ... */);

  // Mock data
  const sources = [/* ... */];
  const content = [/* ... */];
  const preferences = { backlogRatio: 0.3, maxConsecutiveFromSource: 2 };
  const interactions = [/* ... */];

  const feed = generator.generate(sources, content, preferences, interactions);

  console.log('Generated feed:', feed.length, 'items');
  console.log('First 5:', feed.slice(0, 5));
}

testFeedGeneration();
```

---

## Performance Debugging

### Slow Feed Generation

**Measure performance:**

```typescript
const start = Date.now();
const feed = await feedService.generateFeed(userId);
console.log('Feed generation took:', Date.now() - start, 'ms');
```

**Common bottlenecks:**
- Database queries (add indexes)
- Filter application (optimize keyword matching)
- Diversity enforcement (O(n²) algorithm)

**Optimize:**

```typescript
// Use database-level filtering
const content = await prisma.contentItem.findMany({
  where: {
    AND: [
      { duration: { gte: minDuration } },
      { publishedAt: { gte: minDate } },
      // Filter at DB level when possible
    ]
  },
  take: 100 // Limit results
});
```

---

## Testing Feed Generation

### Unit Tests

```typescript
// tests/domain/feed/feed-generator.test.ts
import { describe, it, expect } from 'vitest';
import { FeedGenerator } from '@/domain/feed/feed-generator';

describe('FeedGenerator', () => {
  it('should filter out seen content', () => {
    const generator = new FeedGenerator(/* ... */);
    const feed = generator.generate(sources, content, preferences, [
      { contentId: 'content-1', type: 'WATCHED' },
      { contentId: 'content-2', type: 'DISMISSED' }
    ]);

    expect(feed.map(item => item.id)).not.toContain('content-1');
    expect(feed.map(item => item.id)).not.toContain('content-2');
  });

  it('should respect diversity limit', () => {
    const generator = new FeedGenerator(/* ... */);
    const feed = generator.generate(sources, content, {
      ...preferences,
      maxConsecutiveFromSource: 2
    }, []);

    // Check no more than 2 consecutive from same source
    let consecutive = 1;
    let prevSource = feed[0].sourceId;

    for (let i = 1; i < feed.length; i++) {
      if (feed[i].sourceId === prevSource) {
        consecutive++;
        expect(consecutive).toBeLessThanOrEqual(2);
      } else {
        consecutive = 1;
        prevSource = feed[i].sourceId;
      }
    }
  });
});
```

---

## Quick Fixes

### Reset User's Feed

```sql
-- Clear all interactions (fresh start)
DELETE FROM "ContentInteraction" WHERE "userId" = 'USER_ID';
```

### Force Content Refetch

```sql
-- Reset fetch status
UPDATE "ContentSource"
SET "lastFetchStatus" = 'pending', "lastFetchAt" = NULL
WHERE "userId" = 'USER_ID';
```

### Clear Filters Temporarily

```sql
-- Disable all filters
UPDATE "FilterKeyword"
SET "isActive" = false
WHERE "userId" = 'USER_ID';
```

---

## Resources

- [Feed Algorithm Explanation](../explanation/feed-algorithm.md)
- [Implementation Notes](../reference/IMPLEMENTATION_NOTES.md)
- [Architecture Overview](../reference/architecture.md)

---

**Still stuck?** Open an issue with:
- User ID
- Feed debug output
- Recent error logs
- Steps to reproduce
