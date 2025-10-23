# HopeScroll - AI Assistant Guide

**Last Updated:** 2025-10-23

This guide helps AI coding assistants understand HopeScroll's architecture, conventions, and documentation requirements.

---

## 🚀 START HERE FOR NEW SESSIONS

**IMPORTANT:** Read this section FIRST in every new session!

### Quick Start (5 minutes)
1. **Read the session guide:** [CLAUDE-SESSION-GUIDE.md](./CLAUDE-SESSION-GUIDE.md) - Fast onboarding
2. **Check project status:** [docs/planning/PROJECT_STATUS.md](./docs/planning/PROJECT_STATUS.md) - What's implemented
3. **Review recent work:** `git log -10 --oneline` - What happened last
4. **Verify working state:** `npm run build && npm run test` - Ensure everything works

### Critical Constraints (Never Violate!)

These are **non-negotiable** design principles. Violating these breaks the core product vision:

1. **🚫 NO OUTLINKS** - Everything must work inline (articles expand in feed, no new tabs)
2. **🚫 NO EXTERNAL DEPS IN DOMAIN** - `domain/` must be pure TypeScript (no next, react, prisma)
3. **🧠 ADHD-FIRST DESIGN** - No modals for reading, no context switching, clear progress indicators
4. **🎨 USE DESIGN SYSTEM** - Never hardcode button/badge/spinner styles, use `/components/ui/`

**Why these matter:** See [DESIGN_DECISIONS.md](./docs/planning/DESIGN_DECISIONS.md) for rationale.

### Session End Checklist (Complete Before Stopping!)

**Always run this checklist before ending your session:**

- [ ] ✅ Updated [PROJECT_STATUS.md](./docs/planning/PROJECT_STATUS.md) with changes
- [ ] ✅ Updated [FEATURE_ROADMAP.md](./docs/planning/FEATURE_ROADMAP.md) if working on epics
- [ ] ✅ Ran `npm run test` and all tests pass
- [ ] ✅ Ran `npm run lint` and fixed issues
- [ ] ✅ Committed all changes with descriptive messages
- [ ] ✅ Updated "Last Updated" dates in modified docs
- [ ] ✅ Left clear notes for next session

**Why:** The next agent needs clear context. This 10-minute investment saves 30+ minutes later!

See [CLAUDE-SESSION-GUIDE.md](./CLAUDE-SESSION-GUIDE.md) for detailed session workflow.

---

## Development Guidelines

**Follow these rules during development:**

- **Commit often** - Make frequent, logical git commits
- **Use checklists** - TodoWrite tool for tracking tasks, checklists for linting/testing
- **Refer to docs** - Check `/docs` for guidance:
  - `/docs/planning` - Product vision, roadmap, design decisions
  - `/docs/reference` - Architecture, database, API specs
  - `/docs/how-to` - Task-specific guides
  - `/docs/DOCUMENTATION.md` - Documentation standards
- **Keep it simple** - Don't overcomplicate solutions (core principle!)
- **Verify your work** - Test and verify solutions before finishing
- **Update docs AFTER EVERY CHANGE** - Critical for cross-session context:
  - **Always update PROJECT_STATUS.md** after completing any feature or task
  - New features → How-To guide or Tutorial
  - API changes → Reference docs
  - Design decisions → Explanation docs or planning docs
  - See [Documentation Requirements](#documentation-requirements) below
- **Preserve CLAUDE files** - Never commit or delete `CLAUDE.md` or `CLAUDE-*.md` files
- **Maintain work plans** - Use TodoWrite tool for session task tracking
- **Ask for help** - If commands don't work and you can't install them, ask for installation commands
- **Test as you go** - Integration tests preferred, avoid mocks
- **Lint continuously** - Run linter as you develop, not just at the end
- **Stop appropriately** - When user says "stop" or task is complete, run Session End Checklist immediately

---

## Quick Reference

**Project:** HopeScroll - Content aggregation platform (YouTube, Twitch, RSS, Podcasts)
**Mission:** The healthy alternative to X/Reddit - engaging UX without toxicity
**Framework:** Next.js 14 (App Router)
**Language:** TypeScript (strict mode)
**Database:** PostgreSQL + Prisma ORM
**Styling:** Tailwind CSS + Design System
**Testing:** Vitest
**Architecture:** Hexagonal (Ports & Adapters)

### Product Philosophy

- **Curated over algorithmic** - User chooses sources, not an algorithm
- **Filtered by default** - Heavy filtering to avoid politics, drama, negativity
- **ADHD-first design** - No context switching, clear progress, inline reading
- **Engaging but healthy** - Fun to use without the toxicity
- **No outlinks** - Everything readable/watchable in-app (critical for ADHD focus)

See [`/docs/planning/PRODUCT_VISION.md`](./docs/planning/PRODUCT_VISION.md) for full context.

---

## Architecture Guidelines

### Hexagonal Architecture

HopeScroll uses **hexagonal architecture** with clear layer separation:

```
domain/      → Pure business logic, no external dependencies
adapters/    → External integrations (YouTube, Twitch, DB)
services/    → Orchestration and application logic
app/         → Next.js routes and pages
components/  → React UI components
```

### ADHD-First Design Principles

**Critical:** HopeScroll is designed specifically for ADHD/neurodivergent users. Keep these principles in mind:

1. **No context switching** - Everything readable/watchable in-app, no outlinks to break flow
2. **Fast dopamine hits** - Quick content (short videos, readable articles)
3. **Visual variety** - Mix of videos, images, text to maintain interest
4. **Clear progress indicators** - "2 min left", completion bars, visual feedback
5. **Frictionless actions** - One tap to save, dismiss, or keep scrolling
6. **Gentle boundaries** - Time nudges, not hard stops
7. **Hyperfocus friendly** - Can dive deep without losing place
8. **Easy re-engagement** - Resume where you left off

**Key implementation details:**
- Articles expand **inline in the feed** (not modals, not new tabs)
- Progress tracking on everything (videos, articles, reading depth)
- No paywalled content (would break the flow)
- Smooth animations for engagement without jarring transitions

### Layer Responsibilities

**Domain Layer (`/domain`):**
- Pure TypeScript, no framework imports
- No `next`, `react`, `prisma`, or external libraries
- Defines interfaces (ports) for external dependencies
- Contains core business logic and rules
- Must be 100% unit testable

**Example:**
```typescript
// ✅ Good: Pure domain logic
export function generateFeed(
  items: ContentItem[],
  preferences: UserPreferences
): ContentItem[] {
  // Pure logic, no side effects
}

// ❌ Bad: External dependencies in domain
import { prisma } from '@/lib/db';
export async function generateFeed(userId: string) {
  const items = await prisma.contentItem.findMany();
}
```

**Adapter Layer (`/adapters`):**
- Implements domain-defined interfaces
- Handles external system communication
- Each content source has its own adapter
- Database adapters wrap Prisma

**Service Layer (`/services`):**
- Orchestrates domain logic with adapters
- Manages transactions
- Error handling and logging

**Presentation Layer (`/app`, `/components`):**
- Next.js App Router pages
- React Server/Client Components
- Uses design system components

---

## File Organization

### Naming Conventions

- **Files:** `kebab-case.ts` (e.g., `feed-generator.ts`)
- **Components:** `PascalCase.tsx` (e.g., `FeedCard.tsx`)
- **Utilities:** `camelCase.ts` (e.g., `formatDate.ts`)
- **Test files:** `*.test.ts` or `*.test.tsx`

### Directory Structure

```
app/
├── api/                    # API routes
│   ├── feed/route.ts      # GET /api/feed
│   └── sources/route.ts   # GET/POST /api/sources
├── scroll/page.tsx        # /scroll page
└── sources/page.tsx       # /sources page

domain/
├── content/               # Content entities
├── feed/                  # Feed generation
├── filtering/             # Content filtering
└── user-actions/          # User interaction logic

adapters/
├── content/
│   ├── youtube/          # YouTube adapter
│   ├── twitch/           # Twitch adapter
│   └── rss/              # RSS adapter
└── storage/              # Database adapters

components/
└── ui/                   # Design system components
    ├── button.tsx
    ├── badge.tsx
    └── spinner.tsx
```

---

## Coding Standards

### TypeScript

**Rules:**
- Strict mode enabled
- No `any` without explicit reason
- Explicit return types on functions
- Interfaces over types for objects

**Good:**
```typescript
interface User {
  id: string;
  email: string;
}

async function getUserById(id: string): Promise<User | null> {
  return await prisma.user.findUnique({ where: { id } });
}
```

**Bad:**
```typescript
async function get(id: any) {  // ❌ any type, unclear name
  return await prisma.user.findUnique({ where: { id } });
}
```

### React Components

**Functional components with TypeScript:**
```typescript
'use client';  // Mark client components

interface FeedCardProps {
  title: string;
  thumbnail: string;
  duration: number;
  onWatch: () => void;
}

export function FeedCard({ title, thumbnail, duration, onWatch }: FeedCardProps) {
  return (
    <div className="bg-gray-900 rounded-lg p-4">
      {/* Component JSX */}
    </div>
  );
}
```

**Component standards:**
- Always type props
- Use functional components
- Mark client components with `'use client'`
- Co-locate related files (styles, tests)

### Design System

**Always use design system components:**

```typescript
// ✅ Good: Use design system
import { Button } from '@/components/ui/button';
<Button variant="primary" onClick={handleClick}>Click Me</Button>

// ❌ Bad: Hardcoded styles
<button className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg">
  Click Me
</button>
```

**Available components:**
- `Button` - Primary, success, danger, neutral, ghost variants
- `Badge` - Status badges with semantic colors
- `Spinner` - Loading indicators
- `Toast` - Notifications
- `ConfirmDialog` - Confirmation modals

See [`/docs/reference/design-system.md`](./docs/reference/design-system.md) for full reference.

### API Routes

**Standard pattern:**
```typescript
import { auth } from '@/lib/auth';
import { z } from 'zod';

// Define schema
const createSourceSchema = z.object({
  type: z.enum(['YOUTUBE', 'TWITCH', 'RSS', 'PODCAST']),
  sourceId: z.string(),
  displayName: z.string(),
});

export async function POST(request: Request) {
  try {
    // Authentication
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validation
    const body = await request.json();
    const data = createSourceSchema.parse(body);

    // Business logic
    // ...

    return Response.json({ success: true, data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: error.errors }, { status: 400 });
    }
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

**Requirements:**
- Authentication check
- Input validation with Zod
- Proper error handling
- Consistent response format

### Error Handling

**Pattern:**
```typescript
try {
  // Operation
  const result = await riskyOperation();
  return { success: true, data: result };
} catch (error) {
  if (error instanceof SpecificError) {
    // Handle specific error
    return { success: false, error: 'User-friendly message' };
  }
  // Log unexpected errors
  console.error('Unexpected error:', error);
  throw error;
}
```

---

## Testing Requirements

### Test Strategy

- **Unit tests:** All domain logic (required)
- **Integration tests:** API routes (recommended)
- **Component tests:** Complex UI components (as needed)

### Test Location

Mirror source structure in `/tests`:
```
domain/feed/feed-generator.ts
tests/domain/feed/feed-generator.test.ts
```

### Test Template

```typescript
import { describe, it, expect, beforeEach } from 'vitest';

describe('generateFeed', () => {
  let testItems: ContentItem[];

  beforeEach(() => {
    testItems = [
      // Test data setup
    ];
  });

  it('should sort items by published date', () => {
    // Arrange
    const preferences = { /* ... */ };

    // Act
    const result = generateFeed(testItems, preferences);

    // Assert
    expect(result[0].publishedAt).toBeGreaterThan(result[1].publishedAt);
  });

  it('should respect diversity limit', () => {
    const preferences = { diversityLimit: 2 };
    const result = generateFeed(testItems, preferences);

    // Count items per source
    const sourceCounts = /* ... */;
    expect(Math.max(...sourceCounts)).toBeLessThanOrEqual(2);
  });
});
```

**Run tests:**
```bash
npm run test              # Run once
npm run test:watch        # Watch mode
```

---

## Common Tasks

### Adding a New Feature

1. **Start with domain layer** - Define pure business logic
2. **Create adapters** - If external systems needed
3. **Add service layer** - Orchestrate domain + adapters
4. **Create API route** - Expose via API
5. **Build UI** - Use design system components
6. **Write tests** - Domain logic + integration tests
7. **Update docs** - See [Documentation](#documentation-requirements)

### Creating a Component

```typescript
// 1. Create component file
// components/ui/new-component.tsx
'use client';

interface NewComponentProps {
  // Props
}

export function NewComponent({ }: NewComponentProps) {
  // Implementation
}

// 2. Export from index
// components/ui/index.ts
export { NewComponent } from './new-component';

// 3. Use in pages
import { NewComponent } from '@/components/ui';
```

### Database Changes

```bash
# 1. Modify schema
# Edit prisma/schema.prisma

# 2. Create migration
npm run db:migrate

# 3. Update docs
# Edit docs/reference/database-schema.md
```

### Adding a Content Source Adapter

1. Create adapter in `adapters/content/{source-name}/`
2. Implement `ContentAdapter` interface
3. Add `SourceType` enum value in Prisma schema
4. Register adapter in service layer
5. Add unit tests
6. Update documentation

See [`/docs/how-to/add-content-sources.md`](./docs/how-to/add-content-sources.md) for detailed guide.

---

## Documentation Requirements

### When to Create/Update Documentation

**Always update docs when:**
- Adding new features
- Changing API behavior
- Modifying architecture
- Adding configuration options
- Changing database schema

### Documentation Types (Diátaxis Framework)

HopeScroll uses the **Diátaxis framework** with four doc types:

| Type | Purpose | When to Use |
|------|---------|-------------|
| **Tutorial** | Teaching | Onboarding new users/developers |
| **How-To** | Problem-solving | Explaining specific tasks |
| **Reference** | Specification | Documenting APIs, schemas, configs |
| **Explanation** | Understanding | Explaining concepts, decisions |

**Examples:**

- **New feature:** How-To guide + Reference update
- **API change:** Update Reference docs
- **Architecture change:** Update Reference + Explanation
- **Design decision:** Create Explanation doc
- **Onboarding flow:** Create Tutorial

### Documentation Standards

**File location:**
```
docs/
├── planning/         # Product vision, roadmap, design decisions
├── tutorials/        # Step-by-step learning
├── how-to/          # Task-focused guides
├── reference/       # Technical specs (architecture, DB, API, design system)
└── explanation/     # Concepts & decisions
```

**Important planning docs to consult:**
- `docs/planning/PRODUCT_VISION.md` - Product philosophy, ADHD-first principles
- `docs/planning/FEATURE_ROADMAP.md` - Current features, planned features, priorities
- `docs/planning/DESIGN_DECISIONS.md` - Key design decisions (inline reading, filtering, etc.)

**Format requirements:**
- Version number and date in header
- Code examples must be tested and work
- Use relative links within docs
- Follow markdown standards
- Include cross-references

**Example header:**
```markdown
# Feature Name

**Version:** 1.0
**Last Updated:** 2025-10-23

Brief description...
```

### Code Comments

- **Explain "why" not "what"** - Code shows what, comments explain reasoning
- **Complex algorithms** - Add explanation
- **TODOs** - Include issue number: `// TODO(#123): Description`

**Good:**
```typescript
// Use exponential backoff to avoid overwhelming external APIs
// during temporary outages
const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
```

**Bad:**
```typescript
// Calculate delay
const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
```

---

## Quick Checklist

When implementing a feature:

- [ ] **Checked planning docs** - Read relevant sections in `/docs/planning`
- [ ] **ADHD principles** maintained - No outlinks, inline expansion, clear progress
- [ ] Domain logic is pure (no external dependencies)
- [ ] Adapters implement domain interfaces
- [ ] API routes have auth + validation
- [ ] Design system components used
- [ ] TypeScript types are explicit
- [ ] Error handling implemented
- [ ] Tests written (domain logic required)
- [ ] Documentation updated (right doc type for change)
- [ ] Code follows naming conventions
- [ ] Verified solution works

---

## Key Resources

### Planning & Vision
- [Product Vision](./docs/planning/PRODUCT_VISION.md) - Mission, philosophy, ADHD-first principles
- [Feature Roadmap](./docs/planning/FEATURE_ROADMAP.md) - Current features, planned work, priorities
- [Design Decisions](./docs/planning/DESIGN_DECISIONS.md) - Key design constraints and choices

### Technical Reference
- [Architecture Overview](./docs/reference/architecture.md) - Hexagonal architecture, layers, patterns
- [Database Schema](./docs/reference/database-schema.md) - Complete DB reference
- [Design System](./docs/reference/design-system.md) - UI components, colors, patterns
- [Configuration](./docs/reference/configuration.md) - Environment variables, settings

### Development Guides
- [Getting Started](./docs/tutorials/getting-started.md) - Setup tutorial
- [Contributing Guide](./docs/CONTRIBUTING.md) - How to contribute
- [Documentation Strategy](./docs/DOCUMENTATION.md) - Documentation standards

---

## Common Pitfalls

**❌ Don't:**
- Import external dependencies in domain layer
- Use `any` type without justification
- Hardcode colors/styles (use design system)
- Skip input validation on API routes
- Commit without testing
- Create features without documentation
- **Add outlinks or modals for content** - breaks ADHD flow (use inline expansion)
- **Skip design decisions docs** - check `docs/planning/DESIGN_DECISIONS.md` first

**✅ Do:**
- Follow hexagonal architecture strictly
- Write explicit TypeScript types
- Use design system components
- Validate all inputs with Zod
- Test domain logic thoroughly
- Document as you code
- **Check planning docs** before implementing features
- **Keep ADHD principles** in mind for all UX decisions
- **Inline expansion** for articles (never modals, never new tabs)

---

**For more details, see [Documentation Index](./docs/README.md)**
