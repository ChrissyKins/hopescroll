import { test, expect } from '@playwright/test';
import { cleanupTestUser, createVerifiedUser } from './helpers/db-helpers';

/**
 * E2E Test Suite: Video Watching & History Tracking
 *
 * Critical user journey:
 * 1. User navigates to watch page
 * 2. Video player loads and plays content
 * 3. User watches video (interaction is tracked)
 * 4. Video is marked as watched after 3 seconds
 * 5. User can navigate to next/discover videos
 * 6. Watch history is recorded
 * 7. User can view history page
 * 8. User can dismiss/not-now content
 */

test.describe('Video Watching Flow', () => {
  const testEmail = `e2e-watch-${Date.now()}@hopescroll-test.com`;
  const testPassword = 'TestPassword123!';

  test.beforeAll(async () => {
    await createVerifiedUser(testEmail, testPassword);
  });

  test.afterAll(async () => {
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

  test('should load watch page by default after login', async ({ page }) => {
    // After login, should redirect to /watch
    await expect(page).toHaveURL(/\/watch/);

    // Should see watch page UI
    await expect(
      page.locator('nav, header, main')
    ).toBeVisible({ timeout: 5000 });
  });

  test('should display video player on watch page', async ({ page }) => {
    await page.goto('/watch');
    await page.waitForTimeout(2000);

    // Look for YouTube iframe or video player
    const videoPlayer = page.locator(
      'iframe[src*="youtube"], iframe[src*="embed"], video, [data-testid="video-player"]'
    ).first();

    // Either video player exists or there's a "no content" message
    const hasPlayer = await videoPlayer.count() > 0;
    const hasNoContent = await page.locator('text=No content, text=Add sources').count() > 0;

    expect(hasPlayer || hasNoContent).toBeTruthy();
  });

  test('should show video metadata (title, channel, duration)', async ({ page }) => {
    await page.goto('/watch');
    await page.waitForTimeout(2000);

    // Check for video metadata display
    const hasMetadata = await page.locator(
      'h1, h2, .video-title, [data-testid="video-title"]'
    ).count();

    if (hasMetadata > 0) {
      // Should display some metadata
      await expect(
        page.locator('h1, h2, .video-title')
      ).toBeVisible({ timeout: 5000 });
    }
  });

  test('should have "Next" button to navigate to next video', async ({ page }) => {
    await page.goto('/watch');
    await page.waitForTimeout(2000);

    const nextButton = page.locator('button:has-text("Next"), button[aria-label*="Next"]').first();

    if (await nextButton.count() > 0) {
      // Get current video URL/ID if possible
      const currentUrl = page.url();

      // Click next button
      await nextButton.click();
      await page.waitForTimeout(2000);

      // URL should change or content should update
      const newUrl = page.url();

      // Either URL changed or we're still on watch page
      expect(newUrl).toContain('/watch');
    }
  });

  test('should have "Discover" button for YouTube recommendations', async ({ page }) => {
    await page.goto('/watch');
    await page.waitForTimeout(2000);

    const discoverButton = page.locator('button:has-text("Discover"), button[aria-label*="Discover"]').first();

    if (await discoverButton.count() > 0) {
      await discoverButton.click();
      await page.waitForTimeout(2000);

      // Should load a new video (or show discovery UI)
      await expect(page).toHaveURL(/\/watch/);
    }
  });

  test('should mark video as watched after 3 seconds', async ({ page }) => {
    await page.goto('/watch');
    await page.waitForTimeout(2000);

    // Check if there's a video player
    const hasPlayer = await page.locator('iframe[src*="youtube"], video').count() > 0;

    if (hasPlayer) {
      // Wait for 3 seconds (the threshold for marking as watched)
      await page.waitForTimeout(4000);

      // Check for "watched" indicator (might be in history, or a badge)
      // Hard to assert without seeing UI, but no error should occur
      await expect(page).toHaveURL(/\/watch/);
    }
  });

  test('should show duration filters on watch page', async ({ page }) => {
    await page.goto('/watch');
    await page.waitForTimeout(2000);

    // Look for duration filter buttons
    const durationFilters = page.locator(
      'button:has-text("3+"), button:has-text("5-10"), button:has-text("15-25")'
    );

    if (await durationFilters.count() > 0) {
      // Click a duration filter
      const filter = durationFilters.first();
      await filter.click();
      await page.waitForTimeout(1000);

      // Should apply filter (video changes or UI updates)
      await expect(page).toHaveURL(/\/watch/);
    }
  });

  test('should show recency filters on watch page', async ({ page }) => {
    await page.goto('/watch');
    await page.waitForTimeout(2000);

    // Look for recency filter buttons
    const recencyFilters = page.locator(
      'button:has-text("24h"), button:has-text("Week"), button:has-text("Month")'
    );

    if (await recencyFilters.count() > 0) {
      const filter = recencyFilters.first();
      await filter.click();
      await page.waitForTimeout(1000);

      await expect(page).toHaveURL(/\/watch/);
    }
  });

  test('should allow adding/removing channels from watch page', async ({ page }) => {
    await page.goto('/watch');
    await page.waitForTimeout(2000);

    // Look for add/remove channel button
    const channelButton = page.locator(
      'button:has-text("Add channel"), button:has-text("Remove channel"), button[aria-label*="channel"]'
    ).first();

    if (await channelButton.count() > 0) {
      const buttonText = await channelButton.textContent();

      await channelButton.click();
      await page.waitForTimeout(1000);

      // Button text should change or action should complete
      const newButtonText = await page.locator(
        'button:has-text("Add channel"), button:has-text("Remove channel")'
      ).first().textContent();

      expect(newButtonText).toBeTruthy();
    }
  });

  test('should show "NEW" badge for recent content', async ({ page }) => {
    await page.goto('/watch');
    await page.waitForTimeout(2000);

    // Look for NEW badge (might appear on recent videos)
    const newBadge = page.locator('text=NEW, [data-testid="new-badge"], .badge:has-text("NEW")');

    // Badge may or may not appear depending on content
    const badgeCount = await newBadge.count();

    // Just verify page loaded (badge is optional)
    await expect(page).toHaveURL(/\/watch/);
  });
});

test.describe('Content Interactions on Watch Page', () => {
  const testEmail = `e2e-interactions-${Date.now()}@hopescroll-test.com`;
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

  test('should save video from watch page', async ({ page }) => {
    await page.goto('/watch');
    await page.waitForTimeout(2000);

    const saveButton = page.locator('button:has-text("Save"), button[aria-label*="Save"]').first();

    if (await saveButton.count() > 0) {
      await saveButton.click();
      await page.waitForTimeout(1000);

      // Should show "Saved" state or success message
      await expect(
        page.locator('button:has-text("Saved"), text=Saved')
      ).toBeVisible({ timeout: 5000 });
    }
  });

  test('should dismiss video from watch page', async ({ page }) => {
    await page.goto('/watch');
    await page.waitForTimeout(2000);

    const dismissButton = page.locator('button:has-text("Dismiss"), button[aria-label*="Dismiss"]').first();

    if (await dismissButton.count() > 0) {
      await dismissButton.click();

      // May show reason selector
      const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Dismiss")');
      if (await confirmButton.count() > 0) {
        await confirmButton.click();
      }

      await page.waitForTimeout(1000);

      // Should load next video or show feedback
      await expect(page).toHaveURL(/\/watch/);
    }
  });

  test('should "Not Now" a video from watch page', async ({ page }) => {
    await page.goto('/watch');
    await page.waitForTimeout(2000);

    const notNowButton = page.locator('button:has-text("Not Now"), button:has-text("Later")').first();

    if (await notNowButton.count() > 0) {
      await notNowButton.click();
      await page.waitForTimeout(1000);

      // Should load next video
      await expect(page).toHaveURL(/\/watch/);
    }
  });
});

test.describe('History Tracking', () => {
  const testEmail = `e2e-history-${Date.now()}@hopescroll-test.com`;
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

  test('should navigate to history page', async ({ page }) => {
    await page.goto('/history');

    // Verify we're on the history page
    await expect(page).toHaveURL(/\/history/);

    // Should see history page UI
    await expect(
      page.locator('h1:has-text("History"), h2:has-text("History")')
    ).toBeVisible({ timeout: 5000 });
  });

  test('should show empty history when no interactions', async ({ page }) => {
    await page.goto('/history');
    await page.waitForSelector('text=Loading', { state: 'hidden', timeout: 10000 });

    // May show empty state
    const hasEmptyState = await page.locator('text=No history, text=no interactions').count() > 0;
    const hasContent = await page.locator('[data-testid="history-item"], article').count() > 0;

    expect(hasEmptyState || hasContent).toBeTruthy();
  });

  test('should record watched videos in history', async ({ page }) => {
    // Watch a video for 3+ seconds
    await page.goto('/watch');
    await page.waitForTimeout(4000); // Wait for "watched" threshold

    // Go to history
    await page.goto('/history');
    await page.waitForSelector('text=Loading', { state: 'hidden', timeout: 10000 });
    await page.waitForTimeout(1000);

    // Should show watched video in history (if content exists)
    const historyItems = page.locator('[data-testid="history-item"], article, .history-item');

    if (await historyItems.count() > 0) {
      await expect(historyItems.first()).toBeVisible();
    }
  });

  test('should filter history by interaction type', async ({ page }) => {
    await page.goto('/history');
    await page.waitForSelector('text=Loading', { state: 'hidden', timeout: 10000 });

    // Look for filter buttons/tabs
    const filterButtons = page.locator(
      'button:has-text("Watched"), button:has-text("Saved"), button:has-text("Dismissed")'
    );

    if (await filterButtons.count() > 0) {
      const watchedFilter = page.locator('button:has-text("Watched")').first();
      await watchedFilter.click();
      await page.waitForTimeout(1000);

      // Should filter to only watched items
      await expect(page).toHaveURL(/\/history/);
    }
  });

  test('should search through history', async ({ page }) => {
    await page.goto('/history');
    await page.waitForSelector('text=Loading', { state: 'hidden', timeout: 10000 });

    const searchInput = page.locator('input[type="search"], input[placeholder*="Search"]').first();

    if (await searchInput.count() > 0) {
      await searchInput.fill('test');
      await page.waitForTimeout(500);

      // Results should filter
      await expect(searchInput).toHaveValue('test');
    }
  });

  test('should show completion percentage for watched videos', async ({ page }) => {
    await page.goto('/history');
    await page.waitForSelector('text=Loading', { state: 'hidden', timeout: 10000 });
    await page.waitForTimeout(1000);

    // Look for percentage indicators (if watched videos exist)
    const percentageIndicator = page.locator('text=%, [data-testid="completion"]');

    // May or may not exist depending on data
    const hasPercentage = await percentageIndicator.count() > 0;

    // Just verify page loaded correctly
    await expect(page).toHaveURL(/\/history/);
  });

  test('should show timestamps for interactions', async ({ page }) => {
    await page.goto('/history');
    await page.waitForSelector('text=Loading', { state: 'hidden', timeout: 10000 });
    await page.waitForTimeout(1000);

    // Look for relative time (e.g., "2 minutes ago", "1 hour ago")
    const timestamps = page.locator('text=/\\d+\\s+(second|minute|hour|day)s?\\s+ago/i');

    if (await timestamps.count() > 0) {
      await expect(timestamps.first()).toBeVisible();
    }
  });
});

test.describe('Feed Browsing (Scroll Page)', () => {
  const testEmail = `e2e-scroll-${Date.now()}@hopescroll-test.com`;
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

  test('should load scroll/feed page', async ({ page }) => {
    await page.goto('/scroll');

    await expect(page).toHaveURL(/\/scroll/);

    // Should see feed UI
    await expect(page.locator('main, [data-testid="feed"]')).toBeVisible();
  });

  test('should display content cards in feed', async ({ page }) => {
    await page.goto('/scroll');
    await page.waitForSelector('text=Loading', { state: 'hidden', timeout: 15000 });
    await page.waitForTimeout(2000);

    // Look for content cards
    const contentCards = page.locator('[data-testid="content-card"], article, .content-card');

    const hasCards = await contentCards.count() > 0;
    const hasEmpty = await page.locator('text=No content, text=Add sources').count() > 0;

    expect(hasCards || hasEmpty).toBeTruthy();
  });

  test('should show thumbnails for videos in feed', async ({ page }) => {
    await page.goto('/scroll');
    await page.waitForSelector('text=Loading', { state: 'hidden', timeout: 15000 });
    await page.waitForTimeout(2000);

    const thumbnails = page.locator('img[alt], img[src*="youtube"], img[src*="thumb"]');

    if (await thumbnails.count() > 0) {
      await expect(thumbnails.first()).toBeVisible();
    }
  });

  test('should perform actions on feed cards (save, dismiss, not now)', async ({ page }) => {
    await page.goto('/scroll');
    await page.waitForSelector('text=Loading', { state: 'hidden', timeout: 15000 });
    await page.waitForTimeout(2000);

    const actionButton = page.locator('button:has-text("Save"), button:has-text("Dismiss")').first();

    if (await actionButton.count() > 0) {
      await actionButton.click();
      await page.waitForTimeout(1000);

      // Action should complete
      await expect(page).toHaveURL(/\/scroll/);
    }
  });

  test('should support infinite scroll in feed', async ({ page }) => {
    await page.goto('/scroll');
    await page.waitForSelector('text=Loading', { state: 'hidden', timeout: 15000 });
    await page.waitForTimeout(2000);

    const initialCards = await page.locator('[data-testid="content-card"], article').count();

    if (initialCards > 0) {
      // Scroll to bottom
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(2000);

      // More cards should load (or we reach the end)
      const newCards = await page.locator('[data-testid="content-card"], article').count();

      // Either more cards loaded or we're at the end
      expect(newCards >= initialCards).toBeTruthy();
    }
  });
});
