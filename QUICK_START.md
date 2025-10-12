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

## 🔧 What's Missing

❌ **Auth** - NextAuth.js not configured
❌ **Frontend** - No UI components yet
❌ **Background Jobs** - Content fetching cron not set up

## 🎯 Next Steps

1. **Add Authentication**
   ```bash
   # Configure NextAuth in app/api/auth/[...nextauth]/route.ts
   # Update getUserSession() in lib/get-user-session.ts
   ```

2. **Build Frontend**
   ```bash
   # Create components in /components
   # Build feed page in app/feed/page.tsx
   ```

3. **Background Jobs**
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

**Current Status:** Backend + Database complete, ready for auth + frontend 🎉
