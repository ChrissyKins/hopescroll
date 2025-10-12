import { auth } from './auth';

export async function getUserSession(): Promise<{ userId: string } | null> {
  const session = await auth();
  if (!session?.user) {
    return null;
  }
  return { userId: session.user.id };
}

export async function requireAuth(): Promise<{ userId: string }> {
  const session = await getUserSession();
  if (!session) {
    throw new Error('Unauthorized');
  }
  return session;
}
