// Debug endpoint to check environment variables
import { NextRequest, NextResponse } from 'next/server';
import { ENV } from '@/lib/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  return NextResponse.json({
    ytDlpServiceUrl: ENV.ytDlpServiceUrl,
    isSet: !!ENV.ytDlpServiceUrl,
    length: ENV.ytDlpServiceUrl?.length || 0,
  });
}
