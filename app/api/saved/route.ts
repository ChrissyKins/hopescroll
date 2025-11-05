// GET /api/saved - Get user's saved content
import { NextRequest } from 'next/server';
import { InteractionService } from '@/services/interaction-service';
import { db } from '@/lib/db';
import { cache } from '@/lib/cache';
import { successResponse, errorResponse } from '@/lib/api-response';
import { requireAuth } from '@/lib/get-user-session';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await requireAuth();
    const collection = request.nextUrl.searchParams.get('collection');

    const interactionService = new InteractionService(db, cache);
    const saved = await interactionService.getSavedContent(
      userId,
      collection || undefined
    );

    return successResponse(saved);
  } catch (error) {
    return errorResponse(error);
  }
}
