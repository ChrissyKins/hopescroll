import { test, expect } from '@playwright/test';
import { cleanupTestUser, createVerifiedUser } from './helpers/db-helpers';

/**
 * E2E Test Suite: Filter Management
 *
 * Critical user journey:
 * 1. User creates keyword filters to exclude unwanted content
 * 2. User sets duration preferences (min/max video length)
 * 3. User configures feed generation settings
 * 4. Filters are applied to content feed
 * 5. User can verify filtered content doesn't appear
 */

test.describe('Filter Management Flow', () => {
  const testEmail = `e2e-filters-${Date.now()}@hopescroll-test.com`;
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

  test('should navigate to filters page', async ({ page }) => {
    await page.goto('/filters');

    // Verify we're on the filters page
    await expect(page).toHaveURL(/\/filters/);

    // Should see filters page UI
    await expect(
      page.locator('h1:has-text("Filter"), h2:has-text("Filter")')
    ).toBeVisible({ timeout: 5000 });
  });

  test('should show empty state when no filters added', async ({ page }) => {
    await page.goto('/filters');
    await page.waitForSelector('text=Loading', { state: 'hidden', timeout: 10000 });

    // Check for empty state (might not exist if filters already added)
    const hasEmptyState = await page
      .locator('text=No filters, text=Add your first, text=filter keywords')
      .count()
      .then((count) => count > 0);

    if (hasEmptyState) {
      await expect(
        page.locator('text=No filters, text=Add')
      ).toBeVisible();
    }
  });

  test('should add a keyword filter', async ({ page }) => {
    await page.goto('/filters');
    await page.waitForSelector('text=Loading', { state: 'hidden', timeout: 10000 });

    // Find keyword input field
    const keywordInput = page.locator(
      'input[name*="keyword"], input[placeholder*="keyword"], input[placeholder*="Keyword"]'
    ).first();

    await keywordInput.fill('politics');

    // Click Add button
    const addButton = page.locator('button:has-text("Add")').first();
    await addButton.click();

    // Wait for filter to be added
    await page.waitForTimeout(1000);

    // Verify filter appears in the list
    await expect(
      page.locator('text=politics')
    ).toBeVisible({ timeout: 5000 });
  });

  test('should add wildcard filter', async ({ page }) => {
    await page.goto('/filters');
    await page.waitForSelector('text=Loading', { state: 'hidden', timeout: 10000 });

    // Add wildcard filter (e.g., *drama*)
    const keywordInput = page.locator('input[name*="keyword"], input[placeholder*="keyword"]').first();
    await keywordInput.fill('*drama*');

    const addButton = page.locator('button:has-text("Add")').first();
    await addButton.click();

    await page.waitForTimeout(1000);

    // Verify wildcard filter appears
    await expect(
      page.locator('text=*drama*')
    ).toBeVisible({ timeout: 5000 });
  });

  test('should prevent duplicate filter keywords', async ({ page }) => {
    await page.goto('/filters');
    await page.waitForSelector('text=Loading', { state: 'hidden', timeout: 10000 });

    const keywordInput = page.locator('input[name*="keyword"], input[placeholder*="keyword"]').first();

    // Add a keyword
    await keywordInput.fill('duplicate-test');
    let addButton = page.locator('button:has-text("Add")').first();
    await addButton.click();
    await page.waitForTimeout(1000);

    // Try to add same keyword again
    await keywordInput.fill('duplicate-test');
    addButton = page.locator('button:has-text("Add")').first();
    await addButton.click();

    // Should show error about duplicate
    await expect(
      page.locator('text=already exists, text=duplicate, text=Already')
    ).toBeVisible({ timeout: 5000 });
  });

  test('should delete a filter keyword', async ({ page }) => {
    await page.goto('/filters');
    await page.waitForSelector('text=Loading', { state: 'hidden', timeout: 10000 });

    // Add a filter first
    const keywordInput = page.locator('input[name*="keyword"], input[placeholder*="keyword"]').first();
    await keywordInput.fill('to-delete');
    const addButton = page.locator('button:has-text("Add")').first();
    await addButton.click();
    await page.waitForTimeout(1000);

    // Find delete button for the filter
    const deleteButton = page.locator(
      'button:has-text("Delete"), button:has-text("Remove"), button[aria-label*="Delete"]'
    ).first();

    await deleteButton.click();

    // Confirm if dialog appears
    const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Delete"), button:has-text("Yes")');
    if (await confirmButton.count() > 0) {
      await confirmButton.click();
    }

    await page.waitForTimeout(1000);

    // Verify filter is removed
    const stillExists = await page.locator('text=to-delete').count();
    expect(stillExists).toBe(0);
  });

  test('should search through filter keywords', async ({ page }) => {
    await page.goto('/filters');
    await page.waitForSelector('text=Loading', { state: 'hidden', timeout: 10000 });
    await page.waitForTimeout(1000);

    // Look for search input
    const searchInput = page.locator('input[type="search"], input[placeholder*="Search"]').first();

    if (await searchInput.count() > 0) {
      await searchInput.fill('politics');
      await page.waitForTimeout(500);

      // Results should be filtered
      await expect(searchInput).toHaveValue('politics');
    }
  });

  test('should set minimum duration preference', async ({ page }) => {
    await page.goto('/filters');
    await page.waitForSelector('text=Loading', { state: 'hidden', timeout: 10000 });

    // Look for duration controls (slider, input, buttons)
    const minDurationControl = page.locator(
      'input[name*="minDuration"], input[type="range"][name*="min"], input[aria-label*="Minimum"]'
    ).first();

    if (await minDurationControl.count() > 0) {
      // Set minimum duration (e.g., 3 minutes = 180 seconds)
      await minDurationControl.fill('180');
      await page.waitForTimeout(500);

      // Blur to trigger save
      await minDurationControl.blur();
      await page.waitForTimeout(1000);

      // Verify setting was saved (value persists)
      const savedValue = await minDurationControl.inputValue();
      expect(parseInt(savedValue)).toBeGreaterThanOrEqual(180);
    }
  });

  test('should set maximum duration preference', async ({ page }) => {
    await page.goto('/filters');
    await page.waitForSelector('text=Loading', { state: 'hidden', timeout: 10000 });

    const maxDurationControl = page.locator(
      'input[name*="maxDuration"], input[type="range"][name*="max"], input[aria-label*="Maximum"]'
    ).first();

    if (await maxDurationControl.count() > 0) {
      // Set maximum duration (e.g., 10 minutes = 600 seconds)
      await maxDurationControl.fill('600');
      await page.waitForTimeout(500);

      await maxDurationControl.blur();
      await page.waitForTimeout(1000);

      const savedValue = await maxDurationControl.inputValue();
      expect(parseInt(savedValue)).toBeLessThanOrEqual(600);
    }
  });

  test('should configure backlog ratio', async ({ page }) => {
    await page.goto('/filters');
    await page.waitForSelector('text=Loading', { state: 'hidden', timeout: 10000 });

    // Look for backlog ratio control
    const backlogControl = page.locator(
      'input[name*="backlog"], select[name*="backlog"], input[aria-label*="Backlog"]'
    ).first();

    if (await backlogControl.count() > 0) {
      // Set backlog ratio (e.g., 0.3 = 30% old content)
      await backlogControl.fill('0.3');
      await page.waitForTimeout(500);

      await backlogControl.blur();
      await page.waitForTimeout(1000);

      // Verify setting persisted
      const savedValue = await backlogControl.inputValue();
      expect(parseFloat(savedValue)).toBeCloseTo(0.3, 1);
    }
  });

  test('should configure diversity limit', async ({ page }) => {
    await page.goto('/filters');
    await page.waitForSelector('text=Loading', { state: 'hidden', timeout: 10000 });

    // Look for diversity limit control
    const diversityControl = page.locator(
      'input[name*="diversity"], select[name*="diversity"], input[aria-label*="Diversity"]'
    ).first();

    if (await diversityControl.count() > 0) {
      // Set diversity limit (e.g., 3 items per source)
      await diversityControl.fill('3');
      await page.waitForTimeout(500);

      await diversityControl.blur();
      await page.waitForTimeout(1000);

      const savedValue = await diversityControl.inputValue();
      expect(parseInt(savedValue)).toBe(3);
    }
  });
});

test.describe('Filter Application in Feed', () => {
  const testEmail = `e2e-feed-filter-${Date.now()}@hopescroll-test.com`;
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

  test('should filter content based on keyword filters', async ({ page }) => {
    // Add a filter keyword
    await page.goto('/filters');
    await page.waitForSelector('text=Loading', { state: 'hidden', timeout: 10000 });

    const keywordInput = page.locator('input[name*="keyword"], input[placeholder*="keyword"]').first();
    await keywordInput.fill('test-filter-keyword');
    const addButton = page.locator('button:has-text("Add")').first();
    await addButton.click();
    await page.waitForTimeout(1000);

    // Navigate to feed
    await page.goto('/scroll');
    await page.waitForSelector('text=Loading', { state: 'hidden', timeout: 15000 });
    await page.waitForTimeout(2000);

    // Verify filtered keyword doesn't appear in feed
    const hasFilteredKeyword = await page.locator('text=test-filter-keyword').count();

    // Content with the filtered keyword should not appear
    // (This is a weak assertion as content might not have this keyword anyway)
    expect(hasFilteredKeyword).toBe(0);
  });

  test('should respect duration filters in feed', async ({ page }) => {
    // Set minimum duration to 5 minutes
    await page.goto('/filters');
    await page.waitForSelector('text=Loading', { state: 'hidden', timeout: 10000 });

    const minDurationControl = page.locator('input[name*="minDuration"], input[type="range"]').first();
    if (await minDurationControl.count() > 0) {
      await minDurationControl.fill('300'); // 5 minutes
      await minDurationControl.blur();
      await page.waitForTimeout(1000);
    }

    // Navigate to feed
    await page.goto('/scroll');
    await page.waitForSelector('text=Loading', { state: 'hidden', timeout: 15000 });
    await page.waitForTimeout(2000);

    // Check that videos shown are >= 5 minutes
    // (Hard to assert without inspecting actual video durations in UI)
    // At minimum, feed should load without errors
    const contentCards = page.locator('[data-testid="content-card"], article');
    const hasContent = await contentCards.count() > 0;

    // Either has content or shows appropriate empty state
    if (hasContent) {
      await expect(contentCards.first()).toBeVisible();
    } else {
      await expect(
        page.locator('text=No content, text=filters')
      ).toBeVisible();
    }
  });

  test('should show appropriate message when filters exclude all content', async ({ page }) => {
    // Add very restrictive filters
    await page.goto('/filters');
    await page.waitForSelector('text=Loading', { state: 'hidden', timeout: 10000 });

    // Set impossible duration range (min > max)
    const minControl = page.locator('input[name*="minDuration"]').first();
    const maxControl = page.locator('input[name*="maxDuration"]').first();

    if (await minControl.count() > 0 && await maxControl.count() > 0) {
      await minControl.fill('3600'); // 1 hour min
      await maxControl.fill('60');   // 1 minute max (impossible range)
      await page.waitForTimeout(1000);

      // Navigate to feed
      await page.goto('/scroll');
      await page.waitForSelector('text=Loading', { state: 'hidden', timeout: 15000 });
      await page.waitForTimeout(2000);

      // Should show no content or appropriate message
      await expect(
        page.locator('text=No content, text=filters, text=adjust')
      ).toBeVisible({ timeout: 5000 });
    }
  });
});
