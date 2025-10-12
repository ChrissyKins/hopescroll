import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import { db } from './db';
import { logger } from './logger';

const log = logger.child({ module: 'auth' });

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          log.warn('Missing credentials');
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        try {
          const user = await db.user.findUnique({
            where: { email },
          });

          if (!user) {
            log.warn({ email }, 'User not found');
            return null;
          }

          const isValid = await compare(password, user.password);

          if (!isValid) {
            log.warn({ email }, 'Invalid password');
            return null;
          }

          log.info({ userId: user.id, email: user.email }, 'User authenticated');

          return {
            id: user.id,
            email: user.email,
          };
        } catch (error) {
          log.error({ error }, 'Error during authentication');
          return null;
        }
      },
    }),
  ],
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
      }
      return session;
    },
  },
});
