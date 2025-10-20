// Set up database schema programmatically
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],
});

async function setupDatabase() {
  try {
    console.log('🔧 Setting up database schema...\n');

    // Read the Prisma schema and generate SQL
    const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
    console.log(`📖 Reading schema from: ${schemaPath}\n`);

    // Create tables using raw SQL
    console.log('Creating tables...\n');

    // Create enums first
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE TYPE "SourceType" AS ENUM ('YOUTUBE', 'TWITCH', 'RSS', 'PODCAST');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE TYPE "InteractionType" AS ENUM ('WATCHED', 'SAVED', 'DISMISSED', 'NOT_NOW', 'BLOCKED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    console.log('✓ Enums created\n');

    // Create User table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "User" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "email" TEXT NOT NULL UNIQUE,
        "password" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL
      );
    `);
    console.log('✓ User table created');

    // Create ContentSource table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ContentSource" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "type" "SourceType" NOT NULL,
        "sourceId" TEXT NOT NULL,
        "displayName" TEXT NOT NULL,
        "avatarUrl" TEXT,
        "isMuted" BOOLEAN NOT NULL DEFAULT false,
        "alwaysSafe" BOOLEAN NOT NULL DEFAULT false,
        "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "lastFetchAt" TIMESTAMP(3),
        "lastFetchStatus" TEXT NOT NULL DEFAULT 'pending',
        "errorMessage" TEXT,
        CONSTRAINT "ContentSource_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "ContentSource_userId_type_sourceId_key" UNIQUE ("userId", "type", "sourceId")
      );
    `);
    console.log('✓ ContentSource table created');

    // Create ContentItem table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ContentItem" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "sourceType" "SourceType" NOT NULL,
        "sourceId" TEXT NOT NULL,
        "originalId" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "description" TEXT,
        "thumbnailUrl" TEXT,
        "url" TEXT NOT NULL,
        "duration" INTEGER,
        "publishedAt" TIMESTAMP(3) NOT NULL,
        "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "lastSeenInFeed" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "ContentItem_sourceType_originalId_key" UNIQUE ("sourceType", "originalId")
      );
    `);
    console.log('✓ ContentItem table created');

    // Create ContentInteraction table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ContentInteraction" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "contentId" TEXT NOT NULL,
        "type" "InteractionType" NOT NULL,
        "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "watchDuration" INTEGER,
        "completionRate" DOUBLE PRECISION,
        "dismissReason" TEXT,
        "collection" TEXT,
        CONSTRAINT "ContentInteraction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "ContentInteraction_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "ContentItem"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);
    console.log('✓ ContentInteraction table created');

    // Create FilterKeyword table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "FilterKeyword" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "keyword" TEXT NOT NULL,
        "isWildcard" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "FilterKeyword_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);
    console.log('✓ FilterKeyword table created');

    // Create UserPreferences table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "UserPreferences" (
        "userId" TEXT NOT NULL PRIMARY KEY,
        "minDuration" INTEGER,
        "maxDuration" INTEGER,
        "backlogRatio" DOUBLE PRECISION NOT NULL DEFAULT 0.3,
        "diversityLimit" INTEGER NOT NULL DEFAULT 3,
        "theme" TEXT NOT NULL DEFAULT 'dark',
        "density" TEXT NOT NULL DEFAULT 'cozy',
        "autoPlay" BOOLEAN NOT NULL DEFAULT false,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "UserPreferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);
    console.log('✓ UserPreferences table created');

    // Create SavedContent table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "SavedContent" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "contentId" TEXT NOT NULL,
        "collection" TEXT,
        "savedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "notes" TEXT,
        CONSTRAINT "SavedContent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "SavedContent_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "ContentItem"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "SavedContent_userId_contentId_key" UNIQUE ("userId", "contentId")
      );
    `);
    console.log('✓ SavedContent table created');

    // Create PasswordResetToken table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "PasswordResetToken" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "token" TEXT NOT NULL UNIQUE,
        "expiresAt" TIMESTAMP(3) NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "used" BOOLEAN NOT NULL DEFAULT false,
        CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);
    console.log('✓ PasswordResetToken table created\n');

    // Create indexes
    console.log('Creating indexes...\n');

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "ContentSource_userId_idx" ON "ContentSource"("userId");
    `);

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "ContentItem_sourceType_sourceId_idx" ON "ContentItem"("sourceType", "sourceId");
    `);

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "ContentItem_publishedAt_idx" ON "ContentItem"("publishedAt");
    `);

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "ContentInteraction_userId_contentId_idx" ON "ContentInteraction"("userId", "contentId");
    `);

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "ContentInteraction_userId_type_idx" ON "ContentInteraction"("userId", "type");
    `);

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "ContentInteraction_timestamp_idx" ON "ContentInteraction"("timestamp");
    `);

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "FilterKeyword_userId_idx" ON "FilterKeyword"("userId");
    `);

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "SavedContent_userId_collection_idx" ON "SavedContent"("userId", "collection");
    `);

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");
    `);

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "PasswordResetToken_token_idx" ON "PasswordResetToken"("token");
    `);

    console.log('✓ All indexes created\n');

    // Verify tables were created
    const tables = await prisma.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `;

    console.log('📋 Database tables:');
    tables.forEach(t => console.log(`  - ${t.table_name}`));

    console.log('\n✅ Database setup complete!\n');

  } catch (error) {
    console.error('❌ Database setup failed:');
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

setupDatabase();
