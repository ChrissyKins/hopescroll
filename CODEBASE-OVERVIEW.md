# HopeScroll Project - Comprehensive Codebase Overview

## Project Overview

**Forest Cabin** (HopeScroll) is a curated content feed application built with Next.js that helps users consume content intentionally without algorithmic chaos. It supports multiple content sources (YouTube, Twitch, RSS, Podcasts) with intelligent filtering and a user-customizable feed.

**Location:** `/home/chris/projects/hopescroll`

---

## 1. TECHNOLOGY STACK

### Core Framework
- **Next.js 14.2.0** - Full-stack React framework with App Router
- **React 18.3.0** - UI library
- **TypeScript 5.6.0** - Type safety
- **Tailwind CSS 3.4.0** - Utility-first styling
- **PostCSS** with nested support

### Database & ORM
- **PostgreSQL** - Primary data store
- **Prisma 5.20.0** - ORM for type-safe database access
- **Upstash Redis 1.34.0** - Caching layer for feed generation

### Authentication
- **Next-Auth 5.0.0-beta.29** - Authentication and session management
- **bcrypt/bcryptjs** - Password hashing
- **Resend 6.2.0** - Email service for password reset

### Testing
- **Vitest 2.1.0** - Unit and integration tests
- **@testing-library/react 16.0.0** - Component testing
- **JSDOM 27.0.0** - DOM simulation

### Logging
- **Pino 9.4.0** - Fast JSON logger
- **Pino-pretty 11.2.0** - Pretty formatting for dev

---

## 2. DIRECTORY STRUCTURE

```
/home/chris/projects/hopescroll/
├── app/                          # Next.js App Router
│   ├── api/                      # API routes (REST endpoints)
│   │   ├── auth/                # Authentication endpoints
│   │   ├── sources/             # Source management APIs
│   │   ├── filters/             # Filter management APIs
│   │   ├── saved/               # Saved content APIs
│   │   ├── history/             # History APIs
│   │   ├── feed/                # Feed generation APIs
│   │   ├── content/             # Content interaction APIs
│   │   ├── watch/               # Watch/recommendation APIs
│   │   ├── preferences/         # User preferences APIs
│   │   ├── cron/                # Scheduled tasks
│   │   └── debug/               # Development utilities
│   ├── sources/page.tsx         # Sources management page
│   ├── filters/page.tsx         # Filter management page
│   ├── saved/page.tsx           # Saved content page
│   ├── history/page.tsx         # Interaction history page
│   ├── watch/page.tsx           # Watch mode (theatre)
│   ├── scroll/page.tsx          # Scroll/feed page
│   ├── login/page.tsx           # Login page
│   ├── forgot-password/page.tsx # Password reset request
│   ├── reset-password/page.tsx  # Password reset form
│   ├── page.tsx                 # Home/landing page
│   ├── layout.tsx               # Root layout
│   └── globals.css              # Global styles
│
├── components/                   # Reusable React components
│   ├── feed/
│   │   └── content-card.tsx     # Content display card with interactions
│   ├── theatre/
│   │   ├── theatre-mode.tsx     # Full-screen theatre mode
│   │   └── youtube-player.tsx   # YouTube player wrapper
│   └── navigation.tsx            # Top navigation bar
│
├── domain/                       # Business logic (domain-driven design)
│   ├── content/
│   │   └── content-item.ts      # Content value objects and types
│   ├── feed/
│   │   ├── feed-item.ts         # Feed projection types
│   │   ├── feed-generator.ts    # Feed generation orchestration
│   │   ├── diversity-enforcer.ts # Source diversity logic
│   │   └── backlog-mixer.ts     # Backlog/new content mixing
│   ├── filtering/
│   │   ├── filter-rule.ts       # Filter rule interfaces
│   │   └── filter-engine.ts     # Filter application logic
│   └── user-actions/            # User action types
│
├── services/                     # Application services (orchestration)
│   ├── feed-service.ts          # Feed generation orchestration
│   ├── source-service.ts        # Source management
│   ├── filter-service.ts        # Filter management
│   ├── interaction-service.ts   # Content interaction tracking
│   └── content-service.ts       # Content fetching and storage
│
├── adapters/                     # External integrations
│   ├── content/
│   │   ├── youtube/             # YouTube API adapter
│   │   ├── twitch/              # Twitch API adapter
│   │   ├── rss/                 # RSS feed adapter
│   │   └── podcast/             # Podcast adapter
│   └── storage/                 # Storage adapters
│
├── lib/                          # Utility functions
│   ├── db.ts                    # Prisma client singleton
│   ├── cache.ts                 # Cache client (Redis)
│   ├── logger.ts                # Logging setup
│   ├── api-response.ts          # Standard API response formatting
│   ├── errors.ts                # Custom error classes
│   ├── validation.ts            # Zod validation schemas
│   ├── email.ts                 # Email sending utilities
│   ├── config.ts                # Configuration management
│   ├── auth.ts                  # Auth utilities
│   ├── adapters.ts              # Adapter factory
│   └── get-user-session.ts      # Session retrieval middleware
│
├── prisma/                       # Database schema and migrations
│   ├── schema.prisma            # Database schema definition
│   └── migrations/              # Database migration files
│
├── tests/                        # Test suite
│   ├── services/
│   ├── domain/
│   ├── lib/
│   ├── adapters/
│   ├── api/
│   ├── components/
│   └── integration/
│
├── docs/                         # Project documentation
│   └── planning/
│
├── package.json                  # Dependencies and scripts
├── tsconfig.json                 # TypeScript configuration
├── next.config.js               # Next.js configuration
├── tailwind.config.ts            # Tailwind CSS configuration
└── CLAUDE.md                     # Development guidelines
```

---

## 3. THE FOUR MANAGEMENT PAGES

### 3.1 SOURCES PAGE (`/app/sources/page.tsx`)

**Purpose:** Manage content sources (YouTube channels, RSS feeds, Podcasts, Twitch channels)

**Current Features:**
- Add new sources by platform and ID
- Display sources with avatars, fetch status, and error messages
- Show video stats (total fetched, unwatched counts)
- Mute/unmute individual sources
- Delete sources
- Bulk refresh content from all sources
- Toast-style feedback for fetch operations

**Key Data Interface:**
```typescript
interface ContentSource {
  id: string;
  type: string; // YOUTUBE, RSS, PODCAST, TWITCH
  sourceId: string;
  displayName: string;
  avatarUrl: string | null;
  isMuted: boolean;
  lastFetchStatus: string; // success, error, pending
  errorMessage: string | null;
  videoStats?: {
    totalFetched: number;
    unwatched: number;
  };
}
```

**API Routes:**
- `GET /api/sources` - List user's sources
- `POST /api/sources` - Add new source
- `DELETE /api/sources/[id]` - Remove source
- `PATCH /api/sources/[id]` - Update source (mute/unmute)
- `POST /api/sources/fetch` - Fetch content from all sources

**Styling:** Tailwind utility classes, light/dark mode support

---

### 3.2 FILTERS PAGE (`/app/filters/page.tsx`)

**Purpose:** Configure keyword and duration filters for content

**Current Features:**
- Add/remove keyword filters with wildcard support
- Set minimum and maximum duration (seconds)
- Quick preset buttons (Coffee Break 5-10min, Meal Time 15-25min, Evening 30-60min)
- Two-column layout (keywords left, duration right)
- Inline feedback for updates

**Key Data Interfaces:**
```typescript
interface FilterKeyword {
  id: string;
  keyword: string;
  isWildcard: boolean;
  createdAt: string;
}

interface UserPreferences {
  minDuration: number | null;
  maxDuration: number | null;
}
```

**API Routes:**
- `GET /api/filters` - Get all keywords and duration filters
- `POST /api/filters` - Add new keyword filter
- `DELETE /api/filters/[id]` - Remove keyword filter
- `PATCH /api/preferences` - Update duration filters

**Styling:** Grid layout with sidebar-like design

---

### 3.3 SAVED PAGE (`/app/saved/page.tsx`)

**Purpose:** View and manage saved content with optional collections and notes

**Current Features:**
- Grid layout (3 columns on desktop) of saved content
- Display save date and notes
- Remove items from saved
- Use ContentCard component for display
- Counter showing total saved items

**Key Data Interface:**
```typescript
interface SavedItem {
  id: string;
  collection: string | null;
  savedAt: string;
  notes: string | null;
  content: ContentItem;
}
```

**API Routes:**
- `GET /api/saved` - List user's saved content
- `POST /api/content/[id]/save` - Save content
- `POST /api/content/[id]/unsave` - Remove from saved

**Styling:** Grid layout with card-based design

---

### 3.4 HISTORY PAGE (`/app/history/page.tsx`)

**Purpose:** View interaction history with content (watches, saves, dismissals, etc.)

**Current Features:**
- Filter tabs: All, Watched, Saved, Dismissed, Not Now, Blocked
- List view with interaction type badges and icons
- Display timestamp, watch duration, completion rate
- Link to view content
- Source information

**Key Data Interface:**
```typescript
interface HistoryItem {
  id: string;
  type: string; // WATCHED, SAVED, DISMISSED, NOT_NOW, BLOCKED
  timestamp: string;
  watchDuration?: number;
  completionRate?: number;
  content: ContentItem;
}
```

**API Routes:**
- `GET /api/history` - Get all interactions
- `GET /api/history?type=WATCHED` - Filter by type

**Styling:** List-based design with status badges and filter tabs

---

## 4. SHARED COMPONENTS

### Currently Implemented

#### `components/navigation.tsx`
- Top navigation bar with main navigation (Watch, Scroll) and secondary (Sources, Filters, Saved, History)
- Sign out button
- Dark mode awareness for Watch page
- Active route highlighting

#### `components/feed/content-card.tsx`
- Displays individual content items with thumbnail
- YouTube player integration
- Interactive buttons: Save, Not Now, Dismiss, Expand
- Pin-to-floating-window feature for theatre mode
- Duration badge, NEW badge, publish date
- Source and publish info
- Responsive design with hover states

#### `components/theatre/youtube-player.tsx` & `components/theatre/theatre-mode.tsx`
- Full-screen theatre mode for watching content
- YouTube API integration

### Existing Patterns to Build Upon

1. **API Response Format** (`lib/api-response.ts`):
   ```typescript
   {
     success: boolean;
     data: T;
     error?: { code: string; message: string; details?: unknown };
     timestamp: string;
   }
   ```

2. **Error Handling** (`lib/errors.ts`):
   - Custom `AppError` class with codes and statusCodes
   - Standard error responses

3. **Validation** (`lib/validation.ts`):
   - Zod schemas for request validation
   - Re-usable validators

4. **State Management:**
   - Page-level state with `useState`
   - No global state management (no Redux/Zustand)
   - Client-side data fetching with `fetch`

---

## 5. STYLING & DESIGN SYSTEM

### Tailwind Configuration
**File:** `/home/chris/projects/hopescroll/tailwind.config.ts`

```typescript
const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
      },
    },
  },
}
```

### Global Styles (`app/globals.css`)
```css
:root {
  --background: #0a0a0a;
  --foreground: #ededed;
}
```

### Current Design Patterns

**Colors:**
- Primary: Blue (blue-600 for buttons, blue-500 for badges)
- Success: Green (green-600, green-100 backgrounds)
- Error: Red (red-600, red-100 backgrounds)
- Warning: Yellow (yellow-100 backgrounds)
- Neutral: Gray (gray-200 to gray-900)

**Components:**
- Button styles: `bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded`
- Cards: `bg-white dark:bg-gray-800 rounded-lg shadow p-6`
- Badges: `px-2 py-1 text-xs rounded bg-{color}-100 text-{color}-800`
- Inputs: `px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700`

**Dark Mode:**
- Built-in support with Tailwind's `dark:` prefix
- Consistent light/dark variants throughout

---

## 6. DATA MODELS & DATABASE SCHEMA

### Core Entities

**User**
- id (CUID)
- email (unique)
- password (hashed bcrypt)
- timestamps (createdAt, updatedAt)
- Relations: sources, filters, preferences, interactions, savedContent

**ContentSource**
- id, userId
- type (YOUTUBE, TWITCH, RSS, PODCAST)
- sourceId (platform-specific ID)
- displayName, avatarUrl
- isMuted, alwaysSafe
- lastFetchAt, lastFetchStatus, errorMessage
- Unique constraint: (userId, type, sourceId)

**ContentItem**
- id, sourceType, sourceId, originalId
- title, description, thumbnailUrl, url
- duration (seconds), publishedAt
- fetchedAt, lastSeenInFeed
- Relations: interactions, savedContent

**ContentInteraction**
- id, userId, contentId
- type (WATCHED, SAVED, DISMISSED, NOT_NOW, BLOCKED)
- timestamp
- watchDuration, completionRate (for WATCHED)
- dismissReason, collection (for SAVED)

**FilterKeyword**
- id, userId
- keyword, isWildcard
- createdAt

**UserPreferences**
- userId (primary key)
- minDuration, maxDuration (seconds)
- backlogRatio (0.0-1.0), diversityLimit
- theme (light/dark), density, autoPlay
- updatedAt

**SavedContent**
- id, userId, contentId
- collection (optional grouping)
- savedAt, notes
- Unique constraint: (userId, contentId)

---

## 7. API ARCHITECTURE

### Request/Response Pattern

All API routes follow a consistent pattern:

```typescript
// lib/api-response.ts provides:
successResponse<T>(data: T, status?: number): NextResponse<ApiSuccess<T>>
errorResponse(error: unknown, status?: number): NextResponse<ApiError>
```

### Authentication
- All protected routes use `requireAuth()` middleware
- Returns `{ userId, email }` from session
- Uses NextAuth v5 with adapter pattern

### Service Layer Architecture

```
API Route (app/api/*/route.ts)
    ↓
Service Layer (services/*.ts)
    ↓
Domain Logic (domain/*)
    ↓
Adapters (adapters/*) / Database (Prisma)
```

**Example Flow (Sources):**
1. `POST /api/sources` → SourceService.addSource()
2. SourceService validates and calls ContentService.fetchSource()
3. ContentService uses adapters to fetch from platform
4. Results stored via Prisma and cached in Redis
5. Response formatted with successResponse()

---

## 8. STATE MANAGEMENT PATTERNS

### Page-Level State
- Uses React `useState` hook for local state
- `isLoading`, `isAdding`, `isFetching` flags for async operations
- `error` state for displaying error messages

### Data Flow Pattern
```typescript
// 1. Load initial data
useEffect(() => {
  fetchData();
}, []);

// 2. Handle user action
const handleAction = async (e) => {
  try {
    setIsLoading(true);
    const response = await fetch('/api/...');
    // Handle response
  } catch (err) {
    setError(err.message);
  } finally {
    setIsLoading(false);
  }
};

// 3. Refresh/Invalidate
await fetchData();
```

### Cache Strategy
- Feed uses Redis cache with TTL (configurable seconds)
- Cache invalidated on: source changes, filter changes, new interactions
- Other data fetched fresh each time (intentional for simplicity)

---

## 9. KEY PATTERNS TO UNDERSTAND

### Feed Generation (`domain/feed/`)
The feed is generated per-request with a sophisticated algorithm:

1. **Load Configuration:**
   - User's sources (non-muted)
   - Active filters (keywords, duration)
   - User preferences (backlog ratio, diversity)
   - Past interactions

2. **Fetch Content:**
   - Pull from all sources' recent content
   - Apply filters (keyword exclusion, duration bounds)

3. **Generate Feed:**
   - Enforce diversity (max consecutive items from same source)
   - Mix backlog (older content) with new
   - Return ordered list of FeedItem objects

4. **Cache Result:**
   - Store in Redis with TTL
   - Invalidate on preference/filter changes

### Filtering (`domain/filtering/`)
- **FilterRule interface:** Defines how filters work
- **KeywordFilterRule:** Matches/blocks keywords (exact or wildcard)
- **DurationFilterRule:** Filters by min/max seconds
- **FilterEngine:** Applies all rules to batch of content

### Interactions
Five types: WATCHED, SAVED, DISMISSED, NOT_NOW, BLOCKED

Each affects feed generation differently:
- WATCHED: Shown as watched status (appears in history)
- SAVED: Excludes from feed, shows in saved page
- DISMISSED: Excludes from feed permanently
- NOT_NOW: Temporarily excludes (returns after 1 day or 50 items)
- BLOCKED: Permanently excludes

---

## 10. VALIDATION SCHEMAS (Zod)

Located in `lib/validation.ts`, provides type-safe request parsing:

Examples:
- `addSourceSchema` - validates type and sourceId
- Duration validation - ensures min < max
- Email/password validation for auth

---

## 11. ERROR HANDLING

### Custom AppError
```typescript
class AppError extends Error {
  code: string;
  statusCode: number;
  details?: unknown;
}
```

### Common Error Codes
- NOT_FOUND (404)
- UNAUTHORIZED (401)
- VALIDATION_ERROR (400)
- INTERNAL_SERVER_ERROR (500)

---

## 12. LOGGING

Uses Pino logger throughout:
```typescript
const log = createLogger('module-name');
log.info({ userId, action }, 'Message');
log.error({ error }, 'Message');
```

Enables structured logging for debugging and monitoring.

---

## 13. CONFIGURATION

**Environment Variables Required:**
- POSTGRES_URL - Database connection string
- NEXTAUTH_SECRET - Auth session signing key
- NEXTAUTH_URL - Public auth callback URL
- YouTube API keys, Twitch API keys, etc.
- Resend API key for email

**Config File:** `lib/config.ts` - Validates and exports config

---

## 14. TESTING SETUP

**Framework:** Vitest + Testing Library + JSDOM

**Test Location:** `tests/` mirrors source structure
- `tests/services/` - Service unit tests
- `tests/domain/` - Domain logic tests
- `tests/lib/` - Utility tests
- `tests/integration/` - End-to-end scenarios

**Run Tests:** `npm run test` or `npm run test:watch`

---

## 15. KEY FILES TO REFERENCE

### Data Models & Types
- `/home/chris/projects/hopescroll/domain/feed/feed-item.ts` - FeedItem interface
- `/home/chris/projects/hopescroll/domain/content/content-item.ts` - ContentItem interface
- `/home/chris/projects/hopescroll/prisma/schema.prisma` - Database schema

### Services
- `/home/chris/projects/hopescroll/services/feed-service.ts` - Feed generation
- `/home/chris/projects/hopescroll/services/source-service.ts` - Source management
- `/home/chris/projects/hopescroll/services/filter-service.ts` - Filter management

### API Response Pattern
- `/home/chris/projects/hopescroll/lib/api-response.ts` - Standard response format
- `/home/chris/projects/hopescroll/lib/errors.ts` - Error handling

### Navigation & Layout
- `/home/chris/projects/hopescroll/components/navigation.tsx` - Top nav (reference for consistency)
- `/home/chris/projects/hopescroll/app/layout.tsx` - Root layout

### Existing Pages
- `/home/chris/projects/hopescroll/app/sources/page.tsx`
- `/home/chris/projects/hopescroll/app/filters/page.tsx`
- `/home/chris/projects/hopescroll/app/saved/page.tsx`
- `/home/chris/projects/hopescroll/app/history/page.tsx`

---

## 16. IMPORTANT GUIDELINES

From `CLAUDE.md`:
- Commit to git often
- Don't overcomplicate solutions
- Test functionality as you go
- Lint as you go
- Never implement security-critical features with placeholders
- If features need external services (email, SMS), implement properly or ask
- Dev server runs on port 3000

---

## 17. NEXT STEPS FOR UI IMPROVEMENTS

Based on `PLANNING-ui-improvements.md`, the high-priority items are:

1. **Replace all `alert()` with toast notification system** - Users expect non-blocking toasts
2. **Add search functionality** - All list pages need search
3. **Improve empty states** - Help new users get started
4. **Standardize colors** - Consistent button/badge colors
5. **Add sorting** - All list views should support sorting

See `/home/chris/projects/hopescroll/PLANNING-ui-improvements.md` for detailed recommendations for each page.

---

## Summary

HopeScroll is a well-structured, modern Next.js application with:
- Clear separation of concerns (domain → services → API → UI)
- Type-safe architecture with TypeScript and Zod
- Consistent styling with Tailwind
- Scalable adapter pattern for integrations
- Simple but effective state management
- Four key management pages that control the core functionality

The codebase is ready for UI improvements that will enhance user experience without disrupting the solid foundation.

