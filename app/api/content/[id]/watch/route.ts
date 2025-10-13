// POST /api/content/[id]/watch - Mark content as watched
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

    // Optional: Parse body for watch duration and completion rate
    const body = await request.json().catch(() => ({}));
    const watchDuration = body.watchDuration;
    const completionRate = body.completionRate;

    const interactionService = new InteractionService(db, cache);
    await interactionService.recordWatch(
      userId,
      contentId,
      watchDuration,
      completionRate
    );

    return successResponse({ message: 'Content marked as watched' });
  } catch (error) {
    return errorResponse(error);
  }
}
