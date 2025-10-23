# UI/UX Improvements - Detailed Feature Planning
**HopeScroll Management Pages Enhancement**

Last Updated: 2025-10-22

---

## Document Overview

This document provides detailed feature specifications for UI/UX improvements across the four management pages: Sources, Filters, Saved, and History. Each feature includes implementation details, user stories, acceptance criteria, and technical considerations.

---

## Table of Contents

1. [Cross-Page Features](#cross-page-features)
2. [Sources Page Features](#sources-page-features)
3. [Filters Page Features](#filters-page-features)
4. [Saved Page Features](#saved-page-features)
5. [History Page Features](#history-page-features)
6. [Implementation Roadmap](#implementation-roadmap)

---

## Cross-Page Features

These features apply to multiple or all management pages.

### Feature: Toast Notification System

**Priority:** HIGH (P0)
**Effort:** Medium
**Pages:** All

#### User Story
As a user, I want non-blocking feedback when I perform actions so that I can continue working while being informed of success or errors.

#### Current State
- Using `alert()` and `confirm()` throughout
- Blocking dialogs interrupt workflow
- No persistent notification history

#### Proposed Solution
- Implement toast/snackbar notification system
- Support success, error, warning, and info states
- Auto-dismiss after configurable timeout (default 4s)
- Stack multiple notifications
- Dismissible with close button
- Accessible (ARIA live regions)

#### Technical Considerations
```typescript
interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number; // ms, 0 = no auto-dismiss
  action?: {
    label: string;
    onClick: () => void;
  };
}
```

#### Acceptance Criteria
- [ ] Toast component created with Tailwind styling
- [ ] Toast context/provider for global state
- [ ] useToast hook for easy consumption
- [ ] Position: bottom-right on desktop, bottom on mobile
- [ ] Animations: slide in from bottom, fade out
- [ ] Max 3 visible toasts at once (queue others)
- [ ] Replace all alert() calls across all pages
- [ ] Replace all confirm() with modal component
- [ ] Screen reader announces notifications

#### Design Notes
```
┌─────────────────────────────────┐
│ ✓ Source added successfully!    │
│   Fetched 12 new items.      [×]│
└─────────────────────────────────┘
```

---

### Feature: Universal Search

**Priority:** HIGH (P0)
**Effort:** Medium
**Pages:** Sources, Filters, Saved, History

#### User Story
As a user, I want to quickly find specific items in my lists so that I can manage large collections efficiently.

#### Current State
- No search functionality on any page
- Must manually scroll through lists
- Difficult to find specific items

#### Proposed Solution
- Add search input at top of each list
- Client-side filtering for instant results
- Search across relevant fields per page
- Highlight matching text in results
- Show result count
- Clear search button

#### Search Fields by Page
- **Sources:** displayName, sourceId, type
- **Filters:** keyword
- **Saved:** content.title, notes, collection, sourceDisplayName
- **History:** content.title, content.sourceId, type

#### Technical Considerations
```typescript
// Generic search hook
function useSearch<T>(
  items: T[],
  searchFields: (keyof T)[],
  query: string
): T[] {
  return useMemo(() => {
    if (!query.trim()) return items;
    const lowerQuery = query.toLowerCase();
    return items.filter(item =>
      searchFields.some(field => {
        const value = item[field];
        return String(value).toLowerCase().includes(lowerQuery);
      })
    );
  }, [items, searchFields, query]);
}
```

#### Acceptance Criteria
- [ ] Search component created
- [ ] Debounced input (300ms) to avoid excessive re-renders
- [ ] Search added to all four pages
- [ ] Result count displayed ("Showing 3 of 42 items")
- [ ] Clear button appears when query present
- [ ] Empty state for "no results found"
- [ ] Keyboard shortcut: Cmd/Ctrl+F focuses search

#### Design Notes
```
┌─────────────────────────────────────────┐
│ 🔍 Search sources...              [×]   │
└─────────────────────────────────────────┘
Showing 3 of 15 sources
```

---

### Feature: Improved Empty States

**Priority:** HIGH (P0)
**Effort:** Low
**Pages:** All

#### User Story
As a new user, I want helpful guidance when pages are empty so that I understand what to do next.

#### Current State
- Basic "No X yet" messages
- No visual appeal or guidance
- Missed onboarding opportunity

#### Proposed Solution
- Create reusable EmptyState component
- Include illustration/icon
- Clear heading and description
- Primary action button
- Optional secondary actions/links

#### Empty State Content by Page

**Sources:**
```
Icon: 📡 (or custom SVG)
Heading: "No content sources yet"
Description: "Add YouTube channels, RSS feeds, or podcasts to start
             building your curated feed."
Primary Action: "Add Your First Source"
Secondary: "View Example Sources" | "Import from YouTube"
```

**Filters:**
```
Icon: 🛡️
Heading: "No filters configured"
Description: "Create keyword filters and duration preferences to
             customize your feed."
Primary Action: "Create First Filter"
Secondary: "Import Common Filter Pack"
```

**Saved:**
```
Icon: ⭐
Heading: "No saved content yet"
Description: "Content you save from the feed will appear here for
             easy access later."
Primary Action: "Browse Feed"
Secondary: "Learn About Collections"
```

**History:**
```
Icon: 📜
Heading: "No interaction history"
Description: "Your watched, saved, and dismissed content will be
             tracked here."
Primary Action: "Go to Feed"
```

#### Technical Considerations
```typescript
interface EmptyStateProps {
  icon: ReactNode;
  heading: string;
  description: string;
  primaryAction: {
    label: string;
    onClick: () => void;
  };
  secondaryActions?: {
    label: string;
    onClick: () => void;
  }[];
}
```

#### Acceptance Criteria
- [ ] EmptyState component created
- [ ] Used on all four pages
- [ ] Responsive (stacks on mobile)
- [ ] Proper spacing and visual hierarchy
- [ ] Icons either emoji or SVG (consistent)
- [ ] Action buttons functional

---

### Feature: Standardized Design System

**Priority:** HIGH (P0)
**Effort:** Medium
**Pages:** All

#### User Story
As a user, I expect consistent visual design across all pages so the app feels cohesive and professional.

#### Current Issues
- Inconsistent button colors (blue-600, green-600, red-600)
- Varied badge styles
- Different loading spinner implementations
- Inconsistent spacing

#### Proposed Solution
Create design tokens and shared components:

#### Color Tokens
```typescript
const colors = {
  primary: 'blue-600',      // Main actions
  success: 'green-600',     // Success states, confirmations
  warning: 'yellow-600',    // Warnings, "not now" actions
  danger: 'red-600',        // Destructive actions
  neutral: 'gray-600',      // Secondary actions
  info: 'blue-500',         // Informational badges
};
```

#### Button Component
```typescript
type ButtonVariant = 'primary' | 'success' | 'danger' | 'neutral';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  children: ReactNode;
  onClick?: () => void;
}
```

#### Badge Component
```typescript
type BadgeVariant = 'success' | 'error' | 'warning' | 'info' | 'neutral';

interface BadgeProps {
  variant: BadgeVariant;
  children: ReactNode;
  size?: 'sm' | 'md';
}
```

#### Acceptance Criteria
- [ ] Design tokens documented
- [ ] Button component with all variants
- [ ] Badge component with all variants
- [ ] Spinner/Loading component
- [ ] All pages use design system components
- [ ] Storybook or documentation created
- [ ] No hardcoded color classes outside components

---

### Feature: Loading Skeletons

**Priority:** MEDIUM (P1)
**Effort:** Low
**Pages:** All

#### User Story
As a user, I want to see placeholder content while pages load so I understand the app is working and know what to expect.

#### Current State
- Centered spinner only
- No indication of layout
- Feels slower than necessary

#### Proposed Solution
- Create skeleton components matching actual content
- Show skeletons during initial load
- Smooth transition to real content

#### Technical Considerations
```typescript
// Skeleton for Sources page
function SourceCardSkeleton() {
  return (
    <div className="animate-pulse flex items-center space-x-4 p-4 border rounded-lg">
      <div className="w-12 h-12 bg-gray-300 rounded-full" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-gray-300 rounded w-3/4" />
        <div className="h-3 bg-gray-200 rounded w-1/2" />
      </div>
      <div className="h-8 bg-gray-300 rounded w-20" />
    </div>
  );
}
```

#### Acceptance Criteria
- [ ] Skeleton components for each page type
- [ ] Match actual content layout
- [ ] Smooth pulse animation
- [ ] Replace current loading spinners
- [ ] Show 5-10 skeletons (approximate page size)

---

## Sources Page Features

### Feature: Enhanced Source Cards

**Priority:** MEDIUM (P1)
**Effort:** Medium
**Pages:** Sources

#### User Story
As a user, I want rich, visual source cards so I can quickly identify and understand my sources at a glance.

#### Current State
- List-based layout
- Small avatars
- Stats use emoji
- No hover states

#### Proposed Solution
- Redesigned card layout
- Better visual hierarchy
- Proper icons (SVG)
- Hover states with additional info
- Optional grid/list view toggle

#### Design Mockup
```
┌─────────────────────────────────────────────────────┐
│ [Avatar]  Veritasium                                │
│           YouTube • UCHnyfMqi...  [success] [Muted] │
│           📊 42 fetched  •  ⏳ 38 unwatched         │
│                                                      │
│           [Mute]  [Refresh]  [Settings]  [Remove]   │
└─────────────────────────────────────────────────────┘

HOVER STATE:
┌─────────────────────────────────────────────────────┐
│ [Avatar]  Veritasium                                │
│           YouTube • UCHnyfMqi...  [success] [Muted] │
│           📊 42 fetched  •  ⏳ 38 unwatched         │
│                                                      │
│  Recent: "Why You Can't Trust Me"                   │
│          "The SAT Question Everyone Gets Wrong"     │
│          "The Surprising Secret of Synchronization" │
│                                                      │
│           [Mute]  [Refresh]  [Settings]  [Remove]   │
└─────────────────────────────────────────────────────┘
```

#### Acceptance Criteria
- [ ] New card design implemented
- [ ] Hover state shows 3 recent items
- [ ] Replace emoji with SVG icons
- [ ] Animations smooth (300ms transition)
- [ ] Touch-friendly (tap to expand on mobile)
- [ ] View toggle (grid/list) persisted to localStorage

---

### Feature: Source Management Enhancements

**Priority:** MEDIUM (P1)
**Effort:** Medium
**Pages:** Sources

#### User Story
As a user with many sources, I want better organization tools so I can manage them efficiently.

#### Proposed Features

##### 1. Sorting Options
- Alphabetical (A-Z, Z-A)
- Most recent content
- Most unwatched items
- Last fetch status
- Date added

##### 2. Grouping
- Group by source type (YouTube, RSS, Podcast)
- Collapsible groups
- Show/hide groups

##### 3. Bulk Actions
- Select multiple sources (checkbox mode)
- Bulk mute/unmute
- Bulk refresh
- Bulk delete (with confirmation)

##### 4. Quick Actions
- Refresh single source (without full page refresh)
- View in feed (filter feed by this source)
- Copy source ID/URL

#### Technical Considerations
```typescript
type SortOption =
  | 'name-asc' | 'name-desc'
  | 'recent' | 'unwatched'
  | 'status' | 'date-added';

interface SourceListState {
  sortBy: SortOption;
  groupBy: 'none' | 'type';
  viewMode: 'grid' | 'list';
  selectedIds: Set<string>;
}
```

#### Acceptance Criteria
- [ ] Sort dropdown functional
- [ ] Group toggle works
- [ ] Bulk select mode (checkbox in each card)
- [ ] Bulk actions toolbar appears when items selected
- [ ] Quick actions menu (three-dot icon)
- [ ] All actions show toast feedback
- [ ] Preferences saved to localStorage

---

### Feature: Source Statistics Dashboard

**Priority:** LOW (P2)
**Effort:** Medium
**Pages:** Sources

#### User Story
As a user, I want to see overall statistics about my sources so I can understand my content consumption patterns.

#### Proposed Dashboard
```
┌─────────────────────────────────────────────────────┐
│  Overview                                            │
│  ────────────────────────────────────────────────  │
│  Total Sources: 15                                   │
│  Active: 12  •  Muted: 3                            │
│  Total Content Fetched: 342 items                   │
│  Unwatched: 187 items (~23 hours)                   │
│                                                      │
│  By Source Type:                                     │
│  YouTube: 8 sources (242 items)                     │
│  RSS: 5 sources (78 items)                          │
│  Podcast: 2 sources (22 items)                      │
│                                                      │
│  Last Fetch: 2 hours ago                            │
│  Next Auto-Fetch: in 4 hours                        │
└─────────────────────────────────────────────────────┘
```

#### Acceptance Criteria
- [ ] Statistics panel above source list
- [ ] Collapsible to save space
- [ ] Updates in real-time
- [ ] Breakdown by source type
- [ ] Estimate watch time for unwatched

---

## Filters Page Features

### Feature: Visual Duration Slider

**Priority:** MEDIUM (P1)
**Effort:** Low
**Pages:** Filters

#### User Story
As a user, I want to set duration filters visually so it's easier and more intuitive than number inputs.

#### Current State
- Plain number inputs
- No visual feedback
- Hard to understand ranges

#### Proposed Solution
- Range slider component
- Visual track showing selected range
- Labels at key points (5min, 15min, 30min, 60min+)
- Number inputs still available for precision

#### Design
```
Min Duration ──────────────────── Max Duration
    5min     15min    30min    60min    Any
    ├─────●══════════●─────┤
    ↑                ↑
  300s             1800s

Current: 5-30 minutes (300-1800 seconds)
```

#### Technical Considerations
```typescript
interface DurationSliderProps {
  min: number | null;
  max: number | null;
  onChange: (min: number | null, max: number | null) => void;
}

// Key points in seconds
const marks = [
  { value: 300, label: '5min' },
  { value: 900, label: '15min' },
  { value: 1800, label: '30min' },
  { value: 3600, label: '60min' },
];
```

#### Acceptance Criteria
- [ ] Range slider component created
- [ ] Dual handles (min and max)
- [ ] Snap to marks optional
- [ ] Shows current selection in human format
- [ ] Keyboard accessible
- [ ] Mobile-friendly touch targets
- [ ] Number inputs below for precision

---

### Feature: Filter Impact Preview

**Priority:** MEDIUM (P1)
**Effort:** Medium
**Pages:** Filters

#### User Story
As a user, I want to see how many items my filters are blocking so I can understand their impact and adjust if needed.

#### Proposed Features

##### 1. Live Statistics
```
┌─────────────────────────────────────────┐
│  Current Filter Impact                   │
│  ─────────────────────────────────────  │
│  🛡️ 23 items filtered this week         │
│  📊 ~8% of total content                │
│                                          │
│  Top Keywords:                           │
│  • "election" → 12 items                │
│  • "trump" → 8 items                    │
│  • "politics" → 3 items                 │
└─────────────────────────────────────────┘
```

##### 2. Test Filter Mode
- Add keyword without saving
- See preview of what would be filtered
- "Apply" or "Cancel" decision

##### 3. Filter Activity Log
- List of recently blocked items
- Helpful for debugging filters
- Can whitelist from here

#### Acceptance Criteria
- [ ] Statistics panel showing filter impact
- [ ] Test mode for keywords
- [ ] Shows affected item count
- [ ] Activity log (last 50 filtered items)
- [ ] Can disable individual filters temporarily
- [ ] Updates in real-time

---

### Feature: Keyword Management Improvements

**Priority:** MEDIUM (P1)
**Effort:** Low
**Pages:** Filters

#### User Story
As a user, I want better control over my keyword filters so I can fine-tune what gets blocked.

#### Proposed Features

##### 1. Toggle Filters On/Off
- Enable/disable without deleting
- Visual indication when disabled
- Bulk enable/disable all

##### 2. Keyword Categories
- Group keywords by topic
- "Politics", "Sports", "Violence", etc.
- Toggle entire categories

##### 3. Import/Export
- Export filter list as JSON/text
- Import from file
- Preset filter packs

##### 4. Smart Suggestions
- Analyze dismissed content
- Suggest keywords to block
- One-click to add from feed

#### UI Mockup
```
┌─────────────────────────────────────────────┐
│ election                     [●] [×] [edit] │
│ Wildcard • 12 items blocked • Active        │
└─────────────────────────────────────────────┘

[●] = toggle on/off
[×] = delete
[edit] = edit keyword/settings
```

#### Acceptance Criteria
- [ ] Toggle switch on each keyword
- [ ] Disabled keywords shown with opacity
- [ ] Category system implemented
- [ ] Import/export functionality
- [ ] Filter suggestions based on dismissed content
- [ ] Edit keyword modal

---

## Saved Page Features

### Feature: Collection Management

**Priority:** HIGH (P0)
**Effort:** Medium
**Pages:** Saved

#### User Story
As a user, I want to organize my saved content into collections so I can find things easily and group related content.

#### Current State
- Collection field exists but no management UI
- Can't create, edit, or view collections
- No filtering by collection

#### Proposed Solution

##### 1. Collection UI
```
┌─────────────────────────────────────────────┐
│  Collections (4)                  [+ New]   │
│  ────────────────────────────────────────  │
│  📁 Watch Later (23)              [default] │
│  📁 Tutorials (8)                           │
│  📁 Inspiration (15)                        │
│  📁 To Review (4)                           │
│  📂 Uncategorized (12)                      │
└─────────────────────────────────────────────┘
```

##### 2. Features
- Create new collections
- Rename collections
- Delete collections (move items to uncategorized)
- Set default collection
- Color coding
- Drag-and-drop items between collections

##### 3. Collection View
- Click collection to filter items
- Breadcrumb navigation
- "All Saved" shows everything

#### Technical Considerations
```typescript
interface Collection {
  id: string;
  name: string;
  color?: string;
  isDefault: boolean;
  itemCount: number;
  createdAt: Date;
}

interface SavedItem {
  id: string;
  collectionId: string | null;
  // ... other fields
}
```

#### Acceptance Criteria
- [ ] Collections sidebar/panel
- [ ] Create collection modal
- [ ] Edit/delete collection actions
- [ ] Filter saved items by collection
- [ ] Move items between collections (dropdown or drag)
- [ ] Default collection for quick saves
- [ ] Collection stats (item count, total duration)
- [ ] Empty collection state

---

### Feature: Enhanced Saved Item Cards

**Priority:** MEDIUM (P1)
**Effort:** Low
**Pages:** Saved

#### User Story
As a user, I want saved item cards to show relevant actions so I can manage my saved content efficiently.

#### Current State
- Uses ContentCard with wrong actions
- Can't edit notes inline
- No quick actions

#### Proposed Solution

##### New SavedItemCard Component
```
┌────────────────────────────────────────────┐
│  [Thumbnail]                               │
│  Video Title Here                          │
│  Source Name • Saved 2 days ago            │
│                                            │
│  📁 Collection: Tutorials      [Change]    │
│  📝 "Great explanation of..."  [Edit]      │
│                                            │
│  [Open] [Move to Feed] [Remove]            │
└────────────────────────────────────────────┘
```

##### Actions
- Open (watch/read)
- Remove from saved
- Add back to feed
- Edit notes
- Change collection
- Share

#### Acceptance Criteria
- [ ] SavedItemCard component created
- [ ] All actions functional
- [ ] Edit notes inline
- [ ] Collection dropdown
- [ ] Toast feedback for all actions
- [ ] Keyboard shortcuts

---

### Feature: Saved Content Filtering & Sorting

**Priority:** MEDIUM (P1)
**Effort:** Low
**Pages:** Saved

#### User Story
As a user, I want to filter and sort my saved content so I can find what I'm looking for quickly.

#### Proposed Features

##### 1. Filters
- By collection
- By content type (video, article, podcast)
- By source
- By date saved

##### 2. Sort Options
- Date saved (newest/oldest)
- Title (A-Z, Z-A)
- Source name
- Duration (shortest/longest)
- Random shuffle

##### 3. View Options
- Grid view (current)
- List view (more dense)
- Compact view

#### UI Design
```
┌─────────────────────────────────────────────────┐
│ [🔍 Search] [Filter ▼] [Sort: Date ▼] [⊞ Grid] │
└─────────────────────────────────────────────────┘
```

#### Acceptance Criteria
- [ ] Filter dropdown with all options
- [ ] Sort dropdown functional
- [ ] View toggle (grid/list/compact)
- [ ] Filters combine (collection + type)
- [ ] URL state for sharing filtered views
- [ ] Filter/sort state persisted

---

### Feature: Bulk Operations for Saved

**Priority:** LOW (P2)
**Effort:** Medium
**Pages:** Saved

#### User Story
As a user with many saved items, I want to perform actions on multiple items at once.

#### Proposed Features
- Select mode (checkboxes)
- Select all / deselect all
- Bulk remove from saved
- Bulk move to collection
- Bulk add back to feed
- Bulk export

#### Acceptance Criteria
- [ ] Selection mode toggle
- [ ] Checkboxes on cards in selection mode
- [ ] Bulk action toolbar when items selected
- [ ] Confirmation for destructive actions
- [ ] Progress indicator for bulk operations
- [ ] Success summary toast

---

## History Page Features

### Feature: Advanced History Filtering

**Priority:** MEDIUM (P1)
**Effort:** Medium
**Pages:** History

#### User Story
As a user, I want flexible filtering options for my history so I can review past interactions effectively.

#### Current State
- Basic type filter tabs
- No date range filtering
- No source filtering

#### Proposed Solution

##### 1. Date Range Filters
```
┌────────────────────────────────────────┐
│  [ All Time ▼ ]                        │
│    • Today                             │
│    • Yesterday                         │
│    • Last 7 days                       │
│    • Last 30 days                      │
│    • Last 90 days                      │
│    • Custom range...                   │
└────────────────────────────────────────┘
```

##### 2. Multi-Filter Panel
```
┌─────────────────────────────────────────┐
│  Filters                                │
│  ─────────────────────────────────────  │
│  Date Range:  Last 7 days      [×]      │
│  Type:        Watched          [×]      │
│  Source:      Veritasium       [×]      │
│                                          │
│  [Clear All Filters]                    │
└─────────────────────────────────────────┘
```

##### 3. Advanced Filters
- Completion rate (> 50%, > 75%, 100%)
- Watch duration (quick view < 5min, deep dive > 30min)
- Has notes
- Is in collection

#### Acceptance Criteria
- [ ] Date range filter implemented
- [ ] Custom date picker for ranges
- [ ] Source filter dropdown
- [ ] Multiple filters combine (AND logic)
- [ ] Active filters shown as chips
- [ ] Clear all filters button
- [ ] URL state for sharing filtered views

---

### Feature: Enhanced History Visualization

**Priority:** MEDIUM (P1)
**Effort:** Medium
**Pages:** History

#### User Story
As a user, I want visual representations of my history so I can understand my patterns at a glance.

#### Proposed Features

##### 1. Timeline View
```
Today
├─ 14:23 - Watched "Video Title" (23min, 95% complete)
├─ 12:45 - Saved "Another Video"
└─ 10:15 - Dismissed "Old Content"

Yesterday
├─ 19:30 - Watched "Evening Video" (45min, 100%)
├─ 15:20 - Not Now "Quick Vid"
...
```

##### 2. Progress Bars
```
┌────────────────────────────────────────┐
│  Video Title                           │
│  Watched 23min of 45min                │
│  ████████████░░░░░░░░░  51%            │
└────────────────────────────────────────┘
```

##### 3. Statistics Panel
```
┌─────────────────────────────────────────┐
│  Last 7 Days                            │
│  ─────────────────────────────────────  │
│  🎬 12 videos watched                   │
│  ⏱️  3h 45min total watch time          │
│  ⭐ 4 items saved                       │
│  📊 Average completion: 78%             │
│                                          │
│  Top Source: Veritasium (5 items)       │
│  Most Active Day: Monday (6 items)      │
└─────────────────────────────────────────┘
```

#### Acceptance Criteria
- [ ] Timeline view toggle
- [ ] Progress bars for watched items
- [ ] Statistics panel (collapsible)
- [ ] Chart/graph for trends (optional)
- [ ] Date grouping headers
- [ ] Smooth transitions between views

---

### Feature: History Management Actions

**Priority:** MEDIUM (P1)
**Effort:** Low
**Pages:** History

#### User Story
As a user, I want to interact with my history so I can re-engage with content or clean up mistakes.

#### Proposed Features

##### 1. Re-interaction
- Watch again (reset watched status)
- Save from history
- Dismiss from history
- Add back to feed (undo dismiss)

##### 2. Bulk Operations
- Clear watched history (keep stats)
- Delete specific items
- Export history

##### 3. Undo Recent
- "Undo last action" button (time-limited)
- Undo queue (last 10 actions)

#### UI Design
```
┌────────────────────────────────────────────┐
│  Video Title                       [...]   │
│  Watched • 2 hours ago • 95% complete      │
│                                            │
│  Actions:                                  │
│  [Watch Again] [Save] [Remove from History]│
└────────────────────────────────────────────┘
```

#### Acceptance Criteria
- [ ] Action menu on each history item
- [ ] Re-interaction updates all states properly
- [ ] Undo system (3-10 second window)
- [ ] Bulk delete with confirmation
- [ ] Export as CSV/JSON
- [ ] Clear history (keep aggregated stats)

---

### Feature: History Insights

**Priority:** LOW (P2)
**Effort:** High
**Pages:** History

#### User Story
As a user, I want insights into my viewing patterns so I can understand my habits and preferences.

#### Proposed Insights

##### 1. Viewing Patterns
- Most active time of day
- Most active day of week
- Average session length
- Completion rate trends

##### 2. Content Breakdown
- Content type distribution (pie chart)
- Top sources
- Average video duration preference
- Topic trends (from keywords)

##### 3. Recommendations
- "You might like..." based on watch history
- Sources similar to your favorites
- "You haven't watched X in a while"

#### Design
```
┌─────────────────────────────────────────┐
│  Insights (Last 30 Days)                │
│  ─────────────────────────────────────  │
│  🏆 Top Source: Veritasium (15 videos)  │
│  ⏰ Peak Time: 8-10 PM                  │
│  📅 Most Active: Saturday               │
│  ⏱️  Avg Watch: 23 minutes              │
│  ✅ Completion Rate: 72%                │
│                                          │
│  Content Breakdown:                     │
│  YouTube:  60%  ████████████░░░         │
│  Podcasts: 30%  ██████░░░░░░░░         │
│  RSS:      10%  ██░░░░░░░░░░░░         │
└─────────────────────────────────────────┘
```

#### Acceptance Criteria
- [ ] Insights panel created
- [ ] Statistics calculations accurate
- [ ] Charts/graphs implemented
- [ ] Time range selector (7/30/90 days)
- [ ] Export insights as PDF/image
- [ ] Privacy toggle (hide insights if desired)

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1-2)
**Goal:** Establish shared components and design system

- [ ] Toast notification system
- [ ] Design system components (Button, Badge, etc.)
- [ ] EmptyState component
- [ ] Loading skeleton components
- [ ] Modal/Dialog component for confirmations
- [ ] Search component

**Deliverable:** Shared component library ready for use

---

### Phase 2: High Priority Features (Week 3-4)
**Goal:** Most impactful user-facing improvements

**Sources Page:**
- [ ] Enhanced source cards
- [ ] Search functionality
- [ ] Basic sorting
- [ ] Replace alerts with toasts
- [ ] Improved empty state

**Filters Page:**
- [ ] Visual duration slider
- [ ] Filter toggle (enable/disable)
- [ ] Test filter mode
- [ ] Replace alerts with toasts
- [ ] Improved empty state

**Saved Page:**
- [ ] Collection management UI
- [ ] SavedItemCard component
- [ ] Search functionality
- [ ] Basic filtering by collection
- [ ] Improved empty state

**History Page:**
- [ ] Date range filtering
- [ ] Progress bars for completion
- [ ] Enhanced filter tabs (with counts)
- [ ] Improved empty state

**Deliverable:** All pages have core improvements

---

### Phase 3: Enhanced UX (Week 5-6)
**Goal:** Polish and advanced features

**Sources Page:**
- [ ] Bulk actions
- [ ] Group by type
- [ ] Source statistics dashboard
- [ ] Hover state with recent items

**Filters Page:**
- [ ] Filter impact statistics
- [ ] Activity log
- [ ] Keyword categories
- [ ] Import/export

**Saved Page:**
- [ ] Advanced sorting
- [ ] View mode toggle (grid/list)
- [ ] Inline note editing
- [ ] Collection colors

**History Page:**
- [ ] Timeline view
- [ ] Statistics panel
- [ ] Re-interaction actions
- [ ] Multi-source filtering

**Deliverable:** Feature-complete management pages

---

### Phase 4: Advanced Features (Week 7-8)
**Goal:** Nice-to-have features and optimizations

**All Pages:**
- [ ] Keyboard shortcuts
- [ ] URL state management
- [ ] Performance optimizations (virtualization)
- [ ] Accessibility audit and fixes
- [ ] Mobile responsive refinements

**Sources Page:**
- [ ] Drag-and-drop reordering
- [ ] Import YouTube subscriptions
- [ ] Source health monitoring

**Saved Page:**
- [ ] Drag-and-drop to collections
- [ ] Bulk operations
- [ ] Export saved items

**History Page:**
- [ ] History insights
- [ ] Charts and visualizations
- [ ] Undo system
- [ ] Export history

**Deliverable:** Polished, production-ready pages

---

## Success Metrics

### User Experience Metrics
- **Task Completion Time:** Users can find and manage items 50% faster
- **Error Rate:** Reduce user errors by 75% (via better feedback)
- **User Satisfaction:** > 4.5/5 in post-update survey

### Technical Metrics
- **Performance:** Time to Interactive < 2s on all pages
- **Accessibility:** WCAG 2.1 AA compliance (100%)
- **Code Quality:** Test coverage > 80% for new components

### Adoption Metrics
- **Feature Usage:** > 60% of users use search within first session
- **Collection Adoption:** > 40% of users create collections
- **Filter Engagement:** Average 3+ filters per active user

---

## Testing Strategy

### Unit Tests
- All shared components (Button, Badge, Toast, etc.)
- Search and filter logic
- Sort functions
- Statistics calculations

### Integration Tests
- Page-level interactions
- Multi-filter combinations
- Bulk operations
- Collection management flows

### E2E Tests
- Critical user journeys
- Cross-page workflows
- Error scenarios
- Edge cases (empty states, max limits)

### Accessibility Tests
- Keyboard navigation
- Screen reader compatibility
- Color contrast
- Focus management

### Performance Tests
- Large list rendering (1000+ items)
- Search performance with many items
- Animation smoothness
- Memory leaks

---

## Migration & Rollout

### Backward Compatibility
- All new features are additive
- No breaking changes to existing functionality
- Progressive enhancement approach
- Preferences stored in localStorage initially

### Rollout Strategy

**Phase 1: Internal Testing (Week 1-2)**
- Deploy to staging
- Internal team testing
- Fix critical bugs
- Gather feedback

**Phase 2: Beta Release (Week 3-4)**
- Feature flag system
- Opt-in beta for interested users
- Monitor analytics and errors
- Iterate based on feedback

**Phase 3: Gradual Rollout (Week 5-6)**
- 10% of users
- Monitor metrics
- 50% of users
- Monitor metrics
- 100% rollout

**Phase 4: Deprecation (Week 7-8)**
- Remove old code
- Clean up feature flags
- Update documentation

---

## Documentation

### User Documentation
- [ ] Feature overview guide
- [ ] How-to guides for each major feature
- [ ] Video tutorials
- [ ] FAQ section
- [ ] Keyboard shortcuts reference

### Developer Documentation
- [ ] Component API documentation
- [ ] Storybook for all shared components
- [ ] Code comments and JSDoc
- [ ] Architecture decision records (ADRs)
- [ ] Testing guide

---

## Future Considerations

### Beyond This Roadmap
- AI-powered content recommendations
- Social features (share collections)
- Browser extension for quick saves
- Mobile app
- Offline mode
- Advanced analytics dashboard
- Integration with other platforms (Spotify, etc.)

### Technical Debt
- Consider migration to server-side state (tRPC/React Query)
- Evaluate component library (shadcn/ui, Radix)
- Performance monitoring (Sentry, LogRocket)
- Analytics integration (Plausible, PostHog)

---

## Appendix

### Design Inspiration
- YouTube Studio
- Spotify Saved Songs
- Notion Databases
- Linear Issue Filters
- Twitter Lists

### Technology Stack
- **Frontend:** React, Next.js, TypeScript
- **Styling:** Tailwind CSS
- **State:** React Context / Zustand (TBD)
- **Forms:** React Hook Form
- **Animation:** Framer Motion (optional)
- **Icons:** Heroicons / Lucide React
- **Charts:** Recharts (for insights)

### Color Palette
```
Primary:   #2563eb (blue-600)
Success:   #16a34a (green-600)
Warning:   #ca8a04 (yellow-600)
Danger:    #dc2626 (red-600)
Info:      #3b82f6 (blue-500)
Neutral:   #4b5563 (gray-600)
```

---

**Document Version:** 1.0
**Last Updated:** 2025-10-22
**Owner:** Development Team
**Status:** Draft - Ready for Review
