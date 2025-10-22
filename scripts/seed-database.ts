// Seed database with test data
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seed() {
  try {
    console.log('🌱 Seeding database...\n');

    // Create a test user
    console.log('Creating test user...');
    const hashedPassword = await bcrypt.hash('test123', 10);

    const user = await prisma.user.upsert({
      where: { email: 'test@hopescroll.com' },
      update: {},
      create: {
        id: 'test-user-1',
        email: 'test@hopescroll.com',
        password: hashedPassword,
      },
    });
    console.log(`✓ User created: ${user.email} (password: test123)\n`);

    // Create user preferences
    console.log('Creating user preferences...');
    await prisma.userPreferences.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        minDuration: 300,  // 5 minutes
        maxDuration: 1800, // 30 minutes
        backlogRatio: 0.3,
        diversityLimit: 3,
        theme: 'dark',
        density: 'cozy',
        autoPlay: false,
        updatedAt: new Date(),
      },
    });
    console.log('✓ User preferences created\n');

    // Add some filter keywords
    console.log('Creating filter keywords...');
    const filterKeywords = [
      { keyword: 'election', isWildcard: false },
      { keyword: '*politic*', isWildcard: true },
      { keyword: 'trump', isWildcard: false },
      { keyword: 'biden', isWildcard: false },
      { keyword: 'war', isWildcard: false },
    ];

    // Delete existing keywords for this user first
    await prisma.filterKeyword.deleteMany({
      where: { userId: user.id },
    });

    // Create new keywords
    for (const filter of filterKeywords) {
      await prisma.filterKeyword.create({
        data: {
          userId: user.id,
          keyword: filter.keyword,
          isWildcard: filter.isWildcard,
        },
      });
    }
    console.log(`✓ ${filterKeywords.length} filter keywords created\n`);

    // Add some content sources
    console.log('Creating content sources...');
    const sources = [
      {
        id: 'source-veritasium',
        type: 'YOUTUBE' as const,
        sourceId: 'UCHnyfMqiRRG1u-2MsSQLbXA',
        displayName: 'Veritasium',
        avatarUrl: 'https://yt3.googleusercontent.com/ytc/AIdro_mXt0J8RYKQVy6LlQ-VT1X0rlkqQ2DfxzjHwQ=s240-c-k-c0x00ffffff-no-rj',
      },
      {
        id: 'source-kurzgesagt',
        type: 'YOUTUBE' as const,
        sourceId: 'UCsXVk37bltHxD1rDPwtNM8Q',
        displayName: 'Kurzgesagt – In a Nutshell',
        avatarUrl: 'https://yt3.googleusercontent.com/ytc/AIdro_kLJYLqd-Q7tSJbBU5kQr6TW-2SLH5FpDuLSFY=s240-c-k-c0x00ffffff-no-rj',
      },
      {
        id: 'source-vsauce',
        type: 'YOUTUBE' as const,
        sourceId: 'UC6nSFpj9HTCZ5t-N3Rm3-HA',
        displayName: 'Vsauce',
        avatarUrl: 'https://yt3.googleusercontent.com/ytc/AIdro_mr-6bvBzLEgHlv5bq7XWfkO-NkFEkMvYTMGNY=s240-c-k-c0x00ffffff-no-rj',
      },
    ];

    for (const source of sources) {
      await prisma.contentSource.upsert({
        where: { id: source.id },
        update: {},
        create: {
          ...source,
          userId: user.id,
          isMuted: false,
          alwaysSafe: true, // Educational channels are always safe
          lastFetchStatus: 'pending',
        },
      });
    }
    console.log(`✓ ${sources.length} content sources created\n`);

    // Add some sample content items
    console.log('Creating sample content items...');
    const contentItems = [
      {
        id: 'content-1',
        sourceType: 'YOUTUBE' as const,
        sourceId: 'UCHnyfMqiRRG1u-2MsSQLbXA',
        originalId: 'dQw4w9WgXcQ',
        title: 'The Science of How We Learn',
        description: 'Understanding the neuroscience behind effective learning strategies',
        thumbnailUrl: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
        url: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
        duration: 945, // 15:45
        publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      },
      {
        id: 'content-2',
        sourceType: 'YOUTUBE' as const,
        sourceId: 'UCsXVk37bltHxD1rDPwtNM8Q',
        originalId: 'abc123xyz',
        title: 'What Happens If We Burn All Fossil Fuels?',
        description: 'Exploring climate scenarios in an accessible way',
        thumbnailUrl: 'https://i.ytimg.com/vi/abc123xyz/maxresdefault.jpg',
        url: 'https://youtube.com/watch?v=abc123xyz',
        duration: 600, // 10:00
        publishedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      },
      {
        id: 'content-3',
        sourceType: 'YOUTUBE' as const,
        sourceId: 'UC6nSFpj9HTCZ5t-N3Rm3-HA',
        originalId: 'xyz789abc',
        title: 'How Many Holes Does a Straw Have?',
        description: 'A deep dive into topology and everyday objects',
        thumbnailUrl: 'https://i.ytimg.com/vi/xyz789abc/maxresdefault.jpg',
        url: 'https://youtube.com/watch?v=xyz789abc',
        duration: 780, // 13:00
        publishedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago (backlog)
      },
    ];

    for (const item of contentItems) {
      await prisma.contentItem.upsert({
        where: { id: item.id },
        update: {},
        create: item,
      });
    }
    console.log(`✓ ${contentItems.length} content items created\n`);

    // Add a sample interaction
    console.log('Creating sample interaction...');
    await prisma.contentInteraction.create({
      data: {
        userId: user.id,
        contentId: 'content-1',
        type: 'WATCHED',
        watchDuration: 945,
        completionRate: 1.0,
      },
    });
    console.log('✓ Sample interaction created\n');

    // Add a collection and saved content item
    console.log('Creating collection and saved content...');
    const collection = await prisma.collection.create({
      data: {
        userId: user.id,
        name: 'Watch Later',
        description: 'Videos to watch on the weekend',
        color: '#3B82F6',
      },
    });

    await prisma.savedContent.create({
      data: {
        userId: user.id,
        contentId: 'content-2',
        collectionId: collection.id,
        notes: 'Looks interesting, save for weekend',
      },
    });
    console.log('✓ Collection and saved content created\n');

    // Summary
    console.log('📊 Seed Summary:');
    const counts = {
      users: await prisma.user.count(),
      sources: await prisma.contentSource.count(),
      content: await prisma.contentItem.count(),
      filters: await prisma.filterKeyword.count(),
      interactions: await prisma.contentInteraction.count(),
      saved: await prisma.savedContent.count(),
    };

    console.log(`  Users: ${counts.users}`);
    console.log(`  Content Sources: ${counts.sources}`);
    console.log(`  Content Items: ${counts.content}`);
    console.log(`  Filter Keywords: ${counts.filters}`);
    console.log(`  Interactions: ${counts.interactions}`);
    console.log(`  Saved Content: ${counts.saved}`);

    console.log('\n✅ Database seeding complete!\n');
    console.log('🔐 Test credentials:');
    console.log('   Email: test@hopescroll.com');
    console.log('   Password: test123\n');

  } catch (error) {
    console.error('❌ Seeding failed:');
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
