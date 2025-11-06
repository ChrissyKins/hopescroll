// GET /api/filters - List user's filters
// POST /api/filters - Add new filter

import { NextRequest } from 'next/server';
import { FilterService } from '@/services/filter-service';
import { db } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { requireAuth } from '@/lib/get-user-session';
import { addFilterSchema } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await requireAuth();

    const filterService = new FilterService(db);
    const filterConfig = await filterService.getFilterConfiguration(userId);

    return successResponse({
      keywords: filterConfig.keywords,
      preferences: filterConfig.durationRange ? {
        minDuration: filterConfig.durationRange.min,
        maxDuration: filterConfig.durationRange.max,
      } : {
        minDuration: null,
        maxDuration: null,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireAuth();

    const body = await request.json();
    const validated = addFilterSchema.parse(body);

    const filterService = new FilterService(db);
    const filter = await filterService.addKeyword(
      userId,
      validated.keyword,
      validated.isWildcard
    );

    return successResponse(filter, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
