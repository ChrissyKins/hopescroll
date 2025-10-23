# Database Schema Reference

**Version:** 1.0
**Last Updated:** 2025-10-23

## Overview

HopeScroll uses PostgreSQL as its database, managed via Prisma ORM.

**Schema location:** `/prisma/schema.prisma`

## Entity Relationship Diagram

```
User
├── ContentSource (1:N)
├── FilterKeyword (1:N)
├── UserPreferences (1:1)
├── ContentInteraction (1:N)
├── SavedContent (1:N)
└── Collection (1:N)

ContentItem
├── ContentInteraction (1:N)
└── SavedContent (1:N)

Collection
└── SavedContent (1:N)
```

## Core Models

### User

Represents a user account.

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String   // Hashed with bcrypt
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  sources           ContentSource[]
  filters           FilterKeyword[]
  preferences       UserPreferences?
  interactions      ContentInteraction[]
  savedContent      SavedContent[]
  collections       Collection[]
  passwordResetTokens PasswordResetToken[]
}
```

**Fields:**
- `id` - Unique identifier (CUID format)
- `email` - User's email (unique, used for login)
- `password` - Bcrypt-hashed password
- `createdAt` - Account creation timestamp
- `updatedAt` - Last update timestamp

**Relations:**
- Multiple content sources
- Multiple filter keywords
- One preferences record
- Multiple interactions
- Multiple saved items
- Multiple collections

---

### ContentSource

Represents a configured content source (YouTube channel, RSS feed, etc.)

```prisma
model ContentSource {
  id          String      @id @default(cuid())
  userId      String
  type        SourceType
  sourceId    String      // Platform-specific ID
  displayName String
  avatarUrl   String?
  isMuted     Boolean     @default(false)
  alwaysSafe  Boolean     @default(false)
  addedAt         DateTime  @default(now())
  lastFetchAt     DateTime?
  lastFetchStatus String    @default("pending")
  errorMessage    String?

  @@unique([userId, type, sourceId])
}
```

**Fields:**
- `type` - Source platform (YOUTUBE, TWITCH, RSS, PODCAST)
- `sourceId` - Platform-specific identifier (e.g., YouTube channel ID)
- `displayName` - Human-readable name
- `isMuted` - If true, content is excluded from feed
- `alwaysSafe` - Bypass keyword filters for this source
- `lastFetchStatus` - "success", "error", or "pending"

**Indexes:**
- `userId` - For efficient user source lookups
- Unique constraint on `userId, type, sourceId`

---

### ContentItem

Represents a piece of content fetched from a source.

```prisma
model ContentItem {
  id              String   @id @default(cuid())
  sourceType      SourceType
  sourceId        String
  originalId      String   // Platform's ID (e.g., YouTube video ID)
  title           String
  description     String?  @db.Text
  thumbnailUrl    String?
  url             String
  duration        Int?     // Seconds
  publishedAt     DateTime
  fetchedAt       DateTime @default(now())
  lastSeenInFeed  DateTime @default(now())

  @@unique([sourceType, originalId])
}
```

**Fields:**
- `originalId` - Platform's native ID (prevents duplicates)
- `duration` - Length in seconds (used for filtering)
- `publishedAt` - Original publication date
- `lastSeenInFeed` - Last time shown to any user

**Indexes:**
- `sourceType, originalId` - Uniqueness constraint
- `sourceType, sourceId` - Fetch content by source
- `publishedAt` - Sort by date
- `duration` - Filter by length

---

### ContentInteraction

Tracks user actions on content.

```prisma
model ContentInteraction {
  id          String          @id @default(cuid())
  userId      String
  contentId   String
  type        InteractionType
  timestamp   DateTime        @default(now())

  watchDuration   Int?    // Seconds watched
  completionRate  Float?  // 0.0-1.0
  dismissReason   String?
  collection      String? // For SAVED type

  @@index([userId, contentId])
  @@index([userId, type])
}
```

**Interaction Types:**
- `WATCHED` - User watched content
- `SAVED` - User saved for later
- `DISMISSED` - User permanently dismissed
- `NOT_NOW` - User temporarily dismissed
- `BLOCKED` - User blocked content

**Type-specific fields:**
- `watchDuration` - For WATCHED type
- `completionRate` - Percentage watched
- `dismissReason` - For DISMISSED type

**Indexes:**
- `userId, contentId` - User's actions on specific content
- `userId, type` - Filter by interaction type

---

### FilterKeyword

User-defined keyword filters.

```prisma
model FilterKeyword {
  id        String   @id @default(cuid())
  userId    String
  keyword   String
  isWildcard Boolean @default(false)
  createdAt DateTime @default(now())

  @@index([userId])
}
```

**Fields:**
- `keyword` - Filter term (case-insensitive matching)
- `isWildcard` - If true, matches partial words

**Usage:**
- Filters applied to title and description
- Content matching filter is excluded from feed

---

### UserPreferences

User's feed and UI preferences.

```prisma
model UserPreferences {
  userId    String   @id

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
```

**Feed Parameters:**
- `backlogRatio` - Proportion of older content (0.0-1.0)
- `diversityLimit` - Max items per source per feed

**Duration Filters:**
- `minDuration` - Minimum content length (seconds)
- `maxDuration` - Maximum content length (seconds)

---

### SavedContent

User's saved content with optional notes.

```prisma
model SavedContent {
  id           String      @id @default(cuid())
  userId       String
  contentId    String
  collectionId String?
  savedAt      DateTime    @default(now())
  notes        String?

  @@unique([userId, contentId])
  @@index([userId, collectionId])
}
```

**Fields:**
- `collectionId` - Optional collection assignment
- `notes` - User notes about saved item

**Constraints:**
- User can only save each content item once
- If collection deleted, `collectionId` set to null

---

### Collection

User-created collections for organizing saved content.

```prisma
model Collection {
  id          String   @id @default(cuid())
  userId      String
  name        String
  description String?
  color       String?  // Hex color for UI
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  savedItems  SavedContent[]

  @@unique([userId, name])
  @@index([userId])
}
```

**Fields:**
- `name` - Collection name (unique per user)
- `description` - Optional description
- `color` - Hex color code for UI display

---

### PasswordResetToken

Temporary tokens for password reset flow.

```prisma
model PasswordResetToken {
  id        String   @id @default(cuid())
  userId    String
  token     String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())
  used      Boolean  @default(false)

  @@index([userId])
  @@index([token])
}
```

**Fields:**
- `token` - Unique reset token
- `expiresAt` - Token expiration time
- `used` - Prevents token reuse

---

## Enums

### SourceType

```prisma
enum SourceType {
  YOUTUBE
  TWITCH
  RSS
  PODCAST
}
```

### InteractionType

```prisma
enum InteractionType {
  WATCHED
  SAVED
  DISMISSED
  NOT_NOW
  BLOCKED
}
```

---

## Database Migrations

**Location:** `/prisma/migrations`

**Commands:**
```bash
# Generate Prisma client
npm run db:generate

# Create migration
npm run db:migrate

# Push schema changes (dev only)
npm run db:push

# Open Prisma Studio
npm run db:studio
```

---

## Performance Optimizations

### Indexes

Strategic indexes on:
- Foreign keys (`userId`, `contentId`)
- Frequently queried fields (`publishedAt`, `type`)
- Unique constraints (`email`, `userId + sourceId`)

### Query Optimization

- Use `select` to fetch only needed fields
- Use `include` judiciously to avoid N+1 queries
- Batch operations with `createMany` and `updateMany`

### Connection Pooling

Prisma handles connection pooling automatically. Configure via `DATABASE_URL` connection string parameters.

---

## Related Documentation

- [Architecture Overview](./architecture.md)
- [API Reference](./api.md)
- [Configuration](./configuration.md)
