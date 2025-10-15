// GET /api/cron/fetch-content
// Background job to fetch content from all sources
// Triggered by Vercel Cron or manually

import { NextRequest } from 'next/server';
import { ContentService } from '@/services/content-service';
import { db } from '@/lib/db';
import { getAdapters } from '@/lib/adapters';
import { successResponse, errorResponse } from '@/lib/api-response';
import { createLogger } from '@/lib/logger';

const log = createLogger('cron-fetch-content');

export async function GET(request: NextRequest) {
  try {
    // Optional: Verify cron secret for production
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      log.warn('Unauthorized cron job attempt');
      return new Response('Unauthorized', { status: 401 });
    }

    log.info('Starting scheduled content fetch');

    const adapters = getAdapters();
    const contentService = new ContentService(db, adapters);

    const stats = await contentService.fetchAllSources();

    log.info(stats, 'Scheduled content fetch completed');

    return successResponse({
      message: 'Content fetch completed',
      stats,
    });
  } catch (error) {
    log.error({ error }, 'Cron job failed');
    return errorResponse(error);
  }
}
