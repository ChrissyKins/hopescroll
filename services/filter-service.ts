// Filter Service - Manages user content filters

import { PrismaClient } from '@prisma/client';
import { createLogger } from '@/lib/logger';
import { NotFoundError } from '@/lib/errors';
import { FilterConfiguration } from '@/domain/content/content-item';

const log = createLogger('filter-service');

export class FilterService {
  constructor(private db: PrismaClient) {}

  async addKeyword(
    userId: string,
    keyword: string,
    isWildcard: boolean = false
  ): Promise<{ id: string }> {
    log.info({ userId, keyword, isWildcard }, 'Adding filter keyword');

    const filter = await this.db.filterKeyword.create({
      data: {
        userId,
        keyword: keyword.trim(),
        isWildcard,
      },
    });

    log.info({ filterId: filter.id }, 'Filter keyword added');
    return { id: filter.id };
  }

  async removeKeyword(userId: string, filterId: string): Promise<void> {
    log.info({ userId, filterId }, 'Removing filter keyword');

    const filter = await this.db.filterKeyword.findFirst({
      where: {
        id: filterId,
        userId,
      },
    });

    if (!filter) {
      throw new NotFoundError('Filter keyword');
    }

    await this.db.filterKeyword.delete({
      where: { id: filterId },
    });

    log.info({ filterId }, 'Filter keyword removed');
  }

  async listKeywords(userId: string) {
    return this.db.filterKeyword.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateDurationFilter(
    userId: string,
    minDuration: number | null,
    maxDuration: number | null
  ): Promise<void> {
    log.info({ userId, minDuration, maxDuration }, 'Updating duration filter');

    await this.db.userPreferences.upsert({
      where: { userId },
      update: {
        minDuration,
        maxDuration,
      },
      create: {
        userId,
        minDuration,
        maxDuration,
      },
    });

    log.info({ userId }, 'Duration filter updated');
  }

  async getFilterConfiguration(userId: string): Promise<FilterConfiguration> {
    const [keywords, preferences] = await Promise.all([
      this.db.filterKeyword.findMany({ where: { userId } }),
      this.db.userPreferences.findUnique({ where: { userId } }),
    ]);

    return {
      userId,
      keywords: keywords.map((k: any) => ({
        id: k.id,
        keyword: k.keyword,
        isWildcard: k.isWildcard,
        createdAt: k.createdAt,
      })),
      durationRange: preferences
        ? {
            min: preferences.minDuration,
            max: preferences.maxDuration,
          }
        : null,
      contentTypePreferences: [],
    };
  }
}
