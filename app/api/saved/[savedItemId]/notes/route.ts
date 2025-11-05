// PATCH /api/saved/:id/notes - Update notes for a saved item

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { requireAuth } from '@/lib/get-user-session';

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

    const { notes } = body;

    // Verify the saved item belongs to the user
    const savedItem = await db.savedContent.findFirst({
      where: {
        id: savedItemId,
        userId,
      },
    });

    if (!savedItem) {
      return errorResponse('Saved item not found', 404);
    }

    // Update the notes
    const updated = await db.savedContent.update({
      where: { id: savedItemId },
      data: { notes },
    });

    return successResponse(updated);
  } catch (error) {
    return errorResponse(error);
  }
}
