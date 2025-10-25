import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    // Increase timeouts for integration tests with database
    testTimeout: 30000, // 30 seconds per test
    hookTimeout: 30000, // 30 seconds for beforeEach/afterEach hooks
    // Limit parallelism to avoid database connection pool exhaustion
    maxConcurrency: 1, // Run tests sequentially within each file
    poolOptions: {
      threads: {
        maxThreads: 2, // Limit number of worker threads
        minThreads: 1,
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'tests/**',
        '*.config.{js,ts}',
        '.next/**',
        'docs/**',
        'prisma/**',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
