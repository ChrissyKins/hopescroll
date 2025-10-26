#!/bin/bash
# Setup script for test database
# This script starts the Docker test database and runs migrations

set -e  # Exit on error

echo "🚀 Setting up test database..."

# Check if Docker is available
if ! command -v docker.exe &> /dev/null; then
    echo "❌ Docker not found. Please install Docker Desktop for Windows."
    exit 1
fi

# Check if Docker Desktop is running
if ! docker.exe info &> /dev/null; then
    echo "❌ Docker Desktop is not running. Please start Docker Desktop and try again."
    exit 1
fi

# Start the test database container
echo "📦 Starting PostgreSQL test container..."
docker.exe compose -f docker-compose.test.yml up -d

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
max_attempts=30
attempt=0

until docker.exe compose -f docker-compose.test.yml exec -T postgres-test pg_isready -U hopescroll_test > /dev/null 2>&1; do
  attempt=$((attempt + 1))
  if [ $attempt -ge $max_attempts ]; then
    echo "❌ Database failed to start after ${max_attempts} seconds"
    docker.exe compose -f docker-compose.test.yml logs postgres-test
    exit 1
  fi
  echo "  Waiting... (${attempt}/${max_attempts})"
  sleep 1
done

echo "✅ Database is ready!"

# Run Prisma migrations
echo "🔄 Running Prisma migrations..."
export DATABASE_URL="postgresql://hopescroll_test:test_password_local_only@localhost:5433/hopescroll_test"
npx prisma migrate deploy

echo "✅ Test database setup complete!"
echo ""
echo "📊 Connection string: postgresql://hopescroll_test:test_password_local_only@localhost:5433/hopescroll_test"
echo ""
echo "🧪 To run tests: npm run test"
echo "🛑 To stop database: npm run test:db:stop"
