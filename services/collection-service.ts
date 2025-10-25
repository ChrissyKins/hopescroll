// Collection Service - Handles user collections for saved content

import { PrismaClient } from '@prisma/client';
import { createLogger } from '@/lib/logger';
import { NotFoundError, ValidationError } from '@/lib/errors';

const log = createLogger('collection-service');

export interface CreateCollectionInput {
  name: string;
  description?: string;
  color?: string;
}

export interface UpdateCollectionInput {
  name?: string;
  description?: string;
  color?: string;
}

export class CollectionService {
  constructor(private db: PrismaClient) {}

  /**
   * Get all collections for a user with item counts
   */
  async getUserCollections(userId: string) {
    log.info({ userId }, 'Fetching user collections');

    const collections = await this.db.collection.findMany({
      where: { userId },
      include: {
        _count: {
          select: { savedItems: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return collections.map((collection) => ({
      id: collection.id,
      userId: collection.userId,
      name: collection.name,
      description: collection.description,
      color: collection.color,
      createdAt: collection.createdAt,
      updatedAt: collection.updatedAt,
      itemCount: collection._count.savedItems,
    }));
  }

  /**
   * Get a single collection by ID
   */
  async getCollection(userId: string, collectionId: string) {
    log.info({ userId, collectionId }, 'Fetching collection');

    const collection = await this.db.collection.findFirst({
      where: {
        id: collectionId,
        userId,
      },
      include: {
        _count: {
          select: { savedItems: true },
        },
      },
    });

    if (!collection) {
      throw new NotFoundError('Collection');
    }

    return {
      id: collection.id,
      userId: collection.userId,
      name: collection.name,
      description: collection.description,
      color: collection.color,
      createdAt: collection.createdAt,
      updatedAt: collection.updatedAt,
      itemCount: collection._count.savedItems,
    };
  }

  /**
   * Create a new collection
   */
  async createCollection(userId: string, input: CreateCollectionInput) {
    log.info({ userId, input }, 'Creating collection');

    // Check if collection name already exists for user
    const existing = await this.db.collection.findFirst({
      where: {
        userId,
        name: input.name,
      },
    });

    if (existing) {
      throw new ValidationError('A collection with this name already exists');
    }

    const collection = await this.db.collection.create({
      data: {
        userId,
        name: input.name,
        description: input.description,
        color: input.color,
      },
      include: {
        _count: {
          select: { savedItems: true },
        },
      },
    });

    return {
      id: collection.id,
      userId: collection.userId,
      name: collection.name,
      description: collection.description,
      color: collection.color,
      createdAt: collection.createdAt,
      updatedAt: collection.updatedAt,
      itemCount: collection._count.savedItems,
    };
  }

  /**
   * Update a collection
   */
  async updateCollection(
    userId: string,
    collectionId: string,
    input: UpdateCollectionInput
  ) {
    log.info({ userId, collectionId, input }, 'Updating collection');

    // Verify ownership
    const existing = await this.db.collection.findFirst({
      where: {
        id: collectionId,
        userId,
      },
    });

    if (!existing) {
      throw new NotFoundError('Collection');
    }

    // If changing name, check for duplicates
    if (input.name && input.name !== existing.name) {
      const duplicate = await this.db.collection.findFirst({
        where: {
          userId,
          name: input.name,
          id: { not: collectionId },
        },
      });

      if (duplicate) {
        throw new ValidationError('A collection with this name already exists');
      }
    }

    const collection = await this.db.collection.update({
      where: { id: collectionId },
      data: input,
      include: {
        _count: {
          select: { savedItems: true },
        },
      },
    });

    return {
      id: collection.id,
      userId: collection.userId,
      name: collection.name,
      description: collection.description,
      color: collection.color,
      createdAt: collection.createdAt,
      updatedAt: collection.updatedAt,
      itemCount: collection._count.savedItems,
    };
  }

  /**
   * Delete a collection
   * Note: This will set collectionId to null on all saved items (cascade: SetNull)
   */
  async deleteCollection(userId: string, collectionId: string) {
    log.info({ userId, collectionId }, 'Deleting collection');

    // Verify ownership
    const existing = await this.db.collection.findFirst({
      where: {
        id: collectionId,
        userId,
      },
    });

    if (!existing) {
      throw new NotFoundError('Collection');
    }

    await this.db.collection.delete({
      where: { id: collectionId },
    });

    log.info({ userId, collectionId }, 'Collection deleted');
  }

  /**
   * Update the collection for a saved item
   */
  async updateSavedItemCollection(
    userId: string,
    savedItemId: string,
    collectionId: string | null
  ) {
    log.info(
      { userId, savedItemId, collectionId },
      'Updating saved item collection'
    );

    // Verify the saved item belongs to the user
    const savedItem = await this.db.savedContent.findFirst({
      where: {
        id: savedItemId,
        userId,
      },
    });

    if (!savedItem) {
      throw new NotFoundError('Saved item');
    }

    // If setting a collection, verify it belongs to the user
    if (collectionId) {
      const collection = await this.db.collection.findFirst({
        where: {
          id: collectionId,
          userId,
        },
      });

      if (!collection) {
        throw new NotFoundError('Collection');
      }
    }

    await this.db.savedContent.update({
      where: { id: savedItemId },
      data: { collectionId },
    });

    log.info({ userId, savedItemId, collectionId }, 'Updated saved item collection');
  }
}
