# Test Database Setup

**Version:** 1.0
**Last Updated:** 2025-10-26

This guide explains how to use the Dockerized PostgreSQL database for running tests with HopeScroll.

---

## Why Use Docker for Test Database?

Running tests against a local Docker PostgreSQL instance provides several benefits:

1. **Speed** - Much faster than remote database connections (Neon, etc.)
2. **Isolation** - Tests don't affect production or development data
3. **Consistency** - Same database version and configuration for all developers
4. **Performance** - Optimized for testing with tmpfs (RAM disk) storage
5. **Reliability** - No network latency or connection issues

---

## Quick Start

### 1. Start the Test Database

```bash
npm run test:db:start
```

This will:
- Start a PostgreSQL 16 container on port 5433
- Use a RAM disk (tmpfs) for maximum speed
- Run all Prisma migrations
- Configure performance optimizations for testing

### 2. Run Tests

```bash
npm run test
```

Tests will automatically use the local Docker database via the `.env.test` configuration.

### 3. Stop the Test Database

```bash
npm run test:db:stop
```

This stops and removes the container (data is discarded).

---

## Available Commands

| Command | Description |
|---------|-------------|
| `npm run test:db:start` | Start test database and run migrations |
| `npm run test:db:stop` | Stop and remove test database |
| `npm run test:db:reset` | Reset database to clean state |
| `npm run test:db:logs` | View database logs (Ctrl+C to exit) |
| `npm run test` | Run tests (requires database running) |
| `npm run test:watch` | Run tests in watch mode |

---

## Configuration

### Docker Compose

The test database is configured in `docker-compose.test.yml`:

```yaml
services:
  postgres-test:
    image: postgres:16-alpine
    container_name: hopescroll-test-db
    ports:
      - "5433:5432"  # Avoids conflicts with local postgres
    volumes:
      - type: tmpfs
        target: /var/lib/postgresql/data  # RAM disk for speed
```

### Environment Variables

Test environment variables are in `.env.test`:

```bash
POSTGRES_URL="postgresql://hopescroll_test:test_password_local_only@localhost:5433/hopescroll_test"
```

**Important:** `.env.test` is committed to the repository with safe local-only credentials. Never put production credentials in this file!

### Performance Optimizations

The test database uses several optimizations for speed:

1. **tmpfs (RAM disk)** - Database stored entirely in memory (1GB limit)
2. **fsync=off** - Disables disk synchronization (safe for tests)
3. **synchronous_commit=off** - Async commits for faster writes
4. **full_page_writes=off** - Reduces write overhead
5. **checkpoint_timeout=1d** - Minimal checkpointing

⚠️ **Warning:** These optimizations sacrifice durability for speed. This is perfect for tests (data is ephemeral), but **NEVER use these settings in production!**

---

## Workflow Examples

### Basic Test Workflow

```bash
# First time setup
npm run test:db:start

# Run tests
npm run test

# When done
npm run test:db:stop
```

### Development with Watch Mode

```bash
# Start database (once per session)
npm run test:db:start

# Run tests in watch mode (automatically reruns on changes)
npm run test:watch

# When done
npm run test:db:stop
```

### Reset Database Between Test Runs

If your tests leave data in an inconsistent state:

```bash
npm run test:db:reset  # Drops all tables and reruns migrations
npm run test
```

### Debugging Database Issues

View real-time database logs:

```bash
npm run test:db:logs
```

Check if the container is running:

```bash
docker.exe ps | grep hopescroll-test-db
```

Connect to the database directly:

```bash
docker.exe exec -it hopescroll-test-db psql -U hopescroll_test -d hopescroll_test
```

---

## Troubleshooting

### Docker Not Found

**Error:** `docker: command not found`

**Solution:** Ensure Docker Desktop is installed and WSL integration is enabled:
1. Open Docker Desktop
2. Settings → Resources → WSL Integration
3. Enable integration for your WSL distro

### Port Already in Use

**Error:** `port 5433 is already allocated`

**Solution:** Stop the existing container or process using port 5433:

```bash
npm run test:db:stop
# or
docker.exe ps  # Find the container ID
docker.exe stop <container-id>
```

### Database Connection Timeout

**Error:** `Can't reach database server at localhost:5433`

**Solution:**
1. Check if container is running: `docker.exe ps`
2. Check container logs: `npm run test:db:logs`
3. Restart database: `npm run test:db:stop && npm run test:db:start`

### Migration Failures

**Error:** Prisma migration errors during `test:db:start`

**Solution:**
1. Stop the database: `npm run test:db:stop`
2. Fix any schema issues in `prisma/schema.prisma`
3. Create a new migration: `npm run db:migrate`
4. Start test database again: `npm run test:db:start`

### Tests Hanging or Timing Out

**Issue:** Tests run slowly or hang indefinitely

**Possible causes:**
1. Database not running: Run `npm run test:db:start`
2. Connection pool exhaustion: Check `vitest.config.ts` settings
3. Database locks: Run `npm run test:db:reset`

### WSL2 Memory Issues

**Issue:** Docker container crashes or system slows down

**Solution:** The tmpfs volume uses up to 1GB of RAM. If this is too much:

1. Edit `docker-compose.test.yml`
2. Reduce tmpfs size:
   ```yaml
   tmpfs:
     size: 524288000  # 512MB instead of 1GB
   ```
3. Restart: `npm run test:db:stop && npm run test:db:start`

---

## How It Works

### Architecture

```
┌─────────────────┐
│   Vitest Tests  │
│                 │
│  - Unit tests   │
│  - Integration  │
│  - API tests    │
└────────┬────────┘
         │
         │ .env.test (localhost:5433)
         │
         ▼
┌─────────────────┐
│  Docker Desktop │
│                 │
│  ┌───────────┐  │
│  │ PostgreSQL│  │
│  │   16      │  │
│  │ (tmpfs)   │  │
│  └───────────┘  │
└─────────────────┘
```

### Test Environment Loading

1. `vitest.config.ts` loads `.env.test` before running tests
2. Tests use `POSTGRES_URL` from `.env.test` (localhost:5433)
3. Prisma connects to local Docker database instead of remote Neon
4. Tests run with full database isolation

### Cleanup

After each test file:
- Vitest's `afterAll` hook in `tests/setup.ts` disconnects from database
- Database remains running for next test file (fast)
- Data persists between test files (use transactions or reset if needed)

After all tests:
- Run `npm run test:db:stop` to remove container and free resources
- All data is discarded (tmpfs = ephemeral)

---

## Best Practices

### 1. Use Transactions for Test Isolation

For integration tests that modify the database:

```typescript
import { prisma } from '@/lib/db';

describe('User API', () => {
  beforeEach(async () => {
    // Start a transaction
    await prisma.$executeRaw`BEGIN`;
  });

  afterEach(async () => {
    // Rollback after each test
    await prisma.$executeRaw`ROLLBACK`;
  });

  it('should create a user', async () => {
    // Test code - changes will be rolled back
  });
});
```

### 2. Use Factories for Test Data

Create helper functions for test data:

```typescript
// tests/helpers/factories.ts
export async function createTestUser(data?: Partial<User>) {
  return prisma.user.create({
    data: {
      email: `test-${Date.now()}@example.com`,
      password: 'hashed-password',
      ...data,
    },
  });
}
```

### 3. Clean Up After Tests

For tests that create data:

```typescript
afterEach(async () => {
  // Clean up specific data
  await prisma.contentItem.deleteMany();
  await prisma.user.deleteMany();
});
```

### 4. Use Database Reset Between Suites

If you need a completely clean database:

```bash
npm run test:db:reset  # Full reset (slow)
npm run test           # Run tests
```

### 5. Keep Database Running During Development

Don't stop/start the database between test runs:

```bash
# Start once
npm run test:db:start

# Run tests multiple times
npm run test
npm run test:watch

# Only stop when done for the day
npm run test:db:stop
```

---

## Performance Comparison

Typical test execution times:

| Database | Single Test | Full Suite (40 tests) |
|----------|-------------|------------------------|
| Neon (remote) | ~500ms | ~20s |
| Docker (tmpfs) | ~50ms | ~2s |
| **Speed improvement** | **10x faster** | **10x faster** |

---

## FAQ

**Q: Why port 5433 instead of 5432?**
A: To avoid conflicts if you have PostgreSQL installed locally. The container internally uses 5432, but it's mapped to 5433 on your host.

**Q: Will this affect my production database?**
A: No! Tests use `.env.test` which points to `localhost:5433`. Production uses `.env` with Neon credentials.

**Q: What happens to the data when I stop the container?**
A: All data is discarded. The tmpfs volume is stored in RAM and is deleted when the container stops.

**Q: Can I run this on CI/CD?**
A: Yes! Add the `test:db:start` command to your CI pipeline before running tests. Most CI services (GitHub Actions, GitLab CI, etc.) support Docker.

**Q: Do I need to commit `.env.test`?**
A: Yes! `.env.test` contains only local test credentials (safe to commit). This ensures all developers use the same test configuration.

---

## Related Documentation

- [Testing Overview](../reference/testing.md) - Testing strategy and guidelines
- [Database Schema](../reference/database-schema.md) - Complete schema reference
- [Prisma Documentation](https://www.prisma.io/docs) - Official Prisma docs

---

## Troubleshooting Scripts

If you encounter issues, these scripts are in the `/scripts` directory:

- `setup-test-db.sh` - Starts database and runs migrations
- `teardown-test-db.sh` - Stops and removes container
- `reset-test-db.sh` - Resets database to clean state

All scripts include error handling and detailed logging.
