// GET /api/sources - List user's sources
// POST /api/sources - Add new source

import { NextRequest } from 'next/server';
import { SourceService } from '@/services/source-service';
import { db } from '@/lib/db';
import { getAdapters } from '@/lib/adapters';
import { successResponse, errorResponse } from '@/lib/api-response';
import { requireAuth } from '@/lib/get-user-session';
import { addSourceSchema } from '@/lib/validation';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await requireAuth();

    const adapters = getAdapters();
    const sourceService = new SourceService(db, adapters);
    const sources = await sourceService.listSources(userId);

    return successResponse(sources);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireAuth();

    const body = await request.json();
    const validated = addSourceSchema.parse(body);

    const adapters = getAdapters();
    const sourceService = new SourceService(db, adapters);
    const source = await sourceService.addSource(
      userId,
      validated.type,
      validated.sourceId
    );

    return successResponse(source, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
