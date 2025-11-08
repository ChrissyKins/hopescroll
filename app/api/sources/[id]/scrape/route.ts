// POST /api/sources/:id/scrape - Start async content scraping job for a single source
// Uses yt-dlp async API with job polling for progress tracking

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { requireAuth } from '@/lib/get-user-session';
import { createLogger } from '@/lib/logger';
import { ENV } from '@/lib/config';

export const dynamic = 'force-dynamic';

const log = createLogger('api-source-scrape');

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

    // Only support YouTube for now (yt-dlp async API)
    if (source.type !== 'YOUTUBE') {
      return errorResponse(new Error('Async scraping only supported for YouTube sources'));
    }

    log.info({ sourceId: id, userId, channelId: source.sourceId }, 'Starting async scrape job');

    // Start the scrape job on yt-dlp service
    const ytDlpServiceUrl = ENV.ytDlpServiceUrl;
    if (!ytDlpServiceUrl) {
      return errorResponse(new Error('yt-dlp service not configured'));
    }

    const scrapeResponse = await fetch(
      `${ytDlpServiceUrl}/api/channel/${source.sourceId}/scrape?limit=200`,
      {
        method: 'POST',
        signal: AbortSignal.timeout(10000), // 10 second timeout for starting the job
      }
    );

    if (!scrapeResponse.ok) {
      const error = await scrapeResponse.json().catch(() => ({ detail: scrapeResponse.statusText }));
      throw new Error(error.detail || `Failed to start scrape job: ${scrapeResponse.statusText}`);
    }

    const scrapeData = await scrapeResponse.json();
    const jobId = scrapeData.job_id;

    log.info({ sourceId: id, jobId }, 'Scrape job started successfully');

    // Update source status to pending
    await db.contentSource.update({
      where: { id },
      data: {
        lastFetchStatus: 'pending',
        errorMessage: null,
      },
    });

    return successResponse({
      jobId,
      status: 'started',
      message: 'Scraping job started. Poll /api/sources/jobs/{jobId} for progress.',
    });
  } catch (error) {
    log.error({ error }, 'Failed to start scrape job');
    return errorResponse(error);
  }
}
