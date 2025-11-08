// GET /api/startup - Trigger background tasks on app startup
// This endpoint is called when the app starts to trigger initial background fetches

import { NextRequest } from 'next/server';
import { createLogger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const log = createLogger('startup');

// Track if startup has already been triggered in this instance
let startupTriggered = false;

export async function GET(request: NextRequest) {
  // Only trigger startup tasks once per app instance
  if (startupTriggered) {
    return Response.json({ message: 'Startup already triggered' });
  }

  startupTriggered = true;
  log.info('App startup triggered');

  // With the new unlimited backlog fetching, there's no need for a separate startup task
  // The regular content fetch will handle everything
  log.info('Startup complete - regular content fetch will handle all updates');

  return Response.json({
    message: 'Startup tasks initiated',
    backgroundTasks: [],
  });
}
