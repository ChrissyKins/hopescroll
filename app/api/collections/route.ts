// GET /api/collections - List all collections
// POST /api/collections - Create a new collection

import { NextRequest } from 'next/server';
import { CollectionService } from '@/services/collection-service';
import { db } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { requireAuth } from '@/lib/get-user-session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await requireAuth();

    const collectionService = new CollectionService(db);
    const collections = await collectionService.getUserCollections(userId);

    return successResponse(collections);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireAuth();
    const body = await request.json();

    const { name, description, color } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return errorResponse(new Error('Collection name is required'), 400);
    }

    const collectionService = new CollectionService(db);
    const collection = await collectionService.createCollection(userId, {
      name: name.trim(),
      description,
      color,
    });

    return successResponse(collection);
  } catch (error) {
    return errorResponse(error);
  }
}
