// GET /api/debug/feed - Debug feed generation
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { requireAuth } from '@/lib/get-user-session';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await requireAuth();

    // Get all content
    const allContent = await db.contentItem.findMany({
      take: 20,
      orderBy: { publishedAt: 'desc' },
    });

    // Get user's sources
    const sources = await db.contentSource.findMany({
      where: { userId },
    });

    // Get user's filters
    const filters = await db.filterKeyword.findMany({
      where: { userId },
    });

    // Get user's interactions
    const interactions = await db.contentInteraction.findMany({
      where: { userId },
    });

    // Get user preferences
    const prefs = await db.userPreferences.findUnique({
      where: { userId },
    });

    return successResponse({
      contentCount: allContent.length,
      content: allContent.map(c => ({
        id: c.id,
        title: c.title,
        sourceId: c.sourceId,
        sourceType: c.sourceType,
        publishedAt: c.publishedAt,
      })),
      sources: sources.map(s => ({
        id: s.id,
        sourceId: s.sourceId,
        displayName: s.displayName,
        type: s.type,
      })),
      filters,
      interactions: interactions.map(i => ({
        contentId: i.contentId,
        type: i.type,
      })),
      preferences: prefs,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
