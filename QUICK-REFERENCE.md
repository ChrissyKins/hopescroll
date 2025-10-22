# HopeScroll - Quick Reference Guide

## Core Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                   USER INTERFACE LAYER                       │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐         │
│  │  Sources     │ │  Filters     │ │  Saved       │ History │
│  │  Page        │ │  Page        │ │  Page        │ Page    │
│  └──────────────┘ └──────────────┘ └──────────────┘         │
│  (Content-Card, Navigation components throughout)          │
├─────────────────────────────────────────────────────────────┤
│                  API LAYER (Next.js Routes)                 │
├─────────────────────────────────────────────────────────────┤
│  /api/sources  │ /api/filters  │ /api/saved  │ /api/history│
│  /api/feed     │ /api/content  │ /api/preferences          │
├─────────────────────────────────────────────────────────────┤
│                    SERVICE LAYER                            │
├─────────────────────────────────────────────────────────────┤
│  FeedService   │ SourceService  │ FilterService             │
│  ContentService│ InteractionService                         │
├─────────────────────────────────────────────────────────────┤
│                    DOMAIN LAYER                             │
├─────────────────────────────────────────────────────────────┤
│  Feed Generator │ Filter Engine │ Interaction Tracking      │
│  Diversity Enforcer │ Backlog Mixer                         │
├─────────────────────────────────────────────────────────────┤
│                  DATA ACCESS LAYER                          │
├─────────────────────────────────────────────────────────────┤
│  Prisma (PostgreSQL)  │  Redis Cache  │  Adapters (YouTube) │
└─────────────────────────────────────────────────────────────┘
```

## Four Management Pages at a Glance

### Sources Page (/app/sources/page.tsx)
- **Primary Function:** Manage content sources
- **Data Model:** ContentSource (id, type, sourceId, displayName, isMuted, stats)
- **Key Features:** Add sources, mute/unmute, delete, bulk refresh
- **API Endpoints:** GET/POST/DELETE/PATCH /api/sources, POST /api/sources/fetch
- **Key Component:** Renders source list with action buttons

### Filters Page (/app/filters/page.tsx)
- **Primary Function:** Configure filters and preferences
- **Data Models:** FilterKeyword (keyword, isWildcard), UserPreferences (duration)
- **Key Features:** Add/remove keywords, set duration range, quick presets
- **API Endpoints:** GET/POST/DELETE /api/filters, PATCH /api/preferences
- **Layout:** Two-column (keywords left, duration right)

### Saved Page (/app/saved/page.tsx)
- **Primary Function:** View and manage saved content
- **Data Model:** SavedItem (collection, savedAt, notes, content reference)
- **Key Features:** Grid view, remove items, display notes
- **API Endpoints:** GET /api/saved, POST /api/content/[id]/save|unsave
- **Layout:** 3-column grid on desktop
- **Uses:** ContentCard component

### History Page (/app/history/page.tsx)
- **Primary Function:** Track user interactions with content
- **Data Model:** HistoryItem (type, timestamp, watchDuration, completionRate)
- **Key Features:** Filter tabs (Watched, Saved, Dismissed, etc.), list view, statistics
- **API Endpoints:** GET /api/history?type=FILTER
- **Layout:** List view with filter tabs

## Common Patterns

### Adding New Feature to a Page

1. **Add API Route** (`app/api/feature/route.ts`)
   ```typescript
   import { requireAuth } from '@/lib/get-user-session';
   import { successResponse, errorResponse } from '@/lib/api-response';
   
   export async function GET(request: NextRequest) {
     try {
       const { userId } = await requireAuth();
       // Service logic here
       return successResponse(data);
     } catch (error) {
       return errorResponse(error);
     }
   }
   ```

2. **Create/Update Service** (`services/feature-service.ts`)
   ```typescript
   export class FeatureService {
     constructor(private db: PrismaClient, private cache: CacheClient) {}
     
     async doSomething(userId: string) {
       // Implementation
     }
   }
   ```

3. **Add to Page** (Update relevant page.tsx)
   ```typescript
   const handleAction = async () => {
     try {
       setIsLoading(true);
       const response = await fetch('/api/feature');
       const data = await response.json();
       // Update state
     } catch (err) {
       setError(err.message);
     } finally {
       setIsLoading(false);
     }
   };
   ```

### Authentication Pattern
```typescript
// In any API route
const { userId, email } = await requireAuth();
// Returns 401 if not authenticated
```

### Error Response Pattern
```typescript
// Throws AppError with code and statusCode
throw new AppError('VALIDATION_ERROR', 'Invalid input', 400, { field: 'email' });
// Caught by errorResponse() and formatted for client
```

## File Locations Quick Map

| What | Where |
|------|-------|
| Database schema | `/prisma/schema.prisma` |
| API response format | `/lib/api-response.ts` |
| Error classes | `/lib/errors.ts` |
| Validation schemas | `/lib/validation.ts` |
| Logger setup | `/lib/logger.ts` |
| Navigation component | `/components/navigation.tsx` |
| Content card | `/components/feed/content-card.tsx` |
| Feed generation logic | `/domain/feed/feed-generator.ts` |
| Filter engine | `/domain/filtering/filter-engine.ts` |
| Feed service | `/services/feed-service.ts` |
| Source service | `/services/source-service.ts` |
| Tailwind config | `/tailwind.config.ts` |
| Global styles | `/app/globals.css` |

## Styling Reference

### Colors in Use
- **Primary Actions:** `bg-blue-600 hover:bg-blue-700`
- **Success:** `bg-green-100 text-green-800` / `bg-green-600`
- **Error:** `bg-red-100 text-red-800` / `bg-red-600`
- **Danger:** `bg-red-600 hover:bg-red-700`
- **Warning:** `bg-yellow-100 text-yellow-800`
- **Neutral:** `bg-gray-*` shades

### Component Classes
```css
/* Card */
bg-white dark:bg-gray-800 rounded-lg shadow p-6

/* Button */
bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 
text-white font-medium py-2 px-4 rounded transition-colors

/* Badge */
px-2 py-1 text-xs rounded
bg-{color}-100 text-{color}-800 
dark:bg-{color}-900/20 dark:text-{color}-400

/* Input */
px-3 py-2 border border-gray-300 dark:border-gray-600 
rounded-md bg-white dark:bg-gray-700 
text-gray-900 dark:text-white
```

## State Management Pattern

```typescript
// Page state (useState)
const [data, setData] = useState<T[]>([]);
const [isLoading, setIsLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
const [isAdding, setIsAdding] = useState(false);

// Load on mount
useEffect(() => {
  fetchData();
}, []);

// Handle action
const handleAction = async (e) => {
  e.preventDefault();
  try {
    setIsAdding(true);
    const response = await fetch('/api/endpoint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(await response.json());
    
    // Refresh data
    await fetchData();
  } catch (err) {
    setError(err.message);
  } finally {
    setIsAdding(false);
  }
};
```

## Environment Setup

```bash
# Install dependencies
npm install

# Development
npm run dev          # Start dev server on port 3000
npm run test         # Run tests
npm run test:watch   # Watch mode

# Database
npm run db:push      # Push schema to DB
npm run db:migrate   # Run migrations
npm run db:studio    # Open Prisma Studio

# Build
npm run build        # Production build
npm start            # Run production build
```

## Next Steps for UI Improvements

### High Priority (Quick Wins)
1. Toast notification system (replace `alert()`)
2. Search functionality on all pages
3. Improve empty states
4. Standardize button colors
5. Add sorting to all lists

### Medium Priority
6. Visual icons (replace emoji)
7. Collection management (Saved page)
8. Date range filtering (History page)
9. Enable/disable filter toggles
10. Source stats visualization

### Low Priority
11. Timeline view (History)
12. Filter impact preview
13. Bulk operations
14. Export/import features
15. Analytics widgets

See `PLANNING-ui-improvements.md` for detailed breakdown.

## Key Services

### FeedService
Generates personalized feed for user based on:
- Sources (active, non-muted)
- Filters (keywords, duration)
- Preferences (diversity, backlog ratio)
- Past interactions

### SourceService
- Add/remove sources
- Fetch content from sources
- Update mute status
- List user's sources

### FilterService
- Add/remove keyword filters
- Manage wildcard matching
- Track filter effectiveness

### ContentService
- Fetch content from adapters
- Store in database
- Apply filters
- Track interactions

### InteractionService
- Record WATCHED, SAVED, DISMISSED, NOT_NOW, BLOCKED
- Update feed based on interactions
- Invalidate cache

