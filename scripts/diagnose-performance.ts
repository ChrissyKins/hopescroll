#!/usr/bin/env tsx
/**
 * Performance Diagnostic Script
 *
 * Tests database performance and identifies potential WSL-related issues
 * Run with: tsx scripts/diagnose-performance.ts
 */

import { PrismaClient } from '@prisma/client';
import { performance } from 'perf_hooks';
import fs from 'fs';
import os from 'os';

const db = new PrismaClient({
  log: ['error', 'warn'],
});

interface TestResult {
  name: string;
  duration: number;
  status: 'PASS' | 'WARN' | 'FAIL';
  details?: string;
}

const results: TestResult[] = [];

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color?: keyof typeof colors) {
  const c = color ? colors[color] : '';
  console.log(`${c}${message}${colors.reset}`);
}

function formatDuration(ms: number): string {
  if (ms < 1) return `${(ms * 1000).toFixed(2)}μs`;
  if (ms < 1000) return `${ms.toFixed(2)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

async function runTest(
  name: string,
  testFn: () => Promise<void>,
  warnThreshold: number,
  failThreshold: number
): Promise<void> {
  log(`\n▶ Running: ${name}`, 'cyan');
  const start = performance.now();

  try {
    await testFn();
    const duration = performance.now() - start;

    let status: 'PASS' | 'WARN' | 'FAIL' = 'PASS';
    if (duration > failThreshold) {
      status = 'FAIL';
    } else if (duration > warnThreshold) {
      status = 'WARN';
    }

    results.push({ name, duration, status });

    const color = status === 'PASS' ? 'green' : status === 'WARN' ? 'yellow' : 'red';
    log(`  ✓ ${status}: ${formatDuration(duration)}`, color);
  } catch (error) {
    const duration = performance.now() - start;
    results.push({
      name,
      duration,
      status: 'FAIL',
      details: error instanceof Error ? error.message : String(error),
    });
    log(`  ✗ FAIL: ${error instanceof Error ? error.message : error}`, 'red');
  }
}

async function main() {
  log('\n========================================', 'blue');
  log('  Performance Diagnostic Tool', 'blue');
  log('========================================\n', 'blue');

  // System Information
  log('System Information:', 'cyan');
  log(`  Platform: ${os.platform()}`);
  log(`  Release: ${os.release()}`);
  log(`  CPU: ${os.cpus()[0]?.model || 'Unknown'}`);
  log(`  CPU Cores: ${os.cpus().length}`);
  log(`  Total Memory: ${(os.totalmem() / 1024 / 1024 / 1024).toFixed(2)} GB`);
  log(`  Free Memory: ${(os.freemem() / 1024 / 1024 / 1024).toFixed(2)} GB`);

  // Check if running on WSL
  const isWSL = os.release().toLowerCase().includes('wsl') ||
                os.release().toLowerCase().includes('microsoft');
  if (isWSL) {
    log(`  ⚠ WSL Detected: ${os.release()}`, 'yellow');
  }

  // Database location check (WSL-specific)
  const dbUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL || '';
  log(`\nDatabase Configuration:`, 'cyan');
  log(`  URL: ${dbUrl.replace(/:[^:@]+@/, ':****@')}`);

  if (isWSL && (dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1'))) {
    log(`  ⚠ WARNING: Using localhost on WSL may cause performance issues`, 'yellow');
    log(`  Consider using host.docker.internal or the Windows host IP`, 'yellow');
  }

  // Test 1: Basic Connection
  await runTest(
    'Database Connection',
    async () => {
      await db.$queryRaw`SELECT 1 as test`;
    },
    100, // warn threshold (ms)
    500  // fail threshold (ms)
  );

  // Test 2: Simple Query
  await runTest(
    'Simple Query (SELECT NOW())',
    async () => {
      await db.$queryRaw`SELECT NOW()`;
    },
    50,
    200
  );

  // Test 3: Count Users
  await runTest(
    'Count Users',
    async () => {
      await db.user.count();
    },
    100,
    500
  );

  // Test 4: Count Content Items
  await runTest(
    'Count Content Items',
    async () => {
      await db.contentItem.count();
    },
    100,
    500
  );

  // Test 5: Count Interactions
  await runTest(
    'Count Interactions',
    async () => {
      await db.contentInteraction.count();
    },
    100,
    500
  );

  // Test 6: Complex Query with Joins
  await runTest(
    'Complex Query: Recent Content with Sources',
    async () => {
      await db.contentItem.findMany({
        take: 10,
        orderBy: { publishedAt: 'desc' },
        include: {
          interactions: {
            take: 5,
          },
        },
      });
    },
    200,
    1000
  );

  // Test 7: Sequential Queries (simulating N+1 problem)
  await runTest(
    'Sequential Query Pattern (potential N+1)',
    async () => {
      const users = await db.user.findMany({ take: 5 });
      for (const user of users) {
        await db.contentInteraction.count({
          where: { userId: user.id },
        });
      }
    },
    300,
    1500
  );

  // Test 8: Index Usage Check
  await runTest(
    'Index Test: Find Content by sourceId',
    async () => {
      const content = await db.contentItem.findFirst();
      if (content) {
        await db.contentItem.findMany({
          where: {
            sourceId: content.sourceId,
            sourceType: content.sourceType,
          },
          take: 10,
        });
      }
    },
    150,
    750
  );

  // Test 9: Write Performance
  await runTest(
    'Write Performance: Create & Delete Test Record',
    async () => {
      const testUser = await db.user.create({
        data: {
          email: `test-${Date.now()}@example.com`,
          password: 'test-password-hash',
        },
      });
      await db.user.delete({
        where: { id: testUser.id },
      });
    },
    200,
    1000
  );

  // Test 10: Transaction Performance
  await runTest(
    'Transaction: Multiple Operations',
    async () => {
      await db.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT 1`;
        await tx.user.count();
        await tx.contentItem.count();
      });
    },
    200,
    1000
  );

  // Test 11: File System Speed (WSL-specific)
  if (isWSL) {
    await runTest(
      'File System Speed (WSL Check)',
      async () => {
        const testFile = '/tmp/perf-test.tmp';
        const data = Buffer.alloc(1024 * 1024); // 1MB
        await fs.promises.writeFile(testFile, data);
        await fs.promises.readFile(testFile);
        await fs.promises.unlink(testFile);
      },
      50,
      200
    );
  }

  // Summary Report
  log('\n========================================', 'blue');
  log('  Summary Report', 'blue');
  log('========================================\n', 'blue');

  const passed = results.filter(r => r.status === 'PASS').length;
  const warned = results.filter(r => r.status === 'WARN').length;
  const failed = results.filter(r => r.status === 'FAIL').length;

  log(`Total Tests: ${results.length}`);
  log(`Passed: ${passed}`, passed > 0 ? 'green' : undefined);
  log(`Warnings: ${warned}`, warned > 0 ? 'yellow' : undefined);
  log(`Failed: ${failed}`, failed > 0 ? 'red' : undefined);

  const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
  log(`\nAverage Test Duration: ${formatDuration(avgDuration)}`);

  // Slowest tests
  const slowest = [...results].sort((a, b) => b.duration - a.duration).slice(0, 5);
  log('\nSlowest Tests:', 'cyan');
  slowest.forEach((result, i) => {
    const color = result.status === 'FAIL' ? 'red' : result.status === 'WARN' ? 'yellow' : undefined;
    log(`  ${i + 1}. ${result.name}: ${formatDuration(result.duration)}`, color);
    if (result.details) {
      log(`     Error: ${result.details}`, 'red');
    }
  });

  // Recommendations
  log('\n========================================', 'blue');
  log('  Recommendations', 'blue');
  log('========================================\n', 'blue');

  if (isWSL && (dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1'))) {
    log('⚠ WSL Performance Issue Detected:', 'yellow');
    log('  Your database is accessed via localhost on WSL.');
    log('  This can cause significant slowdowns due to WSL networking overhead.');
    log('  \nSolutions:');
    log('  1. If DB is on Windows: Use Windows host IP instead of localhost');
    log('     - Find Windows IP: ipconfig in Windows PowerShell');
    log('     - Update DATABASE_URL to use that IP');
    log('  2. If DB is in Docker: Use host.docker.internal');
    log('  3. Move DB to WSL filesystem for better performance');
  }

  if (failed > 0) {
    log('\n⚠ Performance Issues Detected:', 'red');
    log('  Some tests failed or took too long.');
    const failedTests = results.filter(r => r.status === 'FAIL');
    failedTests.forEach(test => {
      log(`  - ${test.name}: ${formatDuration(test.duration)}`);
      if (test.details) {
        log(`    Error: ${test.details}`);
      }
    });
  }

  if (warned > 0) {
    log('\n⚠ Performance Warnings:', 'yellow');
    const warnedTests = results.filter(r => r.status === 'WARN');
    warnedTests.forEach(test => {
      log(`  - ${test.name}: ${formatDuration(test.duration)}`);
    });
  }

  if (avgDuration > 200) {
    log('\n⚠ Overall slow performance detected. Possible causes:', 'yellow');
    log('  1. WSL networking overhead (if using localhost)');
    log('  2. Database not optimized or lacking indexes');
    log('  3. Network latency to remote database');
    log('  4. Insufficient database resources');
    log('  5. Cold start (first query after idle period)');
  }

  // Database Stats
  log('\n========================================', 'blue');
  log('  Database Statistics', 'blue');
  log('========================================\n', 'blue');

  try {
    const [users, sources, content, interactions, savedContent] = await Promise.all([
      db.user.count(),
      db.contentSource.count(),
      db.contentItem.count(),
      db.contentInteraction.count(),
      db.savedContent.count(),
    ]);

    log(`Users: ${users.toLocaleString()}`);
    log(`Content Sources: ${sources.toLocaleString()}`);
    log(`Content Items: ${content.toLocaleString()}`);
    log(`Interactions: ${interactions.toLocaleString()}`);
    log(`Saved Content: ${savedContent.toLocaleString()}`);

    if (interactions > 10000 || content > 5000) {
      log('\n⚠ Large dataset detected. Consider:', 'yellow');
      log('  - Adding database connection pooling');
      log('  - Implementing pagination everywhere');
      log('  - Adding composite indexes for common queries');
      log('  - Archiving old interactions');
    }
  } catch (error) {
    log(`Error fetching stats: ${error}`, 'red');
  }

  await db.$disconnect();

  log('\n========================================\n', 'blue');
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
