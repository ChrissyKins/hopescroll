#!/bin/bash
# Performance Testing Runner Script
#
# This script:
# 1. Ensures production build exists
# 2. Starts production server
# 3. Runs performance and responsiveness tests
# 4. Cleans up after completion

set -e  # Exit on error

echo "🚀 Performance Testing Runner"
echo "=============================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if build exists
if [ ! -d ".next" ]; then
    echo -e "${YELLOW}⚠ No production build found. Building now...${NC}"
    npm run build
else
    echo -e "${GREEN}✓ Production build found${NC}"
fi

# Check if test database is running
echo ""
echo "🔍 Checking test database..."
if docker.exe ps | grep -q "hopescroll-test-db"; then
    echo -e "${GREEN}✓ Test database is running${NC}"
else
    echo -e "${YELLOW}⚠ Test database not running. Starting it now...${NC}"
    npm run test:db:start
fi

# Check if server is already running on port 3000
echo ""
echo "🔍 Checking if server is running on port 3000..."
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Server is already running${NC}"
    SERVER_ALREADY_RUNNING=true
else
    echo -e "${YELLOW}⚠ Server not running. Starting production server with test database...${NC}"
    npm run start:test &
    SERVER_PID=$!
    SERVER_ALREADY_RUNNING=false

    # Wait for server to start
    echo "⏳ Waiting for server to be ready..."
    max_attempts=30
    attempt=0

    until curl -s http://localhost:3000 > /dev/null 2>&1; do
        attempt=$((attempt + 1))
        if [ $attempt -ge $max_attempts ]; then
            echo -e "${RED}❌ Server failed to start after ${max_attempts} seconds${NC}"
            kill $SERVER_PID 2>/dev/null || true
            exit 1
        fi
        echo "  Waiting... (${attempt}/${max_attempts})"
        sleep 1
    done

    echo -e "${GREEN}✓ Server is ready!${NC}"
fi

# Run the tests
echo ""
echo "🧪 Running performance and responsiveness tests..."
echo ""

# Disable webServer in config by using environment variable
export SKIP_WEBSERVER=true

# Run tests with manual server management
if npx playwright test --config=playwright.config.production.ts "$@"; then
    echo ""
    echo -e "${GREEN}✅ All tests passed!${NC}"
    TEST_EXIT_CODE=0
else
    echo ""
    echo -e "${RED}❌ Some tests failed${NC}"
    TEST_EXIT_CODE=1
fi

# Cleanup: stop server if we started it
if [ "$SERVER_ALREADY_RUNNING" = false ]; then
    echo ""
    echo "🛑 Stopping production server..."
    kill $SERVER_PID 2>/dev/null || true
    wait $SERVER_PID 2>/dev/null || true
    echo -e "${GREEN}✓ Server stopped${NC}"
fi

echo ""
echo "📊 Test report available at: playwright-report-production/index.html"
echo ""
echo "To view the report: npx playwright show-report playwright-report-production"
echo ""

exit $TEST_EXIT_CODE
