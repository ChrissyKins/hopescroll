// POST /api/content/[id]/not-now - Temporarily dismiss content
import { NextRequest } from 'next/server';
import { InteractionService } from '@/services/interaction-service';
import { db } from '@/lib/db';
import { cache } from '@/lib/cache';
import { successResponse, errorResponse } from '@/lib/api-response';
import { requireAuth } from '@/lib/get-user-session';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await requireAuth();
    const contentId = params.id;

    const interactionService = new InteractionService(db, cache);
    await interactionService.notNowContent(userId, contentId);

    return successResponse({ message: 'Content marked as "not now"' });
  } catch (error) {
    return errorResponse(error);
  }
}
