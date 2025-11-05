// GET /api/history - Get user's interaction history
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
    const { searchParams } = request.nextUrl;
    const type = searchParams.get('type') as
      | 'WATCHED'
      | 'SAVED'
      | 'DISMISSED'
      | 'NOT_NOW'
      | 'BLOCKED'
      | null;
    const limit = searchParams.get('limit');

    const interactionService = new InteractionService(db, cache);
    const history = await interactionService.getHistory(
      userId,
      type || undefined,
      limit ? parseInt(limit) : 50
    );

    return successResponse(history);
  } catch (error) {
    return errorResponse(error);
  }
}
