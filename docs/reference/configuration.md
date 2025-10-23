# Configuration Reference

**Version:** 1.0
**Last Updated:** 2025-10-23

## Environment Variables

HopeScroll uses environment variables for configuration. Create a `.env` file in the project root.

### Required Variables

#### Database

```env
POSTGRES_URL="postgresql://user:password@host:port/database"
```

**Description:** PostgreSQL connection string

**Format:** `postgresql://[user]:[password]@[host]:[port]/[database]?[params]`

**Example:**
```env
# Local development
POSTGRES_URL="postgresql://postgres:password@localhost:5432/hopescroll"

# Vercel Postgres
POSTGRES_URL="postgres://default:xxxxx@xxx.postgres.vercel-storage.com:5432/verceldb"
```

#### Authentication

```env
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"
```

**NEXTAUTH_URL:** Base URL of your application
- Development: `http://localhost:3000`
- Production: `https://yourdomain.com`

**NEXTAUTH_SECRET:** Secret key for JWT signing
- Generate with: `openssl rand -base64 32`
- Must be different between environments
- Keep secure and never commit to git

### Optional Variables

#### YouTube API

```env
YOUTUBE_API_KEY="your-youtube-api-key"
```

**Required for:** YouTube content source
**Get key:** [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
**Quota:** 10,000 units/day (free tier)

#### Twitch API

```env
TWITCH_CLIENT_ID="your-twitch-client-id"
TWITCH_CLIENT_SECRET="your-twitch-client-secret"
```

**Required for:** Twitch content source
**Get credentials:** [Twitch Developer Console](https://dev.twitch.tv/console/apps)

#### Email (Password Reset)

```env
RESEND_API_KEY="re_xxxxxxxxxxxxx"
EMAIL_FROM="noreply@yourdomain.com"
```

**Required for:** Password reset emails
**Service:** [Resend](https://resend.com/)
**Free tier:** 3,000 emails/month

#### Redis (Optional Caching)

```env
UPSTASH_REDIS_REST_URL="https://xxx.upstash.io"
UPSTASH_REDIS_REST_TOKEN="xxxxx"
```

**Required for:** Rate limiting, caching
**Service:** [Upstash Redis](https://upstash.com/)
**Free tier:** 10,000 commands/day

### Development-Only Variables

```env
# Enable debug logging
DEBUG="true"

# Skip email verification (dev only)
SKIP_EMAIL_VERIFICATION="true"
```

---

## Configuration Files

### Next.js Config

**File:** `/next.config.js`

```javascript
module.exports = {
  // Image domains for external images
  images: {
    domains: [
      'i.ytimg.com',           // YouTube thumbnails
      'static-cdn.jtvnw.net',  // Twitch thumbnails
    ],
  },

  // Experimental features
  experimental: {
    serverActions: true,
  },
};
```

### Prisma Config

**File:** `/prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
  binaryTargets = ["native", "debian-openssl-3.0.x"]
  previewFeatures = ["metrics"]
}

datasource db {
  provider = "postgresql"
  url      = env("POSTGRES_URL")
}
```

**Binary targets:** Required for WSL and some hosting platforms
**Preview features:** Enable experimental Prisma features

### Tailwind Config

**File:** `/tailwind.config.ts`

```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Custom colors, fonts, etc.
    },
  },
  plugins: [],
};

export default config;
```

### TypeScript Config

**File:** `/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "preserve",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "allowJs": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "incremental": true,
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
```

**Key settings:**
- `strict: true` - Enables all strict type checking
- `paths` - Allows `@/` imports from root

### Vitest Config

**File:** `/vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: [
        'node_modules/',
        '.next/',
        'tests/',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
```

---

## User Preferences

Stored in `UserPreferences` model (per-user configuration).

### Feed Generation

```typescript
interface FeedPreferences {
  backlogRatio: number;     // 0.0-1.0, default: 0.3
  diversityLimit: number;   // Max items per source, default: 3
}
```

**backlogRatio:** Proportion of older content in feed
- `0.0` - Only newest content
- `0.3` - 30% older content (default)
- `1.0` - Equal mix of old and new

**diversityLimit:** Maximum items per source in one feed
- Prevents single source domination
- Default: 3 items per source

### Duration Filters

```typescript
interface DurationFilters {
  minDuration?: number;  // Minimum seconds
  maxDuration?: number;  // Maximum seconds
}
```

**Example values:**
- Short videos: `maxDuration: 600` (10 minutes)
- Long videos: `minDuration: 1800` (30+ minutes)
- No filter: Both `null`

### UI Preferences

```typescript
interface UIPreferences {
  theme: 'dark' | 'light';           // Default: 'dark'
  density: 'compact' | 'cozy';       // Default: 'cozy'
  autoPlay: boolean;                 // Default: false
}
```

---

## Feature Flags

Currently configured via environment variables. Future: Database-backed feature flags.

```env
# Enable specific features
FEATURE_PODCAST_SUPPORT="true"
FEATURE_COLLABORATIVE_COLLECTIONS="false"
```

---

## Performance Configuration

### Database Connection Pooling

Configure via `POSTGRES_URL` query parameters:

```env
POSTGRES_URL="postgresql://user:pass@host:5432/db?connection_limit=10&pool_timeout=20"
```

**Parameters:**
- `connection_limit` - Max connections (default: 10)
- `pool_timeout` - Connection timeout in seconds

### Caching Strategy

Implemented via Upstash Redis (optional):

- **Content cache:** 5 minutes
- **Feed cache:** 1 minute
- **User session:** 24 hours

---

## Security Configuration

### Password Policy

Configured in code (`/lib/password.ts`):

```typescript
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_REQUIRE_SPECIAL = false;
const PASSWORD_REQUIRE_NUMBER = true;
```

### Rate Limiting

API rate limits (requests per minute):

- **Anonymous:** 20 req/min
- **Authenticated:** 100 req/min
- **Content fetch:** 10 req/min

Configure in `/lib/rate-limit.ts`

### Session Configuration

JWT session settings:

```typescript
session: {
  strategy: 'jwt',
  maxAge: 30 * 24 * 60 * 60, // 30 days
}
```

---

## Deployment Configuration

### Vercel

**Environment variables:** Set in Vercel dashboard

**Build settings:**
- Build command: `npm run build`
- Output directory: `.next`
- Install command: `npm install`

**Auto-deployment:**
- Production: `main` branch
- Preview: All other branches

### Docker (Alternative)

**Dockerfile provided:** See deployment guide

**Environment:** Mount `.env` file or use container environment variables

---

## Troubleshooting

### Database Connection Issues

**Error:** `Can't reach database server`

Check:
1. PostgreSQL is running
2. `POSTGRES_URL` is correct
3. Database exists
4. User has permissions

**Test connection:**
```bash
psql $POSTGRES_URL
```

### Missing API Keys

**Error:** `YouTube API key not configured`

Solution: Add `YOUTUBE_API_KEY` to `.env`

Non-critical: App works without external content sources

### Build Errors

**Error:** `Type error in app/...`

Solution: Run TypeScript check:
```bash
npx tsc --noEmit
```

Fix type errors before deployment.

---

## Related Documentation

- [Getting Started Tutorial](../tutorials/getting-started.md)
- [Deployment Guide](../how-to/deploy.md)
- [Architecture Overview](./architecture.md)
