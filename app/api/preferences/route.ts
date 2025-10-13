// PATCH /api/preferences - Update user preferences
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { cache } from '@/lib/cache';
import { successResponse, errorResponse } from '@/lib/api-response';
import { requireAuth } from '@/lib/get-user-session';

export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await requireAuth();
    const body = await request.json();

    // Update or create preferences
    const preferences = await db.userPreferences.upsert({
      where: { userId },
      update: {
        ...(body.minDuration !== undefined && { minDuration: body.minDuration }),
        ...(body.maxDuration !== undefined && { maxDuration: body.maxDuration }),
        ...(body.backlogRatio !== undefined && { backlogRatio: body.backlogRatio }),
        ...(body.diversityLimit !== undefined && {
          diversityLimit: body.diversityLimit,
        }),
        ...(body.theme !== undefined && { theme: body.theme }),
        ...(body.density !== undefined && { density: body.density }),
        ...(body.autoPlay !== undefined && { autoPlay: body.autoPlay }),
      },
      create: {
        userId,
        minDuration: body.minDuration,
        maxDuration: body.maxDuration,
        backlogRatio: body.backlogRatio,
        diversityLimit: body.diversityLimit,
        theme: body.theme,
        density: body.density,
        autoPlay: body.autoPlay,
      },
    });

    // Invalidate feed cache
    await cache.delete(`feed:${userId}`);

    return successResponse(preferences);
  } catch (error) {
    return errorResponse(error);
  }
}
