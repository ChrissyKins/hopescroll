// GET /api/sources/:id - Get source details
// PATCH /api/sources/:id - Update source
// DELETE /api/sources/:id - Remove source

import { NextRequest } from 'next/server';
import { SourceService } from '@/services/source-service';
import { db } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { requireAuth } from '@/lib/get-user-session';
import { updateSourceSchema } from '@/lib/validation';
import { getAdapters } from '@/lib/adapters';

const adapters = getAdapters();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await requireAuth();
    const { id } = await params;

    const sourceService = new SourceService(db, adapters);
    const source = await sourceService.getSource(userId, id);

    return successResponse(source);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await requireAuth();
    const { id } = await params;

    const body = await request.json();
    const validated = updateSourceSchema.parse(body);

    const sourceService = new SourceService(db, adapters);
    await sourceService.updateSource(userId, id, validated);

    return successResponse({ message: 'Source updated' });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await requireAuth();
    const { id } = await params;

    const sourceService = new SourceService(db, adapters);
    await sourceService.removeSource(userId, id);

    return successResponse({ message: 'Source deleted' });
  } catch (error) {
    return errorResponse(error);
  }
}
