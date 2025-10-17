import { db } from '../lib/db';

/**
 * Migrate content sources and interactions from one user to another
 * This is useful when switching from test auth to Google OAuth
 */
async function migrateUserData(fromUserId: string, toUserId: string) {
  console.log(`Migrating data from ${fromUserId} to ${toUserId}...`);

  try {
    // Check if both users exist
    const fromUser = await db.user.findUnique({ where: { id: fromUserId } });
    const toUser = await db.user.findUnique({ where: { id: toUserId } });

    if (!fromUser) {
      console.error(`Source user ${fromUserId} not found`);
      return;
    }

    if (!toUser) {
      console.error(`Target user ${toUserId} not found`);
      return;
    }

    console.log(`From: ${fromUser.email} (${fromUserId})`);
    console.log(`To: ${toUser.email} (${toUserId})`);

    // Count what we're migrating
    const sourcesCount = await db.contentSource.count({ where: { userId: fromUserId } });
    const interactionsCount = await db.contentInteraction.count({ where: { userId: fromUserId } });
    const preferencesCount = await db.userPreferences.count({ where: { userId: fromUserId } });
    const filtersCount = await db.filterKeyword.count({ where: { userId: fromUserId } });

    console.log(`\nFound:`);
    console.log(`- ${sourcesCount} content sources`);
    console.log(`- ${interactionsCount} interactions`);
    console.log(`- ${preferencesCount} user preferences`);
    console.log(`- ${filtersCount} filter keywords`);

    if (sourcesCount === 0 && interactionsCount === 0 && preferencesCount === 0 && filtersCount === 0) {
      console.log('\nNo data to migrate.');
      return;
    }

    // Perform migration in a transaction
    await db.$transaction(async (tx) => {
      // Migrate content sources
      if (sourcesCount > 0) {
        await tx.contentSource.updateMany({
          where: { userId: fromUserId },
          data: { userId: toUserId },
        });
        console.log(`\n✓ Migrated ${sourcesCount} content sources`);
      }

      // Migrate content interactions
      if (interactionsCount > 0) {
        await tx.contentInteraction.updateMany({
          where: { userId: fromUserId },
          data: { userId: toUserId },
        });
        console.log(`✓ Migrated ${interactionsCount} interactions`);
      }

      // Migrate user preferences (delete old ones for target user first to avoid conflicts)
      if (preferencesCount > 0) {
        await tx.userPreferences.deleteMany({
          where: { userId: toUserId },
        });
        await tx.userPreferences.updateMany({
          where: { userId: fromUserId },
          data: { userId: toUserId },
        });
        console.log(`✓ Migrated ${preferencesCount} user preferences`);
      }

      // Migrate filter keywords
      if (filtersCount > 0) {
        await tx.filterKeyword.updateMany({
          where: { userId: fromUserId },
          data: { userId: toUserId },
        });
        console.log(`✓ Migrated ${filtersCount} filter keywords`);
      }
    });

    console.log('\n✅ Migration completed successfully!');
  } catch (error) {
    console.error('Error during migration:', error);
    throw error;
  } finally {
    await db.$disconnect();
  }
}

// Get user IDs from command line arguments
const args = process.argv.slice(2);
if (args.length !== 2) {
  console.error('Usage: npx tsx scripts/migrate-user-data.ts <from-user-id> <to-user-id>');
  console.error('Example: npx tsx scripts/migrate-user-data.ts test-user-1 cmgvdoyb30000ej0z1aiotol0');
  process.exit(1);
}

const [fromUserId, toUserId] = args;
migrateUserData(fromUserId, toUserId);
