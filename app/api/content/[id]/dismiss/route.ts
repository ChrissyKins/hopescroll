// POST /api/content/[id]/dismiss - Permanently dismiss content
import { NextRequest } from 'next/server';
import { InteractionService } from '@/services/interaction-service';
import { db } from '@/lib/db';
import { cache } from '@/lib/cache';
import { successResponse, errorResponse } from '@/lib/api-response';
import { requireAuth } from '@/lib/get-user-session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await requireAuth();
    const contentId = params.id;

    // Optional: Parse body for dismiss reason
    const body = await request.json().catch(() => ({}));
    const reason = body.reason;

    const interactionService = new InteractionService(db, cache);
    await interactionService.dismissContent(userId, contentId, reason);

    return successResponse({ message: 'Content dismissed' });
  } catch (error) {
    return errorResponse(error);
  }
}
