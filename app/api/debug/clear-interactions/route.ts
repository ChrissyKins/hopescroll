// POST /api/debug/clear-interactions - Clear all interactions (for testing)
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { requireAuth } from '@/lib/get-user-session';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireAuth();

    const result = await db.contentInteraction.deleteMany({
      where: { userId },
    });

    return successResponse({
      message: 'All interactions cleared',
      deletedCount: result.count,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
