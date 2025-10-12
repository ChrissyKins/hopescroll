# Forest Cabin - System Architecture Document

**Version:** 1.0  
**Last Updated:** October 2025  
**Target:** Personal use, single-user deployment on Vercel  
**Purpose:** Curated content feed for intentional digital consumption

---

## Executive Summary

Forest Cabin is a personal content aggregation platform designed to replace algorithmic social media with a curated, filtered feed from pre-approved sources. The architecture prioritizes **maintainability, simplicity, and clean boundaries** over premature optimization for scale.

### Key Architectural Decisions

1. **Deployment Model:** Next.js monolith on Vercel with managed services
2. **Patterns:** Hexagonal Architecture (Ports & Adapters) + Domain-Driven Design principles
3. **Data Flow:** Command-Query separation with event-sourced user interactions
4. **Testing:** Focus on domain logic purity, pragmatic integration testing
5. **Expansion:** Designed for easy addition of content sources and filter types

---

## Architecture Review & Alternatives Considered

### Deployment Architecture

**CHOSEN: Next.js on Vercel + Managed Services**
- ✅ Single deployment artifact (simplicity)
- ✅ Serverless scaling (don't think about infrastructure)
- ✅ Edge caching built-in
- ✅ Vercel Cron for background jobs
- ✅ TypeScript across full stack

**Alternative Considered: Separate Frontend + Backend**
- ❌ More complex deployment (two services)
- ❌ CORS configuration overhead
- ❌ Split codebase harder to maintain solo
- ✅ Could enable native mobile app easier
- **Verdict:** Overengineering for personal use. Can extract API later if needed.

**Alternative Considered: Self-hosted (Docker Compose)**
- ✅ Full control, no vendor lock-in
- ❌ Must manage servers, backups, updates
- ❌ Additional cost and complexity
- **Verdict:** Viable but adds operational burden. Vercel's DX is worth the tradeoff.

### Data Architecture

**CHOSEN: PostgreSQL (Vercel Postgres) + Redis (Upstash)**
- ✅ Relational model fits domain well (sources, users, interactions)
- ✅ Strong consistency for user preferences
- ✅ Excellent TypeScript tooling (Prisma)
- ✅ Redis for feed caching only (can rebuild from DB)

**Alternative Considered: SQLite + Local Cache**
- ✅ Simpler (one file)
- ✅ No external dependencies
- ❌ Harder to inspect/debug remotely
- ❌ Backup strategy more manual
- **Verdict:** PostgreSQL more production-ready, minimal added complexity

**Alternative Considered: MongoDB**
- ✅ Flexible schema
- ❌ Overkill for structured data
- ❌ Less mature TypeScript support
- **Verdict:** Wrong tool for this domain model

### Domain Architecture

**CHOSEN: Hexagonal Architecture (Ports & Adapters)**
- ✅ Content sources are natural adapters
- ✅ Domain logic remains pure (testable, portable)
- ✅ Easy to swap implementations
- ✅ Clear dependency flow (domain → adapters, never reverse)

**Alternative Considered: Traditional Layered Architecture**
- ✅ Simpler, more conventional
- ❌ Tends toward coupled layers over time
- ❌ Harder to test in isolation
- **Verdict:** Hexagonal is worth the upfront structure

**Alternative Considered: Event Sourcing Throughout**
- ✅ Perfect audit trail
- ✅ Time-travel debugging
- ❌ Significant complexity for read-heavy app
- ❌ Query performance overhead
- **Verdict:** Use event log for user actions only, not full ES

### State Management

**CHOSEN: Event-Sourced User Actions + Cached Projections**
- ✅ Complete interaction history (undo, analytics, debugging)
- ✅ Current state is projection (can rebuild)
- ✅ Natural fit for "history" and "saved" features
- ❌ Slightly more complex than simple CRUD

**Alternative Considered: Simple CRUD Updates**
- ✅ Simpler mental model
- ❌ Lose history of state changes
- ❌ "Undo" becomes harder
- **Verdict:** Event sourcing for interactions is worth it

---

## System Architecture

### High-Level Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        Vercel Edge                          │
│                     (CDN + Routing)                         │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                   Next.js Application                       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                  Frontend (React)                     │  │
│  │  • Feed UI          • Theatre Mode                    │  │
│  │  • Filter Manager   • Source Manager                  │  │
│  │  • Player Controls  • History/Saved                   │  │
│  └──────────────────────────────────────────────────────┘  │
│                         │                                   │
│  ┌──────────────────────▼───────────────────────────────┐  │
│  │              API Routes (Backend)                     │  │
│  │  /api/feed  /api/sources  /api/filters               │  │
│  │  /api/content/*  /api/saved                           │  │
│  └──────────────────────────────────────────────────────┘  │
│                         │                                   │
│  ┌──────────────────────▼───────────────────────────────┐  │
│  │              Services Layer                           │  │
│  │  • FeedService       • ContentService                 │  │
│  │  • FilterService     • SourceService                  │  │
│  └───────────┬──────────────────────┬───────────────────┘  │
│              │                      │                       │
│  ┌───────────▼──────────┐  ┌───────▼────────────────────┐  │
│  │   Domain Logic       │  │   Adapters (Ports)         │  │
│  │  • FilterEngine      │  │  • YouTubeAdapter          │  │
│  │  • FeedGenerator     │  │  • TwitchAdapter           │  │
│  │  • DiversityAlgo     │  │  • RSSAdapter              │  │
│  │  (Pure TypeScript)   │  │  • StorageAdapter          │  │
│  └──────────────────────┘  └────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
┌───────▼──────┐  ┌──────▼─────┐  ┌──────▼──────┐
│  PostgreSQL  │  │   Redis    │  │ Vercel Blob │
│   (Vercel)   │  │  (Upstash) │  │  (Storage)  │
│              │  │            │  │             │
│ • Users      │  │ • Feed     │  │ • Thumbs   │
│ • Sources    │  │   Cache    │  │ • Metadata │
│ • Content    │  │ • Session  │  │            │
│ • Actions    │  │   State    │  │            │
└──────────────┘  └────────────┘  └─────────────┘

External APIs:
┌─────────────┐  ┌──────────┐  ┌─────────┐
│ YouTube API │  │ Twitch   │  │  RSS    │
│   (v3)      │  │   API    │  │  Feeds  │
└─────────────┘  └──────────┘  └─────────┘
```

---

## Project Structure

```
forest-cabin/
├── prisma/
│   ├── schema.prisma           # Database schema
│   └── migrations/             # Version-controlled DB migrations
│
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   └── register/
│   │   ├── feed/
│   │   │   └── page.tsx        # Main feed view
│   │   ├── sources/
│   │   │   └── page.tsx        # Source management
│   │   ├── filters/
│   │   │   └── page.tsx        # Filter configuration
│   │   ├── saved/
│   │   │   └── page.tsx        # Saved content
│   │   ├── history/
│   │   │   └── page.tsx        # Watch history
│   │   └── api/
│   │       ├── feed/
│   │       │   ├── route.ts
│   │       │   └── refresh/route.ts
│   │       ├── sources/
│   │       │   ├── route.ts
│   │       │   ├── [id]/route.ts
│   │       │   └── validate/route.ts
│   │       ├── filters/
│   │       │   ├── route.ts
│   │       │   └── [id]/route.ts
│   │       ├── content/
│   │       │   └── [id]/
│   │       │       ├── watch/route.ts
│   │       │       ├── save/route.ts
│   │       │       ├── dismiss/route.ts
│   │       │       └── block/route.ts
│   │       ├── saved/
│   │       │   └── route.ts
│   │       └── cron/
│   │           └── fetch-content/route.ts
│   │
│   ├── domain/                 # Pure business logic (framework-agnostic)
│   │   ├── filtering/
│   │   │   ├── filter-engine.ts
│   │   │   ├── filter-rule.ts
│   │   │   ├── keyword-matcher.ts
│   │   │   └── duration-filter.ts
│   │   ├── feed/
│   │   │   ├── feed-generator.ts
│   │   │   ├── diversity-enforcer.ts
│   │   │   ├── content-rotation.ts
│   │   │   └── backlog-mixer.ts
│   │   ├── content/
│   │   │   ├── content-item.ts
│   │   │   └── content-metadata.ts
│   │   └── user-actions/
│   │       ├── interaction.ts
│   │       ├── interaction-types.ts
│   │       └── state-machine.ts
│   │
│   ├── adapters/               # External system integrations
│   │   ├── content/
│   │   │   ├── base-adapter.ts         # Interface definition
│   │   │   ├── youtube/
│   │   │   │   ├── youtube-client.ts
│   │   │   │   ├── youtube-adapter.ts
│   │   │   │   └── youtube-types.ts
│   │   │   ├── twitch/
│   │   │   │   ├── twitch-client.ts
│   │   │   │   ├── twitch-adapter.ts
│   │   │   │   └── twitch-types.ts
│   │   │   ├── rss/
│   │   │   │   ├── rss-client.ts
│   │   │   │   ├── rss-adapter.ts
│   │   │   │   └── rss-types.ts
│   │   │   └── podcast/
│   │   │       ├── podcast-client.ts
│   │   │       └── podcast-adapter.ts
│   │   └── storage/
│   │       ├── db-adapter.ts
│   │       ├── cache-adapter.ts
│   │       └── blob-adapter.ts
│   │
│   ├── services/               # Application orchestration layer
│   │   ├── feed-service.ts
│   │   ├── content-service.ts
│   │   ├── source-service.ts
│   │   ├── filter-service.ts
│   │   └── interaction-service.ts
│   │
│   ├── lib/                    # Shared utilities
│   │   ├── config.ts
│   │   ├── logger.ts
│   │   ├── db.ts               # Prisma client singleton
│   │   ├── cache.ts            # Redis client
│   │   ├── validation.ts       # Zod schemas
│   │   └── errors.ts           # Error types
│   │
│   └── components/             # React components
│       ├── feed/
│       │   ├── feed-container.tsx
│       │   ├── content-card.tsx
│       │   ├── filter-bar.tsx
│       │   └── action-buttons.tsx
│       ├── theatre/
│       │   ├── theatre-mode.tsx
│       │   ├── video-player.tsx
│       │   └── podcast-player.tsx
│       ├── sources/
│       │   ├── source-list.tsx
│       │   └── add-source-form.tsx
│       ├── filters/
│       │   ├── filter-list.tsx
│       │   └── add-filter-form.tsx
│       └── ui/                 # Reusable UI components
│           ├── button.tsx
│           ├── card.tsx
│           └── modal.tsx
│
├── tests/
│   ├── domain/                 # Domain logic tests (unit)
│   ├── services/               # Service layer tests (integration)
│   └── adapters/               # Adapter tests (integration)
│
├── vercel.json                 # Vercel configuration (cron jobs)
├── package.json
├── tsconfig.json
└── .env.example
```

---

## Domain Model

### Core Entities

#### ContentItem (Aggregate Root)
Represents a single piece of consumable content from any source.

```typescript
interface ContentItem {
  id: string;                    // Internal UUID
  
  // Source identification
  sourceType: SourceType;        // YOUTUBE | TWITCH | RSS | PODCAST
  sourceId: string;              // Channel ID, username, feed URL
  originalId: string;            // Platform-specific ID
  
  // Metadata
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  url: string;                   // Link to original content
  duration: number | null;       // Seconds (null for articles)
  publishedAt: Date;
  
  // System metadata
  fetchedAt: Date;
  lastSeenInFeed: Date;
  
  // Computed
  isFiltered?: boolean;          // Populated by FilterEngine
  filterReason?: string[];       // Which filters matched
}
```

#### ContentSource (Aggregate Root)
User's subscribed content sources.

```typescript
interface ContentSource {
  id: string;
  userId: string;
  
  type: SourceType;
  sourceId: string;              // Platform-specific identifier
  displayName: string;
  avatarUrl: string | null;
  
  // Behavior flags
  isMuted: boolean;              // Temporarily hidden
  alwaysSafe: boolean;           // Skip filtering for this source
  
  // State
  addedAt: Date;
  lastFetchAt: Date | null;
  lastFetchStatus: 'success' | 'error' | 'pending';
  errorMessage: string | null;
}
```

#### ContentInteraction (Event)
Immutable record of user actions (event sourcing pattern).

```typescript
interface ContentInteraction {
  id: string;
  userId: string;
  contentId: string;
  
  type: InteractionType;
  timestamp: Date;
  
  // Context (type-specific)
  watchDuration?: number;        // For WATCHED
  completionRate?: number;       // For WATCHED (0.0-1.0)
  dismissReason?: string;        // For DISMISSED
  collection?: string;           // For SAVED
}

enum InteractionType {
  WATCHED = 'WATCHED',
  SAVED = 'SAVED',
  DISMISSED = 'DISMISSED',
  NOT_NOW = 'NOT_NOW',
  BLOCKED = 'BLOCKED',
}
```

#### FilterConfiguration
User's content filtering rules.

```typescript
interface FilterConfiguration {
  userId: string;
  keywords: FilterKeyword[];
  durationRange: DurationRange | null;
  contentTypePreferences: SourceType[];
}

interface FilterKeyword {
  id: string;
  keyword: string;
  isWildcard: boolean;
  createdAt: Date;
}

interface DurationRange {
  min: number | null;  // seconds
  max: number | null;  // seconds
}
```

#### FeedPreferences
User preferences for feed generation.

```typescript
interface FeedPreferences {
  userId: string;
  
  // Content mix
  backlogRatio: number;          // 0.0-1.0, proportion of older content
  maxConsecutiveFromSource: number;  // Diversity enforcement
  
  // UI preferences
  theme: 'light' | 'dark';
  density: 'compact' | 'cozy' | 'comfortable';
  autoPlay: boolean;
  
  updatedAt: Date;
}
```

### Value Objects

#### FeedItem
Transient representation of content in the feed (projection).

```typescript
interface FeedItem {
  content: ContentItem;
  position: number;              // Feed order
  isNew: boolean;                // Published in last 7 days
  sourceDisplayName: string;
  interactionState: InteractionState | null;
}

type InteractionState = 
  | { type: 'never-seen' }
  | { type: 'dismissed-temp', willReturnAt: Date }
  | { type: 'saved', collection?: string }
  | { type: 'watched', at: Date };
```

---

## Key Patterns & Components

### 1. Hexagonal Architecture Implementation

#### Port Definition (Interface)
```typescript
// adapters/content/base-adapter.ts
export interface ContentAdapter {
  readonly sourceType: SourceType;
  
  // Fetch recent content (last N days)
  fetchRecent(sourceId: string, days: number): Promise<ContentItem[]>;
  
  // Fetch older backlog content
  fetchBacklog(sourceId: string, limit: number, offset: number): Promise<ContentItem[]>;
  
  // Validate source exists and is accessible
  validateSource(sourceId: string): Promise<SourceValidation>;
  
  // Get source metadata
  getSourceMetadata(sourceId: string): Promise<SourceMetadata>;
}

export interface SourceValidation {
  isValid: boolean;
  displayName?: string;
  avatarUrl?: string;
  errorMessage?: string;
}

export interface SourceMetadata {
  displayName: string;
  description: string;
  avatarUrl: string;
  subscriberCount?: number;
  totalContent?: number;
}
```

#### Adapter Implementation Example
```typescript
// adapters/content/youtube/youtube-adapter.ts
import { ContentAdapter } from '../base-adapter';
import { YouTubeClient } from './youtube-client';

export class YouTubeAdapter implements ContentAdapter {
  readonly sourceType = SourceType.YOUTUBE;
  
  constructor(private client: YouTubeClient) {}
  
  async fetchRecent(channelId: string, days: number): Promise<ContentItem[]> {
    const publishedAfter = new Date();
    publishedAfter.setDate(publishedAfter.getDate() - days);
    
    const videos = await this.client.searchChannelVideos({
      channelId,
      publishedAfter,
      maxResults: 50,
    });
    
    return videos.map(this.mapToContentItem);
  }
  
  async fetchBacklog(channelId: string, limit: number, offset: number): Promise<ContentItem[]> {
    const videos = await this.client.getChannelVideos({
      channelId,
      maxResults: limit,
      pageToken: this.calculatePageToken(offset, limit),
    });
    
    return videos.map(this.mapToContentItem);
  }
  
  async validateSource(channelId: string): Promise<SourceValidation> {
    try {
      const channel = await this.client.getChannel(channelId);
      return {
        isValid: true,
        displayName: channel.snippet.title,
        avatarUrl: channel.snippet.thumbnails.default.url,
      };
    } catch (error) {
      return {
        isValid: false,
        errorMessage: error.message,
      };
    }
  }
  
  private mapToContentItem(video: YouTubeVideo): ContentItem {
    return {
      id: generateId(),
      sourceType: SourceType.YOUTUBE,
      sourceId: video.snippet.channelId,
      originalId: video.id.videoId || video.id,
      title: video.snippet.title,
      description: video.snippet.description,
      thumbnailUrl: video.snippet.thumbnails.medium.url,
      url: `https://youtube.com/watch?v=${video.id.videoId || video.id}`,
      duration: this.parseDuration(video.contentDetails?.duration),
      publishedAt: new Date(video.snippet.publishedAt),
      fetchedAt: new Date(),
      lastSeenInFeed: new Date(),
    };
  }
  
  private parseDuration(isoDuration: string): number | null {
    // Parse ISO 8601 duration (PT15M33S) to seconds
    // Implementation details...
  }
}
```

### 2. Domain Logic: Filter Engine

```typescript
// domain/filtering/filter-engine.ts

export class FilterEngine {
  constructor(private rules: FilterRule[]) {}
  
  evaluate(content: ContentItem): FilterResult {
    const matchedRules: FilterRule[] = [];
    
    for (const rule of this.rules) {
      if (rule.matches(content)) {
        matchedRules.push(rule);
      }
    }
    
    return {
      isFiltered: matchedRules.length > 0,
      matchedRules,
      reasons: matchedRules.map(r => r.getReason()),
    };
  }
  
  evaluateBatch(items: ContentItem[]): ContentItem[] {
    return items
      .map(item => ({
        ...item,
        ...this.evaluate(item),
      }))
      .filter(item => !item.isFiltered);
  }
}

export interface FilterResult {
  isFiltered: boolean;
  matchedRules: FilterRule[];
  reasons: string[];
}

// domain/filtering/filter-rule.ts
export interface FilterRule {
  matches(content: ContentItem): boolean;
  getReason(): string;
}

export class KeywordFilterRule implements FilterRule {
  constructor(
    private keyword: string,
    private isWildcard: boolean,
    private caseSensitive: boolean = false
  ) {}
  
  matches(content: ContentItem): boolean {
    const searchText = `${content.title} ${content.description || ''}`;
    const text = this.caseSensitive ? searchText : searchText.toLowerCase();
    const keyword = this.caseSensitive ? this.keyword : this.keyword.toLowerCase();
    
    if (this.isWildcard) {
      // Remove * from keyword for matching
      const pattern = keyword.replace(/\*/g, '');
      return text.includes(pattern);
    } else {
      // Whole word matching
      const regex = new RegExp(`\\b${this.escapeRegex(keyword)}\\b`, 'i');
      return regex.test(text);
    }
  }
  
  getReason(): string {
    return `Keyword: ${this.keyword}`;
  }
  
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

export class DurationFilterRule implements FilterRule {
  constructor(
    private min: number | null,
    private max: number | null
  ) {}
  
  matches(content: ContentItem): boolean {
    if (!content.duration) return false;
    
    if (this.min !== null && content.duration < this.min) {
      return true;
    }
    
    if (this.max !== null && content.duration > this.max) {
      return true;
    }
    
    return false;
  }
  
  getReason(): string {
    if (this.min && this.max) {
      return `Duration not between ${this.formatDuration(this.min)} and ${this.formatDuration(this.max)}`;
    } else if (this.min) {
      return `Duration less than ${this.formatDuration(this.min)}`;
    } else {
      return `Duration more than ${this.formatDuration(this.max!)}`;
    }
  }
  
  private formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    return `${mins}m`;
  }
}
```

### 3. Domain Logic: Feed Generator

```typescript
// domain/feed/feed-generator.ts

export class FeedGenerator {
  constructor(
    private diversityEnforcer: DiversityEnforcer,
    private backlogMixer: BacklogMixer
  ) {}
  
  generate(
    sources: ContentSource[],
    allContent: ContentItem[],
    preferences: FeedPreferences,
    previousInteractions: ContentInteraction[]
  ): FeedItem[] {
    // 1. Filter out content already interacted with (except NOT_NOW)
    const unseenContent = this.filterSeen(allContent, previousInteractions);
    
    // 2. Separate recent and backlog content
    const { recent, backlog } = this.categorizeByAge(unseenContent);
    
    // 3. Mix according to backlog ratio
    const mixed = this.backlogMixer.mix(recent, backlog, preferences.backlogRatio);
    
    // 4. Enforce diversity (no more than N consecutive from same source)
    const diversified = this.diversityEnforcer.enforce(
      mixed,
      preferences.maxConsecutiveFromSource
    );
    
    // 5. Add "Not Now" items back into rotation (random positions)
    const withReturning = this.integrateReturningItems(
      diversified,
      allContent,
      previousInteractions
    );
    
    // 6. Enrich with metadata and position
    return withReturning.map((content, index) => this.toFeedItem(content, index, sources));
  }
  
  private filterSeen(
    content: ContentItem[],
    interactions: ContentInteraction[]
  ): ContentItem[] {
    const seenIds = new Set(
      interactions
        .filter(i => ['WATCHED', 'DISMISSED', 'SAVED', 'BLOCKED'].includes(i.type))
        .map(i => i.contentId)
    );
    
    return content.filter(item => !seenIds.has(item.id));
  }
  
  private categorizeByAge(content: ContentItem[]) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recent: ContentItem[] = [];
    const backlog: ContentItem[] = [];
    
    for (const item of content) {
      if (item.publishedAt > sevenDaysAgo) {
        recent.push(item);
      } else {
        backlog.push(item);
      }
    }
    
    return { recent, backlog };
  }
  
  private toFeedItem(
    content: ContentItem,
    position: number,
    sources: ContentSource[]
  ): FeedItem {
    const source = sources.find(s => 
      s.sourceId === content.sourceId && s.type === content.sourceType
    );
    
    return {
      content,
      position,
      isNew: this.isNew(content),
      sourceDisplayName: source?.displayName || 'Unknown',
      interactionState: null,
    };
  }
  
  private isNew(content: ContentItem): boolean {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return content.publishedAt > sevenDaysAgo;
  }
  
  private integrateReturningItems(
    feed: ContentItem[],
    allContent: ContentItem[],
    interactions: ContentInteraction[]
  ): ContentItem[] {
    // Find content marked as NOT_NOW that should return
    const notNowIds = new Set(
      interactions
        .filter(i => i.type === 'NOT_NOW')
        .map(i => i.contentId)
    );
    
    const returningContent = allContent.filter(item => notNowIds.has(item.id));
    
    // Randomly insert returning items (max 20% of feed)
    const maxReturning = Math.floor(feed.length * 0.2);
    const toReturn = this.shuffle(returningContent).slice(0, maxReturning);
    
    // Insert at random positions
    const result = [...feed];
    for (const item of toReturn) {
      const position = Math.floor(Math.random() * result.length);
      result.splice(position, 0, item);
    }
    
    return result;
  }
  
  private shuffle<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}

// domain/feed/diversity-enforcer.ts
export class DiversityEnforcer {
  enforce(content: ContentItem[], maxConsecutive: number): ContentItem[] {
    if (content.length === 0) return [];
    
    const result: ContentItem[] = [content[0]];
    const remaining = content.slice(1);
    
    while (remaining.length > 0) {
      const lastN = result.slice(-maxConsecutive);
      const lastSource = lastN[0]?.sourceId;
      
      // Check if all last N items are from same source
      const allSameSource = lastN.every(item => 
        item.sourceId === lastSource && item.sourceType === lastN[0].sourceType
      );
      
      if (allSameSource && lastN.length >= maxConsecutive) {
        // Find item from different source
        const differentSourceIndex = remaining.findIndex(item =>
          item.sourceId !== lastSource || item.sourceType !== lastN[0].sourceType
        );
        
        if (differentSourceIndex >= 0) {
          result.push(remaining[differentSourceIndex]);
          remaining.splice(differentSourceIndex, 1);
        } else {
          // No different source available, add anyway
          result.push(remaining.shift()!);
        }
      } else {
        result.push(remaining.shift()!);
      }
    }
    
    return result;
  }
}

// domain/feed/backlog-mixer.ts
export class BacklogMixer {
  mix(recent: ContentItem[], backlog: ContentItem[], ratio: number): ContentItem[] {
    const totalItems = recent.length + backlog.length;
    const backlogCount = Math.floor(totalItems * ratio);
    const recentCount = totalItems - backlogCount;
    
    const selectedRecent = this.shuffle(recent).slice(0, recentCount);
    const selectedBacklog = this.shuffle(backlog).slice(0, backlogCount);
    
    // Interleave them
    return this.interleave(selectedRecent, selectedBacklog);
  }
  
  private interleave(a: ContentItem[], b: ContentItem[]): ContentItem[] {
    const result: ContentItem[] = [];
    const maxLength = Math.max(a.length, b.length);
    
    for (let i = 0; i < maxLength; i++) {
      if (i < a.length) result.push(a[i]);
      if (i < b.length) result.push(b[i]);
    }
    
    return result;
  }
  
  private shuffle<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}
```

### 4. Service Layer Example

```typescript
// services/feed-service.ts

export class FeedService {
  constructor(
    private db: PrismaClient,
    private cache: CacheClient,
    private filterEngine: FilterEngine,
    private feedGenerator: FeedGenerator,
    private logger: Logger
  ) {}
  
  async getUserFeed(userId: string): Promise<FeedItem[]> {
    // Try cache first
    const cached = await this.cache.get(`feed:${userId}`);
    if (cached) {
      this.logger.info({ userId }, 'Feed cache hit');
      return cached;
    }
    
    this.logger.info({ userId }, 'Generating fresh feed');
    
    // 1. Load user configuration
    const [sources, filterConfig, preferences, interactions] = await Promise.all([
      this.db.contentSource.findMany({ where: { userId, isMuted: false } }),
      this.loadFilterConfig(userId),
      this.loadPreferences(userId),
      this.db.contentInteraction.findMany({ where: { userId } }),
    ]);
    
    // 2. Load content from all sources
    const allContent = await this.db.contentItem.findMany({
      where: {
        sourceId: { in: sources.map(s => s.sourceId) },
        sourceType: { in: sources.map(s => s.type) },
      },
      orderBy: { publishedAt: 'desc' },
      take: 500, // Reasonable limit
    });
    
    // 3. Apply filters (domain logic)
    const filtered = this.filterEngine.evaluateBatch(allContent);
    
    // 4. Generate feed (domain logic)
    const feed = this.feedGenerator.generate(
      sources,
      filtered,
      preferences,
      interactions
    );
    
    // 5. Cache result
    await this.cache.set(`feed:${userId}`, feed, 300); // 5 min TTL
    
    return feed;
  }
  
  async refreshFeed(userId: string): Promise<void> {
    this.logger.info({ userId }, 'Manual feed refresh requested');
    
    // Invalidate cache
    await this.cache.delete(`feed:${userId}`);
    
    // Optionally trigger content fetch
    // (or rely on background job)
  }
  
  private async loadFilterConfig(userId: string): Promise<FilterConfiguration> {
    const keywords = await this.db.filterKeyword.findMany({ where: { userId } });
    const prefs = await this.db.userPreferences.findUnique({ where: { userId } });
    
    return {
      userId,
      keywords: keywords.map(k => ({
        id: k.id,
        keyword: k.keyword,
        isWildcard: k.isWildcard,
        createdAt: k.createdAt,
      })),
      durationRange: prefs ? {
        min: prefs.minDuration,
        max: prefs.maxDuration,
      } : null,
      contentTypePreferences: [],
    };
  }
  
  private async loadPreferences(userId: string): Promise<FeedPreferences> {
    const prefs = await this.db.userPreferences.findUnique({ where: { userId } });
    
    return {
      userId,
      backlogRatio: prefs?.backlogRatio ?? 0.3,
      maxConsecutiveFromSource: prefs?.diversityLimit ?? 3,
      theme: prefs?.theme ?? 'dark',
      density: prefs?.density ?? 'cozy',
      autoPlay: false,
      updatedAt: prefs?.updatedAt ?? new Date(),
    };
  }
}
```

---

## Data Flow Patterns

### Command Flow (User Actions)

```
User clicks "Watch" button
  ↓
React component dispatches action
  ↓
API Route: POST /api/content/:id/watch
  ↓
InteractionService.recordWatch(userId, contentId, duration)
  ↓
1. Create ContentInteraction event in DB
2. Update cached feed projection
3. Invalidate feed cache
  ↓
Return success to client
  ↓
Client updates UI optimistically
```

### Query Flow (Feed Generation)

```
User navigates to /feed
  ↓
Server Component: feed/page.tsx
  ↓
FeedService.getUserFeed(userId)
  ↓
1. Check cache → hit? return
2. Load: sources, filters, preferences, interactions
3. Load content items from DB
4. FilterEngine.evaluateBatch(content) [pure]
5. FeedGenerator.generate(...) [pure]
6. Cache result
7. Return to component
  ↓
Render feed with FeedItem[]
```

### Background Job Flow (Content Fetching)

```
Vercel Cron triggers every 30 minutes
  ↓
GET /api/cron/fetch-content (with secret token)
  ↓
ContentService.fetchAllSources()
  ↓
For each ContentSource:
  1. Get appropriate adapter (YouTube, Twitch, RSS)
  2. adapter.fetchRecent(sourceId, days: 7)
  3. Normalize to ContentItem[]
  4. Deduplicate against existing DB content
  5. Bulk insert new items
  6. Update source.lastFetchAt
  ↓
Log completion metrics
  ↓
Invalidate all user feed caches (new content available)
```

---

## Database Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String   // Hashed
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  sources        ContentSource[]
  filters        FilterKeyword[]
  preferences    UserPreferences?
  interactions   ContentInteraction[]
  savedContent   SavedContent[]
}

model ContentSource {
  id          String      @id @default(cuid())
  userId      String
  user        User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  type        SourceType
  sourceId    String      // Platform-specific ID (channel ID, username, feed URL)
  displayName String
  avatarUrl   String?
  
  isMuted     Boolean     @default(false)
  alwaysSafe  Boolean     @default(false)
  
  addedAt         DateTime  @default(now())
  lastFetchAt     DateTime?
  lastFetchStatus String    @default("pending") // success, error, pending
  errorMessage    String?
  
  @@unique([userId, type, sourceId])
  @@index([userId])
}

model ContentItem {
  id              String   @id @default(cuid())
  
  sourceType      SourceType
  sourceId        String
  originalId      String   // YouTube video ID, Twitch VOD ID, etc.
  
  title           String
  description     String?  @db.Text
  thumbnailUrl    String?
  url             String
  duration        Int?     // Seconds
  publishedAt     DateTime
  
  fetchedAt       DateTime @default(now())
  lastSeenInFeed  DateTime @default(now())
  
  interactions    ContentInteraction[]
  savedContent    SavedContent[]
  
  @@unique([sourceType, originalId])
  @@index([sourceType, sourceId])
  @@index([publishedAt])
}

model ContentInteraction {
  id          String          @id @default(cuid())
  userId      String
  contentId   String
  content     ContentItem     @relation(fields: [contentId], references: [id], onDelete: Cascade)
  
  type        InteractionType
  timestamp   DateTime        @default(now())
  
  // Type-specific context
  watchDuration   Int?    // Seconds watched
  completionRate  Float?  // 0.0-1.0
  dismissReason   String?
  collection      String? // For SAVED type
  
  @@index([userId, contentId])
  @@index([userId, type])
  @@index([timestamp])
}

model FilterKeyword {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  keyword   String
  isWildcard Boolean @default(false)
  
  createdAt DateTime @default(now())
  
  @@index([userId])
}

model UserPreferences {
  userId    String   @id
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  // Duration filters
  minDuration Int?
  maxDuration Int?
  
  // Feed generation
  backlogRatio   Float @default(0.3)
  diversityLimit Int   @default(3)
  
  // UI preferences
  theme       String @default("dark")
  density     String @default("cozy")
  autoPlay    Boolean @default(false)
  
  updatedAt   DateTime @updatedAt
}

model SavedContent {
  id          String      @id @default(cuid())
  userId      String
  user        User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  contentId   String
  content     ContentItem @relation(fields: [contentId], references: [id], onDelete: Cascade)
  
  collection  String?     // Optional grouping
  savedAt     DateTime    @default(now())
  notes       String?     // User notes about saved item
  
  @@unique([userId, contentId])
  @@index([userId, collection])
}

enum SourceType {
  YOUTUBE
  TWITCH
  RSS
  PODCAST
}

enum InteractionType {
  WATCHED
  SAVED
  DISMISSED
  NOT_NOW
  BLOCKED
}
```

---

## API Design

### REST Endpoints

#### Feed Management
```
GET    /api/feed                    # Get user's feed
POST   /api/feed/refresh            # Manually refresh feed
GET    /api/feed/search?q=...       # Search within feed
```

#### Content Sources
```
GET    /api/sources                 # List all sources
POST   /api/sources                 # Add new source
PATCH  /api/sources/:id             # Update source (mute, unmute, etc.)
DELETE /api/sources/:id             # Remove source
POST   /api/sources/validate        # Validate source before adding
POST   /api/sources/import          # Bulk import (YouTube subscriptions)
```

#### Filters
```
GET    /api/filters                 # Get all filters
POST   /api/filters                 # Add filter keyword
DELETE /api/filters/:id             # Remove filter
POST   /api/filters/test            # Test filters against content
GET    /api/filters/suggestions     # Get suggested filters
```

#### Content Interactions
```
POST   /api/content/:id/watch       # Mark as watched
POST   /api/content/:id/save        # Save for later
POST   /api/content/:id/dismiss     # Dismiss from feed
POST   /api/content/:id/not-now     # Temporarily dismiss
POST   /api/content/:id/block       # Block + extract keywords
```

#### Saved Content
```
GET    /api/saved                   # Get saved items
GET    /api/saved/collections       # Get collection names
DELETE /api/saved/:id               # Remove from saved
PATCH  /api/saved/:id               # Update collection/notes
```

#### History
```
GET    /api/history                 # Get watch history
GET    /api/history/search?q=...    # Search history
```

#### User Preferences
```
GET    /api/preferences             # Get preferences
PATCH  /api/preferences             # Update preferences
```

#### Background Jobs (Internal)
```
GET    /api/cron/fetch-content      # Triggered by Vercel Cron
```

### API Response Format

Standard success response:
```typescript
{
  success: true,
  data: T,
  timestamp: string
}
```

Standard error response:
```typescript
{
  success: false,
  error: {
    code: string,      // ERROR_CODE
    message: string,   // Human-readable
    details?: any      // Additional context
  },
  timestamp: string
}
```

---

## Configuration

### Environment Variables

```bash
# Database
DATABASE_URL="postgresql://..."

# Redis Cache
UPSTASH_REDIS_URL="https://..."
UPSTASH_REDIS_TOKEN="..."

# Blob Storage
BLOB_READ_WRITE_TOKEN="..."

# External APIs
YOUTUBE_API_KEY="..."
TWITCH_CLIENT_ID="..."
TWITCH_CLIENT_SECRET="..."

# Authentication
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="http://localhost:3000"

# Background Jobs
CRON_SECRET="..."  # For securing cron endpoints

# Logging
LOG_LEVEL="info"  # debug, info, warn, error

# Feature Flags
ENABLE_USAGE_TRACKING="false"
ENABLE_PALETTE_CLEANSER="false"
```

### Application Configuration

```typescript
// lib/config.ts

export const CONFIG = {
  feed: {
    defaultBacklogRatio: 0.3,
    maxConsecutiveFromSource: 3,
    cacheTimeSeconds: 300,
    maxItemsInFeed: 200,
    notNowReturnAfterItems: 50,
  },
  
  content: {
    fetchIntervalMinutes: 30,
    fetchRecentDays: 7,
    backlogBatchSize: 50,
    maxBacklogDepth: 500,
    deduplicationWindowDays: 90,
  },
  
  filtering: {
    defaultKeywordMode: 'whole-word',
    caseSensitive: false,
  },
  
  rateLimit: {
    youtube: {
      requestsPerMinute: 100,
      dailyQuota: 10000,
    },
    twitch: {
      requestsPerMinute: 800,
    },
  },
  
  ui: {
    defaultTheme: 'dark',
    defaultDensity: 'cozy',
    contentCardImageRatio: 16/9,
  },
} as const;
```

---

## Testing Strategy

### Test Pyramid

```
      /\
     /  \     E2E (10%)
    /----\    - Critical user flows only
   /      \   - Playwright tests
  /--------\  
 /  Integration (20%)
/____________\ - Service layer with real DB
               - Adapter implementations
               
═══════════════ Unit (70%)
               - Domain logic
               - Pure functions
               - Filter engine
               - Feed generator
```

### Unit Tests (Domain Logic)

```typescript
// tests/domain/filtering/filter-engine.test.ts

import { describe, it, expect } from 'vitest';
import { FilterEngine } from '@/domain/filtering/filter-engine';
import { KeywordFilterRule } from '@/domain/filtering/filter-rule';

describe('FilterEngine', () => {
  describe('keyword filtering', () => {
    it('filters exact keyword match', () => {
      const rules = [new KeywordFilterRule('election', false)];
      const engine = new FilterEngine(rules);
      
      const content = {
        id: '1',
        title: 'Election Results 2024',
        description: 'Full coverage',
      } as ContentItem;
      
      const result = engine.evaluate(content);
      
      expect(result.isFiltered).toBe(true);
      expect(result.reasons).toContain('Keyword: election');
    });
    
    it('filters wildcard keyword', () => {
      const rules = [new KeywordFilterRule('*politic*', true)];
      const engine = new FilterEngine(rules);
      
      const content = {
        title: 'Political Debate Tonight',
      } as ContentItem;
      
      expect(engine.evaluate(content).isFiltered).toBe(true);
    });
    
    it('respects whole-word boundaries', () => {
      const rules = [new KeywordFilterRule('war', false)];
      const engine = new FilterEngine(rules);
      
      const shouldFilter = { title: 'War in Ukraine' } as ContentItem;
      const shouldNotFilter = { title: 'Star Wars Review' } as ContentItem;
      
      expect(engine.evaluate(shouldFilter).isFiltered).toBe(true);
      expect(engine.evaluate(shouldNotFilter).isFiltered).toBe(false);
    });
  });
  
  describe('duration filtering', () => {
    it('filters content outside duration range', () => {
      const rules = [new DurationFilterRule(300, 1800)]; // 5-30 min
      const engine = new FilterEngine(rules);
      
      const tooShort = { duration: 120 } as ContentItem; // 2 min
      const justRight = { duration: 900 } as ContentItem; // 15 min
      const tooLong = { duration: 3600 } as ContentItem; // 60 min
      
      expect(engine.evaluate(tooShort).isFiltered).toBe(true);
      expect(engine.evaluate(justRight).isFiltered).toBe(false);
      expect(engine.evaluate(tooLong).isFiltered).toBe(true);
    });
  });
});
```

### Integration Tests (Services)

```typescript
// tests/services/feed-service.test.ts

import { describe, it, expect, beforeEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { FeedService } from '@/services/feed-service';
import { mockDeep, DeepMockProxy } from 'vitest-mock-extended';

describe('FeedService', () => {
  let db: DeepMockProxy<PrismaClient>;
  let feedService: FeedService;
  
  beforeEach(() => {
    db = mockDeep<PrismaClient>();
    // Setup service with mocked dependencies
    feedService = new FeedService(
      db,
      mockCache,
      mockFilterEngine,
      mockFeedGenerator,
      mockLogger
    );
  });
  
  it('generates feed with diversity enforcement', async () => {
    // Setup test data
    db.contentSource.findMany.mockResolvedValue([
      { id: '1', sourceId: 'channel1', type: 'YOUTUBE' },
      { id: '2', sourceId: 'channel2', type: 'YOUTUBE' },
    ]);
    
    db.contentItem.findMany.mockResolvedValue([
      { sourceId: 'channel1', title: 'Video 1' },
      { sourceId: 'channel1', title: 'Video 2' },
      { sourceId: 'channel1', title: 'Video 3' },
      { sourceId: 'channel1', title: 'Video 4' },
      { sourceId: 'channel2', title: 'Video 5' },
    ]);
    
    const feed = await feedService.getUserFeed('user1');
    
    // Verify no more than 3 consecutive from same source
    let consecutiveCount = 1;
    for (let i = 1; i < feed.length; i++) {
      if (feed[i].content.sourceId === feed[i-1].content.sourceId) {
        consecutiveCount++;
        expect(consecutiveCount).toBeLessThanOrEqual(3);
      } else {
        consecutiveCount = 1;
      }
    }
  });
});
```

### Adapter Tests

```typescript
// tests/adapters/youtube/youtube-adapter.test.ts

import { describe, it, expect, vi } from 'vitest';
import { YouTubeAdapter } from '@/adapters/content/youtube/youtube-adapter';
import { YouTubeClient } from '@/adapters/content/youtube/youtube-client';

describe('YouTubeAdapter', () => {
  it('normalizes YouTube video to ContentItem', async () => {
    const mockClient = {
      searchChannelVideos: vi.fn().mockResolvedValue([
        {
          id: { videoId: 'abc123' },
          snippet: {
            title: 'Test Video',
            description: 'Test description',
            channelId: 'channel123',
            publishedAt: '2024-01-01T00:00:00Z',
            thumbnails: {
              medium: { url: 'https://example.com/thumb.jpg' }
            }
          },
          contentDetails: {
            duration: 'PT10M30S' // 10 minutes 30 seconds
          }
        }
      ])
    } as any;
    
    const adapter = new YouTubeAdapter(mockClient);
    const results = await adapter.fetchRecent('channel123', 7);
    
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      sourceType: 'YOUTUBE',
      sourceId: 'channel123',
      originalId: 'abc123',
      title: 'Test Video',
      duration: 630, // 10*60 + 30
      url: 'https://youtube.com/watch?v=abc123',
    });
  });
});
```

---

## Deployment Strategy

### Vercel Configuration

```json
// vercel.json
{
  "buildCommand": "prisma generate && next build",
  "installCommand": "npm install",
  "framework": "nextjs",
  "regions": ["lhr1"],
  "crons": [
    {
      "path": "/api/cron/fetch-content",
      "schedule": "*/30 * * * *"
    }
  ],
  "env": {
    "DATABASE_URL": "@database-url",
    "YOUTUBE_API_KEY": "@youtube-api-key"
  }
}
```

### Database Migrations

```bash
# Development
npx prisma migrate dev --name init

# Production (automatic on deploy)
npx prisma migrate deploy
```

### Monitoring & Observability

**Logging Strategy:**
```typescript
logger.info({ userId, contentCount }, 'Fetched content');
logger.warn({ sourceId, error }, 'Failed to fetch from source');
logger.error({ error, context }, 'Critical error');
```

**Metrics to Track:**
- Content fetch success/failure rate per source
- Feed generation time
- Cache hit rate
- Filter match rate
- User interaction distribution

**Tools:**
- Vercel Analytics (built-in)
- Upstash Redis insights
- Prisma query logging (development)
- Structured logging with Pino

---

## Security Considerations

### Authentication
- NextAuth.js for session management
- Secure password hashing (bcrypt)
- HTTP-only cookies for session tokens
- CSRF protection via NextAuth

### API Security
- Cron endpoints protected by secret token
- Rate limiting on user-facing endpoints
- Input validation with Zod schemas
- SQL injection prevention via Prisma (parameterized queries)

### Data Privacy
- User content sources are private (no sharing)
- Filter keywords are private
- Watch history is private
- No analytics tracking without explicit consent

### External API Keys
- Stored as environment variables (Vercel secrets)
- Never exposed to client
- Rotated regularly
- Minimal required scopes

---

## Performance Optimizations

### Caching Strategy
```
Feed Cache (Redis)
├─ Key: feed:{userId}
├─ TTL: 5 minutes
└─ Invalidation: on source/filter/preference change

Source Metadata Cache (Redis)
├─ Key: source:{type}:{sourceId}
├─ TTL: 24 hours
└─ Invalidation: manual only

Content Thumbnails (Vercel Blob + CDN)
├─ Edge caching
└─ Lazy loading
```

### Database Optimization
- Indexes on frequent queries (userId, sourceId, publishedAt)
- Pagination for large result sets
- Eager loading for related entities (reduce N+1 queries)
- Periodic cleanup of old ContentInteraction records

### Frontend Optimization
- React Server Components for initial feed load
- Infinite scroll with virtualization
- Image optimization (next/image)
- Code splitting by route
- Prefetch next items in background

---

## Expansion Roadmap

### Phase 1 (MVP - Weeks 1-8)
- ✅ User authentication
- ✅ YouTube adapter
- ✅ RSS adapter
- ✅ Filter engine (keyword + duration)
- ✅ Basic feed generation
- ✅ Watch/Save/Dismiss interactions
- ✅ Theatre mode player

### Phase 2 (Polish - Weeks 9-12)
- Twitch adapter (live streams + VODs)
- Podcast adapter
- Advanced filter presets
- Onboarding flow
- Export/import configuration
- Search within feed

### Phase 3 (Enhancement - Future)
- Mobile-responsive design
- PWA support
- Saved content collections
- Usage awareness features (optional)
- Advanced analytics (optional)
- Multi-device sync

### Future Content Sources
- Bluesky posts
- Mastodon posts
- Newsletter digests
- Vimeo channels
- Educational platforms (Coursera, Udemy)

---

## Success Metrics

### Technical Health
- Feed generation < 500ms (p95)
- Content fetch success rate > 95%
- Cache hit rate > 80%
- Zero data loss incidents
- API uptime > 99.9%

### User Experience (Personal)
- Can go 1+ month without algorithmic platforms
- Zero anxiety-inducing content in feed
- Daily usage feels intentional, not compulsive
- No "FOMO" about missing content
- Setup and maintenance < 15 min/week

---

## Anti-Patterns to Avoid

### The Vibecode Traps
❌ **Shotgun Surgery** - Changes require touching many files
   ✅ Use bounded contexts and clear interfaces

❌ **God Objects** - One class does everything
   ✅ Single Responsibility Principle

❌ **Premature Optimization** - Optimizing for scale we don't need
   ✅ Optimize for readability and maintainability first

❌ **Magic Strings/Numbers** - Hardcoded values everywhere
   ✅ CONFIG object for all tunable parameters

❌ **Hidden Dependencies** - Global state, singletons without DI
   ✅ Explicit dependency injection throughout

❌ **Leaky Abstractions** - Domain logic knows about DB/API details
   ✅ Hexagonal architecture maintains boundaries

❌ **Test-Induced Damage** - Tests are so hard we stop writing them
   ✅ Pure domain logic makes testing trivial

---

## References & Further Reading

### Books
- **"Domain-Driven Design Distilled"** - Vaughn Vernon
  - Core concepts, bounded contexts, aggregates
- **"Clean Architecture"** - Robert C. Martin
  - Dependency rules, ports & adapters
- **"Get Your Hands Dirty on Clean Architecture"** - Tom Hombergers
  - Practical hexagonal architecture in modern apps
- **"Designing Data-Intensive Applications"** - Martin Kleppmann
  - Caching, replication, consistency trade-offs
- **"Release It!"** - Michael Nygard
  - Resilience patterns, circuit breakers, timeouts

### Patterns
- **Hexagonal Architecture** (Ports & Adapters)
- **Domain-Driven Design** (Bounded Contexts)
- **Event Sourcing** (for user interactions only)
- **Command Query Responsibility Segregation** (CQRS-lite)
- **Repository Pattern** (via Prisma)
- **Strategy Pattern** (filter rules, content adapters)
- **Chain of Responsibility** (filter pipeline)

---

## Appendix: Key Design Decisions

### Why Hexagonal Architecture?
Multiple content sources are the core challenge. Hexagonal architecture naturally isolates each adapter, making new sources trivial to add. Domain logic stays pure and testable.

### Why Event Sourcing for Interactions Only?
Full event sourcing is overkill for this app. But user interactions naturally form an event log (watch, save, dismiss). This gives us undo, history, and analytics for free without complex state management.

### Why Next.js over Separate Backend?
Single-person project benefits from unified codebase. Vercel's DX (deployment, cron, caching) is excellent. Can extract API later if needed. TypeScript across full stack reduces context switching.

### Why PostgreSQL over NoSQL?
Domain model is inherently relational (users, sources, content, interactions). Prisma provides excellent TypeScript integration. ACID transactions matter for user actions.

### Why Not Microservices?
Personal use, single user, manageable complexity. Microservices add operational overhead with no benefit. Modular monolith gives structure without deployment complexity.

---

**Document Status:** Living document, will evolve with implementation learnings  
**Next Review:** After Phase 1 completion  
**Owner:** Solo developer (personal project)