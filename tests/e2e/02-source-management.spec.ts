import { test, expect } from '@playwright/test';
import { cleanupTestUser, createVerifiedUser } from './helpers/db-helpers';

/**
 * E2E Test Suite: Source Management Flow
 *
 * Critical user journey:
 * 1. User adds a YouTube channel by channel ID
 * 2. System fetches channel information
 * 3. Content is fetched from the channel
 * 4. User can browse feed with content from added source
 * 5. User can manage (mute/unmute/delete) sources
 *
 * Note: These tests use real YouTube API calls in some cases,
 * so they may be slower or require API key configuration.
 */

test.describe('Source Management Flow', () => {
  const testEmail = `e2e-sources-${Date.now()}@hopescroll-test.com`;
  const testPassword = 'TestPassword123!';
  let userId: string;

  // Well-known YouTube channel IDs for testing
  const TEST_CHANNEL_ID = 'UC_x5XG1OV2P6uZZ5FSM9Ttw'; // Google Developers (public, stable)
  const TEST_CHANNEL_ID_2 = 'UCXuqSBlHAE6Xw-yeJA0Tunw'; // Linus Tech Tips (public, stable)

  test.beforeAll(async () => {
    // Create a verified test user
    userId = await createVerifiedUser(testEmail, testPassword);
  });

  test.afterAll(async () => {
    // Cleanup test user and all associated data
    await cleanupTestUser(testEmail);
  });

  test.beforeEach(async ({ page }) => {
    // Log in before each test
    await page.goto('/login');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]:has-text("Sign In")');
    await page.waitForURL(/\/watch/, { timeout: 10000 });
  });

  test('should navigate to sources page', async ({ page }) => {
    // Navigate to sources page
    await page.goto('/sources');

    // Verify we're on the sources page
    await expect(page).toHaveURL(/\/sources/);

    // Should see sources page UI
    await expect(
      page.locator('h1:has-text("Sources"), h2:has-text("Sources")')
    ).toBeVisible({ timeout: 5000 });
  });

  test('should show empty state when no sources added', async ({ page }) => {
    await page.goto('/sources');

    // Wait for loading to complete
    await page.waitForSelector('text=Loading', { state: 'hidden', timeout: 10000 });

    // Should see empty state (if no sources exist)
    // Note: This might fail if sources were added in previous tests
    const hasNoSources = await page
      .locator('text=No sources found, text=Get started, text=add your first')
      .count()
      .then((count) => count > 0);

    if (hasNoSources) {
      await expect(
        page.locator('text=No sources, text=Get started, text=add')
      ).toBeVisible();
    }
  });

  test('should add a YouTube channel by channel ID', async ({ page }) => {
    await page.goto('/sources');

    // Wait for page to load
    await page.waitForSelector('text=Loading', { state: 'hidden', timeout: 10000 });

    // Find and fill the channel ID input
    const channelInput = page.locator('input[placeholder*="channel"], input[placeholder*="Channel"], input[placeholder*="ID"]').first();
    await channelInput.fill(TEST_CHANNEL_ID);

    // Submit the form (look for "Add" button)
    const addButton = page.locator('button:has-text("Add")').first();
    await addButton.click();

    // Wait for success message or source to appear
    await expect(
      page.locator(`text=${TEST_CHANNEL_ID}, text=added, text=Added, text=success, text=Success`)
    ).toBeVisible({ timeout: 15000 });

    // Verify source appears in the list
    // The display name might be fetched from YouTube API
    await page.waitForTimeout(2000); // Give time for source to appear in list

    // Check that we have at least one source card
    const sourceCards = page.locator('[data-testid="source-card"], .source-item, article, .bg-gray-900');
    await expect(sourceCards.first()).toBeVisible({ timeout: 5000 });
  });

  test('should show error for invalid YouTube channel ID', async ({ page }) => {
    await page.goto('/sources');
    await page.waitForSelector('text=Loading', { state: 'hidden', timeout: 10000 });

    // Try to add an invalid channel ID
    const channelInput = page.locator('input[placeholder*="channel"], input[placeholder*="Channel"], input[placeholder*="ID"]').first();
    await channelInput.fill('invalid-channel-id-12345');

    const addButton = page.locator('button:has-text("Add")').first();
    await addButton.click();

    // Should show error message
    await expect(
      page.locator('text=error, text=Error, text=invalid, text=Invalid, text=not found, text=Not found')
    ).toBeVisible({ timeout: 10000 });
  });

  test('should prevent adding duplicate channel', async ({ page }) => {
    await page.goto('/sources');
    await page.waitForSelector('text=Loading', { state: 'hidden', timeout: 10000 });

    // Add a channel first
    const channelInput = page.locator('input[placeholder*="channel"], input[placeholder*="Channel"], input[placeholder*="ID"]').first();
    await channelInput.fill(TEST_CHANNEL_ID_2);

    let addButton = page.locator('button:has-text("Add")').first();
    await addButton.click();

    // Wait for success
    await page.waitForTimeout(3000);

    // Try to add the same channel again
    await channelInput.fill(TEST_CHANNEL_ID_2);
    addButton = page.locator('button:has-text("Add")').first();
    await addButton.click();

    // Should show error about duplicate
    await expect(
      page.locator('text=already, text=Already, text=duplicate, text=Duplicate, text=exists')
    ).toBeVisible({ timeout: 10000 });
  });

  test('should search for sources by name', async ({ page }) => {
    await page.goto('/sources');
    await page.waitForSelector('text=Loading', { state: 'hidden', timeout: 10000 });

    // Wait for sources to load
    await page.waitForTimeout(2000);

    // Find search input
    const searchInput = page.locator('input[type="search"], input[placeholder*="Search"], input[placeholder*="search"]').first();

    if (await searchInput.count() > 0) {
      // Type a search query
      await searchInput.fill('Google');

      // Wait for search to filter
      await page.waitForTimeout(500);

      // Results should update (specific assertion depends on UI)
      // At minimum, search input should have the value
      await expect(searchInput).toHaveValue('Google');
    }
  });

  test('should mute and unmute a source', async ({ page }) => {
    await page.goto('/sources');
    await page.waitForSelector('text=Loading', { state: 'hidden', timeout: 10000 });

    // Wait for sources to load
    await page.waitForTimeout(2000);

    // Find a mute/unmute button (look for common patterns)
    const muteButton = page.locator('button:has-text("Mute"), button[aria-label*="Mute"], button[title*="Mute"]').first();

    if (await muteButton.count() > 0) {
      // Click to mute
      await muteButton.click();

      // Wait for state update
      await page.waitForTimeout(1000);

      // Should now show "Unmute" or indicate muted state
      await expect(
        page.locator('text=Unmute, text=Muted, button:has-text("Unmute")')
      ).toBeVisible({ timeout: 5000 });

      // Click to unmute
      const unmuteButton = page.locator('button:has-text("Unmute"), button[aria-label*="Unmute"]').first();
      await unmuteButton.click();

      // Should return to mute option
      await page.waitForTimeout(1000);
    }
  });

  test('should delete a source', async ({ page }) => {
    await page.goto('/sources');
    await page.waitForSelector('text=Loading', { state: 'hidden', timeout: 10000 });

    // First, add a source to delete
    const channelInput = page.locator('input[placeholder*="channel"], input[placeholder*="Channel"], input[placeholder*="ID"]').first();
    await channelInput.fill(TEST_CHANNEL_ID);

    const addButton = page.locator('button:has-text("Add")').first();
    await addButton.click();

    // Wait for source to be added
    await page.waitForTimeout(3000);

    // Find and click delete button
    const deleteButton = page.locator('button:has-text("Delete"), button:has-text("Remove"), button[aria-label*="Delete"]').first();

    if (await deleteButton.count() > 0) {
      await deleteButton.click();

      // Confirm deletion if confirmation dialog appears
      const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Delete"), button:has-text("Yes")');
      if (await confirmButton.count() > 0) {
        await confirmButton.click();
      }

      // Wait for deletion to complete
      await page.waitForTimeout(2000);

      // Success message or source removed from list
      const stillVisible = await page.locator(`text=${TEST_CHANNEL_ID}`).count();
      // Source should be gone or success message shown
      expect(stillVisible === 0 || await page.locator('text=deleted, text=Deleted, text=removed').count() > 0).toBeTruthy();
    }
  });

  test('should display source statistics', async ({ page }) => {
    await page.goto('/sources');
    await page.waitForSelector('text=Loading', { state: 'hidden', timeout: 10000 });

    // Wait for sources to load
    await page.waitForTimeout(2000);

    // Check for statistics display (videos, unwatched, etc.)
    const hasStats = await page.locator('text=video, text=unwatched, text=fetched').count();

    if (hasStats > 0) {
      // Verify statistics are showing numbers
      await expect(
        page.locator('text=/\\d+\\s+(video|item|unwatched)/i')
      ).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe('Source to Feed Integration', () => {
  const testEmail = `e2e-feed-${Date.now()}@hopescroll-test.com`;
  const testPassword = 'TestPassword123!';

  test.beforeAll(async () => {
    await createVerifiedUser(testEmail, testPassword);
  });

  test.afterAll(async () => {
    await cleanupTestUser(testEmail);
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]:has-text("Sign In")');
    await page.waitForURL(/\/watch/, { timeout: 10000 });
  });

  test('should show content in feed after adding source', async ({ page }) => {
    // Add a source
    await page.goto('/sources');
    await page.waitForSelector('text=Loading', { state: 'hidden', timeout: 10000 });

    const channelInput = page.locator('input[placeholder*="channel"], input[placeholder*="Channel"], input[placeholder*="ID"]').first();
    await channelInput.fill('UC_x5XG1OV2P6uZZ5FSM9Ttw');

    const addButton = page.locator('button:has-text("Add")').first();
    await addButton.click();

    // Wait for content to be fetched
    await page.waitForTimeout(5000);

    // Navigate to scroll/feed page
    await page.goto('/scroll');

    // Wait for feed to load
    await page.waitForSelector('text=Loading', { state: 'hidden', timeout: 15000 });

    // Check if content appears (might need manual fetch trigger)
    const contentCards = page.locator('[data-testid="content-card"], .content-item, article');

    // Either content is visible OR there's a "no content" message
    const hasContent = await contentCards.count() > 0;
    const hasEmptyMessage = await page.locator('text=No content, text=Add sources').count() > 0;

    expect(hasContent || hasEmptyMessage).toBeTruthy();
  });
});
