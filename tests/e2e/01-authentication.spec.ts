import { test, expect } from '@playwright/test';
import { cleanupTestUser, createVerifiedUser } from './helpers/db-helpers';

/**
 * E2E Test Suite: User Authentication Flow
 *
 * Critical user journey:
 * 1. User signs up with email/password
 * 2. User logs in with credentials
 * 3. User is redirected to the watch page
 * 4. User can log out
 *
 * Note: Email verification is skipped in these tests as it requires
 * external email service integration. We create verified users directly.
 */

test.describe('Authentication Flow', () => {
  const testEmail = `e2e-auth-${Date.now()}@hopescroll-test.com`;
  const testPassword = 'TestPassword123!';

  // Cleanup after all tests
  test.afterAll(async () => {
    await cleanupTestUser(testEmail);
  });

  test('should allow user to sign up with valid credentials', async ({ page }) => {
    // Navigate to login page
    await page.goto('/login');

    // Switch to sign up mode
    await page.click('button:has-text("Don\'t have an account? Sign up")');

    // Verify sign up form is shown
    await expect(page.locator('h2:has-text("Create your account")')).toBeVisible();

    // Fill in sign up form
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.fill('input[name="confirmPassword"]', testPassword);

    // Submit form
    await page.click('button[type="submit"]:has-text("Sign Up")');

    // Wait for redirect to watch page (successful signup + auto-login)
    await page.waitForURL(/\/watch/, { timeout: 10000 });

    // Verify we're logged in (check for navigation)
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();
  });

  test('should show error for mismatched passwords during signup', async ({ page }) => {
    const uniqueEmail = `e2e-mismatch-${Date.now()}@hopescroll-test.com`;

    await page.goto('/login');
    await page.click('button:has-text("Don\'t have an account? Sign up")');

    await page.fill('input[name="email"]', uniqueEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.fill('input[name="confirmPassword"]', 'DifferentPassword123!');

    await page.click('button[type="submit"]:has-text("Sign Up")');

    // Verify error message
    await expect(page.locator('text=Passwords do not match')).toBeVisible();

    // Cleanup
    await cleanupTestUser(uniqueEmail);
  });

  test('should show error for short password during signup', async ({ page }) => {
    const uniqueEmail = `e2e-short-${Date.now()}@hopescroll-test.com`;

    await page.goto('/login');
    await page.click('button:has-text("Don\'t have an account? Sign up")');

    await page.fill('input[name="email"]', uniqueEmail);
    await page.fill('input[name="password"]', 'short');
    await page.fill('input[name="confirmPassword"]', 'short');

    await page.click('button[type="submit"]:has-text("Sign Up")');

    // Verify error message
    await expect(
      page.locator('text=Password must be at least 8 characters')
    ).toBeVisible();

    // Cleanup
    await cleanupTestUser(uniqueEmail);
  });

  test('should allow existing user to log in', async ({ page }) => {
    // Create a verified user directly in DB (bypass email verification)
    const loginEmail = `e2e-login-${Date.now()}@hopescroll-test.com`;
    await createVerifiedUser(loginEmail, testPassword);

    // Navigate to login page
    await page.goto('/login');

    // Verify we're on login mode by default
    await expect(page.locator('h2:has-text("Sign in to your account")')).toBeVisible();

    // Fill in login form
    await page.fill('input[name="email"]', loginEmail);
    await page.fill('input[name="password"]', testPassword);

    // Submit form
    await page.click('button[type="submit"]:has-text("Sign In")');

    // Wait for redirect to watch page
    await page.waitForURL(/\/watch/, { timeout: 10000 });

    // Verify we're logged in
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();

    // Cleanup
    await cleanupTestUser(loginEmail);
  });

  test('should show error for invalid credentials during login', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[name="email"]', 'nonexistent@example.com');
    await page.fill('input[name="password"]', 'WrongPassword123!');

    await page.click('button[type="submit"]:has-text("Sign In")');

    // Verify error message
    await expect(page.locator('text=Invalid email or password')).toBeVisible();

    // Should still be on login page
    await expect(page).toHaveURL(/\/login/);
  });

  test('should show error for duplicate email during signup', async ({ page }) => {
    // Create a user first
    const duplicateEmail = `e2e-duplicate-${Date.now()}@hopescroll-test.com`;
    await createVerifiedUser(duplicateEmail, testPassword);

    // Try to sign up with same email
    await page.goto('/login');
    await page.click('button:has-text("Don\'t have an account? Sign up")');

    await page.fill('input[name="email"]', duplicateEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.fill('input[name="confirmPassword"]', testPassword);

    await page.click('button[type="submit"]:has-text("Sign Up")');

    // Verify error message (exact wording may vary)
    await expect(
      page.locator('div:has-text("email"), div:has-text("exists"), div:has-text("already")')
    ).toBeVisible({ timeout: 5000 });

    // Cleanup
    await cleanupTestUser(duplicateEmail);
  });

  test('should toggle between sign up and sign in modes', async ({ page }) => {
    await page.goto('/login');

    // Initially on sign in
    await expect(page.locator('h2:has-text("Sign in to your account")')).toBeVisible();
    await expect(page.locator('input[name="confirmPassword"]')).not.toBeVisible();

    // Switch to sign up
    await page.click('button:has-text("Don\'t have an account? Sign up")');
    await expect(page.locator('h2:has-text("Create your account")')).toBeVisible();
    await expect(page.locator('input[name="confirmPassword"]')).toBeVisible();

    // Switch back to sign in
    await page.click('button:has-text("Already have an account? Sign in")');
    await expect(page.locator('h2:has-text("Sign in to your account")')).toBeVisible();
    await expect(page.locator('input[name="confirmPassword"]')).not.toBeVisible();
  });

  test('should validate email format', async ({ page }) => {
    await page.goto('/login');

    // Try invalid email
    await page.fill('input[name="email"]', 'not-an-email');
    await page.fill('input[name="password"]', testPassword);

    // HTML5 validation should prevent submission
    const emailInput = page.locator('input[name="email"]');
    const validationMessage = await emailInput.evaluate(
      (el: HTMLInputElement) => el.validationMessage
    );

    expect(validationMessage).toBeTruthy();
  });
});

test.describe('Authentication State Persistence', () => {
  let verifiedEmail: string;

  test.beforeAll(async () => {
    verifiedEmail = `e2e-persist-${Date.now()}@hopescroll-test.com`;
    await createVerifiedUser(verifiedEmail, 'TestPassword123!');
  });

  test.afterAll(async () => {
    await cleanupTestUser(verifiedEmail);
  });

  test('should persist login across page navigations', async ({ page }) => {
    // Log in
    await page.goto('/login');
    await page.fill('input[name="email"]', verifiedEmail);
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]:has-text("Sign In")');

    await page.waitForURL(/\/watch/, { timeout: 10000 });

    // Navigate to different pages
    await page.goto('/sources');
    await expect(page.locator('nav')).toBeVisible();

    await page.goto('/scroll');
    await expect(page.locator('nav')).toBeVisible();

    await page.goto('/filters');
    await expect(page.locator('nav')).toBeVisible();

    // Should still be logged in on all pages
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('should redirect to login when accessing protected pages while logged out', async ({
    page,
  }) => {
    // Try to access protected page without login
    await page.goto('/sources');

    // Should redirect to login (or show login prompt)
    await page.waitForURL(/\/login/, { timeout: 10000 });
  });
});
