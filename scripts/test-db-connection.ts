// Test database connection
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],
});

async function testConnection() {
  try {
    console.log('🔌 Testing database connection...');

    // Try a simple query
    const result = await prisma.$queryRaw`SELECT 1 as connected`;
    console.log('✅ Database connection successful!');
    console.log('Result:', result);

    // Check if tables exist
    const tables = await prisma.$queryRaw`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `;

    console.log('\n📋 Existing tables:');
    console.log(tables);

  } catch (error) {
    console.error('❌ Database connection failed:');
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
