/**
 * Test cleanup helpers
 * Provides clean database cleanup without "Record not found" errors
 */

import { db } from '@/lib/db';

/**
 * Safely delete a user and all related data
 * Uses deleteMany which doesn't throw if record doesn't exist
 */
export async function cleanupTestUser(userId: string): Promise<void> {
  // Delete user data (foreign keys will cascade where configured)
  await db.user.deleteMany({ where: { id: userId } });
}

/**
 * Safely delete a user by email and all related data
 */
export async function cleanupTestUserByEmail(email: string): Promise<void> {
  await db.user.deleteMany({ where: { email } });
}

/**
 * Safely delete multiple users by IDs
 */
export async function cleanupTestUsers(userIds: string[]): Promise<void> {
  await db.user.deleteMany({ where: { id: { in: userIds } } });
}

/**
 * Clean up all test data for a user
 * This is more thorough than relying on cascade deletes
 */
export async function cleanupAllUserData(userId: string): Promise<void> {
  // Delete in correct order to avoid foreign key constraints
  await db.contentInteraction.deleteMany({ where: { userId } });
  await db.savedContent.deleteMany({ where: { userId } });
  await db.filterKeyword.deleteMany({ where: { userId } });
  await db.userPreferences.deleteMany({ where: { userId } });
  await db.collection.deleteMany({ where: { userId } });

  // Get all content sources for this user
  const sources = await db.contentSource.findMany({
    where: { userId },
    select: { sourceId: true }
  });

  // Delete content items from those sources
  if (sources.length > 0) {
    await db.contentItem.deleteMany({
      where: {
        sourceId: { in: sources.map(s => s.sourceId) }
      }
    });
  }

  await db.contentSource.deleteMany({ where: { userId } });
  await db.user.deleteMany({ where: { id: userId } });
}

/**
 * Clean up content items by source ID pattern
 * Useful for test-specific content
 */
export async function cleanupTestContent(sourceIdPattern: string): Promise<void> {
  await db.contentItem.deleteMany({
    where: {
      sourceId: { startsWith: sourceIdPattern },
    },
  });
}

/**
 * Clean up content items by original ID pattern
 * Useful for cleaning up test-specific content items
 */
export async function cleanupContentByOriginalId(originalIdPattern: string): Promise<void> {
  await db.contentItem.deleteMany({
    where: {
      originalId: { startsWith: originalIdPattern },
    },
  });
}
