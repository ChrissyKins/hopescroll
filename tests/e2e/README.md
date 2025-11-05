# E2E Testing Guide

## Quick Start

### Run Standard E2E Tests (Development)
```bash
npm run test:e2e
```

### Run Performance Tests (Safe - Test Database)
```bash
npm run test:db:start           # Start test database
npm run build                    # Build production
npm run test:e2e:production      # Run performance tests
```

### Run Performance Tests (⚠️  Production Database)
```bash
npm run build                           # Build production
npm run test:e2e:production-live        # Run tests on REAL prod DB!
```

## Test Configurations

| Config | Database | Use Case | Command |
|--------|----------|----------|---------|
| `playwright.config.ts` | Dev DB | Development testing | `npm run test:e2e` |
| `playwright.config.production.ts` | **Test DB** | Performance testing (safe) | `npm run test:e2e:production` |
| `playwright.config.production-live.ts` | **Prod DB** ⚠️  | Live production testing | `npm run test:e2e:production-live` |

---

**Last Updated:** 2025-11-03
