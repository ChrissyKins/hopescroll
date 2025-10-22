import { PrismaClient } from '@prisma/client';

interface LatencyTest {
  query: string;
  duration: number;
}

async function testLatency(connectionUrl: string, label: string): Promise<LatencyTest[]> {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: connectionUrl
      }
    }
  });

  const tests: LatencyTest[] = [];

  try {
    // Test 1: Simple query
    const start1 = Date.now();
    await prisma.$queryRaw`SELECT 1 as result`;
    tests.push({ query: 'SELECT 1', duration: Date.now() - start1 });

    // Test 2: Current timestamp
    const start2 = Date.now();
    await prisma.$queryRaw`SELECT NOW() as timestamp`;
    tests.push({ query: 'SELECT NOW()', duration: Date.now() - start2 });

    // Test 3: Database version
    const start3 = Date.now();
    await prisma.$queryRaw`SELECT version() as version`;
    tests.push({ query: 'SELECT version()', duration: Date.now() - start3 });

    // Test 4: List tables
    const start4 = Date.now();
    await prisma.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' LIMIT 5`;
    tests.push({ query: 'List tables', duration: Date.now() - start4 });

    // Test 5: Count users
    const start5 = Date.now();
    await prisma.user.count();
    tests.push({ query: 'COUNT users', duration: Date.now() - start5 });

  } catch (error) {
    console.error(`Error in ${label}:`, error);
  } finally {
    await prisma.$disconnect();
  }

  return tests;
}

async function main() {
  const pooledUrl = process.env.POSTGRES_URL!;
  const nonPooledUrl = process.env.POSTGRES_URL_NON_POOLING!;

  console.log('🔍 Testing Neon Database Connection Latency\n');
  console.log('━'.repeat(60));

  // Test pooled connection
  console.log('\n📊 Pooled Connection (PgBouncer)');
  console.log('URL:', pooledUrl.replace(/:[^:@]+@/, ':***@'));
  const pooledTests = await testLatency(pooledUrl, 'Pooled');

  pooledTests.forEach(test => {
    console.log(`  ${test.query.padEnd(20)} ${test.duration}ms`);
  });

  const pooledAvg = pooledTests.reduce((sum, t) => sum + t.duration, 0) / pooledTests.length;
  console.log(`  ${'Average'.padEnd(20)} ${pooledAvg.toFixed(2)}ms`);

  // Test non-pooled connection
  console.log('\n📊 Non-Pooled Connection (Direct)');
  console.log('URL:', nonPooledUrl.replace(/:[^:@]+@/, ':***@'));
  const nonPooledTests = await testLatency(nonPooledUrl, 'Non-Pooled');

  nonPooledTests.forEach(test => {
    console.log(`  ${test.query.padEnd(20)} ${test.duration}ms`);
  });

  const nonPooledAvg = nonPooledTests.reduce((sum, t) => sum + t.duration, 0) / nonPooledTests.length;
  console.log(`  ${'Average'.padEnd(20)} ${nonPooledAvg.toFixed(2)}ms`);

  // Summary
  console.log('\n━'.repeat(60));
  console.log('\n📈 Summary');
  console.log(`  Pooled average:      ${pooledAvg.toFixed(2)}ms`);
  console.log(`  Non-pooled average:  ${nonPooledAvg.toFixed(2)}ms`);

  if (pooledAvg < nonPooledAvg) {
    console.log(`  ✅ Pooled is faster by ${(nonPooledAvg - pooledAvg).toFixed(2)}ms`);
  } else {
    console.log(`  ✅ Non-pooled is faster by ${(pooledAvg - nonPooledAvg).toFixed(2)}ms`);
  }

  // Performance rating
  const avgLatency = Math.min(pooledAvg, nonPooledAvg);
  console.log('\n📊 Performance Rating:');
  if (avgLatency < 50) {
    console.log('  🚀 Excellent (<50ms)');
  } else if (avgLatency < 100) {
    console.log('  ✅ Good (50-100ms)');
  } else if (avgLatency < 200) {
    console.log('  ⚠️  Fair (100-200ms)');
  } else {
    console.log('  🐌 Slow (>200ms)');
  }

  console.log('\n💡 Recommendation:');
  console.log(`  Use ${pooledAvg < nonPooledAvg ? 'POOLED' : 'NON-POOLED'} connection for best performance`);
  console.log('  Note: Pooled connections are generally better for serverless/high-concurrency');
  console.log('  Note: Non-pooled may be needed for migrations or long-running transactions');
}

main().catch(console.error);
