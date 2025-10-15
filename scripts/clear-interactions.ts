import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.contentInteraction.deleteMany({
    where: { userId: 'test-user-1' },
  });

  console.log(`✅ Deleted ${result.count} interactions for test-user-1`);
  await prisma.$disconnect();
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
