import { Page, expect } from '@playwright/test';

/**
 * Helper utilities for authentication flows in E2E tests
 */

export interface TestUser {
  email: string;
  password: string;
  name?: string;
}

/**
 * Sign up a new user through the UI
 */
export async function signUpUser(page: Page, user: TestUser): Promise<void> {
  await page.goto('/auth/signup');

  // Fill signup form
  await page.fill('input[name="email"]', user.email);
  await page.fill('input[name="password"]', user.password);
  await page.fill('input[name="confirmPassword"]', user.password);

  // Submit form
  await page.click('button[type="submit"]');

  // Wait for success (redirect or message)
  await page.waitForURL(/\/auth\/verify-email|\/scroll/, { timeout: 10000 });
}

/**
 * Log in an existing user through the UI
 */
export async function loginUser(page: Page, user: TestUser): Promise<void> {
  await page.goto('/auth/login');

  // Fill login form
  await page.fill('input[name="email"]', user.email);
  await page.fill('input[name="password"]', user.password);

  // Submit form
  await page.click('button[type="submit"]');

  // Wait for redirect to authenticated page
  await page.waitForURL(/\/scroll|\/sources|\/watch/, { timeout: 10000 });
}

/**
 * Log out the current user
 */
export async function logoutUser(page: Page): Promise<void> {
  // Click user menu or logout button (adjust selector based on your UI)
  await page.click('[data-testid="user-menu"]').catch(() => {
    // If no user menu, try direct logout button
    return page.click('button:has-text("Log out")');
  });

  await page.click('button:has-text("Log out")').catch(() => {
    // Logout button might be in the menu
  });

  // Wait for redirect to login page
  await page.waitForURL(/\/auth\/login/, { timeout: 5000 });
}

/**
 * Create a test user with a unique email
 */
export function createTestUser(suffix?: string): TestUser {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  const uniqueSuffix = suffix || `${timestamp}-${random}`;

  return {
    email: `test-${uniqueSuffix}@hopescroll-test.com`,
    password: 'TestPassword123!',
    name: `Test User ${uniqueSuffix}`,
  };
}

/**
 * Ensure user is logged in (login if not already)
 */
export async function ensureLoggedIn(page: Page, user: TestUser): Promise<void> {
  // Check if already logged in by looking for authenticated content
  const isLoggedIn = await page
    .locator('[data-testid="user-menu"], nav a[href="/sources"]')
    .count()
    .then((count) => count > 0);

  if (!isLoggedIn) {
    await loginUser(page, user);
  }
}
