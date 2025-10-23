import { useMemo } from 'react';
import type { FilterState, ContentType, DateRange, SortOption } from '@/components/ui/filter-sort';

interface SavedItem {
  id: string;
  collectionId: string | null;
  collection: {
    id: string;
    name: string;
    color: string | null;
  } | null;
  savedAt: string;
  notes: string | null;
  content: {
    id: string;
    title: string;
    url: string;
    sourceType: string;
    thumbnailUrl: string | null;
    duration: number | null;
    sourceDisplayName?: string;
  };
}

export function useFilterSort(
  items: SavedItem[],
  filters: FilterState,
  sortBy: SortOption
) {
  // Apply filters
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Collection filter
      if (filters.collectionId && item.collectionId !== filters.collectionId) {
        return false;
      }

      // Content type filter
      if (filters.contentType !== 'all') {
        const itemType = item.content.sourceType?.toLowerCase();
        if (filters.contentType === 'video' && itemType !== 'youtube' && itemType !== 'video') {
          return false;
        }
        if (filters.contentType === 'article' && itemType !== 'article') {
          return false;
        }
        if (filters.contentType === 'podcast' && itemType !== 'podcast') {
          return false;
        }
      }

      // Source filter
      if (filters.source) {
        const itemSource = item.content.sourceDisplayName || '';
        if (itemSource !== filters.source) {
          return false;
        }
      }

      // Date range filter
      if (filters.dateRange !== 'all') {
        const savedDate = new Date(item.savedAt);
        const now = new Date();
        const diffMs = now.getTime() - savedDate.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);

        switch (filters.dateRange) {
          case 'today':
            if (diffDays > 1) return false;
            break;
          case 'week':
            if (diffDays > 7) return false;
            break;
          case 'month':
            if (diffDays > 30) return false;
            break;
          case 'year':
            if (diffDays > 365) return false;
            break;
        }
      }

      return true;
    });
  }, [items, filters]);

  // Apply sorting
  const sortedItems = useMemo(() => {
    const sorted = [...filteredItems];

    switch (sortBy) {
      case 'date-desc':
        sorted.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
        break;
      case 'date-asc':
        sorted.sort((a, b) => new Date(a.savedAt).getTime() - new Date(b.savedAt).getTime());
        break;
      case 'title-asc':
        sorted.sort((a, b) => (a.content.title || '').localeCompare(b.content.title || ''));
        break;
      case 'title-desc':
        sorted.sort((a, b) => (b.content.title || '').localeCompare(a.content.title || ''));
        break;
      case 'source':
        sorted.sort((a, b) => {
          const sourceA = a.content.sourceDisplayName || '';
          const sourceB = b.content.sourceDisplayName || '';
          return sourceA.localeCompare(sourceB);
        });
        break;
      case 'duration-asc':
        sorted.sort((a, b) => {
          const durationA = a.content.duration || 0;
          const durationB = b.content.duration || 0;
          return durationA - durationB;
        });
        break;
      case 'duration-desc':
        sorted.sort((a, b) => {
          const durationA = a.content.duration || 0;
          const durationB = b.content.duration || 0;
          return durationB - durationA;
        });
        break;
      case 'random':
        // Fisher-Yates shuffle algorithm
        for (let i = sorted.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [sorted[i], sorted[j]] = [sorted[j], sorted[i]];
        }
        break;
    }

    return sorted;
  }, [filteredItems, sortBy]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.collectionId) count++;
    if (filters.contentType !== 'all') count++;
    if (filters.source) count++;
    if (filters.dateRange !== 'all') count++;
    return count;
  }, [filters]);

  return {
    filteredAndSortedItems: sortedItems,
    activeFilterCount,
    totalCount: items.length,
    filteredCount: sortedItems.length,
  };
}
