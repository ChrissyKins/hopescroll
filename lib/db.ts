// Prisma Client Singleton
// Prevents multiple instances in development with hot reloading
import { PrismaClient } from '@prisma/client';
import { ENV } from './config';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ENV.isDevelopment ? ['query', 'error', 'warn'] : ['error'],
  });

if (ENV.isDevelopment) globalForPrisma.prisma = db;

// Helper to safely disconnect (useful for tests)
export async function disconnectDb() {
  await db.$disconnect();
}
