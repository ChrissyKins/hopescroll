# Forest Cabin - Quick Start Guide

## 🚀 Running Tests

```bash
# Run all unit tests
npm test

# Run integration test with real YouTube API
npx tsx scripts/test-integration.ts

# Test YouTube adapter specifically
npx tsx scripts/test-youtube.ts

# Type checking
npx tsc --noEmit

# Linting
npm run lint
```

## 🗄️ Database Setup

```bash
# Set up database schema
npx tsx scripts/setup-database.ts

# Seed test data
npx tsx scripts/seed-database.ts

# Verify database
npx tsx scripts/verify-database.ts

# Test connection
npx tsx scripts/test-db-connection.ts
```

**Test credentials:**
- Email: `test@hopescroll.com`
- Password: `test123`

## 📦 What's Implemented

✅ **Domain Logic** - Pure business rules (filters, feed generation)
✅ **YouTube Adapter** - Fetch videos from any channel
✅ **Service Layer** - Feed, source, and filter management
✅ **API Routes** - REST endpoints for all operations
✅ **Database Schema** - All tables created and seeded
✅ **19 Passing Tests** - Unit + integration coverage
✅ **Authentication** - NextAuth.js with credentials provider
✅ **Basic Frontend** - Login page, feed page, navigation, content cards

## 🔧 What's Missing

❌ **Content Interactions** - Watch/save/dismiss endpoints need implementing
❌ **Frontend Pages** - Sources, filters, saved, and history pages
❌ **Background Jobs** - Content fetching cron not set up
❌ **Theatre Mode** - Video player modal

## 🎯 Next Steps

1. **Implement Content Interactions**
   ```bash
   # Create POST /api/content/:id/watch endpoint
   # Create POST /api/content/:id/save endpoint
   # Create POST /api/content/:id/dismiss endpoint
   # Create POST /api/content/:id/not-now endpoint
   ```

2. **Build Additional Frontend Pages**
   ```bash
   # Create /sources page for managing content sources
   # Create /filters page for keyword/duration filters
   # Create /saved page for saved content
   # Create /history page for watch history
   ```

3. **Add Theatre Mode**
   ```bash
   # Create video player modal component
   # Integrate with YouTube embed
   # Add keyboard shortcuts
   ```

4. **Background Jobs**
   ```bash
   # Set up Vercel Cron for content fetching
   # Implement content fetch service
   ```

## 📖 Key Files

- `SESSION_SUMMARY.md` - Detailed session report
- `WORK_PLAN.md` - Task checklist and progress
- `docs/planning/` - Architecture and feature specs
- `scripts/` - Test scripts for validation

## 🧪 Test Coverage

```
Domain Tests (12)      ████████████ 100%
Adapter Tests (7)      ████████████ 100%
Integration Test (1)   ████████████ 100%
─────────────────────────────────────
Total: 19 tests        ████████████ PASS
```

## 🏗️ Architecture

```
Frontend (Next.js) → API Routes → Services → Domain Logic
                                ↓
                            Adapters (YouTube, etc.)
                                ↓
                         External APIs
```

See `docs/planning/architecture_design.md` for full details.

## 💡 Running the App (when DB is set up)

```bash
# Development
npm run dev

# Build
npm run build

# Production
npm start
```

## 🔑 Environment Variables

Copy `.env.example` to `.env` and fill in:
- `POSTGRES_PRISMA_URL` - Database connection
- `YOUTUBE_API_KEY` - For YouTube sources
- `NEXTAUTH_SECRET` - For auth
- `UPSTASH_REDIS_URL` + `UPSTASH_REDIS_TOKEN` - For caching (optional)

---

**Current Status:** Backend + Database + Auth + Basic Frontend complete! 🎉

**Next:** Implement content interaction endpoints and build remaining frontend pages.
