# Performance & Responsiveness Testing Guide

## Overview

This guide covers the performance and responsiveness test suites for HopeScroll. These tests measure page load times, UI responsiveness, and cross-device compatibility using production builds.

## ⚠️  Test Modes: Test DB vs Production DB

HopeScroll supports **two performance testing modes**:

### 1. Test Database Mode (✅ Safe, Recommended)
- **Config:** `playwright.config.production.ts`
- **Database:** Local PostgreSQL test database (localhost:5433)
- **Use case:** Safe testing during development, CI/CD
- **Commands:**
  ```bash
  npm run test:e2e:production         # All tests
  npm run test:e2e:performance        # Performance only
  npm run test:e2e:responsiveness     # Responsiveness only
  ```

### 2. Live Production Mode (⚠️  Use with Caution!)
- **Config:** `playwright.config.production-live.ts`
- **Database:** Real production database (Neon)
- **Use case:** Testing actual production stack with real network latency
- **Commands:**
  ```bash
  npm run test:e2e:production-live    # All tests on prod
  npm run test:e2e:performance-live   # Performance only on prod
  ```
- **⚠️  WARNING:** Creates test users in production database!
- **Cleanup:** Delete test users manually after testing:
  ```sql
  DELETE FROM "User" WHERE email LIKE '%@hopescroll-test.com';
  ```

## Test Suites

### 1. Performance Tests (`performance.spec.ts`)

Measures page load times and Core Web Vitals metrics across all major pages.

**Metrics Measured:**
- **TTFB (Time to First Byte)**: < 800ms
- **FCP (First Contentful Paint)**: < 1.8s
- **LCP (Largest Contentful Paint)**: < 2.5s (Core Web Vital)
- **DOM Content Loaded**: < 3s
- **Full Load Time**: < 5s

**Pages Tested:**
- `/login` - Public login page
- `/` - Landing page
- `/watch` - Main feed (authenticated)
- `/sources` - Source management (authenticated)
- `/scroll` - Saved content (authenticated)
- `/filters` - Filter management (authenticated)
- `/collections` - Collections page (authenticated)

**Additional Tests:**
- Client-side navigation performance
- Interactive responsiveness
- Bundle size validation
- Resource loading efficiency

### 2. Responsiveness Tests (`responsiveness.spec.ts`)

Tests UI layout and functionality across different viewport sizes and devices.

**Viewports Tested:**
- **Mobile**: iPhone 12 (390x844), Pixel 5 (393x851)
- **Tablet**: iPad Portrait (768x1024), iPad Landscape (1024x768)
- **Desktop**: 1920x1080, 2560x1440

**Elements Tested:**
- Navigation visibility and layout
- Feed card rendering and sizing
- Form layouts and input accessibility
- Button touch target sizes (44x44px minimum)
- Text readability and overflow handling
- Touch interaction spacing
- Orientation change handling

## Running the Tests

### Test Database Mode (Recommended)

1. **Start test database:**
   ```bash
   npm run test:db:start
   ```

2. **Build production version:**
   ```bash
   npm run build
   ```

3. **Run tests:**
   ```bash
   # All tests
   npm run test:e2e:production

   # Performance only
   npm run test:e2e:performance

   # Responsiveness only
   npm run test:e2e:responsiveness
   ```

   Tests automatically start the server with test database configuration.

### Live Production Mode (⚠️  Use with Caution)

1. **Build production version:**
   ```bash
   npm run build
   ```

2. **Run tests:**
   ```bash
   # All tests on production stack
   npm run test:e2e:production-live

   # Performance only on production stack
   npm run test:e2e:performance-live
   ```

   **Note:** This creates test users in production. Clean up afterward:
   ```sql
   DELETE FROM "User" WHERE email LIKE '%@hopescroll-test.com';
   ```

### Run Tests in UI Mode

```bash
# Interactive UI mode (helpful for debugging)
playwright test --config=playwright.config.production.ts --ui
```

### Run Tests in Headed Mode

```bash
# See the browser while tests run
playwright test --config=playwright.config.production.ts --headed
```

### Run Specific Test Files

```bash
# Performance tests only
playwright test tests/e2e/performance.spec.ts --config=playwright.config.production.ts

# Responsiveness tests only
playwright test tests/e2e/responsiveness.spec.ts --config=playwright.config.production.ts
```

### Run on Specific Devices

```bash
# Test only on mobile
playwright test --config=playwright.config.production.ts --project=mobile-chrome

# Test only on desktop
playwright test --config=playwright.config.production.ts --project=chromium-desktop

# Test on iPad
playwright test --config=playwright.config.production.ts --project=tablet-ipad
```

## Configuration

### Production Config (`playwright.config.production.ts`)

The production config differs from the standard dev config:

- Uses **production build** (`npm run start`)
- Tests on **multiple devices** (desktop, mobile, tablet)
- Tests on **multiple browsers** (Chrome, Firefox, Safari)
- Longer timeouts for production builds
- Separate report directory (`playwright-report-production/`)

### Environment Variables

Set these in `.env` or `.env.local`:

```bash
# Production database URL (if different from dev)
DATABASE_URL_PRODUCTION=postgresql://user:pass@host:port/db

# Base URL for tests (default: http://localhost:3000)
PLAYWRIGHT_BASE_URL=http://localhost:3000
```

## Understanding Test Results

### Performance Metrics

After running performance tests, you'll see output like:

```
📊 Performance Metrics for Watch Page:
   TTFB: 245.32ms
   FCP: 892.15ms
   LCP: 1247.89ms
   DOM Content Loaded: 1456.23ms
   Load Complete: 2134.67ms
```

**What These Mean:**
- **TTFB**: Server response time - should be fast
- **FCP**: When first content appears - affects perceived load time
- **LCP**: When main content appears - Core Web Vital, critical for SEO
- **DOM Content Loaded**: When HTML is fully parsed
- **Load Complete**: When all resources are loaded

### Responsiveness Results

Responsiveness tests check:

```
📱 Testing iPhone 12 (390x844)
   ✓ Form fits viewport (358px wide)
   ✓ Input height suitable for touch (48px)
   ✓ Font size readable (16px)
   ✓ No horizontal scroll
```

**Common Issues Detected:**
- Horizontal overflow (elements too wide)
- Touch targets too small (< 40px)
- Text too small (< 14px)
- Elements too close together (< 8px spacing)

## Performance Thresholds

Tests will fail if metrics exceed these thresholds:

| Metric | Threshold | Notes |
|--------|-----------|-------|
| TTFB | 800ms | Server response time |
| FCP | 1.8s | First content painted |
| LCP | 2.5s | **Core Web Vital** - main content |
| DOM Content Loaded | 3s | HTML fully parsed |
| Full Load | 5s | All resources loaded |

For feed pages (with dynamic content), thresholds are 1.5x higher.

## Devices Tested

### Desktop Browsers
- Chrome (Desktop 1920x1080)
- Firefox (Desktop 1920x1080)
- Safari (Desktop 1920x1080)

### Mobile Devices
- Chrome on Pixel 5 (393x851)
- Safari on iPhone 12 (390x844)

### Tablet Devices
- Safari on iPad (gen 7) (768x1024)

## Debugging Failed Tests

### Performance Test Failures

If a performance test fails:

1. **Check the metrics output** - which metric failed?
2. **Run in headed mode** to see what's loading:
   ```bash
   npm run test:e2e:performance -- --headed
   ```
3. **Check Network tab** - are there slow API calls?
4. **Profile the build** - is the bundle too large?
5. **Check database** - are queries optimized?

### Responsiveness Test Failures

If a responsiveness test fails:

1. **Take screenshots** - tests auto-capture on failure
2. **Run in UI mode** to inspect:
   ```bash
   playwright test --config=playwright.config.production.ts --ui
   ```
3. **Check specific viewport**:
   ```bash
   playwright test responsiveness.spec.ts --config=playwright.config.production.ts --headed
   ```
4. **Inspect CSS** - look for hardcoded widths, missing media queries
5. **Test manually** - open browser DevTools, test responsive mode

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Performance Tests

on:
  push:
    branches: [main]
  pull_request:

jobs:
  performance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run build
      - run: npm run test:db:start
      - run: npm run test:e2e:production
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report-production/
```

## Best Practices

### Performance Testing

1. **Always test with production build** - dev mode is slower
2. **Use realistic data** - test with typical amount of content
3. **Test on target hardware** - mobile devices are slower
4. **Monitor over time** - track metrics across releases
5. **Test on real networks** - use Chrome DevTools throttling

### Responsiveness Testing

1. **Test on real devices** when possible - emulation isn't perfect
2. **Test both orientations** - portrait and landscape
3. **Test with real content** - long titles, URLs, etc.
4. **Check touch targets** - minimum 40x40px, prefer 44x44px
5. **Verify no horizontal scroll** - common mobile issue

## Troubleshooting

### Tests Timeout

If tests timeout:
- Increase timeout in `playwright.config.production.ts`
- Check if build server is actually running
- Verify database is accessible

### Database Connection Issues

If tests fail with DB errors:
- Verify test database is running: `npm run test:db:start`
- Check `DATABASE_URL` in `.env.test`
- Reset test database: `npm run test:db:reset`

### Build Not Starting

If production server doesn't start:
- Build manually first: `npm run build`
- Check for build errors in console
- Verify port 3000 is not in use

### Metrics Not Collected

If performance metrics are `0` or `N/A`:
- Some metrics require multiple page loads
- LCP may not be available on simple pages
- Check browser console for errors

## Reporting Issues

When reporting performance issues, include:

1. **Metrics output** - copy console logs
2. **Test name** - which test failed?
3. **Device/browser** - which project?
4. **Screenshots** - from `test-results-production/`
5. **Video** - if available
6. **System info** - OS, hardware

## Further Reading

- [Core Web Vitals](https://web.dev/vitals/) - Google's performance metrics
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Mobile UX Guidelines](https://developer.apple.com/design/human-interface-guidelines/ios/visual-design/adaptivity-and-layout/)
- [Touch Target Sizes](https://www.w3.org/WAI/WCAG21/Understanding/target-size.html)

## Maintenance

### Updating Thresholds

If you need to adjust performance thresholds:

1. Edit `tests/e2e/performance.spec.ts`
2. Update the `THRESHOLDS` constant
3. Document why in a code comment
4. Update this README

### Adding New Pages

To add performance tests for new pages:

1. Add test in `performance.spec.ts`
2. Use existing test structure
3. Set appropriate thresholds
4. Add to this README

### Adding New Viewports

To test additional viewport sizes:

1. Add to `VIEWPORTS` in `responsiveness.spec.ts`
2. Add corresponding test cases
3. Update this README

---

**Last Updated:** 2025-11-03
