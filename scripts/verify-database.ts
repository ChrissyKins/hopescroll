// Verify database data
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verify() {
  try {
    console.log('🔍 Verifying database data...\n');

    // Get user
    const user = await prisma.user.findFirst({
      include: {
        preferences: true,
        sources: true,
        filters: true,
        interactions: {
          include: {
            content: true,
          },
        },
        savedContent: {
          include: {
            content: true,
            collection: true,
          },
        },
      },
    });

    if (!user) {
      console.error('❌ No user found in database');
      process.exit(1);
    }

    console.log('👤 User:');
    console.log(`   Email: ${user.email}`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Created: ${user.createdAt.toISOString()}\n`);

    console.log('⚙️  Preferences:');
    if (user.preferences) {
      console.log(`   Duration: ${user.preferences.minDuration}s - ${user.preferences.maxDuration}s`);
      console.log(`   Backlog ratio: ${user.preferences.backlogRatio}`);
      console.log(`   Diversity limit: ${user.preferences.diversityLimit}`);
      console.log(`   Theme: ${user.preferences.theme}`);
    } else {
      console.log('   None');
    }
    console.log();

    console.log('🎯 Filter Keywords:');
    user.filters.forEach((filter) => {
      console.log(`   - "${filter.keyword}" (${filter.isWildcard ? 'wildcard' : 'exact'})`);
    });
    console.log();

    console.log('📺 Content Sources:');
    user.sources.forEach((source) => {
      console.log(`   - [${source.type}] ${source.displayName}`);
      console.log(`     ID: ${source.sourceId}`);
      console.log(`     Status: ${source.lastFetchStatus}${source.isMuted ? ' (muted)' : ''}`);
    });
    console.log();

    // Get all content
    const allContent = await prisma.contentItem.findMany({
      orderBy: { publishedAt: 'desc' },
    });

    console.log('📝 Content Items:');
    allContent.forEach((item) => {
      console.log(`   - [${item.sourceType}] ${item.title}`);
      console.log(`     Duration: ${item.duration ? Math.floor(item.duration / 60) + 'm' : 'N/A'}`);
      console.log(`     Published: ${item.publishedAt.toLocaleDateString()}`);
      console.log(`     URL: ${item.url}`);
    });
    console.log();

    console.log('🎬 Interactions:');
    user.interactions.forEach((interaction) => {
      console.log(`   - ${interaction.type}: ${interaction.content.title}`);
      if (interaction.watchDuration) {
        console.log(`     Watched: ${Math.floor(interaction.watchDuration / 60)}m ${interaction.watchDuration % 60}s`);
      }
    });
    console.log();

    console.log('💾 Saved Content:');
    user.savedContent.forEach((saved) => {
      console.log(`   - ${saved.content.title}`);
      console.log(`     Collection: ${saved.collection?.name || 'None'}`);
      if (saved.notes) {
        console.log(`     Notes: ${saved.notes}`);
      }
    });
    console.log();

    console.log('✅ Database verification complete!\n');
    console.log('📊 Summary:');
    console.log(`   ✓ ${user.sources.length} content sources`);
    console.log(`   ✓ ${allContent.length} content items`);
    console.log(`   ✓ ${user.filters.length} filter keywords`);
    console.log(`   ✓ ${user.interactions.length} interactions`);
    console.log(`   ✓ ${user.savedContent.length} saved items`);
    console.log();

  } catch (error) {
    console.error('❌ Verification failed:');
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verify();
