# Curated Feed App - Feature Specification
## "Forest Cabin with Treats"

### Design Philosophy
A safe, curated content platform for intentional disconnection from algorithmic social media. Provides ADHD-friendly infinite scroll with only pre-approved sources. No political news, no doomscrolling, just personally chosen content that brings joy and calm.

---

## 1. User Accounts

### Account Management
- User registration and login with email/password
- Each user has their own private feed configuration
- All preferences, sources, and filters are per-user
- Account settings and preferences management

---

## 2. Content Sources

### Supported Platforms
- **YouTube Channels**: Both new uploads and full back catalog
- **Twitch**: Live stream status, VODs, and clips
- **Podcasts**: Episodes via RSS feeds (new and back catalog)
- **Blogs/Articles**: Long-form content via RSS (Substacks, personal blogs)
- **Science/Discovery News**: Space, nature, technology (no politics)

### Source Management
- Add sources by URL, username, or channel ID
- Remove sources at any time
- Temporary mute (hide source without deleting)
- Test sources against current filters before adding
- Bulk import YouTube subscriptions
- View all configured sources in one place
- Mark sources as "always safe" vs "needs filtering"

---

## 3. The Feed

### Content Discovery
- Infinite scroll feed that never runs out
- Mix of recent uploads AND older back catalog content
- Pulls from all configured sources simultaneously
- Randomized older content prevents "keeping up" pressure
- Content diversity - prevents too many items from same source in a row
- Auto-interleaves different content types (video, podcast, article, stream)

### Feed Interaction (Explicit Actions)
Every item in feed has clear action buttons:

- **👁️ Watch/Open**: Opens in theatre mode, marks as consumed, moves to history
- **⭐ Save for Later**: Moves to dedicated saved list, removed from main feed
- **⏭️ Not Now**: Temporarily dismisses, will resurface later in rotation
- **❌ Dismiss**: Permanently removes from feed, marks as not interested
- **🚫 Block & Filter**: Removes item and prompts to add keywords to blocklist

### Feed Controls
- Refresh to pull latest content
- "Clear all watched" bulk action
- Manual shuffle mode (randomize current feed order)
- Filter by content type (only videos, only podcasts, etc.)
- Search within your feed

---

## 4. Universal Filter System

### Master Blocklist
- One keyword blocklist applies across ALL content types
- Filters titles, descriptions, tags, and metadata
- Content matching filters never appears in feed
- Real-time filtering - add keyword and content instantly disappears
- Whole word matching, case-insensitive
- Wildcard support (e.g., *election* matches "elections", "election day", etc.)

### Filter Management Interface
- Dedicated filters tab/page
- Simple text input to add keywords
- List of all current filters with easy removal
- Import/export filter lists
- Pre-made filter packs (Politics, Violence, US News, etc.)
- "Hide + extract keywords" quick action from any item

### Filter Intelligence
- One-click to block keywords from an item's title
- Stats showing how many items blocked (optional display)
- Suggested filters based on manually hidden content
- Category-specific overrides (whitelist for specific sources)
- Test mode: see what would be filtered without applying

### Filter Warnings
- When adding a source, preview how many items would be filtered
- Alert if a source frequently triggers filters (may not be a good fit)

---

## 5. Context-Based Filtering

### Duration Filters
Quick presets for different contexts:
- **🍽️ Meal Time** (15-25 minutes)
- **☕ Coffee Break** (5-10 minutes)  
- **🛋️ Evening Wind-Down** (30-60 minutes)
- **🎲 Any Length** (show everything)

### Custom Duration Controls
- Min/max duration slider
- Applies to YouTube videos, Twitch VODs, podcasts
- Shows estimated read time for articles
- Preference is "sticky" (remembers last selection)
- Quick toggle buttons at top of feed

---

## 6. Theatre Mode Player

### Video Player
- Click any video card to open large theatre-style player
- Dimmed or blurred background to maintain focus
- Embedded YouTube player (respects Premium subscription, no ads)
- No YouTube branding, related videos, or algorithmic recommendations
- ESC key or click outside to close back to feed
- Standard playback controls (play/pause, seek, quality, captions, speed)

### Player Features
- "Next in feed" button to chain-watch without exiting theatre mode
- Picture-in-picture mode for watching while scrolling
- Fullscreen mode
- Optional sidebar mode (video on right, feed scrollable on left)

### Podcast Player
- Same theatre-mode treatment for audio content
- Album artwork display
- Show notes visible
- Standard playback controls
- Continue scrolling feed while listening

### Twitch Integration
- Live streams open in theatre mode
- Chat visible or hideable (user preference)
- Seamless experience without leaving the app

---

## 7. Live Streamers Section

### Persistent Display
- Dedicated section (header or sidebar) showing followed streamers who are currently live
- Not intrusive, just visible at a glance
- No push notifications - check when you want to

### Stream Information
- Viewer count
- Current game/category
- Stream title
- Click to open in theatre mode

---

## 8. Content Management

### Saved Content ("Watch Later")
- Dedicated tab for saved items
- Optional organization into collections/playlists
- Search within saved items
- Mark saved items as watched
- Re-add items to main feed
- Export saved list

### Watch History
- Searchable archive of all consumed content
- Filter by source, date, content type
- Re-watch any previous item
- Toggle to show/hide watched items in main feed
- "Deep dive mode" - prioritize older content from history

### "Not Now" Queue
- Temporarily dismissed items automatically resurface
- Configurable rotation (after N items or time period)
- Never shows same item twice in one session
- No pressure - content comes back when you might be ready

---

## 9. Onboarding & Setup

### Initial Setup Flow
- Curated "wholesome starter pack" of suggested channels/sources
- Organized by category: Calming, Educational, Funny, Creative, Nature
- Preset configurations like "UK person avoiding US news"
- Can accept all suggestions, pick some, or start with blank slate
- Guided filter setup with common blocklist suggestions

---

## 10. Mental Health Features

### Usage Awareness (Optional)
- Session timers with gentle awareness notifications (not naggy)
- "That's enough for now" graceful exit button with calming message
- Refresh frequency monitoring (alerts if refreshing obsessively)
- All features can be disabled if metrics cause anxiety

### Safety Mechanisms
- Emergency "hide this source + block keywords" action
- Quick filter adjustment from any concerning content
- Undo actions (3-second window)
- No gamification or streak tracking
- No "time spent" metrics unless user explicitly enables

### Palette Cleansers
- Option to auto-insert calming content after X items
- "Show me something calming" manual button
- Break suggestions (optional)

---

## 11. Visual & Accessibility

### Design
- Dark mode
- Calm, minimal interface
- Clear visual hierarchy
- Smooth animations and transitions
- Thumbnail preview on hover

### Content Cards Display
- Thumbnail image
- Title
- Source badge/indicator
- Timestamp (how old)
- Duration (for videos/podcasts)
- Content type icon

### Accessibility
- Keyboard shortcuts for all actions
- Text size options
- Spacing/density controls (cozy vs compact)
- Reduced motion mode
- Screen reader support

---

## 12. Additional Features

### Content Discovery Tools
- "Rediscovery mode" - surfaces older content you might have missed
- Themed filters (e.g., "show me more nature content today")
- Content diversity indicator (visual feedback on feed variety)
- Manual shuffle to mix up current feed

### Search & Organization
- Search within your configured sources
- Search your history
- Filter feed by date range
- Sort options: chronological, random, by source type

### Data Management
- Export entire configuration (sources, filters, preferences)
- Import configuration to new device/account
- Backup and restore functionality
- "My forest cabin blueprint" shareable template (without account details)

### Network Resilience
- Cached content available during connectivity issues
- Calm offline indicator (not stressful)
- Low connectivity mode with reduced data usage
- Graceful handling of API failures

---

## Success Criteria

The app successfully achieves its goal when:

1. User can spend extended periods (weeks/months) without opening YouTube, X, Reddit, or news sites
2. Zero anxiety-inducing or triggering content appears in feed
3. ADHD stimulation needs are satisfied without toxic algorithmic patterns
4. Experience feels calm, safe, and intentional rather than compulsive
5. Content variety prevents boredom while maintaining boundaries
6. User feels in control of their content consumption
7. Setup and maintenance are intuitive and low-effort

---

## Core Principles

- **User Control**: Transparent, no black-box algorithms
- **Mental Health First**: Designed to reduce anxiety, not exploit it  
- **ADHD-Friendly**: Infinite content, clear actions, context-aware
- **Forest Cabin Philosophy**: Calm, safe, curated, intentional
- **Never Run Out**: Back catalog + new content = endless discovery
- **Complete Replacement**: One app for all healthy content consumption

---

## User Context

- UK-based user
- Wants to avoid all US and UK political news
- YouTube Premium subscriber
- ADHD diagnosis - needs stimulation but struggles with negative content spirals
- Goal: One month digital detox with healthy content, potentially permanent lifestyle change
- Emphasis on disconnection from toxic content, not isolation from all content