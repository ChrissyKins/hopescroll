// POST /api/content/[id]/save - Save content for later
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

    // Optional: Parse body for collection and notes
    const body = await request.json().catch(() => ({}));
    const collection = body.collection;
    const notes = body.notes;

    const interactionService = new InteractionService(db, cache);
    await interactionService.saveContent(userId, contentId, collection, notes);

    return successResponse({ message: 'Content saved' });
  } catch (error) {
    return errorResponse(error);
  }
}
