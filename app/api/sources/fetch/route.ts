// POST /api/sources/fetch
// Manually trigger content fetch for user's sources
// Useful for testing and immediate updates

import { NextRequest } from 'next/server';
import { ContentService } from '@/services/content-service';
import { db } from '@/lib/db';
import { getAdapters } from '@/lib/adapters';
import { successResponse, errorResponse } from '@/lib/api-response';
import { requireAuth } from '@/lib/get-user-session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireAuth();

    const adapters = getAdapters();
    const contentService = new ContentService(db, adapters);

    const stats = await contentService.fetchUserSources(userId);

    return successResponse({
      message: 'Content fetch completed',
      stats,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
