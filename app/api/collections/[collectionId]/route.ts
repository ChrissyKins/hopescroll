// GET /api/collections/:id - Get a single collection
// PATCH /api/collections/:id - Update a collection
// DELETE /api/collections/:id - Delete a collection

import { NextRequest } from 'next/server';
import { CollectionService } from '@/services/collection-service';
import { db } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { requireAuth } from '@/lib/get-user-session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{
    collectionId: string;
  }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await requireAuth();
    const { collectionId } = await params;

    const collectionService = new CollectionService(db);
    const collection = await collectionService.getCollection(
      userId,
      collectionId
    );

    return successResponse(collection);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await requireAuth();
    const { collectionId } = await params;
    const body = await request.json();

    const { name, description, color } = body;

    const collectionService = new CollectionService(db);
    const collection = await collectionService.updateCollection(
      userId,
      collectionId,
      {
        name: name ? name.trim() : undefined,
        description,
        color,
      }
    );

    return successResponse(collection);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await requireAuth();
    const { collectionId } = await params;

    const collectionService = new CollectionService(db);
    await collectionService.deleteCollection(userId, collectionId);

    return successResponse({ message: 'Collection deleted successfully' });
  } catch (error) {
    return errorResponse(error);
  }
}
