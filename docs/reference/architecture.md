# Architecture Overview

**Version:** 1.0
**Last Updated:** 2025-10-23

## Introduction

HopeScroll follows a **hexagonal (ports and adapters) architecture** to maintain clean separation of concerns and enable testability.

## Project Structure

```
hopescroll/
├── app/                    # Next.js App Router pages and API routes
│   ├── api/               # API endpoints
│   ├── scroll/            # Main feed page
│   ├── sources/           # Source management
│   ├── filters/           # Filter management
│   ├── saved/             # Saved content
│   └── history/           # Watch history
├── domain/                # Business logic (pure TypeScript)
│   ├── content/          # Content entities and logic
│   ├── feed/             # Feed generation algorithm
│   ├── filtering/        # Content filtering logic
│   └── user-actions/     # User interaction logic
├── adapters/              # External system adapters
│   ├── content/          # Content source adapters
│   │   ├── youtube/
│   │   ├── twitch/
│   │   ├── rss/
│   │   └── podcast/
│   └── storage/          # Database adapters
├── services/              # Application services
├── components/            # React components
│   ├── ui/               # Reusable UI components
│   ├── feed/             # Feed-specific components
│   └── theatre/          # Video player components
├── hooks/                 # Custom React hooks
├── lib/                   # Utilities and helpers
├── types/                 # TypeScript type definitions
└── prisma/                # Database schema and migrations
```

## Architecture Layers

### 1. Domain Layer (`/domain`)

**Pure business logic** with no external dependencies.

- Contains core entities, value objects, and business rules
- No database, HTTP, or framework code
- Fully unit-testable
- Defines ports (interfaces) for external systems

**Examples:**
- `domain/feed/feed-generator.ts` - Feed generation algorithm
- `domain/filtering/keyword-filter.ts` - Keyword filtering logic
- `domain/content/content-item.ts` - Content entity

### 2. Adapter Layer (`/adapters`)

**Implements ports defined by domain layer.**

- Adapters for external content sources (YouTube, Twitch, RSS)
- Database adapters (Prisma)
- Each adapter implements a domain-defined interface

**Examples:**
- `adapters/content/youtube/youtube-adapter.ts` - YouTube API integration
- `adapters/storage/prisma-content-repository.ts` - Database operations

### 3. Application Layer (`/services`, `/app/api`)

**Orchestrates domain logic and adapters.**

- API route handlers in Next.js App Router
- Application services that coordinate domain logic
- Transaction boundaries and error handling

**Examples:**
- `app/api/feed/route.ts` - Feed API endpoint
- `services/content-fetch-service.ts` - Content fetching orchestration

### 4. Presentation Layer (`/app`, `/components`)

**User interface and interaction.**

- Next.js pages and layouts
- React components
- Client-side state management

**Examples:**
- `app/scroll/page.tsx` - Feed page
- `components/feed/feed-card.tsx` - Feed item component

## Data Flow

```
User Request
    ↓
Next.js App Router (app/api/)
    ↓
Application Service (services/)
    ↓
Domain Logic (domain/)
    ↓
Adapter (adapters/)
    ↓
External System (DB, API)
```

## Key Design Patterns

### Repository Pattern

Abstract database operations behind interfaces defined in the domain layer.

```typescript
// Domain defines the interface
interface ContentRepository {
  findById(id: string): Promise<ContentItem | null>;
  save(item: ContentItem): Promise<void>;
}

// Adapter implements it
class PrismaContentRepository implements ContentRepository {
  // Prisma-specific implementation
}
```

### Adapter Pattern

Each external content source implements a common interface.

```typescript
interface ContentAdapter {
  fetchContent(sourceId: string): Promise<ContentItem[]>;
}

class YouTubeAdapter implements ContentAdapter { }
class TwitchAdapter implements ContentAdapter { }
```

### Dependency Injection

Dependencies are injected rather than imported directly.

```typescript
// Good: Dependency is injected
function generateFeed(
  repository: ContentRepository,
  filters: FilterService
) { }

// Bad: Direct import creates tight coupling
import { prisma } from './db';
```

## Database Design

See [Database Schema Reference](./database-schema.md) for full schema details.

**Key entities:**
- `User` - User accounts
- `ContentSource` - Configured content sources
- `ContentItem` - Fetched content
- `ContentInteraction` - User actions (watched, saved, dismissed)
- `Collection` - Saved content collections
- `FilterKeyword` - Content filtering rules

## Authentication

- **Library:** NextAuth.js v5
- **Strategy:** Credentials provider with bcrypt password hashing
- **Session:** JWT-based sessions
- **Location:** `app/api/auth/[...nextauth]/route.ts`

## Content Fetching

Content is fetched via cron job or manual trigger:

1. User adds content source
2. Cron job calls `/api/cron/fetch-content`
3. Service identifies sources to fetch
4. Appropriate adapter fetches new content
5. Content stored in database
6. Feed algorithm generates personalized feed

## Feed Algorithm

See [Feed Algorithm Explanation](../explanation/feed-algorithm.md) for detailed logic.

**Key principles:**
- Mix of new content and backlog
- Diversity limit (max N items per source)
- Duration filtering
- Keyword filtering
- User preferences

## Testing Strategy

- **Unit tests:** Domain layer logic
- **Integration tests:** API routes with test database
- **Component tests:** React components with Vitest
- **Test location:** `/tests` directory mirrors source structure

## Performance Considerations

- Prisma connection pooling
- Efficient database indexes on common queries
- Client-side caching with React Query (future)
- Image optimization via Next.js Image component

## Security

- Password hashing with bcrypt
- Input validation with Zod
- CSRF protection via NextAuth
- Environment variable management
- SQL injection protection via Prisma

## Deployment

See [Deployment Guide](../how-to/deploy.md) for deployment instructions.

**Recommended platform:** Vercel
**Database:** Vercel Postgres or Supabase
**Environment:** Node.js 20+

---

## Related Documentation

- [Database Schema](./database-schema.md)
- [API Reference](./api.md)
- [Architecture Decisions](../explanation/architecture-decisions.md)
