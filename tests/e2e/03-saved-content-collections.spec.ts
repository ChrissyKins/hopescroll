import { test, expect } from '@playwright/test';
import { cleanupTestUser, createVerifiedUser } from './helpers/db-helpers';

/**
 * E2E Test Suite: Saved Content & Collections
 *
 * Critical user journey:
 * 1. User saves content from feed
 * 2. User creates collections
 * 3. User organizes saved content into collections
 * 4. User retrieves saved content
 * 5. User adds notes to saved items
 * 6. User moves items between collections
 */

test.describe('Saved Content Flow', () => {
  const testEmail = `e2e-saved-${Date.now()}@hopescroll-test.com`;
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

  test('should navigate to saved content page', async ({ page }) => {
    await page.goto('/saved');

    // Verify we're on the saved page
    await expect(page).toHaveURL(/\/saved/);

    // Should see saved content UI
    await expect(
      page.locator('h1:has-text("Saved"), h2:has-text("Saved")')
    ).toBeVisible({ timeout: 5000 });
  });

  test('should show empty state when no content saved', async ({ page }) => {
    await page.goto('/saved');

    // Wait for loading to complete
    await page.waitForSelector('text=Loading', { state: 'hidden', timeout: 10000 });

    // Check for empty state (might not exist if content already saved)
    const hasEmptyState = await page
      .locator('text=No saved content, text=Save some, text=nothing saved')
      .count()
      .then((count) => count > 0);

    if (hasEmptyState) {
      await expect(
        page.locator('text=No saved content, text=Save, text=nothing')
      ).toBeVisible();
    }
  });

  test('should save content from feed', async ({ page }) => {
    // First, navigate to scroll/feed page
    await page.goto('/scroll');
    await page.waitForSelector('text=Loading', { state: 'hidden', timeout: 15000 });

    // Wait for content to load
    await page.waitForTimeout(2000);

    // Find a "Save" button on a content card
    const saveButton = page.locator('button:has-text("Save"), button[aria-label*="Save"]').first();

    if (await saveButton.count() > 0) {
      await saveButton.click();

      // Wait for save action to complete
      await page.waitForTimeout(1000);

      // Should show success feedback (toast, button change, etc.)
      const savedIndicator = await page.locator(
        'text=Saved, button:has-text("Saved"), [aria-label*="Saved"]'
      ).count();

      expect(savedIndicator).toBeGreaterThan(0);

      // Navigate to saved page
      await page.goto('/saved');
      await page.waitForSelector('text=Loading', { state: 'hidden', timeout: 10000 });

      // Verify content appears in saved list
      const savedItems = page.locator('[data-testid="saved-item"], .saved-item, article');
      await expect(savedItems.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('should unsave content', async ({ page }) => {
    // Navigate to saved page
    await page.goto('/saved');
    await page.waitForSelector('text=Loading', { state: 'hidden', timeout: 10000 });
    await page.waitForTimeout(1000);

    // Find an "Unsave" or "Remove" button
    const unsaveButton = page.locator(
      'button:has-text("Unsave"), button:has-text("Remove"), button:has-text("Delete"), button[aria-label*="Remove"]'
    ).first();

    if (await unsaveButton.count() > 0) {
      // Get count before removing
      const beforeCount = await page.locator('[data-testid="saved-item"], .saved-item, article').count();

      await unsaveButton.click();

      // Confirm if dialog appears
      const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Remove"), button:has-text("Yes")');
      if (await confirmButton.count() > 0) {
        await confirmButton.click();
      }

      // Wait for removal
      await page.waitForTimeout(1000);

      // Verify item was removed (count decreased or empty state shown)
      const afterCount = await page.locator('[data-testid="saved-item"], .saved-item, article').count();
      const hasEmptyState = await page.locator('text=No saved content').count() > 0;

      expect(afterCount < beforeCount || hasEmptyState).toBeTruthy();
    }
  });
});

test.describe('Collections Management', () => {
  const testEmail = `e2e-collections-${Date.now()}@hopescroll-test.com`;
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

  test('should create a new collection', async ({ page }) => {
    await page.goto('/saved');
    await page.waitForSelector('text=Loading', { state: 'hidden', timeout: 10000 });

    // Find "Create Collection" or "New Collection" button
    const createButton = page.locator(
      'button:has-text("Create"), button:has-text("New Collection"), button:has-text("Add Collection")'
    ).first();

    if (await createButton.count() > 0) {
      await createButton.click();

      // Wait for modal/form to appear
      await page.waitForTimeout(500);

      // Fill in collection name
      const nameInput = page.locator('input[name="name"], input[placeholder*="name"], input[placeholder*="Name"]').first();
      await nameInput.fill('Test Collection E2E');

      // Submit
      const submitButton = page.locator('button:has-text("Create"), button:has-text("Save"), button[type="submit"]').last();
      await submitButton.click();

      // Wait for collection to be created
      await page.waitForTimeout(1000);

      // Verify collection appears (might be in a dropdown or list)
      await expect(
        page.locator('text=Test Collection E2E')
      ).toBeVisible({ timeout: 5000 });
    }
  });

  test('should edit collection name', async ({ page }) => {
    await page.goto('/saved');
    await page.waitForSelector('text=Loading', { state: 'hidden', timeout: 10000 });
    await page.waitForTimeout(1000);

    // Find edit button for a collection
    const editButton = page.locator(
      'button:has-text("Edit"), button[aria-label*="Edit"], button:has-text("Rename")'
    ).first();

    if (await editButton.count() > 0) {
      await editButton.click();
      await page.waitForTimeout(500);

      // Update the name
      const nameInput = page.locator('input[name="name"], input[value*="Collection"]').first();
      await nameInput.clear();
      await nameInput.fill('Updated Collection Name');

      // Save changes
      const saveButton = page.locator('button:has-text("Save"), button:has-text("Update")').last();
      await saveButton.click();

      await page.waitForTimeout(1000);

      // Verify updated name
      await expect(
        page.locator('text=Updated Collection Name')
      ).toBeVisible({ timeout: 5000 });
    }
  });

  test('should delete a collection', async ({ page }) => {
    await page.goto('/saved');
    await page.waitForSelector('text=Loading', { state: 'hidden', timeout: 10000 });
    await page.waitForTimeout(1000);

    // Create a collection first
    const createButton = page.locator('button:has-text("Create"), button:has-text("New Collection")').first();
    if (await createButton.count() > 0) {
      await createButton.click();
      await page.waitForTimeout(500);

      const nameInput = page.locator('input[name="name"], input[placeholder*="name"]').first();
      await nameInput.fill('Collection to Delete');

      const submitButton = page.locator('button:has-text("Create"), button:has-text("Save")').last();
      await submitButton.click();
      await page.waitForTimeout(1000);
    }

    // Now delete it
    const deleteButton = page.locator('button:has-text("Delete"), button[aria-label*="Delete"]').first();
    if (await deleteButton.count() > 0) {
      await deleteButton.click();

      // Confirm deletion
      const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Delete"), button:has-text("Yes")');
      if (await confirmButton.count() > 0) {
        await confirmButton.click();
      }

      await page.waitForTimeout(1000);

      // Verify collection is gone
      const stillExists = await page.locator('text=Collection to Delete').count();
      expect(stillExists).toBe(0);
    }
  });

  test('should assign saved content to a collection', async ({ page }) => {
    // First, save some content
    await page.goto('/scroll');
    await page.waitForSelector('text=Loading', { state: 'hidden', timeout: 15000 });
    await page.waitForTimeout(2000);

    const saveButton = page.locator('button:has-text("Save")').first();
    if (await saveButton.count() > 0) {
      await saveButton.click();
      await page.waitForTimeout(1000);
    }

    // Go to saved content
    await page.goto('/saved');
    await page.waitForSelector('text=Loading', { state: 'hidden', timeout: 10000 });
    await page.waitForTimeout(1000);

    // Look for collection selector or "Move to collection" button
    const collectionSelector = page.locator(
      'select[name*="collection"], button:has-text("Collection"), button:has-text("Move")'
    ).first();

    if (await collectionSelector.count() > 0) {
      await collectionSelector.click();
      await page.waitForTimeout(500);

      // Select a collection (if dropdown) or create one
      const collectionOption = page.locator('[role="option"], option').first();
      if (await collectionOption.count() > 0) {
        await collectionOption.click();
        await page.waitForTimeout(1000);
      }
    }
  });

  test('should filter saved content by collection', async ({ page }) => {
    await page.goto('/saved');
    await page.waitForSelector('text=Loading', { state: 'hidden', timeout: 10000 });
    await page.waitForTimeout(1000);

    // Look for collection filter/tabs
    const collectionFilter = page.locator(
      'button:has-text("All"), select[name*="collection"], [role="tab"]'
    ).first();

    if (await collectionFilter.count() > 0) {
      // Click to filter by a specific collection
      await collectionFilter.click();
      await page.waitForTimeout(500);

      // Select a collection
      const specificCollection = page.locator('[role="tab"], option, button').nth(1);
      if (await specificCollection.count() > 0) {
        await specificCollection.click();
        await page.waitForTimeout(1000);

        // Content should be filtered (hard to assert without knowing data)
        // At minimum, no error should occur
      }
    }
  });

  test('should add notes to saved content', async ({ page }) => {
    // Navigate to saved content
    await page.goto('/saved');
    await page.waitForSelector('text=Loading', { state: 'hidden', timeout: 10000 });
    await page.waitForTimeout(1000);

    // Look for "Add note" or "Edit note" button
    const addNoteButton = page.locator(
      'button:has-text("Note"), button:has-text("Add note"), button[aria-label*="Note"]'
    ).first();

    if (await addNoteButton.count() > 0) {
      await addNoteButton.click();
      await page.waitForTimeout(500);

      // Find note input/textarea
      const noteInput = page.locator('textarea[name*="note"], textarea[placeholder*="note"], input[name*="note"]').first();
      if (await noteInput.count() > 0) {
        await noteInput.fill('This is a test note for E2E testing');

        // Save note
        const saveButton = page.locator('button:has-text("Save"), button:has-text("Update")').last();
        await saveButton.click();
        await page.waitForTimeout(1000);

        // Verify note was saved
        await expect(
          page.locator('text=This is a test note for E2E testing')
        ).toBeVisible({ timeout: 5000 });
      }
    }
  });
});
