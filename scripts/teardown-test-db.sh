#!/bin/bash
# Teardown script for test database
# This script stops and removes the test database container

set -e  # Exit on error

echo "🛑 Stopping test database..."

# Check if Docker is available
if ! command -v docker.exe &> /dev/null; then
    echo "❌ Docker not found. Please install Docker Desktop for Windows."
    exit 1
fi

# Stop and remove the test database container
docker.exe compose -f docker-compose.test.yml down -v

echo "✅ Test database stopped and removed!"
