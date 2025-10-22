# Quick Start: Implementing RSS/Article Feed
**Use this when you're ready to start building**

---

## Phase 1: Backend Setup (Week 1)

### Step 1: Install Dependencies
```bash
npm install rss-parser @extractus/article-extractor
npm install -D @types/node
```

### Step 2: Update Database Schema
```prisma
// prisma/schema.prisma

enum ContentType {
  VIDEO
  ARTICLE
  PODCAST
}

model ContentItem {
  // ... existing fields

  // Add these new fields:
  contentType     ContentType  @default(VIDEO)
  readTime        Int?         // Estimated minutes
  excerpt         String?      @db.Text
  fullContent     String?      @db.Text
  author          String?

  @@index([contentType])
  @@index([readTime])
}
```

```bash
npx prisma migrate dev --name add-article-support
```

### Step 3: Create Utility Files

**`lib/rss/parser.ts`** - RSS feed parser
```typescript
import Parser from 'rss-parser';

export async function parseRSSFeed(url: string) {
  const parser = new Parser();
  const feed = await parser.parseURL(url);
  return feed;
}
```

**`lib/rss/scraper.ts`** - Article content scraper
```typescript
import { extract } from '@extractus/article-extractor';

export async function scrapeArticle(url: string) {
  const article = await extract(url);
  return article;
}

export function estimateReadTime(content: string): number {
  const wordsPerMinute = 200;
  const words = content.split(/\s+/).length;
  return Math.ceil(words / wordsPerMinute);
}
```

**`lib/rss/paywall-detector.ts`** - Detect paywalls
```typescript
const PAYWALL_DOMAINS = [
  'nytimes.com',
  'wsj.com',
  'ft.com',
  'medium.com/p/', // Medium member-only
];

export function isPaywalled(url: string, content?: string): boolean {
  // Check domain
  if (PAYWALL_DOMAINS.some(domain => url.includes(domain))) {
    return true;
  }

  // Check content length (too short = likely paywalled)
  if (content && content.length < 500) {
    return true;
  }

  return false;
}
```

### Step 4: Update Content Fetcher
```typescript
// lib/content-fetcher.ts (or similar)

async function fetchRSSSource(source: ContentSource) {
  const feed = await parseRSSFeed(source.sourceId); // sourceId = RSS URL

  for (const item of feed.items) {
    // Check if already exists
    const existing = await prisma.contentItem.findUnique({
      where: { sourceType_originalId: { sourceType: 'RSS', originalId: item.link } }
    });

    if (existing) continue;

    // Scrape full article
    let fullContent = null;
    let readTime = null;

    try {
      const article = await scrapeArticle(item.link);

      // Check for paywall
      if (isPaywalled(item.link, article?.content)) {
        console.log(`Skipping paywalled: ${item.title}`);
        continue; // Skip paywalled content
      }

      fullContent = article?.content;
      readTime = article?.content ? estimateReadTime(article.content) : null;
    } catch (error) {
      console.error(`Failed to scrape ${item.link}:`, error);
      // Use RSS excerpt as fallback
    }

    // Create content item
    await prisma.contentItem.create({
      data: {
        sourceType: 'RSS',
        sourceId: source.sourceId,
        originalId: item.link,
        contentType: 'ARTICLE',
        title: item.title,
        description: item.contentSnippet || item.content,
        excerpt: item.contentSnippet?.slice(0, 300),
        fullContent: fullContent,
        url: item.link,
        readTime: readTime,
        author: item.creator || item['dc:creator'],
        publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
        thumbnailUrl: item.enclosure?.url || extractImageFromContent(item.content),
      }
    });
  }
}
```

---

## Phase 2: Frontend Components (Week 2)

### Step 1: Create ArticleCard Component

**`components/feed/article-card.tsx`**
```typescript
'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { FeedItem } from '@/domain/feed/feed-generator';

interface ArticleCardProps {
  item: FeedItem;
  onSave: (id: string) => void;
  onDismiss: (id: string) => void;
  onNotNow: (id: string) => void;
}

export function ArticleCard({ item, onSave, onDismiss, onNotNow }: ArticleCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { content, sourceDisplayName, isNew } = item;

  const handleExpand = () => {
    setIsExpanded(true);
    // TODO: Fetch full content if not already loaded
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
      {/* Collapsed State */}
      {!isExpanded && (
        <>
          {/* Hero Image */}
          {content.thumbnailUrl && (
            <div className="relative aspect-video">
              <Image
                src={content.thumbnailUrl}
                alt={content.title}
                fill
                className="object-cover"
              />
            </div>
          )}

          {/* Content */}
          <div className="p-5">
            <h3 className="text-lg font-semibold mb-2">{content.title}</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-3">
              {content.excerpt}
            </p>

            {/* Metadata */}
            <div className="flex items-center text-sm text-gray-500 mb-4">
              <span>{sourceDisplayName}</span>
              <span className="mx-2">•</span>
              <span>{formatTimeAgo(content.publishedAt)}</span>
              {content.readTime && (
                <>
                  <span className="mx-2">•</span>
                  <span>{content.readTime} min read</span>
                </>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={handleExpand}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
              >
                Read
              </button>
              <button
                onClick={() => onSave(content.id)}
                className="px-4 py-2 border rounded-lg"
              >
                Save
              </button>
              <button
                onClick={() => onNotNow(content.id)}
                className="px-4 py-2 border rounded-lg"
              >
                Not Now
              </button>
              <button
                onClick={() => onDismiss(content.id)}
                className="px-4 py-2 border rounded-lg text-red-600"
              >
                Dismiss
              </button>
            </div>
          </div>
        </>
      )}

      {/* Expanded State */}
      {isExpanded && (
        <div className="p-6">
          <button
            onClick={() => setIsExpanded(false)}
            className="mb-4 text-blue-600 hover:text-blue-700"
          >
            ← Collapse
          </button>

          {/* Article Reader Component */}
          <ArticleReader content={content} />

          <div className="mt-6 flex gap-2">
            <button
              onClick={() => setIsExpanded(false)}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg"
            >
              Continue Scrolling
            </button>
            <button className="px-4 py-2 border rounded-lg">
              More like this 👍
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

### Step 2: Create ArticleReader Component

**`components/feed/article-reader.tsx`**
```typescript
'use client';

import { useEffect, useState } from 'react';

interface ArticleReaderProps {
  content: ContentItem;
}

export function ArticleReader({ content }: ArticleReaderProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Track scroll progress
    const handleScroll = () => {
      const element = document.getElementById(`article-${content.id}`);
      if (!element) return;

      const rect = element.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const elementHeight = element.scrollHeight;
      const scrolled = windowHeight - rect.top;
      const progressPercent = Math.min(100, Math.max(0, (scrolled / elementHeight) * 100));

      setProgress(progressPercent);

      // Save progress to backend
      if (progressPercent > 5) {
        saveReadingProgress(content.id, progressPercent);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [content.id]);

  return (
    <article id={`article-${content.id}`} className="prose dark:prose-invert max-w-none">
      {/* Progress Bar */}
      <div className="sticky top-0 bg-white dark:bg-gray-800 py-2 mb-4 border-b">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>{Math.round(progress)}% complete</span>
          {content.readTime && (
            <span>{Math.ceil(content.readTime * (1 - progress / 100))} min left</span>
          )}
        </div>
        <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* TL;DR (if available) */}
      {content.excerpt && (
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-6">
          <h4 className="font-semibold mb-2">TL;DR</h4>
          <p className="text-sm">{content.excerpt}</p>
        </div>
      )}

      {/* Article Content */}
      <div dangerouslySetInnerHTML={{ __html: content.fullContent || '' }} />
    </article>
  );
}
```

---

## Phase 3: API Routes (Week 2)

### Update Feed Generator
```typescript
// domain/feed/feed-generator.ts

export async function generateFeed(userId: string) {
  // Get user sources (both YouTube and RSS)
  const sources = await prisma.contentSource.findMany({
    where: { userId, isMuted: false }
  });

  // Get content from all source types
  const content = await prisma.contentItem.findMany({
    where: {
      OR: sources.map(s => ({
        sourceType: s.type,
        sourceId: s.sourceId,
      })),
    },
    orderBy: { publishedAt: 'desc' },
    take: 100,
  });

  // Apply filters
  const filtered = applyFilters(content, userFilters);

  // Mix video and article content (50/50)
  const videos = filtered.filter(c => c.contentType === 'VIDEO');
  const articles = filtered.filter(c => c.contentType === 'ARTICLE');

  const feed = interleave(videos, articles); // Alternate video-article-video-article

  return feed;
}

function interleave<T>(arr1: T[], arr2: T[]): T[] {
  const result: T[] = [];
  const maxLength = Math.max(arr1.length, arr2.length);

  for (let i = 0; i < maxLength; i++) {
    if (i < arr1.length) result.push(arr1[i]);
    if (i < arr2.length) result.push(arr2[i]);
  }

  return result;
}
```

---

## Phase 4: Onboarding (Week 3)

### Preset Source Packs
```typescript
// lib/onboarding/preset-sources.ts

export const PRESET_SOURCE_PACKS = {
  'tech-news': [
    { type: 'RSS', sourceId: 'https://arstechnica.com/feed/', displayName: 'Ars Technica' },
    { type: 'RSS', sourceId: 'https://www.theverge.com/rss/index.xml', displayName: 'The Verge' },
    { type: 'YOUTUBE', sourceId: 'UCBJycsmduvYEL83R_U4JriQ', displayName: 'Marques Brownlee' },
  ],
  'science': [
    { type: 'RSS', sourceId: 'https://www.quantamagazine.org/feed/', displayName: 'Quanta Magazine' },
    { type: 'YOUTUBE', sourceId: 'UCHnyfMqiRRG1u-2MsSQLbXA', displayName: 'Veritasium' },
    { type: 'YOUTUBE', sourceId: 'UCsXVk37bltHxD1rDPwtNM8Q', displayName: 'Kurzgesagt' },
  ],
  'general-interest': [
    { type: 'RSS', sourceId: 'https://aeon.co/feed.rss', displayName: 'Aeon' },
    { type: 'RSS', sourceId: 'https://longform.org/feed', displayName: 'Longform' },
  ],
};
```

---

## Testing Checklist

### Week 1: Backend
- [ ] RSS parser works with 5 different feeds
- [ ] Article scraper successfully extracts content
- [ ] Paywall detection correctly identifies paywalled content
- [ ] Read time estimation is reasonable
- [ ] Content saved to database correctly
- [ ] Feed generator mixes videos and articles

### Week 2: Frontend
- [ ] Article cards render correctly
- [ ] Expand/collapse animation is smooth
- [ ] Progress tracking works
- [ ] Actions (save/dismiss) work
- [ ] Mobile responsive (basic)

### Week 3: Integration
- [ ] Onboarding flow works end-to-end
- [ ] Can add RSS sources via UI
- [ ] Feed displays mixed content
- [ ] Filtering works on articles
- [ ] Performance is acceptable (<2s load)

---

## Common Issues & Solutions

### Issue: Article scraper returns null
**Cause:** Site blocks scrapers or requires JavaScript
**Solution:** Fallback to RSS excerpt, log for review

### Issue: Images don't load
**Cause:** CORS or invalid URLs
**Solution:** Proxy images through your backend or use Next.js Image loader

### Issue: Read time way off
**Cause:** Content includes code blocks, lots of whitespace
**Solution:** Clean HTML before counting words

### Issue: Feed feels repetitive
**Cause:** Not enough diversity in algorithm
**Solution:** Implement diversity limits (max 2 from same source in feed)

---

## Resources

- RSS Parser: https://github.com/rbren/rss-parser
- Article Extractor: https://github.com/extractus/article-extractor
- Readability Algorithm: https://github.com/mozilla/readability

---

**Ready to build? Start with Phase 1, Step 1!**
