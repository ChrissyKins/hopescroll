import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { logger } from './logger';
import { db } from './db';
import bcrypt from 'bcryptjs';

const log = logger.child({ module: 'auth' });

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true, // Required for Vercel and reverse proxies
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email as string }
        });

        if (!user || !user.password) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!isPasswordValid) {
          return null;
        }

        log.info({ userId: user.id, email: user.email }, 'User authenticated with credentials');

        return {
          id: user.id,
          email: user.email,
        };
      }
    })
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
