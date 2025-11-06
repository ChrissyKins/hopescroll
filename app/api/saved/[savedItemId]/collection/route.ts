// PATCH /api/saved/:id/collection - Update collection for a saved item

import { NextRequest } from 'next/server';
import { CollectionService } from '@/services/collection-service';
import { db } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { requireAuth } from '@/lib/get-user-session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{
    savedItemId: string;
  }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await requireAuth();
    const { savedItemId } = await params;
    const body = await request.json();

    const { collectionId } = body;

    const collectionService = new CollectionService(db);
    await collectionService.updateSavedItemCollection(
      userId,
      savedItemId,
      collectionId
    );

    return successResponse({ message: 'Collection updated successfully' });
  } catch (error) {
    return errorResponse(error);
  }
}
