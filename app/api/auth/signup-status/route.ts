import { NextRequest } from 'next/server';
import { successResponse } from '@/lib/api-response';
import { ENV } from '@/lib/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/signup-status
 * Returns whether new user signups are currently allowed
 */
export async function GET(request: NextRequest) {
  return successResponse({
    allowed: ENV.allowSignups,
  });
}
