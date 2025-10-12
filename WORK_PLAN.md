# Forest Cabin - Development Work Plan

**Project:** Curated content feed app for intentional digital consumption
**Status:** Phase 1 - MVP Development
**Started:** 2025-10-12

---

## Current Sprint: Foundation & Core Setup

### ✅ Completed
- [x] Project planning and architecture review
- [x] Work plan document created
- [x] Initialize Next.js project structure
- [x] Set up Prisma with PostgreSQL schema
- [x] Core configuration files (config, logger, db, cache, validation, errors)
- [x] Project structure following hexagonal architecture
- [x] Domain logic: ContentItem types and interfaces
- [x] Filter Engine with keyword and duration rules
- [x] Feed Generator with diversity enforcement and backlog mixing
- [x] Unit tests for domain logic (12 passing tests)
- [x] YouTube adapter with client, types, and adapter implementation
- [x] Service layer: FeedService, SourceService, FilterService
- [x] Integration tests for YouTube adapter (19 total tests passing)
- [x] TypeScript compilation and linting clean

### 🔄 In Progress
- [ ] API routes for feed and sources

### 📋 Up Next
- [ ] Configure environment variables and external services
- [ ] Set up NextAuth.js authentication

---

## Phase 1: MVP (Weeks 1-8)

### Week 1-2: Project Setup & Foundation
- [ ] **Day 1-2:** Project initialization
  - [ ] Next.js 14+ with App Router and TypeScript
  - [ ] Prisma setup with PostgreSQL
  - [ ] Environment configuration
  - [ ] Git repository structure

- [ ] **Day 3-4:** Authentication
  - [ ] NextAuth.js configuration
  - [ ] User registration/login pages
  - [ ] Session management
  - [ ] Protected routes middleware

- [ ] **Day 5-7:** Project structure
  - [ ] Create hexagonal architecture folders
  - [ ] Set up shared utilities (logger, config, validation)
  - [ ] Base types and interfaces
  - [ ] Testing infrastructure (Vitest)

### Week 3-4: Domain Logic & Core Engine
- [ ] **Domain Layer (Pure TypeScript)**
  - [ ] ContentItem, ContentSource, FilterConfiguration models
  - [ ] FilterEngine with KeywordFilterRule
  - [ ] FilterEngine with DurationFilterRule
  - [ ] Unit tests for filter engine (>90% coverage)

- [ ] **Feed Generation**
  - [ ] FeedGenerator core logic
  - [ ] DiversityEnforcer algorithm
  - [ ] BacklogMixer for content mixing
  - [ ] Unit tests for feed generation

- [ ] **Interaction System**
  - [ ] ContentInteraction event model
  - [ ] Interaction state machine
  - [ ] Event sourcing for user actions

### Week 5: First Content Adapter (YouTube)
- [ ] **YouTube Integration**
  - [ ] YouTube API client setup
  - [ ] YouTubeAdapter implementing ContentAdapter interface
  - [ ] Channel validation
  - [ ] Video fetching (recent + backlog)
  - [ ] ISO 8601 duration parsing
  - [ ] Normalize YouTube data to ContentItem
  - [ ] Integration tests with mock data

- [ ] **Service Layer**
  - [ ] ContentService for fetching/storing content
  - [ ] SourceService for managing user sources
  - [ ] Basic error handling and logging

### Week 6: Feed Service & API
- [ ] **Feed Service**
  - [ ] FeedService orchestration
  - [ ] Redis caching integration
  - [ ] Cache invalidation strategy
  - [ ] Load user configuration
  - [ ] Integration tests

- [ ] **API Routes**
  - [ ] GET /api/feed
  - [ ] POST /api/sources
  - [ ] DELETE /api/sources/:id
  - [ ] POST /api/sources/validate
  - [ ] Error handling middleware
  - [ ] Input validation with Zod

### Week 7: Frontend - Feed UI
- [ ] **Feed Page**
  - [ ] Main feed layout with App Router
  - [ ] Content card component (thumbnail, title, metadata)
  - [ ] Infinite scroll implementation
  - [ ] Loading states and skeletons
  - [ ] Empty state handling

- [ ] **Action Buttons**
  - [ ] Watch/Open action
  - [ ] Save for Later
  - [ ] Dismiss
  - [ ] Not Now
  - [ ] Optimistic UI updates

- [ ] **Source Management**
  - [ ] Source list page
  - [ ] Add source form with validation
  - [ ] Remove/mute source actions

### Week 8: Filters & Theatre Mode
- [ ] **Filter System UI**
  - [ ] Filter management page
  - [ ] Add/remove keyword filters
  - [ ] Duration presets (meal time, coffee break, etc.)
  - [ ] Filter stats (items blocked count)
  - [ ] Real-time filter preview

- [ ] **Theatre Mode Player**
  - [ ] Modal/overlay component
  - [ ] YouTube embedded player (no branding)
  - [ ] Keyboard shortcuts (ESC to close)
  - [ ] "Next in feed" navigation
  - [ ] Mark as watched on play

- [ ] **Interaction Endpoints**
  - [ ] POST /api/content/:id/watch
  - [ ] POST /api/content/:id/save
  - [ ] POST /api/content/:id/dismiss
  - [ ] POST /api/content/:id/not-now

### Week 8: Background Jobs & Polish
- [ ] **Content Fetching Cron**
  - [ ] GET /api/cron/fetch-content endpoint
  - [ ] Vercel cron configuration (every 30 min)
  - [ ] Secret token authentication
  - [ ] Fetch from all user sources
  - [ ] Error handling and retries
  - [ ] Cache invalidation after fetch

- [ ] **MVP Polish**
  - [ ] Error boundaries
  - [ ] Toast notifications
  - [ ] Loading indicators
  - [ ] Responsive design basics
  - [ ] Dark mode styling

---

## Phase 2: Additional Sources & Polish (Weeks 9-12)

### RSS/Podcast Adapter
- [ ] RSS feed parser
- [ ] RSSAdapter implementation
- [ ] Podcast-specific handling
- [ ] Article read time estimation

### Twitch Integration
- [ ] Twitch API client
- [ ] TwitchAdapter for VODs and clips
- [ ] Live stream detection
- [ ] Live streamers section in UI

### Advanced Features
- [ ] Saved content page with collections
- [ ] Watch history page with search
- [ ] Export/import configuration
- [ ] Onboarding flow with starter packs
- [ ] Advanced filter presets (politics, violence, etc.)

---

## Phase 3: Enhancement (Future)

### Mobile & PWA
- [ ] Mobile-responsive refinements
- [ ] PWA manifest and service worker
- [ ] Offline support

### Advanced Feed Features
- [ ] "Rediscovery mode" for older content
- [ ] Content diversity indicator
- [ ] Themed filters
- [ ] Manual shuffle mode

### Optional Mental Health Features
- [ ] Usage awareness (session timers)
- [ ] Palette cleansers
- [ ] Break suggestions

---

## Technical Debt & Maintenance

### To Address
- [ ] Performance monitoring setup
- [ ] Error tracking (Sentry or similar)
- [ ] Database backup strategy
- [ ] API rate limiting implementation
- [ ] Comprehensive E2E tests (Playwright)
- [ ] Documentation updates

---

## Current Blockers

*None currently*

---

## Notes & Decisions

### 2025-10-12: Project Kickoff
- Confirmed hexagonal architecture approach
- Starting with YouTube as first adapter (most complex API)
- Will use Vercel Postgres, Upstash Redis, Vercel Blob
- Prioritizing domain logic purity for testability
- Event sourcing only for user interactions (not full ES)

---

## Success Metrics (MVP)

- [ ] User can add YouTube channels as sources
- [ ] Feed generates with content from all sources
- [ ] Keyword filters work (whole-word and wildcard)
- [ ] Duration filters work with presets
- [ ] Theatre mode plays videos without YouTube recommendations
- [ ] User can save/dismiss/watch content
- [ ] Background job fetches new content every 30 min
- [ ] Feed caching reduces load times < 500ms
- [ ] Zero manual infrastructure management needed

---

**Next Update:** After Week 1 completion
