// Application Configuration
// Centralized configuration following the architecture document

export const CONFIG = {
  feed: {
    defaultBacklogRatio: 0.3,
    maxConsecutiveFromSource: 3,
    cacheTimeSeconds: 300,
    maxItemsInFeed: 200,
    notNowReturnAfterItems: 50,
  },

  content: {
    fetchIntervalMinutes: 30,
    fetchRecentDays: 7,
    backlogBatchSize: 200, // Fetch 200 videos initially (4 pages of 50)
    dailyBacklogLimit: 100, // Incremental backlog: 100 videos/channel/day
    maxBacklogDepth: 500,
    deduplicationWindowDays: 90,
  },

  filtering: {
    defaultKeywordMode: 'whole-word' as const,
    caseSensitive: false,
  },

  rateLimit: {
    youtube: {
      requestsPerMinute: 100,
      dailyQuota: 10000,
    },
    twitch: {
      requestsPerMinute: 800,
    },
  },

  ui: {
    defaultTheme: 'dark' as const,
    defaultDensity: 'cozy' as const,
    contentCardImageRatio: 16 / 9,
  },
} as const;

// Environment variables with validation
export const ENV = {
  // Database
  databaseUrl: process.env.POSTGRES_URL || '',

  // Redis Cache (Upstash)
  redisUrl: process.env.UPSTASH_REDIS_REST_URL || process.env.UPSTASH_REDIS_URL || '',
  redisToken: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.UPSTASH_REDIS_TOKEN || '',

  // Vercel Blob Storage
  blobToken: process.env.BLOB_READ_WRITE_TOKEN || '',

  // External Content APIs
  youtubeApiKey: process.env.YOUTUBE_API_KEY || '',
  ytDlpServiceUrl: process.env.YOUTUBE_DLP_SERVICE_URL || '',
  twitchClientId: process.env.TWITCH_CLIENT_ID || '',
  twitchClientSecret: process.env.TWITCH_CLIENT_SECRET || '',

  // Authentication
  nextAuthSecret: process.env.NEXTAUTH_SECRET || '',
  nextAuthUrl: process.env.NEXTAUTH_URL || 'http://localhost:3000',

  // Background Jobs Security
  cronSecret: process.env.CRON_SECRET || '',

  // Logging
  logLevel: (process.env.LOG_LEVEL || 'info') as 'debug' | 'info' | 'warn' | 'error',

  // Feature Flags
  enableUsageTracking: process.env.ENABLE_USAGE_TRACKING === 'true',
  enablePaletteCleanser: process.env.ENABLE_PALETTE_CLEANSER === 'true',
  useYtDlp: process.env.USE_YT_DLP === 'true', // Use yt-dlp instead of YouTube API

  // Node environment
  nodeEnv: process.env.NODE_ENV || 'development',
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
} as const;

// Validate critical environment variables
export function validateEnv(): void {
  const requiredVars = [
    'POSTGRES_URL',
    'NEXTAUTH_SECRET',
  ];

  const missing = requiredVars.filter(
    (varName) => !process.env[varName]
  );

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    );
  }
}
