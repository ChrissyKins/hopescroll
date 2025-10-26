# HopeScroll E2E Tests

**Last Updated:** 2025-10-26

This directory contains end-to-end tests for HopeScroll using Playwright.

## Test Suites

### 1. Authentication Flow (`01-authentication.spec.ts`)
Tests user signup, login, and session management:
- User signup with validation
- User login with credentials
- Error handling (wrong password, duplicate email, etc.)
- Session persistence across page navigation
- Protected route redirects

**Total Tests:** ~10 tests

### 2. Source Management (`02-source-management.spec.ts`)
Tests adding and managing YouTube channels:
- Navigate to sources page
- Add YouTube channel by ID
- Validate channel IDs (error handling)
- Prevent duplicate channels
- Search, mute/unmute, delete sources
- Source statistics display
- Integration with feed (content appears after adding source)

**Total Tests:** ~12 tests

### 3. Saved Content & Collections (`03-saved-content-collections.spec.ts`)
Tests saving content and organizing into collections:
- Save/unsave content from feed
- Create, edit, delete collections
- Assign content to collections
- Filter by collection
- Add notes to saved items
- Move items between collections

**Total Tests:** ~12 tests

### 4. Filter Management (`04-filter-management.spec.ts`)
Tests content filtering and feed preferences:
- Add/delete keyword filters
- Wildcard filter support
- Duplicate prevention
- Search through filters
- Duration preferences (min/max)
- Backlog ratio and diversity limits
- Verify filters applied to feed

**Total Tests:** ~12 tests

### 5. Watch & History (`05-watch-and-history.spec.ts`)
Tests video watching and interaction tracking:
- Video player loads
- Next/Discover navigation
- Mark as watched (3-second threshold)
- Duration and recency filters on watch page
- Save, dismiss, not-now actions
- Watch history recording
- History filtering and search
- Feed browsing (scroll page)
- Infinite scroll support

**Total Tests:** ~20 tests

## Total E2E Coverage

- **Test Suites:** 5
- **Estimated Tests:** ~66 tests
- **Critical User Journeys:** 5 complete flows

## Running E2E Tests

### Prerequisites

```bash
# Install dependencies
npm install

# Install Playwright browsers (Chromium)
npx playwright install chromium
```

### Run Tests

```bash
# Run all E2E tests (headless)
npm run test:e2e

# Run with UI mode (interactive)
npm run test:e2e:ui

# Run with browser visible (headed mode)
npm run test:e2e:headed

# Debug mode (step through tests)
npm run test:e2e:debug

# Run specific test file
npx playwright test tests/e2e/01-authentication.spec.ts

# Run tests matching pattern
npx playwright test --grep "should login"
```

### View Test Reports

```bash
# View HTML report
npx playwright show-report
```

## Configuration

E2E tests are configured in `playwright.config.ts`:

- **Base URL:** `http://localhost:3000` (auto-starts dev server)
- **Timeout:** 30 seconds per test
- **Retries:** 2 on CI, 0 locally
- **Screenshots:** On failure
- **Video:** On first retry
- **Trace:** On first retry

## Test Helpers

### Authentication Helpers (`helpers/auth-helpers.ts`)

- `signUpUser(page, user)` - Sign up through UI
- `loginUser(page, user)` - Log in through UI
- `logoutUser(page)` - Log out
- `createTestUser(suffix)` - Generate unique test user
- `ensureLoggedIn(page, user)` - Ensure authenticated

### Database Helpers (`helpers/db-helpers.ts`)

- `cleanupTestUser(email)` - Delete test user and data
- `cleanupAllTestUsers()` - Delete all test users
- `createVerifiedUser(email, password)` - Create user directly in DB
- `disconnectDb()` - Close Prisma connection

## Test Data

Test users follow the pattern:
- Email: `e2e-{purpose}-{timestamp}@hopescroll-test.com`
- Password: `TestPassword123!`

All test data is automatically cleaned up in `afterAll` hooks.

## CI/CD Integration

E2E tests are designed to run in CI:
- Auto-starts Next.js dev server
- Uses headless browser
- Retries failed tests (2x)
- Generates HTML reports

## Best Practices

1. **Isolation:** Each test suite creates its own test user
2. **Cleanup:** Always cleanup test data in `afterAll`
3. **Selectors:** Use semantic selectors (text, aria-label) over CSS classes
4. **Waits:** Use `waitForSelector` and `waitForURL` instead of fixed timeouts
5. **Assertions:** Prefer `expect(locator).toBeVisible()` over counting
6. **Resilience:** Handle missing UI elements gracefully (feature flags, empty states)

## Troubleshooting

### Tests Timing Out

- Increase timeout in `playwright.config.ts`
- Check that dev server is starting correctly
- Verify database connectivity

### Flaky Tests

- Add explicit waits for async operations
- Use `waitForLoadState('networkidle')` after navigation
- Avoid hardcoded timeouts, use `waitFor*` methods

### Browser Not Found

```bash
# Reinstall browsers
npx playwright install --force chromium
```

### Database Cleanup Issues

```bash
# Manually cleanup test users
npm run db:studio
# Delete users with emails containing @hopescroll-test.com
```

## Future Improvements

- [ ] Add visual regression tests (screenshot comparison)
- [ ] Add accessibility tests (axe-core integration)
- [ ] Add performance benchmarks
- [ ] Add mobile viewport tests
- [ ] Add network failure simulation
- [ ] Add browser compatibility tests (Firefox, Safari)

---

**For more information:** See [Playwright Documentation](https://playwright.dev/)
