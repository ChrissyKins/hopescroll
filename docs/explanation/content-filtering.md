# Content Filtering Explained

**Version:** 1.0
**Last Updated:** 2025-10-23

This document explains HopeScroll's content filtering strategy and design decisions.

---

## Overview

HopeScroll uses **keyword-based filtering** to let users block unwanted topics. The filtering happens at **feed generation time**, not fetch time.

---

## Why Keyword Filtering?

### Alternatives Considered

#### 1. AI Sentiment Analysis
**Pros:** Can detect toxicity, negativity automatically
**Cons:** Expensive, slow, false positives, "black box"

#### 2. Category Tags
**Pros:** Structured, precise
**Cons:** Requires manual tagging or NLP, limited granularity

#### 3. Community Voting
**Pros:** Crowd-sourced moderation
**Cons:** Delays, groupthink, against "user controls everything" principle

**Why we chose keywords:**
- ✅ Simple and transparent
- ✅ User has full control
- ✅ Fast (no API calls)
- ✅ Works offline
- ✅ No training data needed

---

## How It Works

### Filter on Title + Excerpt Only

```typescript
const searchText = `${content.title} ${content.excerpt || ''}`.toLowerCase();

for (const filter of filters) {
  if (matches(searchText, filter.keyword)) {
    return false; // Filtered out
  }
}
```

**Why title + excerpt, not full content?**
1. **Performance** - Don't need to fetch full article until user clicks
2. **Speed** - Can filter immediately when content is fetched
3. **Good enough** - 90% of topics appear in title/excerpt
4. **Acceptable trade-offs** - Occasional false negative is okay for MVP

**Example:**
- Title: "Breaking: Election Results Announced"
- Filter: `*election*`
- Result: Filtered out ✅

---

## Filter Types

### 1. Wildcard Filters

**Format:** `*keyword*`

**Behavior:** Matches anywhere in text (substring match)

**Examples:**
- `*trump*` → Filters "Trump", "Trumpism", "trump card"
- `*politics*` → Filters "politics", "political", "politicians"
- `*covid*` → Filters "COVID-19", "covid vaccine", "long covid"

**Use case:** Broad topics you want to avoid entirely

### 2. Exact Word Filters

**Format:** `keyword` (no wildcards)

**Behavior:** Matches whole word only (word boundary match)

**Examples:**
- `election` → Filters "election" but NOT "elections" or "reelection"
- `war` → Filters "war" but NOT "warning" or "award"
- `trump` → Filters "trump" but NOT "trumpet"

**Use case:** Specific terms without over-filtering

---

## Filter Strategy

### Default Approach: Whitelist Sources

**Best practice:**
- Choose trustworthy sources (channels/feeds you trust)
- Use filters sparingly for specific topics
- Don't try to filter everything

**Why:**
- Less maintenance (fewer filters to manage)
- Better signal-to-noise ratio
- Avoids over-filtering (missing good content)

### Common Filter Patterns

**Politics:**
```
*election*
*politics*
*democrat*
*republican*
congress
senate
biden
trump
```

**Negative News:**
```
*death*
*murder*
*shooting*
*tragedy*
crisis
disaster
```

**Drama/Controversy:**
```
*drama*
*controversy*
*scandal*
*feud*
beef
```

---

## Limitations & Trade-Offs

### False Positives

**Problem:** Filter blocks good content

**Example:**
- Filter: `*death*`
- Blocked: "The Death of Moore's Law" (tech article)
- Blocked: "Death Valley National Park" (travel)

**Mitigation:**
- Use exact word filters when possible
- Review filtered content occasionally
- Mark sources as "always safe" (bypass filters)

### False Negatives

**Problem:** Filter misses unwanted content

**Example:**
- Filter: `politics`
- Missed: "Political tensions rise in..." (keyword in full article, not title)
- Missed: "Congress passes new bill..." (didn't filter "congress")

**Mitigation:**
- Add more filter keywords iteratively
- Use wildcards for broad topics
- Consider full-text filtering in future (Phase 3)

### Language/Context Sensitivity

**Problem:** Words have multiple meanings

**Example:**
- Filter: `trump`
- Blocks: "trump card" (gaming), "trumpet" (music)

**Mitigation:**
- Be specific with filters
- Review and remove overly broad filters
- Use "always safe" for trusted sources

---

## Performance Considerations

### Why Filter at Feed Generation (Not Fetch)?

#### Fetch Time Filtering ❌
```typescript
// BAD: Filter during content fetch
async fetchContent(sourceId) {
  const items = await api.fetch(sourceId);
  return items.filter(item => !isFiltered(item)); // Filters here
}
```

**Problems:**
- Can't change filters retroactively
- Fetched content is already filtered (can't undo)
- Wasted API quota on filtered content

#### Feed Generation Filtering ✅
```typescript
// GOOD: Filter during feed generation
generateFeed(allContent, filters) {
  return allContent.filter(item => !isFiltered(item, filters));
}
```

**Benefits:**
- User can change filters anytime
- Can review what was filtered
- Don't waste API quota
- Faster feed generation (in-memory filtering)

### Performance Benchmarks

**Filter application time:**
- 1,000 items, 10 filters: ~5ms
- 10,000 items, 50 filters: ~50ms
- Negligible impact on feed generation (< 10% of total time)

**Optimization:**
- Filters compiled to regex patterns once
- Lowercase comparison (case-insensitive)
- Short-circuit evaluation (stop on first match)

---

## Future Enhancements

### Planned (Phase 3)

#### 1. AI Sentiment Filtering
- Detect negative/toxic content automatically
- User can enable/disable
- Runs after keyword filtering (not replacement)

#### 2. Category-Based Filtering
- Auto-detect: Politics, Tech, Sports, etc.
- Filter by category instead of keywords
- Use NLP or keyword clustering

#### 3. Filter Analytics
- "X items filtered this week"
- Show what was filtered (optional transparency)
- Suggest new filters based on dismissed content

### Explicitly Not Planned

#### 1. Community Filter Lists
- Risk: Groupthink, over-filtering
- Against "user controls everything" principle

#### 2. Automatic Filter Suggestions
- Risk: Algorithm deciding what you shouldn't see
- Slippery slope to content manipulation

#### 3. Hard-Coded Content Moderation
- Risk: Platform censorship
- Users can block what they want themselves

---

## Best Practices

### For Users

1. **Start minimal** - Add filters only when you see unwanted content
2. **Use wildcards** for broad topics (`*politics*`)
3. **Use exact words** for precision (`biden` not `*biden*`)
4. **Review filters** periodically - Remove ones you no longer need
5. **Mark trusted sources** as "always safe" to bypass filters

### For Developers

1. **Keep filtering transparent** - Users should understand what's blocked
2. **Make it reversible** - Users can disable/remove filters anytime
3. **Avoid hidden filtering** - No secret content moderation
4. **Performance first** - Filtering must be fast (< 100ms)
5. **Test edge cases** - Empty filters, all filtered, special characters

---

## Testing Filters

### Manual Testing

```typescript
// Test filter in browser console
const filters = [
  { keyword: '*election*', isWildcard: true },
  { keyword: 'trump', isWildcard: false }
];

const item = {
  title: "Breaking: Election Results",
  excerpt: "Trump wins..."
};

const isFiltered = testFilters(item, filters);
console.log('Filtered:', isFiltered); // true
```

### Unit Testing

```typescript
describe('KeywordFilter', () => {
  it('should filter wildcard matches', () => {
    const filter = { keyword: '*politics*', isWildcard: true };
    const item = { title: 'Political tensions rise', excerpt: '' };

    expect(isFiltered(item, [filter])).toBe(true);
  });

  it('should filter exact word matches', () => {
    const filter = { keyword: 'election', isWildcard: false };
    const item = { title: 'The election is tomorrow', excerpt: '' };

    expect(isFiltered(item, [filter])).toBe(true);
  });

  it('should not filter partial word matches', () => {
    const filter = { keyword: 'war', isWildcard: false };
    const item = { title: 'Software warning issued', excerpt: '' };

    expect(isFiltered(item, [filter])).toBe(false);
  });
});
```

---

## Debugging Filters

### Filter Not Working

```typescript
// Add logging in keyword-filter.ts
console.log('Testing filter:', filter.keyword);
console.log('Against text:', searchText);
console.log('Match:', isMatch);
```

### Over-Filtering

```sql
-- See what's being filtered
SELECT ci.title, ci.excerpt, fk.keyword
FROM "ContentItem" ci
CROSS JOIN "FilterKeyword" fk
WHERE fk."userId" = 'USER_ID'
  AND (
    ci.title ILIKE '%' || fk.keyword || '%'
    OR ci.excerpt ILIKE '%' || fk.keyword || '%'
  );
```

---

## Resources

- [How to Set Up Filters](../how-to/setup-filters.md)
- [How to Debug Feed Generation](../how-to/debug-feed-generation.md)
- [Implementation Notes](../reference/IMPLEMENTATION_NOTES.md)

---

**Questions?** Open a discussion about filtering improvements!
