import { test, expect, Page } from '@playwright/test';
import { createVerifiedUser, cleanupTestUser } from './helpers/db-helpers';

/**
 * E2E Performance Test Suite
 *
 * Tests page responsiveness and load times using production build.
 *
 * Metrics measured:
 * - Time to First Byte (TTFB)
 * - First Contentful Paint (FCP)
 * - Largest Contentful Paint (LCP)
 * - Total load time
 * - DOM content loaded time
 *
 * Pages tested:
 * - Login page (public)
 * - Watch page (authenticated, main feed)
 * - Sources page (authenticated)
 * - Saved content page (authenticated)
 * - Filters page (authenticated)
 */

interface PerformanceMetrics {
  ttfb: number;
  fcp: number;
  lcp: number;
  domContentLoaded: number;
  loadComplete: number;
}

/**
 * Collect performance metrics from the page
 */
async function collectPerformanceMetrics(page: Page): Promise<PerformanceMetrics> {
  const metrics = await page.evaluate(() => {
    const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const paintEntries = performance.getEntriesByType('paint');

    // Find FCP and LCP
    const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0;

    // LCP observer
    let lcp = 0;
    try {
      const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
      if (lcpEntries.length > 0) {
        lcp = lcpEntries[lcpEntries.length - 1].startTime;
      }
    } catch (e) {
      // LCP might not be available
    }

    return {
      ttfb: perfData.responseStart - perfData.requestStart,
      fcp: fcp,
      lcp: lcp,
      domContentLoaded: perfData.domContentLoadedEventEnd - perfData.fetchStart,
      loadComplete: perfData.loadEventEnd - perfData.fetchStart,
    };
  });

  return metrics;
}

/**
 * Log performance metrics for debugging
 */
function logMetrics(pageName: string, metrics: PerformanceMetrics) {
  console.log(`\n📊 Performance Metrics for ${pageName}:`);
  console.log(`   TTFB: ${metrics.ttfb.toFixed(2)}ms`);
  console.log(`   FCP: ${metrics.fcp.toFixed(2)}ms`);
  console.log(`   LCP: ${metrics.lcp > 0 ? metrics.lcp.toFixed(2) + 'ms' : 'N/A'}`);
  console.log(`   DOM Content Loaded: ${metrics.domContentLoaded.toFixed(2)}ms`);
  console.log(`   Load Complete: ${metrics.loadComplete.toFixed(2)}ms\n`);
}

/**
 * Performance thresholds (in milliseconds)
 * Based on Core Web Vitals and best practices
 */
const THRESHOLDS = {
  ttfb: 800,           // Time to First Byte should be < 800ms
  fcp: 1800,           // First Contentful Paint should be < 1.8s
  lcp: 2500,           // Largest Contentful Paint should be < 2.5s (Core Web Vital)
  domContentLoaded: 3000,  // DOM should be ready within 3s
  loadComplete: 5000,  // Full page load within 5s
};

test.describe('Performance Tests - Public Pages', () => {
  test('login page should load quickly', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/login', { waitUntil: 'load' });

    const loadTime = Date.now() - startTime;
    const metrics = await collectPerformanceMetrics(page);

    logMetrics('Login Page', metrics);

    // Assertions
    expect(metrics.ttfb).toBeLessThan(THRESHOLDS.ttfb);
    expect(metrics.fcp).toBeLessThan(THRESHOLDS.fcp);
    expect(metrics.domContentLoaded).toBeLessThan(THRESHOLDS.domContentLoaded);
    expect(metrics.loadComplete).toBeLessThan(THRESHOLDS.loadComplete);

    // Visual check - page should be interactive
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('landing page (/) should load quickly', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/', { waitUntil: 'load' });

    const loadTime = Date.now() - startTime;
    const metrics = await collectPerformanceMetrics(page);

    logMetrics('Landing Page', metrics);

    // Assertions
    expect(metrics.ttfb).toBeLessThan(THRESHOLDS.ttfb);
    expect(metrics.fcp).toBeLessThan(THRESHOLDS.fcp);
    expect(metrics.domContentLoaded).toBeLessThan(THRESHOLDS.domContentLoaded);
  });
});

test.describe('Performance Tests - Authenticated Pages', () => {
  const testEmail = `perf-test-${Date.now()}@hopescroll-test.com`;
  const testPassword = 'TestPassword123!';

  test.beforeAll(async () => {
    await createVerifiedUser(testEmail, testPassword);
  });

  test.afterAll(async () => {
    await cleanupTestUser(testEmail);
  });

  // Login helper
  async function login(page: Page) {
    await page.goto('/login');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]:has-text("Sign In")');
    await page.waitForURL(/\/watch/, { timeout: 10000 });
  }

  test('watch page should load quickly', async ({ page }) => {
    await login(page);

    const startTime = Date.now();
    await page.goto('/watch', { waitUntil: 'load' });
    const loadTime = Date.now() - startTime;

    const metrics = await collectPerformanceMetrics(page);
    logMetrics('Watch Page', metrics);

    // Assertions
    expect(metrics.ttfb).toBeLessThan(THRESHOLDS.ttfb);
    expect(metrics.fcp).toBeLessThan(THRESHOLDS.fcp);
    expect(metrics.domContentLoaded).toBeLessThan(THRESHOLDS.domContentLoaded * 1.5); // Allow more time for feed

    // Visual check - navigation should be visible
    await expect(page.locator('nav')).toBeVisible();
  });

  test('sources page should load quickly', async ({ page }) => {
    await login(page);

    const startTime = Date.now();
    await page.goto('/sources', { waitUntil: 'load' });
    const loadTime = Date.now() - startTime;

    const metrics = await collectPerformanceMetrics(page);
    logMetrics('Sources Page', metrics);

    // Assertions
    expect(metrics.ttfb).toBeLessThan(THRESHOLDS.ttfb);
    expect(metrics.fcp).toBeLessThan(THRESHOLDS.fcp);
    expect(metrics.domContentLoaded).toBeLessThan(THRESHOLDS.domContentLoaded);

    // Visual check
    await expect(page.locator('nav')).toBeVisible();
  });

  test('scroll (saved content) page should load quickly', async ({ page }) => {
    await login(page);

    const startTime = Date.now();
    await page.goto('/scroll', { waitUntil: 'load' });
    const loadTime = Date.now() - startTime;

    const metrics = await collectPerformanceMetrics(page);
    logMetrics('Scroll Page', metrics);

    // Assertions
    expect(metrics.ttfb).toBeLessThan(THRESHOLDS.ttfb);
    expect(metrics.fcp).toBeLessThan(THRESHOLDS.fcp);
    expect(metrics.domContentLoaded).toBeLessThan(THRESHOLDS.domContentLoaded * 1.5); // Allow more time for feed

    // Visual check
    await expect(page.locator('nav')).toBeVisible();
  });

  test('filters page should load quickly', async ({ page }) => {
    await login(page);

    const startTime = Date.now();
    await page.goto('/filters', { waitUntil: 'load' });
    const loadTime = Date.now() - startTime;

    const metrics = await collectPerformanceMetrics(page);
    logMetrics('Filters Page', metrics);

    // Assertions
    expect(metrics.ttfb).toBeLessThan(THRESHOLDS.ttfb);
    expect(metrics.fcp).toBeLessThan(THRESHOLDS.fcp);
    expect(metrics.domContentLoaded).toBeLessThan(THRESHOLDS.domContentLoaded);

    // Visual check
    await expect(page.locator('nav')).toBeVisible();
  });

  test('collections page should load quickly', async ({ page }) => {
    await login(page);

    const startTime = Date.now();
    await page.goto('/collections', { waitUntil: 'load' });
    const loadTime = Date.now() - startTime;

    const metrics = await collectPerformanceMetrics(page);
    logMetrics('Collections Page', metrics);

    // Assertions
    expect(metrics.ttfb).toBeLessThan(THRESHOLDS.ttfb);
    expect(metrics.fcp).toBeLessThan(THRESHOLDS.fcp);
    expect(metrics.domContentLoaded).toBeLessThan(THRESHOLDS.domContentLoaded);

    // Visual check
    await expect(page.locator('nav')).toBeVisible();
  });
});

test.describe('Performance Tests - Page Navigation', () => {
  const testEmail = `perf-nav-${Date.now()}@hopescroll-test.com`;
  const testPassword = 'TestPassword123!';

  test.beforeAll(async () => {
    await createVerifiedUser(testEmail, testPassword);
  });

  test.afterAll(async () => {
    await cleanupTestUser(testEmail);
  });

  async function login(page: Page) {
    await page.goto('/login');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]:has-text("Sign In")');
    await page.waitForURL(/\/watch/, { timeout: 10000 });
  }

  test('navigation between pages should be fast (client-side routing)', async ({ page }) => {
    await login(page);

    // Test navigation performance
    const routes = ['/sources', '/scroll', '/filters', '/collections', '/watch'];
    const navigationTimes: { [key: string]: number } = {};

    for (const route of routes) {
      const startTime = Date.now();
      await page.click(`a[href="${route}"]`);
      await page.waitForURL(route);
      const navTime = Date.now() - startTime;

      navigationTimes[route] = navTime;
      console.log(`   Navigation to ${route}: ${navTime}ms`);

      // Client-side navigation should be very fast
      expect(navTime).toBeLessThan(1000); // < 1 second for client-side nav
    }
  });

  test('page should remain responsive during interactions', async ({ page }) => {
    await login(page);
    await page.goto('/watch');

    // Test button click responsiveness
    const startTime = Date.now();

    // Navigate to sources
    await page.click('a[href="/sources"]');
    await page.waitForURL('/sources');

    const responseTime = Date.now() - startTime;
    console.log(`   Button response time: ${responseTime}ms`);

    // Should respond within reasonable time
    expect(responseTime).toBeLessThan(2000);
  });
});

test.describe('Performance Tests - Bundle Size & Resources', () => {
  test('should not load excessive JavaScript', async ({ page }) => {
    // Monitor network requests
    const jsRequests: any[] = [];

    page.on('response', (response) => {
      const url = response.url();
      if (url.endsWith('.js') && response.status() === 200) {
        jsRequests.push({
          url,
          headers: response.headers(),
        });
      }
    });

    await page.goto('/login', { waitUntil: 'networkidle' });

    console.log(`   Total JS files loaded: ${jsRequests.length}`);

    // Should have reasonable number of JS files (Next.js chunks)
    expect(jsRequests.length).toBeLessThan(50); // Reasonable limit
  });

  test('should load critical CSS quickly', async ({ page }) => {
    const cssRequests: any[] = [];

    page.on('response', (response) => {
      const url = response.url();
      if (url.endsWith('.css') && response.status() === 200) {
        cssRequests.push({
          url,
          size: response.headers()['content-length'],
        });
      }
    });

    await page.goto('/login', { waitUntil: 'networkidle' });

    console.log(`   Total CSS files loaded: ${cssRequests.length}`);

    // Should have reasonable number of CSS files
    expect(cssRequests.length).toBeLessThan(20);
  });
});
