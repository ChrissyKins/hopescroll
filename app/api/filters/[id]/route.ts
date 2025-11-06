// DELETE /api/filters/:id - Remove filter

import { NextRequest } from 'next/server';
import { FilterService } from '@/services/filter-service';
import { db } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { requireAuth } from '@/lib/get-user-session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await requireAuth();

    const filterService = new FilterService(db);
    await filterService.removeKeyword(userId, params.id);

    return successResponse({ message: 'Filter removed' });
  } catch (error) {
    return errorResponse(error);
  }
}
