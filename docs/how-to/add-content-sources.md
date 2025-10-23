# How to Add Content Source Adapters

**Version:** 1.0
**Last Updated:** 2025-10-23

This guide shows you how to add support for a new content source type (e.g., RSS, Twitch, Podcast) to HopeScroll.

---

## Prerequisites

Before you start:
- Understanding of hexagonal architecture (read [architecture.md](../reference/architecture.md))
- Familiarity with the domain layer (see `/domain/content/`)
- Knowledge of TypeScript and async/await patterns

**Time required:** 2-4 hours for basic adapter

---

## Overview

Adding a new content source involves:
1. Creating an adapter in `/adapters/content/{source-name}/`
2. Implementing the `ContentAdapter` interface
3. Registering the adapter in the service layer
4. Adding database enum value (if needed)
5. Writing tests
6. Updating documentation

---

## Step 1: Understand the ContentAdapter Interface

All content adapters implement this interface:

```typescript
// domain/content/content-adapter.ts (conceptual)
interface ContentAdapter {
  /**
   * Fetch content items from a specific source
   * @param sourceId - Platform-specific identifier (channel ID, feed URL, etc.)
   * @returns Array of content items
   */
  fetchContent(sourceId: string): Promise<ContentItem[]>;

  /**
   * Validate that a source ID is accessible and valid
   * @param sourceId - Source identifier to validate
   * @returns true if valid, false otherwise
   */
  validateSource(sourceId: string): Promise<boolean>;

  /**
   * Get metadata about a source (name, avatar, etc.)
   * @param sourceId - Source identifier
   * @returns Source metadata
   */
  getSourceMetadata(sourceId: string): Promise<SourceMetadata>;
}
```

---

## Step 2: Create Adapter Directory

Create a new directory for your adapter:

```bash
mkdir -p adapters/content/{source-name}
cd adapters/content/{source-name}
```

**Directory structure:**
```
adapters/content/{source-name}/
├── index.ts                 # Main adapter class
├── api-client.ts            # API wrapper (if using external API)
├── types.ts                 # Type definitions
└── transformer.ts           # Transform external format → ContentItem
```

---

## Step 3: Implement the Adapter

### Example: YouTube Adapter (Reference)

Let's look at the YouTube adapter as a reference:

```typescript
// adapters/content/youtube/index.ts
import { ContentAdapter, ContentItem, SourceMetadata } from '@/domain/content';
import { YouTubeAPIClient } from './api-client';
import { transformVideo } from './transformer';

export class YouTubeAdapter implements ContentAdapter {
  private apiClient: YouTubeAPIClient;

  constructor(apiKey: string) {
    this.apiClient = new YouTubeAPIClient(apiKey);
  }

  async fetchContent(channelId: string): Promise<ContentItem[]> {
    try {
      // 1. Fetch from external API
      const videos = await this.apiClient.getChannelVideos(channelId, {
        maxResults: 50,
        order: 'date'
      });

      // 2. Transform to domain format
      return videos.map(video => transformVideo(video, channelId));
    } catch (error) {
      console.error('YouTube fetch error:', error);
      throw new Error(`Failed to fetch YouTube content: ${error.message}`);
    }
  }

  async validateSource(channelId: string): Promise<boolean> {
    try {
      const channel = await this.apiClient.getChannel(channelId);
      return !!channel;
    } catch {
      return false;
    }
  }

  async getSourceMetadata(channelId: string): Promise<SourceMetadata> {
    const channel = await this.apiClient.getChannel(channelId);
    return {
      displayName: channel.snippet.title,
      avatarUrl: channel.snippet.thumbnails.default.url,
      description: channel.snippet.description,
      subscriberCount: channel.statistics.subscriberCount
    };
  }
}
```

### Example: RSS Adapter (Template)

Here's a template for implementing an RSS adapter:

```typescript
// adapters/content/rss/index.ts
import Parser from 'rss-parser';
import { extract } from '@extractus/article-extractor';
import { ContentAdapter, ContentItem, SourceMetadata } from '@/domain/content';
import { transformArticle } from './transformer';

export class RSSAdapter implements ContentAdapter {
  private parser: Parser;

  constructor() {
    this.parser = new Parser({
      customFields: {
        item: ['author', 'content:encoded', 'media:thumbnail']
      }
    });
  }

  async fetchContent(feedUrl: string): Promise<ContentItem[]> {
    try {
      // 1. Parse RSS feed
      const feed = await this.parser.parseURL(feedUrl);

      // 2. Extract full article content (optional, can be lazy-loaded)
      const articles = await Promise.all(
        feed.items.slice(0, 50).map(async (item) => {
          // Extract full article text
          const fullContent = await this.extractArticleContent(item.link);
          return transformArticle(item, feedUrl, fullContent);
        })
      );

      return articles;
    } catch (error) {
      console.error('RSS fetch error:', error);
      throw new Error(`Failed to fetch RSS content: ${error.message}`);
    }
  }

  async validateSource(feedUrl: string): Promise<boolean> {
    try {
      await this.parser.parseURL(feedUrl);
      return true;
    } catch {
      return false;
    }
  }

  async getSourceMetadata(feedUrl: string): Promise<SourceMetadata> {
    const feed = await this.parser.parseURL(feedUrl);
    return {
      displayName: feed.title || feedUrl,
      avatarUrl: feed.image?.url || null,
      description: feed.description || null
    };
  }

  private async extractArticleContent(url: string): Promise<string | null> {
    try {
      const article = await extract(url);
      return article?.content || null;
    } catch {
      // If extraction fails, return null (will use RSS excerpt)
      return null;
    }
  }
}
```

---

## Step 4: Create Transformer

Transform external API format to internal `ContentItem` format:

```typescript
// adapters/content/rss/transformer.ts
import { ContentItem } from '@/domain/content';
import { Item as RSSItem } from 'rss-parser';

export function transformArticle(
  item: RSSItem,
  sourceId: string,
  fullContent: string | null
): ContentItem {
  // Calculate read time (simple heuristic: 200 words per minute)
  const wordCount = countWords(fullContent || item.contentSnippet || '');
  const readTime = Math.ceil(wordCount / 200);

  return {
    id: generateId(item.guid || item.link),
    sourceType: 'RSS',
    sourceId,
    originalId: item.guid || item.link,
    title: item.title || 'Untitled',
    description: item.contentSnippet || item.description,
    thumbnailUrl: extractThumbnail(item),
    url: item.link,
    duration: readTime * 60, // Convert to seconds for consistency
    publishedAt: new Date(item.pubDate || Date.now()),
    // Article-specific fields
    contentType: 'ARTICLE',
    author: item.creator || item['dc:creator'] || null,
    excerpt: item.contentSnippet?.slice(0, 300),
    fullContent: fullContent,
    readTime: readTime
  };
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).length;
}

function extractThumbnail(item: RSSItem): string | null {
  // Try various thumbnail sources
  return item['media:thumbnail']?.url
    || item.enclosure?.url
    || item['media:content']?.url
    || null;
}

function generateId(originalId: string): string {
  // Generate consistent ID from original ID
  return `rss_${Buffer.from(originalId).toString('base64url')}`;
}
```

---

## Step 5: Update Database Schema (if needed)

If your source type doesn't exist in the `SourceType` enum:

```prisma
// prisma/schema.prisma

enum SourceType {
  YOUTUBE
  TWITCH
  RSS       // Add your type here
  PODCAST
}
```

Then create a migration:

```bash
npm run db:migrate -- --name add-rss-source-type
```

---

## Step 6: Register Adapter in Service Layer

Update the content service to use your new adapter:

```typescript
// services/content-service.ts

import { YouTubeAdapter } from '@/adapters/content/youtube';
import { RSSAdapter } from '@/adapters/content/rss';  // Add import

export class ContentService {
  private adapters: Record<SourceType, ContentAdapter>;

  constructor() {
    this.adapters = {
      YOUTUBE: new YouTubeAdapter(process.env.YOUTUBE_API_KEY!),
      RSS: new RSSAdapter(),  // Register adapter
      // ... other adapters
    };
  }

  async fetchContentForSource(source: ContentSource): Promise<ContentItem[]> {
    const adapter = this.adapters[source.type];
    if (!adapter) {
      throw new Error(`No adapter for source type: ${source.type}`);
    }

    return await adapter.fetchContent(source.sourceId);
  }
}
```

---

## Step 7: Add UI for Source Type

Create UI components for adding your new source type:

```typescript
// app/sources/components/AddRSSSource.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function AddRSSSource({ onAdd }: { onAdd: (url: string) => void }) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    setLoading(true);
    try {
      await onAdd(url);
      setUrl('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex gap-2">
      <input
        type="url"
        placeholder="https://example.com/feed.xml"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        className="flex-1 px-3 py-2 border rounded"
      />
      <Button onClick={handleAdd} disabled={!url || loading}>
        {loading ? 'Adding...' : 'Add RSS Feed'}
      </Button>
    </div>
  );
}
```

---

## Step 8: Write Tests

Create unit tests for your adapter:

```typescript
// tests/adapters/rss/rss-adapter.test.ts

import { describe, it, expect, beforeEach } from 'vitest';
import { RSSAdapter } from '@/adapters/content/rss';

describe('RSSAdapter', () => {
  let adapter: RSSAdapter;

  beforeEach(() => {
    adapter = new RSSAdapter();
  });

  it('should fetch articles from RSS feed', async () => {
    const feedUrl = 'https://example.com/feed.xml';
    const articles = await adapter.fetchContent(feedUrl);

    expect(articles).toBeInstanceOf(Array);
    expect(articles[0]).toHaveProperty('title');
    expect(articles[0]).toHaveProperty('contentType', 'ARTICLE');
  });

  it('should validate valid RSS feed URL', async () => {
    const feedUrl = 'https://example.com/feed.xml';
    const isValid = await adapter.validateSource(feedUrl);

    expect(isValid).toBe(true);
  });

  it('should reject invalid feed URL', async () => {
    const feedUrl = 'https://not-a-feed.com';
    const isValid = await adapter.validateSource(feedUrl);

    expect(isValid).toBe(false);
  });

  it('should extract source metadata', async () => {
    const feedUrl = 'https://example.com/feed.xml';
    const metadata = await adapter.getSourceMetadata(feedUrl);

    expect(metadata).toHaveProperty('displayName');
    expect(metadata).toHaveProperty('avatarUrl');
  });
});
```

---

## Step 9: Update Documentation

Update these documents:

### 1. PROJECT_STATUS.md
```markdown
### Adapters
- ✅ YouTube - Complete
- ✅ RSS - Complete (newly added!)
- 🔴 Twitch - Not started
- 🔴 Podcast - Not started
```

### 2. FEATURE_ROADMAP.md
```markdown
#### Epic 2A.1: RSS/Blog Source Support
**Status:** ✅ COMPLETE
```

### 3. IMPLEMENTATION_NOTES.md
Add section about your adapter:
```markdown
### RSS Adapter
**Location:** `/adapters/content/rss/`

**Implementation notes:**
- Uses `rss-parser` for feed parsing
- Uses `@extractus/article-extractor` for full text
- Handles paywalls gracefully (fallback to excerpt)
- Supports RSS 2.0 and Atom formats

**Known limitations:**
- No support for password-protected feeds
- Max 50 articles per fetch
- Some sites block scraping
```

---

## Common Pitfalls

### 1. External Dependencies in Domain Layer ❌
```typescript
// ❌ BAD: Domain layer importing adapter
// domain/content/content-item.ts
import { YouTubeAdapter } from '@/adapters/content/youtube';
```

**Fix:** Keep domain layer pure. Adapters depend on domain, not vice versa.

### 2. Not Handling API Errors ❌
```typescript
// ❌ BAD: Unhandled errors
async fetchContent(sourceId: string) {
  return await this.api.fetch(sourceId); // May throw
}
```

**Fix:** Wrap in try/catch and provide meaningful errors:
```typescript
// ✅ GOOD: Proper error handling
async fetchContent(sourceId: string) {
  try {
    return await this.api.fetch(sourceId);
  } catch (error) {
    console.error('Fetch error:', error);
    throw new Error(`Failed to fetch from ${sourceId}: ${error.message}`);
  }
}
```

### 3. Inconsistent Data Format ❌
```typescript
// ❌ BAD: Custom format per adapter
return {
  name: video.title,        // Inconsistent field names
  thumbnail: video.image,
  length: video.duration
};
```

**Fix:** Use ContentItem interface consistently:
```typescript
// ✅ GOOD: Standard ContentItem format
return {
  title: video.title,
  thumbnailUrl: video.image,
  duration: video.duration
};
```

---

## Testing Your Adapter

### Manual Testing Checklist

- [ ] Add a source via UI
- [ ] Validate that source metadata loads correctly
- [ ] Trigger content fetch (manually or via cron)
- [ ] Verify content appears in feed
- [ ] Check that filters work with new content type
- [ ] Test error handling (invalid source, network error)
- [ ] Verify content deduplication works

### Performance Testing

- [ ] Fetch from source with 100+ items (should handle gracefully)
- [ ] Test timeout handling (slow API)
- [ ] Verify rate limiting (don't hammer external APIs)
- [ ] Check memory usage (large content sets)

---

## Next Steps

After implementing your adapter:

1. ✅ Submit PR with adapter code
2. ✅ Include tests (minimum 80% coverage)
3. ✅ Update all relevant documentation
4. ✅ Add example source URLs to `/docs/examples/`
5. ✅ Update CLAUDE.md if new patterns introduced

---

## Example: Complete RSS Adapter

For a complete example, see:
- YouTube adapter: `/adapters/content/youtube/` (reference implementation)
- RSS adapter template: (in this document)

---

## Troubleshooting

### Adapter not recognized
**Symptom:** `No adapter for source type: RSS`

**Fix:** Ensure adapter is registered in `content-service.ts`

### Source validation fails
**Symptom:** "Invalid source" error when adding

**Fix:** Check `validateSource()` implementation, add logging

### Content not appearing in feed
**Symptom:** Fetch succeeds but no content in feed

**Fix:** Check transformer output format matches `ContentItem` interface

### Performance issues
**Symptom:** Slow content fetching

**Fix:**
- Add caching layer
- Reduce `maxResults` in API calls
- Use pagination instead of fetching all at once

---

## Resources

- [Architecture Overview](../reference/architecture.md)
- [Database Schema](../reference/database-schema.md)
- [Implementation Notes](../reference/IMPLEMENTATION_NOTES.md)
- [YouTube Adapter Source](/adapters/content/youtube/)

---

**Questions?** Open an issue or ask in [discussions](https://github.com/your-repo/discussions).
