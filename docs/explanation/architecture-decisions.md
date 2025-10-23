# Architecture Decisions

**Version:** 1.0
**Last Updated:** 2025-10-23

This document explains the key architectural decisions in HopeScroll and the reasoning behind them.

---

## Decision 1: Hexagonal Architecture

**Decision:** Use hexagonal (ports and adapters) architecture

**Context:**
- Need to support multiple content sources (YouTube, RSS, Twitch, Podcasts)
- Want to test business logic without external dependencies
- May need to swap implementations (different YouTube API, different database)

**Rationale:**
- **Testability** - Pure domain logic can be unit tested without mocks
- **Flexibility** - Easy to add new content sources
- **Maintainability** - Clear boundaries between layers
- **Independence** - Business logic doesn't depend on frameworks

**Trade-offs:**
- ✅ Clean separation of concerns
- ✅ Easy to test and modify
- ✅ Framework-agnostic domain layer
- ❌ More upfront complexity
- ❌ More files and directories
- ❌ Requires discipline to maintain boundaries

**Alternative considered:** Traditional MVC
**Why rejected:** Business logic would be mixed with framework code, harder to test

---

## Decision 2: Pure Domain Layer

**Decision:** Domain layer must have zero external dependencies

**Rules:**
- No `next`, `react`, `prisma` imports in `/domain`
- No database calls, HTTP requests, or file I/O
- Pure TypeScript functions and classes only

**Rationale:**
- **100% unit testable** - No need for integration tests in domain
- **Framework independence** - Can migrate from Next.js if needed
- **Reasoning clarity** - Business logic is just logic, no side effects
- **Performance** - Pure functions are fast to test and execute

**Example:**
```typescript
// ✅ GOOD: Pure domain function
export function generateFeed(
  items: ContentItem[],
  preferences: UserPreferences
): FeedItem[] {
  // Pure logic, no side effects
}

// ❌ BAD: External dependencies
import { prisma } from '@/lib/db';
export async function generateFeed(userId: string) {
  const items = await prisma.contentItem.findMany(); // Database call!
}
```

**Trade-offs:**
- ✅ Easy to test
- ✅ Easy to reason about
- ✅ Reusable across projects
- ❌ Requires adapters for everything
- ❌ More boilerplate (interfaces, adapters)

---

## Decision 3: Filter at Feed Generation Time

**Decision:** Apply keyword filters when generating feed, not when fetching content

**Context:**
- Users want to change filters and see immediate results
- Fetching content is expensive (API quota, network time)
- Filters are subjective and change frequently

**Rationale:**
- **Retroactive filtering** - Change filters, feed updates immediately
- **Don't waste quota** - Fetch all content, filter later
- **Transparency** - Can show what was filtered
- **Undo-able** - Can disable filters and see all content

**Alternative considered:** Filter during content fetch
**Why rejected:** Can't change filters retroactively, wastes API quota

**Trade-offs:**
- ✅ Flexible and user-friendly
- ✅ No wasted API calls
- ✅ Instant filter updates
- ❌ Store more content in database
- ❌ Filtering happens every feed generation (but it's fast)

---

## Decision 4: Inline Article Reading (CRITICAL!)

**Decision:** Articles expand inline in feed, NOT in modals or new tabs

**Context:**
- ADHD-first design principle
- Context switching kills focus
- Users want frictionless reading

**Rationale:**
- **No context switching** - Stay in flow, keep scrolling
- **Lower cognitive load** - Don't manage tabs/windows
- **Faster decision making** - Peek at article, collapse if not interested
- **Mobile-friendly** - No tab management on mobile

**Implementation:**
```typescript
// Card expands in place
<ArticleCard onClick={toggleExpand}>
  {expanded ? (
    <ArticleReader content={article} />
  ) : (
    <ArticlePreview title={article.title} />
  )}
</ArticleCard>
```

**Alternative considered:** Modal overlay or new tab
**Why rejected:** Breaks flow, forces context switch, against ADHD principles

**Trade-offs:**
- ✅ Seamless UX
- ✅ ADHD-friendly
- ✅ Mobile-optimized
- ❌ More complex UI (expand/collapse states)
- ❌ Feed scroll position management

**Non-negotiable:** This is a core product principle, not just a UI choice!

---

## Decision 5: PostgreSQL + Prisma

**Decision:** Use PostgreSQL with Prisma ORM

**Context:**
- Need relational data (users, sources, content, interactions)
- Want type-safe database access
- Need migrations and schema management

**Rationale:**
- **Type safety** - Prisma generates TypeScript types
- **Developer experience** - Great tooling, migrations, introspection
- **Relational data** - Complex queries, joins, transactions
- **Scalability** - PostgreSQL scales to millions of rows

**Alternative considered:** MongoDB
**Why rejected:** Relational data model fits better, SQL is more powerful for queries

**Alternative considered:** Raw SQL
**Why rejected:** No type safety, more boilerplate, harder to maintain

**Trade-offs:**
- ✅ Type-safe queries
- ✅ Automatic migrations
- ✅ Great DX
- ❌ Prisma adds overhead (minimal)
- ❌ Harder to optimize specific queries

---

## Decision 6: Server Components by Default

**Decision:** Use React Server Components for all pages, Client Components only when needed

**Context:**
- Next.js 14 App Router encourages Server Components
- Reduces JavaScript sent to client
- Better performance, SEO

**When to use Client Components:**
- Interactive elements (buttons, forms)
- Client-side state (useState, useEffect)
- Browser APIs (localStorage, navigator)

**Rationale:**
- **Performance** - Less JavaScript to download/parse
- **SEO** - Server-rendered HTML
- **Security** - API keys stay on server
- **Simplicity** - No hydration mismatches

**Trade-offs:**
- ✅ Better performance
- ✅ Better SEO
- ✅ Simpler mental model
- ❌ Can't use client hooks everywhere
- ❌ Requires 'use client' directive

---

## Decision 7: Keyword Filtering (Not AI)

**Decision:** Use keyword-based filtering for MVP, not AI sentiment analysis

**Context:**
- Users want to block specific topics (politics, drama, etc.)
- Need fast, transparent, user-controlled filtering

**Rationale:**
- **Transparency** - Users know exactly what's filtered
- **Control** - Users decide the rules
- **Performance** - Fast regex matching (< 10ms)
- **Simplicity** - No API calls, no training data
- **Privacy** - No content sent to external services

**Future:** May add AI sentiment analysis as optional layer (Phase 3)

**Alternative considered:** AI sentiment analysis
**Why rejected for MVP:**
- Expensive (API costs)
- Slow (network latency)
- "Black box" (users don't understand decisions)
- False positives/negatives
- Against "user controls everything" principle

**Trade-offs:**
- ✅ Fast and cheap
- ✅ Transparent
- ✅ User-controlled
- ❌ Requires manual filter setup
- ❌ Can't detect nuanced negativity

---

## Decision 8: Backlog Mixing Algorithm

**Decision:** Mix 30% backlog content with 70% recent content by default

**Context:**
- Users don't want to miss older good content
- But recent content is usually more relevant
- Need balance

**Rationale:**
- **Completeness** - Don't miss older gems
- **Freshness** - Prioritize recent content
- **User control** - Configurable via preferences
- **Predictable** - Clear temporal boundary (7 days)

**Why 30%?**
- User testing showed 20-40% felt right
- 30% is middle ground
- Can be adjusted per user

**Alternative considered:** Pure chronological (0% backlog)
**Why rejected:** Misses older content completely

**Alternative considered:** 50/50 split
**Why rejected:** Too much old content, felt stale

**Trade-offs:**
- ✅ Balances freshness and completeness
- ✅ User-configurable
- ✅ Predictable
- ❌ Arbitrary percentage
- ❌ Doesn't adapt to content velocity

---

## Decision 9: Diversity Limit (Max 2 Consecutive)

**Decision:** Limit to max 2 consecutive items from same source

**Context:**
- Prolific sources can dominate feed
- Users want variety
- But some clustering is okay

**Rationale:**
- **Visual variety** - Mix of thumbnails, styles
- **Source variety** - See content from all sources
- **Engagement** - Prevents monotony
- **Fair representation** - All sources get exposure

**Why 2 (not 1)?**
- 1 is too strict (feels unnatural)
- 2 allows natural clustering
- 3+ feels repetitive

**Alternative considered:** No diversity enforcement
**Why rejected:** Prolific sources dominate, feed feels monotonous

**Alternative considered:** Max 1 consecutive
**Why rejected:** Too strict, feels artificial

**Trade-offs:**
- ✅ Creates variety
- ✅ Fair to all sources
- ✅ Prevents monotony
- ❌ Breaks chronological order
- ❌ Complex algorithm

---

## Decision 10: No Social Features (MVP)

**Decision:** No social features (sharing, following, comments) in MVP

**Context:**
- Social features add complexity
- Risk of toxicity (comments, arguments)
- Against "calm, personal" product vision

**Rationale:**
- **Focus** - Perfect core experience first
- **Simplicity** - Less to build and maintain
- **Privacy** - No social graph, no tracking
- **Healthy** - No comparison, FOMO, toxicity

**Future:** May add optional, private-first social features (Phase 3)
- Share collections (view-only links)
- Follow friends' collections (opt-in)
- No public profiles, no comments

**Trade-offs:**
- ✅ Simpler product
- ✅ More private
- ✅ Healthier experience
- ❌ Less viral potential
- ❌ Harder to discover content

---

## Decision 11: Desktop-First Design

**Decision:** Design and build for desktop first, adapt to mobile later

**Context:**
- Development happens on desktop
- Easier to test and iterate on desktop
- Can add mobile optimizations in Phase 2

**Rationale:**
- **Development speed** - Faster iteration on desktop
- **Testing** - Easier to test/debug on desktop
- **Responsive from start** - Tailwind makes mobile adaptation easy
- **Can optimize later** - Mobile gestures, PWA in Phase 2

**Trade-offs:**
- ✅ Faster MVP development
- ✅ Easier testing
- ✅ Still works on mobile (responsive)
- ❌ Not optimized for mobile UX
- ❌ No native app features (push notifications, offline)

---

## Principles Behind Decisions

### 1. User Control Over Algorithms
- Users choose sources (not algorithms)
- Users set filters (not AI)
- Transparent about what's shown/hidden

### 2. ADHD-First Design
- No context switching (inline reading)
- Clear progress indicators
- Frictionless actions
- Visual variety

### 3. Simplicity Over Features
- Do fewer things better
- Don't overcomplicate
- MVP first, iterate later

### 4. Testability Matters
- Pure domain logic
- Integration tests for adapters
- E2E tests for critical paths

### 5. Performance Matters
- Fast feed generation (< 500ms)
- Fast page loads (< 2s)
- Responsive UI (60fps)

---

## Resources

- [Product Vision](../planning/PRODUCT_VISION.md)
- [Design Decisions](../planning/DESIGN_DECISIONS.md)
- [Architecture Overview](../reference/architecture.md)
- [Implementation Notes](../reference/IMPLEMENTATION_NOTES.md)

---

**Questions about these decisions?** Open a discussion!
