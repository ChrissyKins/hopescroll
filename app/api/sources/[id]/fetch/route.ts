// POST /api/sources/:id/fetch - Manually trigger content fetch for a single source

import { NextRequest } from 'next/server';
import { ContentService } from '@/services/content-service';
import { db } from '@/lib/db';
import { getAdapters } from '@/lib/adapters';
import { successResponse, errorResponse } from '@/lib/api-response';
import { requireAuth } from '@/lib/get-user-session';
import { createLogger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const log = createLogger('api-source-fetch');

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await requireAuth();
    const { id } = await params;

    // Verify user owns this source
    const source = await db.contentSource.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!source) {
      return new Response('Source not found', { status: 404 });
    }

    log.info({ sourceId: id, userId }, 'Manual fetch triggered for source');

    const adapters = getAdapters();
    const contentService = new ContentService(db, adapters);

    // Fetch content for this source
    const newItemsCount = await contentService.fetchSource(id);

    log.info({ sourceId: id, newItemsCount }, 'Manual fetch completed');

    return successResponse({
      message: 'Content fetch completed',
      newItemsCount,
    });
  } catch (error) {
    log.error({ error }, 'Manual fetch failed');
    return errorResponse(error);
  }
}
