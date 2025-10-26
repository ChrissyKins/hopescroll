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
    teardownTimeout: 10000, // 10 seconds for cleanup
    // Limit parallelism to avoid database connection pool exhaustion
    maxConcurrency: 1, // Run tests sequentially within each file
    fileParallelism: false, // Run test FILES sequentially (not in parallel)
    poolOptions: {
      threads: {
        maxThreads: 1, // Only 1 worker thread - forces sequential file execution
        minThreads: 1,
      },
      forks: {
        maxForks: 1, // Only 1 fork - forces sequential file execution
        minForks: 1,
      },
    },
    // Force exit after tests complete to prevent hanging
    // This ensures that any lingering connections don't block the process
    pool: 'forks', // Use forks instead of threads for better isolation
    isolate: true, // Isolate test environments
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
