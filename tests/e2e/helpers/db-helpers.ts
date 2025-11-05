import { PrismaClient } from '@prisma/client';

/**
 * Database helper utilities for E2E test setup/cleanup
 *
 * Note: Connects to test database using POSTGRES_URL from .env.test
 */

// Ensure we're using the test database
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.POSTGRES_URL || 'postgresql://hopescroll_test:test_password_local_only@localhost:5433/hopescroll_test',
    },
  },
});

/**
 * Clean up test user data from the database
 */
export async function cleanupTestUser(email: string): Promise<void> {
  try {
    // Delete user and all related data (cascading deletes handled by schema)
    await prisma.user.delete({
      where: { email },
    });
  } catch (error) {
    // User might not exist, that's okay
    if ((error as any)?.code !== 'P2025') {
      console.error('Error cleaning up test user:', error);
    }
  }
}

/**
 * Clean up all test users (emails matching test pattern)
 */
export async function cleanupAllTestUsers(): Promise<void> {
  try {
    await prisma.user.deleteMany({
      where: {
        email: {
          contains: '@hopescroll-test.com',
        },
      },
    });
  } catch (error) {
    console.error('Error cleaning up test users:', error);
  }
}

/**
 * Create a verified user directly in the database
 * Note: HopeScroll doesn't have email verification enabled in schema,
 * so we just create a user normally.
 */
export async function createVerifiedUser(
  email: string,
  password: string
): Promise<string> {
  const bcrypt = await import('bcryptjs');
  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
    },
  });

  return user.id;
}

/**
 * Disconnect Prisma client
 */
export async function disconnectDb(): Promise<void> {
  await prisma.$disconnect();
}
