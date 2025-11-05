import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';

// Load test environment variables for database helpers
dotenv.config({ path: '.env.test' });

/**
 * Playwright Configuration for Production Performance Testing
 *
 * This config is specifically for testing performance and responsiveness
 * with a production build and production database.
 *
 * Key differences from dev config:
 * - Uses production build (npm run build && npm run start)
 * - Connects to production database (or production-like DB)
 * - More realistic performance measurements
 * - Tests across multiple devices and viewports
 *
 * Usage:
 *   npm run build
 *   npm run test:e2e:production
 */
export default defineConfig({
  // Test directory - same as dev
  testDir: './tests/e2e',

  // Only run performance and responsiveness tests
  testMatch: ['**/performance.spec.ts', '**/responsiveness.spec.ts'],

  // Longer timeout for production tests (build time included)
  timeout: 60000,

  // Expect timeout for assertions
  expect: {
    timeout: 10000, // Longer for production
  },

  // Run tests in parallel
  fullyParallel: true,

  // Retry failed tests
  retries: process.env.CI ? 2 : 1,

  // Workers
  workers: process.env.CI ? 1 : 2,

  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'playwright-report-production', open: 'never' }],
    ['json', { outputFile: 'playwright-report-production/results.json' }],
    ['list'],
  ],

  // Shared test configuration
  use: {
    // Base URL for production tests
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',

    // Screenshots on failure
    screenshot: 'only-on-failure',

    // Video on failure
    video: 'retain-on-failure',

    // Trace on first retry
    trace: 'on-first-retry',

    // Set production-like conditions
    navigationTimeout: 30000,
    actionTimeout: 10000,
  },

  // Test multiple devices for responsiveness
  projects: [
    // Desktop browsers
    {
      name: 'chromium-desktop',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox-desktop',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit-desktop',
      use: { ...devices['Desktop Safari'] },
    },

    // Mobile devices
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] },
    },

    // Tablet devices
    {
      name: 'tablet-ipad',
      use: { ...devices['iPad (gen 7)'] },
    },
  ],

  // Web server configuration for production build with test database
  // Note: This starts the server with .env.test to use the test database
  // Run: npm run build && npm run test:e2e:production
  webServer: process.env.SKIP_WEBSERVER
    ? undefined
    : {
        command: 'npm run start:test',
        url: 'http://localhost:3000',
        reuseExistingServer: true,
        timeout: 120000,
      },

  // Output directory
  outputDir: 'test-results-production',
});
