import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { db } from './db';
import { logger } from './logger';

const log = logger.child({ module: 'auth' });

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: [
            'openid',
            'email',
            'profile',
            'https://www.googleapis.com/auth/youtube.readonly',
          ].join(' '),
          access_type: 'offline',
          prompt: 'consent',
        },
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
    async jwt({ token, account, user, profile }) {
      // Initial sign in
      if (account && user) {
        log.info({ userId: user.id, email: user.email }, 'User authenticated via Google OAuth');

        token.id = user.id;
        token.email = user.email;
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;

        // Store or update user in database
        try {
          const existingUser = await db.user.findUnique({
            where: { email: user.email! },
          });

          if (existingUser) {
            // Update OAuth tokens
            await db.user.update({
              where: { id: existingUser.id },
              data: {
                googleAccessToken: account.access_token,
                googleRefreshToken: account.refresh_token,
                tokenExpiresAt: account.expires_at
                  ? new Date(account.expires_at * 1000)
                  : null,
              },
            });
            token.id = existingUser.id;
          } else {
            // Create new user
            const newUser = await db.user.create({
              data: {
                email: user.email!,
                password: '', // Empty password for OAuth users
                googleAccessToken: account.access_token,
                googleRefreshToken: account.refresh_token,
                tokenExpiresAt: account.expires_at
                  ? new Date(account.expires_at * 1000)
                  : null,
              },
            });
            token.id = newUser.id;
          }
        } catch (error) {
          log.error({ error }, 'Error storing user OAuth tokens');
        }
      }

      // Check if token needs refresh (30 minutes before expiry)
      if (token.expiresAt && Date.now() > (token.expiresAt as number) * 1000 - 30 * 60 * 1000) {
        log.info('Access token expired, refreshing...');
        return await refreshAccessToken(token);
      }

      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.accessToken = token.accessToken as string;
        session.refreshToken = token.refreshToken as string;
      }
      return session;
    },
  },
});

async function refreshAccessToken(token: any) {
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        grant_type: 'refresh_token',
        refresh_token: token.refreshToken,
      }),
    });

    const refreshedTokens = await response.json();

    if (!response.ok) {
      throw refreshedTokens;
    }

    log.info('Access token refreshed successfully');

    // Update in database
    try {
      await db.user.update({
        where: { id: token.id },
        data: {
          googleAccessToken: refreshedTokens.access_token,
          tokenExpiresAt: refreshedTokens.expires_at
            ? new Date(Date.now() + refreshedTokens.expires_in * 1000)
            : null,
        },
      });
    } catch (error) {
      log.error({ error }, 'Error updating refreshed tokens in database');
    }

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      expiresAt: Math.floor(Date.now() / 1000 + refreshedTokens.expires_in),
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
    };
  } catch (error) {
    log.error({ error }, 'Error refreshing access token');
    return {
      ...token,
      error: 'RefreshAccessTokenError',
    };
  }
}
