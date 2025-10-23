# Feed Algorithm Explained

**Version:** 1.0
**Last Updated:** 2025-10-23

This document explains how HopeScroll's feed generation algorithm works and why it's designed this way.

---

## Overview

The feed algorithm balances several competing goals:
- **Freshness** - Show recent content
- **Completeness** - Don't miss older good content
- **Diversity** - Mix content from different sources
- **Personalization** - Respect user interactions and preferences

---

## Algorithm Steps

### 1. Filter Seen Content

**What it does:**
Removes content the user has already interacted with (except "Not Now").

**Why:**
- Users don't want to see the same video twice
- Dismissed content should stay dismissed
- Saved content should stay saved (visible in /saved)

**Implementation:**
```typescript
const seenIds = new Set(
  interactions
    .filter(i => ['WATCHED', 'DISMISSED', 'SAVED', 'BLOCKED'].includes(i.type))
    .map(i => i.contentId)
);

return content.filter(item => !seenIds.has(item.id));
```

**Trade-offs:**
- ✅ Simple and predictable
- ✅ Respects user intent
- ❌ Doesn't allow "watch again"

---

### 2. Categorize by Age

**What it does:**
Splits content into "recent" (last 7 days) and "backlog" (older than 7 days).

**Why:**
- Recent content is usually more relevant
- Older content shouldn't disappear forever
- Users can control the mix via `backlogRatio`

**Implementation:**
```typescript
const sevenDaysAgo = new Date();
sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

const recent = content.filter(item => item.publishedAt >= sevenDaysAgo);
const backlog = content.filter(item => item.publishedAt < sevenDaysAgo);
```

**Why 7 days?**
- Balances freshness vs. completeness
- Users check app ~3x/week on average
- Aligns with "weekly routine" mental model

**Trade-offs:**
- ✅ Clear temporal boundary
- ✅ Easy to understand
- ❌ Arbitrary cutoff (why not 5 or 10 days?)

---

### 3. Mix Backlog Ratio

**What it does:**
Combines recent and backlog content according to user preference.

**Why:**
- Some users want 100% fresh content (backlogRatio = 0)
- Some users want to catch up on everything (backlogRatio = 0.5)
- Default 30% backlog balances both needs

**Implementation:**
```typescript
const numBacklog = Math.floor(total * backlogRatio);
const numRecent = total - numBacklog;

const mixed = [
  ...shuffleArray(recent).slice(0, numRecent),
  ...shuffleArray(backlog).slice(0, numBacklog)
];
```

**Example:**
- Total feed size: 100 items
- backlogRatio: 0.3 (30%)
- Result: 70 recent + 30 backlog items

**Trade-offs:**
- ✅ User-configurable
- ✅ Predictable behavior
- ❌ Doesn't adapt to content velocity

---

### 4. Enforce Diversity

**What it does:**
Ensures no more than N consecutive items from the same source.

**Why:**
- Prevents "5 videos in a row from same channel"
- Maintains visual variety
- Keeps feed engaging

**Implementation:**
```typescript
const diversified = [];
let consecutive = 0;
let lastSource = null;

for (const item of mixed) {
  if (item.sourceId === lastSource) {
    consecutive++;
    if (consecutive >= maxConsecutive) {
      // Skip this item, it will be added later
      deferred.push(item);
      continue;
    }
  } else {
    consecutive = 1;
    lastSource = item.sourceId;
  }

  diversified.push(item);
}

// Add deferred items at random positions
return interleaveDeferredItems(diversified, deferred);
```

**Example (maxConsecutive = 2):**
- Before: A, A, A, B, B, B, C, C, C
- After: A, A, B, B, C, C, A, B, C

**Trade-offs:**
- ✅ Creates variety
- ✅ Prevents monotony
- ❌ May break chronological order
- ❌ Complex algorithm (harder to debug)

---

### 5. Reintegrate "Not Now" Items

**What it does:**
Randomly reinserts "Not Now" items back into the feed after 24 hours.

**Why:**
- "Not Now" != "Never"
- Users may want to see it again later
- Prevents content from being lost forever

**Implementation:**
```typescript
const notNowItems = interactions
  .filter(i => i.type === 'NOT_NOW')
  .filter(i => Date.now() - i.createdAt > 24 * 60 * 60 * 1000) // 24h
  .filter(() => Math.random() < 0.3); // 30% chance

return insertAtRandomPositions(diversified, notNowItems);
```

**Why 24 hours?**
- Long enough to clear from immediate memory
- Short enough to resurface while still relevant

**Why 30% chance?**
- Prevents overwhelming with "Not Now" items
- Gradual reintroduction
- User can always dismiss if not interested

**Trade-offs:**
- ✅ Respects "I'll watch later" intent
- ✅ Prevents content loss
- ❌ Randomness makes it unpredictable
- ❌ May annoy users who meant "dismiss"

---

### 6. Enrich with Metadata

**What it does:**
Adds position, source info, and "NEW" badges.

**Why:**
- UI needs source name, avatar
- Users want to know what's new vs. backlog
- Position tracking for analytics

**Implementation:**
```typescript
return items.map((content, index) => ({
  ...content,
  position: index,
  source: sources.find(s => s.id === content.sourceId),
  isNew: content.publishedAt > sevenDaysAgo,
  badgeLabel: content.isNew ? 'NEW' : null
}));
```

---

## Why This Approach?

### Alternatives Considered

#### 1. Pure Chronological (Rejected)
**Pros:** Simple, predictable
**Cons:** Misses older content, no diversity, boring

#### 2. Purely Random (Rejected)
**Pros:** Maximum diversity
**Cons:** No freshness bias, chaotic, unpredictable

#### 3. Machine Learning Recommendations (Future)
**Pros:** Personalized, adaptive
**Cons:** Complex, needs data, "black box," filter bubble risk

**Why we chose this approach:**
- ✅ Transparent and understandable
- ✅ User-configurable
- ✅ No ML training needed
- ✅ Works with minimal data
- ✅ Respects user autonomy (no algorithm manipulation)

---

## Algorithm Properties

### Determinism
- Given same inputs, produces same output
- Randomness is seeded (can be made deterministic for testing)
- Predictable behavior

### Complexity
- Time: O(n log n) - dominated by sorting
- Space: O(n) - stores content in memory
- Scales to 10,000+ items

### Fairness
- All sources get equal opportunity
- No hidden biases
- User controls the rules

---

## Future Enhancements

### Planned

1. **Time-aware diversity**
   - Evening: More videos
   - Morning: More articles
   - Weekend: Longer content

2. **Engagement-based boosting**
   - Boost sources user interacts with more
   - Decay sources user skips frequently
   - Maintain minimum exposure for all sources

3. **Category balancing**
   - Mix Tech, Science, General content
   - Avoid topic clustering
   - User-defined category preferences

### Not Planned (Explicitly Rejected)

1. **Algorithmic recommendations**
   - Risk: Filter bubble, manipulation
   - Goes against "curated over algorithmic" principle

2. **Engagement optimization**
   - Risk: Optimize for watch time, not user wellbeing
   - Against "healthy engagement" mission

3. **A/B testing feed variants**
   - Risk: Users feel manipulated
   - Against transparency principle

---

## Tuning the Algorithm

### For More Freshness
```typescript
backlogRatio: 0.1  // Only 10% backlog
maxDaysBack: 3     // Only last 3 days
```

### For More Diversity
```typescript
maxConsecutiveFromSource: 1  // No repeats
shuffleIntensity: 'high'     // More randomization
```

### For Completeness
```typescript
backlogRatio: 0.5  // 50% backlog
reintroduceNotNow: true  // All "Not Now" items
```

---

## Edge Cases

### What if all content is filtered?
→ Returns empty feed with helpful message

### What if one source has 1000 videos, others have 10?
→ Diversity enforcer spreads them out, but prolific sources will appear more often (fair representation)

### What if user watches everything?
→ Feed becomes empty, prompts user to add more sources or check back later

### What if "Not Now" items keep coming back?
→ User can explicitly dismiss them, which permanently removes them

---

## Testing the Algorithm

See `/tests/domain/feed/feed-generator.test.ts` for comprehensive test suite.

**Key test cases:**
- Filters seen content correctly
- Respects backlog ratio
- Enforces diversity limit
- Reintegrates "Not Now" items
- Handles edge cases (empty sources, all watched, etc.)

---

## Resources

- [Implementation Notes](../reference/IMPLEMENTATION_NOTES.md)
- [How to Debug Feed Generation](../how-to/debug-feed-generation.md)
- [Source Code: feed-generator.ts](/domain/feed/feed-generator.ts)

---

**Questions?** Open a discussion to talk about feed algorithm improvements!
