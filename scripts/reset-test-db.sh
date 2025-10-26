#!/bin/bash
# Reset script for test database
# This script resets the test database to a clean state

set -e  # Exit on error

echo "🔄 Resetting test database..."

# Check if Docker is available
if ! command -v docker.exe &> /dev/null; then
    echo "❌ Docker not found. Please install Docker Desktop for Windows."
    exit 1
fi

# Check if container is running
if ! docker.exe ps --format '{{.Names}}' | grep -q "^hopescroll-test-db$"; then
    echo "⚠️  Test database is not running. Starting it..."
    bash scripts/setup-test-db.sh
    exit 0
fi

echo "🗑️  Dropping and recreating database..."
export DATABASE_URL="postgresql://hopescroll_test:test_password_local_only@localhost:5433/hopescroll_test"

# Drop all tables using Prisma
npx prisma migrate reset --force --skip-seed

echo "✅ Test database reset complete!"
echo ""
echo "🧪 Ready to run tests: npm run test"
