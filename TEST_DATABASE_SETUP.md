# Quick Test Database Setup

This project uses a Dockerized PostgreSQL database for fast, isolated testing.

## 🚀 Quick Start

### Prerequisites
- Docker Desktop for Windows (must be running)
- WSL2 integration enabled in Docker Desktop

### Setup (First Time)

1. **Start Docker Desktop** - Ensure Docker Desktop is running

2. **Start Test Database**
   ```bash
   npm run test:db:start
   ```
   This will:
   - Start PostgreSQL 16 container on port 5433
   - Use RAM disk (tmpfs) for maximum speed
   - Run all Prisma migrations

3. **Run Tests**
   ```bash
   npm run test
   ```

4. **Stop Database** (when done)
   ```bash
   npm run test:db:stop
   ```

## 📋 Commands

| Command | Description |
|---------|-------------|
| `npm run test:db:start` | Start test database and run migrations |
| `npm run test:db:stop` | Stop and remove test database |
| `npm run test:db:reset` | Reset database to clean state |
| `npm run test:db:logs` | View database logs |
| `npm run test` | Run all tests |
| `npm run test:watch` | Run tests in watch mode |

## 🎯 Typical Workflow

```bash
# Start database (once per session)
npm run test:db:start

# Run tests (can run multiple times)
npm run test

# Or use watch mode during development
npm run test:watch

# Stop database when done for the day
npm run test:db:stop
```

## ⚡ Performance

**Speed improvements compared to remote database:**
- Single test: **10x faster** (50ms vs 500ms)
- Full suite: **10x faster** (2s vs 20s)

## 🐛 Troubleshooting

### Docker Desktop Not Running
**Error:** `Docker Desktop is not running`

**Solution:** Start Docker Desktop and wait for it to fully initialize.

### Port Already in Use
**Error:** `port 5433 is already allocated`

**Solution:**
```bash
npm run test:db:stop
```

### Database Not Ready
**Error:** `Can't reach database server`

**Solution:** Wait a few seconds and try again, or check logs:
```bash
npm run test:db:logs
```

## 📚 Full Documentation

See [docs/how-to/test-database-setup.md](./docs/how-to/test-database-setup.md) for complete documentation including:
- Performance optimizations explained
- Advanced workflows
- Best practices for test isolation
- CI/CD integration
- Troubleshooting guide

## 🔒 Security Note

The `.env.test` file contains **local-only test credentials** and is safe to commit. These credentials only work with the local Docker container and cannot access any production systems.
