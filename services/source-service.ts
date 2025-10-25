// Source Service - Manages content sources for users

import { PrismaClient } from '@prisma/client';
import { ContentAdapter } from '@/adapters/content/base-adapter';
import { createLogger } from '@/lib/logger';
import { NotFoundError, ValidationError } from '@/lib/errors';
import { SourceType } from '@/domain/content/content-item';

const log = createLogger('source-service');

export class SourceService {
  constructor(
    private db: PrismaClient,
    private adapters: Map<SourceType, ContentAdapter>
  ) {}

  async addSource(
    userId: string,
    type: SourceType,
    sourceId: string
  ): Promise<{ id: string; displayName: string }> {
    log.info({ userId, type, sourceId }, 'Adding content source');

    const adapter = this.adapters.get(type);
    if (!adapter) {
      throw new ValidationError(`Unsupported source type: ${type}`);
    }

    // Validate source exists and is accessible
    const validation = await adapter.validateSource(sourceId);
    if (!validation.isValid) {
      throw new ValidationError(
        validation.errorMessage || 'Source validation failed'
      );
    }

    // Use resolved ID if provided (e.g., @handle -> channel ID)
    const finalSourceId = validation.resolvedId || sourceId;

    // Check if source already exists for user
    const existing = await this.db.contentSource.findUnique({
      where: {
        userId_type_sourceId: {
          userId,
          type,
          sourceId: finalSourceId,
        },
      },
    });

    if (existing) {
      throw new ValidationError('Source already added');
    }

    // Create source
    const source = await this.db.contentSource.create({
      data: {
        userId,
        type,
        sourceId: finalSourceId,
        displayName: validation.displayName || finalSourceId,
        avatarUrl: validation.avatarUrl,
        isMuted: false,
        alwaysSafe: false,
        lastFetchStatus: 'pending',
      },
    });

    log.info({ sourceId: source.id, displayName: source.displayName }, 'Source added');

    return {
      id: source.id,
      displayName: source.displayName,
    };
  }

  async removeSource(userId: string, sourceId: string): Promise<void> {
    log.info({ userId, sourceId }, 'Removing content source');

    const source = await this.db.contentSource.findFirst({
      where: {
        id: sourceId,
        userId,
      },
    });

    if (!source) {
      throw new NotFoundError('Content source');
    }

    // Delete associated content items first
    await this.db.contentItem.deleteMany({
      where: { sourceId: source.sourceId },
    });

    await this.db.contentSource.delete({
      where: { id: sourceId },
    });

    log.info({ sourceId }, 'Source and associated content removed');
  }

  async updateSource(
    userId: string,
    sourceId: string,
    updates: { isMuted?: boolean; alwaysSafe?: boolean }
  ): Promise<void> {
    log.info({ userId, sourceId, updates }, 'Updating content source');

    const source = await this.db.contentSource.findFirst({
      where: {
        id: sourceId,
        userId,
      },
    });

    if (!source) {
      throw new NotFoundError('Content source');
    }

    await this.db.contentSource.update({
      where: { id: sourceId },
      data: updates,
    });

    log.info({ sourceId }, 'Source updated');
  }

  async listSources(userId: string) {
    const sources = await this.db.contentSource.findMany({
      where: { userId },
      orderBy: { addedAt: 'desc' },
    });

    // For each source, get video counts
    const sourcesWithCounts = await Promise.all(
      sources.map(async (source) => {
        // Count total fetched videos for this source
        const totalVideos = await this.db.contentItem.count({
          where: {
            sourceType: source.type,
            sourceId: source.sourceId,
          },
        });

        // Count unwatched videos (videos that haven't been interacted with)
        const unwatchedVideos = await this.db.contentItem.count({
          where: {
            sourceType: source.type,
            sourceId: source.sourceId,
            NOT: {
              interactions: {
                some: {
                  userId,
                  type: { in: ['WATCHED', 'DISMISSED', 'BLOCKED'] },
                },
              },
            },
          },
        });

        return {
          ...source,
          videoStats: {
            totalFetched: totalVideos,
            unwatched: unwatchedVideos,
          },
        };
      })
    );

    return sourcesWithCounts;
  }

  async getSource(userId: string, sourceId: string) {
    const source = await this.db.contentSource.findFirst({
      where: {
        id: sourceId,
        userId,
      },
    });

    if (!source) {
      throw new NotFoundError('Content source');
    }

    return source;
  }
}
