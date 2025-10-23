# 🚀 Claude Code - Quick Session Start Guide

**Last Updated:** 2025-10-23

This guide helps you start productive sessions quickly and end them cleanly. Read this FIRST in every new session!

---

## ⚡ First Actions for Every New Session

### 1. Check Project Status (2 minutes)
```bash
# Read the current state
Read: /home/chris/projects/hopescroll/docs/planning/PROJECT_STATUS.md
```

**What you'll learn:**
- ✅ What features are complete
- 🚧 What's in progress
- 🔴 What's not started yet
- 🎯 Current priorities
- 🚫 Known blockers

### 2. Review Recent Work (1 minute)
```bash
git log -10 --oneline
```

**Look for:**
- What was the last session working on?
- Are there incomplete features?
- Any obvious TODOs left?

### 3. Verify Working State (1 minute)
```bash
npm run build && npm run test
```

**Expected:**
- Build should succeed
- Tests should pass
- If not, check recent commits for issues

---

## 🎯 What HopeScroll Is (Essential Context)

### Core Mission
**"The healthy alternative to X/Reddit"** - ADHD-first content aggregation platform

### Critical Design Principles (NEVER VIOLATE THESE!)

1. **NO OUTLINKS** 🚫
   - Everything must work **inline in the feed**
   - Articles expand in place (not modals, not new tabs)
   - Videos play embedded
   - **Why:** Context switching kills ADHD focus

2. **NO EXTERNAL DEPS IN DOMAIN** 🚫
   - `domain/` must be pure TypeScript
   - No `next`, `react`, `prisma`, or external libraries
   - **Why:** Clean hexagonal architecture, 100% testable

3. **ADHD-FIRST DESIGN** 🧠
   - Clear progress indicators ("2 min left")
   - Fast dopamine hits (quick content)
   - Visual variety (mix videos, articles, images)
   - Frictionless actions (one-tap save/dismiss)
   - **Why:** Designed for neurodivergent users

4. **USE DESIGN SYSTEM** 🎨
   - Always use components from `/components/ui/`
   - Never hardcode button/badge/spinner styles
   - **Why:** Consistency and maintainability

### Current State (Quick Summary)
- **Working:** YouTube video player, feed, sources, filters, saved content, collections
- **Next:** RSS/article support (Phase 2A)
- **Future:** Podcast support, mobile apps, social features

---

## 📚 Required Reading (Before You Code)

### Must Read First (15 minutes)
1. **PROJECT_STATUS.md** - Current implementation state
2. **PRODUCT_VISION.md** - Why HopeScroll exists, ADHD principles
3. **DESIGN_DECISIONS.md** - Critical constraints and choices

### Read When Relevant (as needed)
4. **FEATURE_ROADMAP.md** - Full feature plan and epics
5. **architecture.md** - Hexagonal architecture details
6. **CLAUDE.md** - Complete AI assistant guide

### Quick Reference Links
- [Product Vision](./docs/planning/PRODUCT_VISION.md)
- [Project Status](./docs/planning/PROJECT_STATUS.md)
- [Feature Roadmap](./docs/planning/FEATURE_ROADMAP.md)
- [Design Decisions](./docs/planning/DESIGN_DECISIONS.md)
- [Architecture](./docs/reference/architecture.md)
- [Database Schema](./docs/reference/database-schema.md)
- [Design System](./docs/reference/design-system.md)

---

## 🏗️ Architecture Quick Reference

### Directory Structure
```
domain/        → Pure business logic (NO external deps)
  ├── content/      → Content entities
  ├── feed/         → Feed generation algorithm
  ├── filtering/    → Keyword filtering
  └── user-actions/ → User interaction logic

adapters/      → External system integrations
  ├── content/
  │   ├── youtube/  → ✅ Complete
  │   ├── rss/      → 🔴 Empty (needs implementation!)
  │   ├── twitch/   → 🔴 Empty
  │   └── podcast/  → 🔴 Empty
  └── storage/      → ✅ Prisma database adapters

services/      → Application logic orchestration
app/           → Next.js routes and pages
components/    → React UI components
  └── ui/          → Design system (USE THESE!)
```

### Data Flow
```
User Request → App Router → Service → Domain Logic → Adapter → External System
```

### Layer Rules
- **Domain** calls → Nothing (pure logic)
- **Adapter** calls → Domain interfaces + external systems
- **Service** calls → Domain + Adapters
- **App** calls → Services

---

## 🎯 Current Priorities (This Sprint)

### Week of 2025-10-23

**Top 3 Priorities:**
1. ✅ Complete documentation restructure (in progress)
2. 🔴 Begin RSS adapter implementation (Epic 2A.1)
3. 🔴 Design article card components (Epic 2A.2 prep)

**Next Up:**
- Implement RSS feed parsing (`@extractus/article-extractor`)
- Add `contentType` field to database schema
- Create ArticleCard component (collapsed + expanded states)
- Test inline article expansion UX

**Blocked/Waiting:**
- Article display (needs RSS adapter first)
- Article filtering (needs article display first)

---

## ⚠️ Common Gotchas (Save Yourself Time!)

### 1. Collections Are Complete ✅
- **Backend:** Database schema, API routes - ALL DONE
- **Frontend:** UI for create/edit/delete - ALL DONE
- **Don't rebuild it!** It's fully functional

### 2. RSS Adapter Doesn't Exist Yet 🔴
- Directory exists but empty: `/adapters/content/rss/`
- Needs implementation: RSS parser, article scraper, content adapter
- See Epic 2A.1 in FEATURE_ROADMAP.md

### 3. Design System Components
- Located in `/components/ui/`
- **Always use these!** Don't create custom buttons/badges
- Available: Button, Badge, Spinner, Toast, ConfirmDialog, Icons
- See `/docs/reference/design-system.md`

### 4. Inline Reading is Non-Negotiable
- Articles must expand **inline in the feed**
- Not modals, not new tabs, not external links
- This is core to ADHD-friendly design
- See DESIGN_DECISIONS.md #1

### 5. Database Schema Notes
- `Collection` table exists and is used
- `SavedContent` has `collectionId` and `notes` fields
- No `contentType` field yet (VIDEO vs. ARTICLE)
- `SourceType` enum includes RSS but no adapter yet

---

## 🛠️ Common Tasks

### Adding a New Feature
1. Read relevant docs (PRODUCT_VISION, DESIGN_DECISIONS)
2. Check PROJECT_STATUS.md for current state
3. Start with domain layer (pure logic)
4. Add adapters if needed (external systems)
5. Create service layer (orchestration)
6. Build UI with design system components
7. Write tests (domain logic required)
8. Update docs (PROJECT_STATUS, FEATURE_ROADMAP)

### Creating a Component
1. Check if design system component exists (`/components/ui/`)
2. If new, create in appropriate directory
3. Use TypeScript with explicit prop types
4. Mark client components with `'use client'`
5. Export from index file
6. Document in design-system.md if reusable

### Database Changes
1. Edit `prisma/schema.prisma`
2. Run `npm run db:migrate`
3. Update `docs/reference/database-schema.md`
4. Update PROJECT_STATUS.md with schema changes

### API Route Pattern
```typescript
import { auth } from '@/lib/auth';
import { z } from 'zod';

const schema = z.object({ /* ... */ });

export async function POST(request: Request) {
  try {
    // 1. Auth check
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Validation
    const body = await request.json();
    const data = schema.parse(body);

    // 3. Business logic (via service)
    // ...

    return Response.json({ success: true, data });
  } catch (error) {
    // 4. Error handling
    if (error instanceof z.ZodError) {
      return Response.json({ error: error.errors }, { status: 400 });
    }
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

---

## ✅ Session End Checklist

**IMPORTANT:** Before ending your session or when asked to stop, complete this checklist!

### 1. Update Documentation (5 minutes)
- [ ] Update **PROJECT_STATUS.md**:
  - Mark completed items as ✅
  - Add new items to 🚧 In Progress or 🔴 Not Started
  - Update "Recent Changes" section
  - Update "Last Updated" date
  - Add any new blockers or technical debt
- [ ] Update **FEATURE_ROADMAP.md** if working on epics:
  - Add status markers (✅ 🚧 🔴)
  - Check off completed story items
  - Note any blockers

### 2. Code Quality (3 minutes)
- [ ] Run `npm run test` - all tests pass
- [ ] Run `npm run lint` - fix any issues
- [ ] Run `npm run build` - build succeeds

### 3. Version Control (2 minutes)
- [ ] Commit all changes with descriptive messages
- [ ] Use conventional commit format:
  - `feat:` for new features
  - `fix:` for bug fixes
  - `docs:` for documentation
  - `refactor:` for code restructuring
  - `test:` for test additions
- [ ] Ensure no uncommitted changes: `git status`

### 4. Handoff Notes (2 minutes)
- [ ] Add notes to PROJECT_STATUS.md "Notes for AI Agents" section
- [ ] If work is incomplete, add clear TODO comments in code
- [ ] Update top 3 priorities if they changed

### Total Time: ~12 minutes

**Why this matters:** The next agent (or you in the next session) needs clear context. Spending 12 minutes now saves 30+ minutes of re-discovery later!

---

## 🚨 When to Stop Working

### Automatic Stop Triggers
Stop and run the Session End Checklist when:

1. **User says "stop"** or "that's enough" or "end session"
2. **Feature is complete** - Don't auto-continue to next feature
3. **Tests fail** - Fix tests or stop and document the issue
4. **Blocked** - Can't proceed without user input or missing dependencies
5. **2+ hours of work** - Good stopping point, wrap up

### Before Stopping
1. ✅ Complete current atomic task (finish the function, test, etc.)
2. ✅ Commit work in progress (with "WIP:" prefix if incomplete)
3. ✅ Run Session End Checklist above
4. ✅ Leave clear handoff notes

### Don't Stop Without
- ❌ Leaving uncommitted changes
- ❌ Leaving broken tests
- ❌ Leaving broken build
- ❌ Updating PROJECT_STATUS.md

**Exception:** If the user explicitly says "stop now" or "emergency stop", prioritize stopping quickly and document what's incomplete.

---

## 💡 Pro Tips

### Speed Up Sessions
- Use TodoWrite tool to track tasks during session
- Commit frequently (after each atomic change)
- Run tests incrementally (not just at the end)
- Read PROJECT_STATUS.md first (saves 15+ min of exploration)

### Avoid Common Mistakes
- Don't rebuild existing features (check PROJECT_STATUS first)
- Don't skip the Session End Checklist (future you will thank you)
- Don't hardcode styles (use design system)
- Don't add external deps to domain/ (keep it pure)
- Don't create outlinks for articles (inline expansion only!)

### Communication Style
- Be concise (this is a CLI tool)
- Show progress (use TodoWrite tool)
- Ask questions when unclear (don't guess)
- Explain trade-offs (when multiple approaches exist)

---

## 📞 Getting Help

### Documentation Index
- **Start here:** [/docs/README.md](./docs/README.md)
- **Planning docs:** `/docs/planning/`
- **How-to guides:** `/docs/how-to/`
- **Reference docs:** `/docs/reference/`
- **Explanations:** `/docs/explanation/`

### Common Questions
- "What's implemented?" → Read PROJECT_STATUS.md
- "What's next?" → Check FEATURE_ROADMAP.md
- "Why this design?" → See DESIGN_DECISIONS.md
- "How does X work?" → Check `/docs/reference/` or `/docs/explanation/`
- "How do I do X?" → Check `/docs/how-to/`

---

## 🎯 Success Criteria

You're doing well if:
- ✅ You read PROJECT_STATUS.md before starting work
- ✅ You update docs after every change
- ✅ Tests pass and build succeeds
- ✅ You follow ADHD-first principles (inline reading, clear progress)
- ✅ You use design system components
- ✅ You keep domain layer pure
- ✅ You complete Session End Checklist before stopping

---

**Remember:**
- 📖 Read PROJECT_STATUS.md first
- 🧠 Keep ADHD principles in mind
- 🎨 Use design system components
- ✅ Complete Session End Checklist before stopping
- 📝 Update docs after every change

**Happy coding! 🚀**
