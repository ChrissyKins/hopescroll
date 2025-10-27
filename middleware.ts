import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { runStartupTasks } from '@/lib/startup-tasks';

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isAuthenticated = !!req.auth;

  // Run startup tasks in background (debounced internally)
  // This checks for daily backlog fetches on app startup/wake
  if (isAuthenticated) {
    runStartupTasks();
  }

  // Public routes
  const publicRoutes = ['/login', '/register', '/forgot-password', '/reset-password'];
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));

  // API routes that don't require auth
  const publicApiRoutes = ['/api/auth'];
  const isPublicApiRoute = publicApiRoutes.some((route) => pathname.startsWith(route));

  // Allow public routes
  if (isPublicRoute || isPublicApiRoute) {
    return NextResponse.next();
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated && !pathname.startsWith('/login')) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
