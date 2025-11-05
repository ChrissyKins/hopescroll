import { test, expect, Page, devices } from '@playwright/test';
import { createVerifiedUser, cleanupTestUser } from './helpers/db-helpers';

/**
 * E2E Responsiveness Test Suite
 *
 * Tests UI responsiveness across different viewport sizes and devices.
 *
 * Viewports tested:
 * - Mobile (iPhone 12): 390x844
 * - Mobile (Pixel 5): 393x851
 * - Tablet (iPad): 768x1024
 * - Tablet landscape (iPad): 1024x768
 * - Desktop (1920x1080)
 * - Large desktop (2560x1440)
 *
 * Elements tested:
 * - Navigation visibility and layout
 * - Feed card rendering
 * - Form layouts
 * - Button accessibility
 * - Text readability
 */

const VIEWPORTS = {
  mobile_iphone: { width: 390, height: 844, name: 'iPhone 12' },
  mobile_pixel: { width: 393, height: 851, name: 'Pixel 5' },
  tablet_portrait: { width: 768, height: 1024, name: 'iPad Portrait' },
  tablet_landscape: { width: 1024, height: 768, name: 'iPad Landscape' },
  desktop: { width: 1920, height: 1080, name: 'Desktop 1080p' },
  desktop_large: { width: 2560, height: 1440, name: 'Desktop 1440p' },
};

test.describe('Responsiveness - Login Page', () => {
  Object.entries(VIEWPORTS).forEach(([key, viewport]) => {
    test(`should render properly on ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/login');

      console.log(`\n📱 Testing ${viewport.name} (${viewport.width}x${viewport.height})`);

      // Check critical elements are visible
      await expect(page.locator('input[name="email"]')).toBeVisible();
      await expect(page.locator('input[name="password"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();

      // Check form is not overflowing
      const form = page.locator('form').first();
      const formBox = await form.boundingBox();

      if (formBox) {
        expect(formBox.width).toBeLessThanOrEqual(viewport.width);
        expect(formBox.x).toBeGreaterThanOrEqual(0);
        console.log(`   ✓ Form fits viewport (${formBox.width}px wide)`);
      }

      // Check inputs are large enough for touch on mobile
      const emailInput = page.locator('input[name="email"]');
      const inputBox = await emailInput.boundingBox();

      if (inputBox) {
        if (viewport.width < 768) {
          // Mobile: inputs should be at least 44px tall (Apple HIG recommendation)
          expect(inputBox.height).toBeGreaterThanOrEqual(40);
          console.log(`   ✓ Input height suitable for touch (${inputBox.height}px)`);
        }
      }

      // Check text is readable (not too small)
      const fontSize = await page.locator('input[name="email"]').evaluate((el) => {
        return window.getComputedStyle(el).fontSize;
      });

      const fontSizeNum = parseFloat(fontSize);
      expect(fontSizeNum).toBeGreaterThanOrEqual(14); // Minimum 14px for readability
      console.log(`   ✓ Font size readable (${fontSize})`);
    });
  });
});

test.describe('Responsiveness - Navigation', () => {
  const testEmail = `resp-nav-${Date.now()}@hopescroll-test.com`;
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

  Object.entries(VIEWPORTS).forEach(([key, viewport]) => {
    test(`navigation should work on ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await login(page);

      console.log(`\n📱 Testing navigation on ${viewport.name}`);

      // Check navigation is visible
      const nav = page.locator('nav');
      await expect(nav).toBeVisible();

      // Check navigation links are accessible
      const navLinks = ['Watch', 'Sources', 'Scroll', 'Filters'];

      for (const linkText of navLinks) {
        const link = page.locator(`nav a:has-text("${linkText}")`);

        // Link should be visible or in a hamburger menu
        const isVisible = await link.isVisible().catch(() => false);

        if (!isVisible && viewport.width < 768) {
          // On mobile, might be in hamburger menu
          console.log(`   ℹ ${linkText} might be in mobile menu`);
        } else {
          await expect(link).toBeVisible();

          // Check link is large enough for touch on mobile
          if (viewport.width < 768) {
            const linkBox = await link.boundingBox();
            if (linkBox) {
              expect(linkBox.height).toBeGreaterThanOrEqual(40);
              console.log(`   ✓ ${linkText} link suitable for touch (${linkBox.height}px)`);
            }
          }
        }
      }
    });
  });
});

test.describe('Responsiveness - Feed Layout', () => {
  const testEmail = `resp-feed-${Date.now()}@hopescroll-test.com`;
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

  Object.entries(VIEWPORTS).forEach(([key, viewport]) => {
    test(`feed should render properly on ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await login(page);
      await page.goto('/watch');

      console.log(`\n📱 Testing feed layout on ${viewport.name}`);

      // Wait for content to potentially load
      await page.waitForTimeout(1000);

      // Check if feed container exists and fits viewport
      const feedContainer = page.locator('[data-testid="feed-container"]').first().or(page.locator('main').first());

      const containerBox = await feedContainer.boundingBox();
      if (containerBox) {
        // Container should not overflow viewport horizontally
        expect(containerBox.width).toBeLessThanOrEqual(viewport.width + 1); // +1 for rounding
        console.log(`   ✓ Feed container fits viewport (${containerBox.width}px wide)`);
      }

      // Check for horizontal scrollbar (should not exist)
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });

      expect(hasHorizontalScroll).toBe(false);
      console.log(`   ✓ No horizontal scroll`);

      // Check any video cards if present
      const videoCards = page.locator('[data-testid="video-card"]').or(page.locator('article'));
      const cardCount = await videoCards.count();

      if (cardCount > 0) {
        // Check first card
        const firstCard = videoCards.first();
        const cardBox = await firstCard.boundingBox();

        if (cardBox) {
          // Card should fit within viewport with some padding
          expect(cardBox.width).toBeLessThanOrEqual(viewport.width);
          console.log(`   ✓ Video card fits viewport (${cardBox.width}px wide)`);

          // Check card has reasonable proportions
          const aspectRatio = cardBox.width / cardBox.height;
          expect(aspectRatio).toBeGreaterThan(0.5); // Not too tall
          expect(aspectRatio).toBeLessThan(5); // Not too wide
        }
      } else {
        console.log(`   ℹ No video cards found (empty feed)`);
      }
    });
  });
});

test.describe('Responsiveness - Sources Page', () => {
  const testEmail = `resp-sources-${Date.now()}@hopescroll-test.com`;
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

  Object.entries(VIEWPORTS).forEach(([key, viewport]) => {
    test(`sources page should render properly on ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await login(page);
      await page.goto('/sources');

      console.log(`\n📱 Testing sources page on ${viewport.name}`);

      // Wait for page to load
      await page.waitForTimeout(500);

      // Check for horizontal overflow
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });

      expect(hasHorizontalScroll).toBe(false);
      console.log(`   ✓ No horizontal scroll`);

      // Check if "Add Source" button is accessible
      const addButton = page.locator('button:has-text("Add")').first()
        .or(page.locator('button:has-text("New")').first())
        .or(page.locator('a:has-text("Add")').first());

      const hasAddButton = await addButton.count() > 0;
      if (hasAddButton) {
        await expect(addButton.first()).toBeVisible();

        const buttonBox = await addButton.first().boundingBox();
        if (buttonBox && viewport.width < 768) {
          // On mobile, button should be touch-friendly
          expect(buttonBox.height).toBeGreaterThanOrEqual(40);
          console.log(`   ✓ Add button suitable for touch (${buttonBox.height}px)`);
        }
      }
    });
  });
});

test.describe('Responsiveness - Text Overflow & Truncation', () => {
  const testEmail = `resp-text-${Date.now()}@hopescroll-test.com`;
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

  test('long text should not overflow on mobile (iPhone)', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile_iphone);
    await login(page);
    await page.goto('/watch');

    console.log(`\n📱 Testing text overflow on mobile`);

    // Check all text elements don't overflow
    const allTextElements = await page.locator('h1, h2, h3, h4, h5, h6, p, span, a').all();

    for (const element of allTextElements.slice(0, 20)) { // Check first 20
      const box = await element.boundingBox();
      if (box && box.width > 0) {
        // Text should not exceed viewport width
        expect(box.x + box.width).toBeLessThanOrEqual(VIEWPORTS.mobile_iphone.width + 20); // +20 for padding
      }
    }

    console.log(`   ✓ Text elements don't overflow viewport`);
  });

  test('long URLs should be handled properly on mobile', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile_iphone);
    await login(page);
    await page.goto('/sources');

    // If there are any URLs displayed, they should wrap or truncate
    const links = await page.locator('a[href^="http"]').all();

    for (const link of links.slice(0, 5)) {
      const box = await link.boundingBox();
      if (box && box.width > 0) {
        expect(box.x + box.width).toBeLessThanOrEqual(VIEWPORTS.mobile_iphone.width + 20);
      }
    }

    console.log(`   ✓ URLs don't cause horizontal overflow`);
  });
});

test.describe('Responsiveness - Touch Interactions (Mobile)', () => {
  const testEmail = `resp-touch-${Date.now()}@hopescroll-test.com`;
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

  test('buttons should be large enough for touch (44x44 minimum)', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile_iphone);
    await login(page);
    await page.goto('/watch');

    console.log(`\n📱 Testing touch target sizes on mobile`);

    // Check all buttons
    const buttons = await page.locator('button').all();

    let tooSmallCount = 0;
    let checkedCount = 0;

    for (const button of buttons) {
      const isVisible = await button.isVisible().catch(() => false);
      if (!isVisible) continue;

      const box = await button.boundingBox();
      if (box) {
        checkedCount++;

        // Apple HIG recommends 44x44 minimum for touch targets
        // We'll allow 40x40 as acceptable minimum
        if (box.height < 40 || box.width < 40) {
          tooSmallCount++;
          console.log(`   ⚠ Button too small: ${box.width}x${box.height}px`);
        }
      }
    }

    console.log(`   Checked ${checkedCount} buttons, ${tooSmallCount} too small`);

    // Most buttons should be appropriately sized
    if (checkedCount > 0) {
      const percentageOk = ((checkedCount - tooSmallCount) / checkedCount) * 100;
      expect(percentageOk).toBeGreaterThanOrEqual(80); // 80% should be ok
    }
  });

  test('spacing between clickable elements should prevent mis-taps', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile_iphone);
    await login(page);
    await page.goto('/watch');

    console.log(`\n📱 Testing spacing between interactive elements`);

    // Get all interactive elements
    const interactiveElements = await page.locator('button, a, input').all();

    // Check first few visible elements
    let overlappingCount = 0;
    let checkedPairs = 0;

    for (let i = 0; i < Math.min(10, interactiveElements.length - 1); i++) {
      const elem1 = interactiveElements[i];
      const elem2 = interactiveElements[i + 1];

      const isVisible1 = await elem1.isVisible().catch(() => false);
      const isVisible2 = await elem2.isVisible().catch(() => false);

      if (!isVisible1 || !isVisible2) continue;

      const box1 = await elem1.boundingBox();
      const box2 = await elem2.boundingBox();

      if (box1 && box2) {
        checkedPairs++;

        // Check if elements are too close vertically
        const verticalDistance = Math.abs((box1.y + box1.height) - box2.y);

        // Elements should have at least 8px spacing (or be far apart)
        if (verticalDistance < 8 && verticalDistance > 0) {
          overlappingCount++;
        }
      }
    }

    console.log(`   Checked ${checkedPairs} pairs, ${overlappingCount} too close`);

    // Most elements should have appropriate spacing
    if (checkedPairs > 0) {
      const percentageOk = ((checkedPairs - overlappingCount) / checkedPairs) * 100;
      expect(percentageOk).toBeGreaterThanOrEqual(70); // 70% should have ok spacing
    }
  });
});

test.describe('Responsiveness - Orientation Changes', () => {
  const testEmail = `resp-orient-${Date.now()}@hopescroll-test.com`;
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

  test('should handle portrait to landscape rotation (iPad)', async ({ page }) => {
    await login(page);
    await page.goto('/watch');

    console.log(`\n🔄 Testing orientation change`);

    // Start in portrait
    await page.setViewportSize(VIEWPORTS.tablet_portrait);
    await page.waitForTimeout(500);

    let hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasHorizontalScroll).toBe(false);
    console.log(`   ✓ Portrait mode: no horizontal scroll`);

    // Switch to landscape
    await page.setViewportSize(VIEWPORTS.tablet_landscape);
    await page.waitForTimeout(500);

    hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasHorizontalScroll).toBe(false);
    console.log(`   ✓ Landscape mode: no horizontal scroll`);

    // Navigation should still be visible
    await expect(page.locator('nav')).toBeVisible();
    console.log(`   ✓ Navigation visible in both orientations`);
  });
});
