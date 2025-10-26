'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { Navigation } from '@/components/navigation';
import {
  useToast,
  Search,
  EmptyState,
  SavedIcon,
  CollectionManager,
  SavedContentSkeleton,
  CollectionListSkeleton,
  Button,
  SavedItemCard,
  SavedItemList,
  SavedItemCompact,
  FilterSort,
  ViewToggle,
  BulkActionToolbar,
  useConfirmDialog,
  type FilterState,
  type SortOption,
  type ViewMode,
} from '@/components/ui';
import { useSearch } from '@/hooks/use-search';
import { useFilterSort } from '@/hooks/use-filter-sort';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { useUrlState } from '@/hooks/use-url-state';
import { useCachedFetch } from '@/hooks/use-cached-fetch';

interface Collection {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}

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

function SavedPageContent() {
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);

  // Bulk operations state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isBulkOperationInProgress, setIsBulkOperationInProgress] = useState(false);

  const toast = useToast();
  const { confirm, ConfirmDialog } = useConfirmDialog();

  // Fetch collections with caching
  const { data: collections, refetch: refetchCollections } = useCachedFetch<Collection[]>({
    cacheKey: 'collections',
    fetcher: async () => {
      const response = await fetch('/api/collections');
      if (!response.ok) {
        throw new Error('Failed to fetch collections');
      }
      const data = await response.json();
      return data.data;
    },
    ttl: 30000, // 30 seconds
  });

  // Fetch saved items with caching
  const { data: saved, isLoading, error, refetch: refetchSaved } = useCachedFetch<SavedItem[]>({
    cacheKey: `saved-${selectedCollectionId || 'all'}`,
    fetcher: async () => {
      const url = selectedCollectionId
        ? `/api/saved?collectionId=${selectedCollectionId}`
        : '/api/saved';

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch saved content');
      }
      const data = await response.json();
      return data.data;
    },
    ttl: 30000, // 30 seconds
    deps: [selectedCollectionId],
  });

  // Initialize filter, sort, and view state with defaults
  const initialFilters: FilterState = {
    collectionId: null,
    contentType: 'all',
    source: null,
    dateRange: 'all',
  };

  // Use localStorage to persist preferences (without URL state initially)
  const [savedSortPreference, setSavedSortPreference] = useLocalStorage<SortOption>('saved-sort-preference', 'date-desc');
  const [savedViewPreference, setSavedViewPreference] = useLocalStorage<ViewMode>('saved-view-preference', 'grid');

  // URL state management for shareable filtered views
  const { filters, sortBy, view, setFilters, setSortBy, setView, isHydrated } = useUrlState(
    initialFilters,
    savedSortPreference,
    savedViewPreference
  );

  // Persist preferences to localStorage when they change
  useEffect(() => {
    if (isHydrated) {
      setSavedSortPreference(sortBy);
      setSavedViewPreference(view);
    }
  }, [sortBy, view, isHydrated, setSavedSortPreference, setSavedViewPreference]);

  // Search functionality
  const { query, setQuery, clearSearch, filteredItems: searchFilteredItems, resultCount, totalCount } = useSearch(
    saved || [],
    (item) => [
      item.content?.title || '',
      item.notes || '',
      item.collection?.name || '',
      item.content?.sourceDisplayName || ''
    ]
  );

  // Apply filters and sorting to the search results
  const { filteredAndSortedItems, activeFilterCount } = useFilterSort(
    searchFilteredItems,
    filters,
    sortBy
  );

  // Get unique sources for filter dropdown
  const uniqueSources = useMemo(() => {
    if (!saved) return [];
    const sources = new Set<string>();
    saved.forEach((item) => {
      if (item.content?.sourceDisplayName) {
        sources.add(item.content.sourceDisplayName);
      }
    });
    return Array.from(sources).sort();
  }, [saved]);

  // Helper to refetch both collections and saved items
  const refetchAll = async () => {
    await Promise.all([refetchCollections(), refetchSaved()]);
  };

  const handleUnsave = async (contentId: string) => {
    try {
      const response = await fetch(`/api/content/${contentId}/unsave`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to remove from saved');
      }

      toast.success('Removed from saved content');
      await refetchAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove from saved');
    }
  };

  const handleCollectionChange = async (savedItemId: string, collectionId: string | null) => {
    try {
      const response = await fetch(`/api/saved/${savedItemId}/collection`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collectionId }),
      });

      if (!response.ok) {
        throw new Error('Failed to update collection');
      }

      toast.success('Collection updated');
      await refetchAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update collection');
    }
  };

  const handleUpdateNotes = async (savedItemId: string, notes: string) => {
    try {
      const response = await fetch(`/api/saved/${savedItemId}/notes`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });

      if (!response.ok) {
        throw new Error('Failed to update notes');
      }

      toast.success('Notes updated');
      await refetchSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update notes');
    }
  };

  const handleMoveToFeed = async (contentId: string) => {
    try {
      // First unsave the content
      await handleUnsave(contentId);
      toast.success('Moved back to feed');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to move to feed');
    }
  };

  const handleOpen = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleCollectionsChange = () => {
    refetchAll();
  };

  const handleSelectCollection = (collectionId: string | null) => {
    setSelectedCollectionId(collectionId);
    clearSearch();
  };

  // Bulk operation handlers
  const handleToggleSelect = (itemId: string) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    const allIds = new Set(filteredAndSortedItems.map((item) => item.id));
    setSelectedItems(allIds);
  };

  const handleDeselectAll = () => {
    setSelectedItems(new Set());
  };

  const handleExitSelection = () => {
    setSelectionMode(false);
    setSelectedItems(new Set());
  };

  const handleBulkRemove = async () => {
    const confirmed = await confirm({
      title: 'Remove Items',
      message: `Are you sure you want to remove ${selectedItems.size} item${selectedItems.size > 1 ? 's' : ''} from saved?`,
      confirmLabel: 'Remove',
      variant: 'danger',
    });

    if (!confirmed) return;

    setIsBulkOperationInProgress(true);
    let successCount = 0;
    let failCount = 0;

    try {
      const promises = Array.from(selectedItems).map(async (itemId) => {
        const item = (saved || []).find((s) => s.id === itemId);
        if (!item) return false;

        try {
          const response = await fetch(`/api/content/${item.content.id}/unsave`, {
            method: 'POST',
          });
          if (response.ok) {
            successCount++;
            return true;
          } else {
            failCount++;
            return false;
          }
        } catch {
          failCount++;
          return false;
        }
      });

      await Promise.all(promises);

      if (successCount > 0) {
        toast.success(`Removed ${successCount} item${successCount > 1 ? 's' : ''} from saved`);
      }
      if (failCount > 0) {
        toast.error(`Failed to remove ${failCount} item${failCount > 1 ? 's' : ''}`);
      }

      await refetchAll();
      setSelectedItems(new Set());
    } finally {
      setIsBulkOperationInProgress(false);
    }
  };

  const handleBulkMoveToCollection = async (collectionId: string | null) => {
    setIsBulkOperationInProgress(true);
    let successCount = 0;
    let failCount = 0;

    try {
      const promises = Array.from(selectedItems).map(async (itemId) => {
        try {
          const response = await fetch(`/api/saved/${itemId}/collection`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ collectionId }),
          });
          if (response.ok) {
            successCount++;
            return true;
          } else {
            failCount++;
            return false;
          }
        } catch {
          failCount++;
          return false;
        }
      });

      await Promise.all(promises);

      const collectionName = collectionId
        ? (collections || []).find((c) => c.id === collectionId)?.name || 'collection'
        : 'no collection';

      if (successCount > 0) {
        toast.success(`Moved ${successCount} item${successCount > 1 ? 's' : ''} to ${collectionName}`);
      }
      if (failCount > 0) {
        toast.error(`Failed to move ${failCount} item${failCount > 1 ? 's' : ''}`);
      }

      await refetchAll();
      setSelectedItems(new Set());
    } finally {
      setIsBulkOperationInProgress(false);
    }
  };

  const handleBulkMoveToFeed = async () => {
    const confirmed = await confirm({
      title: 'Move to Feed',
      message: `Are you sure you want to move ${selectedItems.size} item${selectedItems.size > 1 ? 's' : ''} back to the feed? This will remove them from saved.`,
      confirmLabel: 'Move to Feed',
      variant: 'primary',
    });

    if (!confirmed) return;

    setIsBulkOperationInProgress(true);
    let successCount = 0;
    let failCount = 0;

    try {
      const promises = Array.from(selectedItems).map(async (itemId) => {
        const item = (saved || []).find((s) => s.id === itemId);
        if (!item) return false;

        try {
          const response = await fetch(`/api/content/${item.content.id}/unsave`, {
            method: 'POST',
          });
          if (response.ok) {
            successCount++;
            return true;
          } else {
            failCount++;
            return false;
          }
        } catch {
          failCount++;
          return false;
        }
      });

      await Promise.all(promises);

      if (successCount > 0) {
        toast.success(`Moved ${successCount} item${successCount > 1 ? 's' : ''} back to feed`);
      }
      if (failCount > 0) {
        toast.error(`Failed to move ${failCount} item${failCount > 1 ? 's' : ''}`);
      }

      await refetchAll();
      setSelectedItems(new Set());
    } finally {
      setIsBulkOperationInProgress(false);
    }
  };

  const handleBulkExport = async () => {
    setIsBulkOperationInProgress(true);

    try {
      const selectedItemsData = filteredAndSortedItems.filter((item) =>
        selectedItems.has(item.id)
      );

      const exportData = selectedItemsData.map((item) => ({
        title: item.content.title,
        url: item.content.url,
        source: item.content.sourceDisplayName || 'Unknown',
        sourceType: item.content.sourceType,
        savedAt: item.savedAt,
        notes: item.notes || '',
        collection: item.collection?.name || 'None',
        duration: item.content.duration,
      }));

      // Create JSON export
      const jsonString = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `saved-items-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Exported ${selectedItems.size} item${selectedItems.size > 1 ? 's' : ''}`);
      setSelectedItems(new Set());
    } catch (error) {
      toast.error('Failed to export items');
      console.error('Export error:', error);
    } finally {
      setIsBulkOperationInProgress(false);
    }
  };

  if (isLoading) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Saved Content
              </h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Sidebar - Collections Skeleton */}
              <div className="lg:col-span-1">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                  <div className="animate-pulse h-6 bg-gray-300 dark:bg-gray-600 rounded w-32 mb-4" />
                  <CollectionListSkeleton count={4} />
                </div>
              </div>

              {/* Main Content Skeleton */}
              <div className="lg:col-span-3">
                <div className="mb-6">
                  <div className="animate-pulse h-10 bg-gray-200 dark:bg-gray-700 rounded w-full" />
                </div>
                <SavedContentSkeleton count={6} />
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-red-800 dark:text-red-300 mb-2">
                Error loading saved content
              </h2>
              <p className="text-red-600 dark:text-red-400">{error}</p>
              <div className="mt-4">
                <Button
                  variant="danger"
                  onClick={() => refetchSaved()}
                >
                  Try again
                </Button>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  const totalSavedCount = collections?.reduce((sum, c) => sum + c.itemCount, 0) || 0;

  if (totalSavedCount === 0) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
              Saved Content
            </h1>
            <EmptyState
              icon={<SavedIcon className="w-16 h-16 text-gray-400" />}
              heading="No saved content yet"
              description="Content you save from the feed will appear here for easy access later. Save items to create your personal library of valuable content."
              primaryAction={{
                label: "Browse Feed",
                onClick: () => window.location.href = '/scroll'
              }}
            />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Saved Content
            </h1>
            <div className="flex items-center gap-4">
              {!selectionMode && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setSelectionMode(true)}
                >
                  Select Items
                </Button>
              )}
              <span className="text-gray-600 dark:text-gray-400">
                {saved?.length || 0} {(saved?.length || 0) === 1 ? 'item' : 'items'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar - Collections */}
            <div className="lg:col-span-1">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Collections
                </h2>
                <CollectionManager
                  collections={collections || []}
                  selectedCollectionId={selectedCollectionId}
                  onSelectCollection={handleSelectCollection}
                  onCollectionsChange={handleCollectionsChange}
                />
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3">
              {/* Search, Filter, Sort, and View Toggle */}
              <div className="space-y-4 mb-6">
                <Search
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onClear={clearSearch}
                  placeholder="Search by title, notes, collection, or source..."
                  resultCount={resultCount}
                  totalCount={totalCount}
                />

                <div className="flex flex-wrap items-center gap-3 justify-between">
                  <FilterSort
                    filters={filters}
                    onFiltersChange={setFilters}
                    sortBy={sortBy}
                    onSortChange={setSortBy}
                    collections={(collections || []).map(c => ({ id: c.id, name: c.name }))}
                    sources={uniqueSources}
                    activeFilterCount={activeFilterCount}
                  />

                  <ViewToggle view={view} onChange={setView} />
                </div>
              </div>

              {/* Bulk Action Toolbar */}
              {selectionMode && (
                <div className="mb-6">
                  <BulkActionToolbar
                    selectedCount={selectedItems.size}
                    totalCount={filteredAndSortedItems.length}
                    collections={collections || []}
                    onSelectAll={handleSelectAll}
                    onDeselectAll={handleDeselectAll}
                    onBulkRemove={handleBulkRemove}
                    onBulkMoveToCollection={handleBulkMoveToCollection}
                    onBulkMoveToFeed={handleBulkMoveToFeed}
                    onBulkExport={handleBulkExport}
                    onExitSelection={handleExitSelection}
                  />
                </div>
              )}

              {filteredAndSortedItems.length === 0 ? (
                <p className="text-gray-600 dark:text-gray-400 text-center py-8">
                  No saved items match your filters.
                </p>
              ) : (
                <>
                  {view === 'grid' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {filteredAndSortedItems.map((item) => (
                        <SavedItemCard
                          key={item.id}
                          id={item.id}
                          content={item.content}
                          sourceDisplayName={item.content.sourceDisplayName || 'Unknown Source'}
                          savedAt={item.savedAt}
                          notes={item.notes}
                          collection={item.collection}
                          collections={collections || []}
                          selectionMode={selectionMode}
                          isSelected={selectedItems.has(item.id)}
                          onToggleSelect={handleToggleSelect}
                          onOpen={handleOpen}
                          onRemove={handleUnsave}
                          onMoveToFeed={handleMoveToFeed}
                          onUpdateNotes={handleUpdateNotes}
                          onChangeCollection={handleCollectionChange}
                        />
                      ))}
                    </div>
                  )}

                  {view === 'list' && (
                    <div className="space-y-4">
                      {filteredAndSortedItems.map((item) => (
                        <SavedItemList
                          key={item.id}
                          id={item.id}
                          content={item.content}
                          sourceDisplayName={item.content.sourceDisplayName || 'Unknown Source'}
                          savedAt={item.savedAt}
                          notes={item.notes}
                          collection={item.collection}
                          collections={collections || []}
                          selectionMode={selectionMode}
                          isSelected={selectedItems.has(item.id)}
                          onToggleSelect={handleToggleSelect}
                          onOpen={handleOpen}
                          onRemove={handleUnsave}
                          onMoveToFeed={handleMoveToFeed}
                          onUpdateNotes={handleUpdateNotes}
                          onChangeCollection={handleCollectionChange}
                        />
                      ))}
                    </div>
                  )}

                  {view === 'compact' && (
                    <div className="space-y-2">
                      {filteredAndSortedItems.map((item) => (
                        <SavedItemCompact
                          key={item.id}
                          id={item.id}
                          content={item.content}
                          sourceDisplayName={item.content.sourceDisplayName || 'Unknown Source'}
                          savedAt={item.savedAt}
                          notes={item.notes}
                          collection={item.collection}
                          selectionMode={selectionMode}
                          isSelected={selectedItems.has(item.id)}
                          onToggleSelect={handleToggleSelect}
                          onOpen={handleOpen}
                          onRemove={handleUnsave}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Confirm Dialog */}
      <ConfirmDialog />

      {/* Bulk Operation Loading Overlay */}
      {isBulkOperationInProgress && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-gray-800 rounded-lg p-6 shadow-xl">
            <div className="flex items-center gap-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
              <span className="text-white font-medium">Processing bulk operation...</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function SavedPage() {
  return (
    <Suspense fallback={
      <>
        <Navigation />
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Saved Content
              </h1>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-1">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                  <div className="animate-pulse h-6 bg-gray-300 dark:bg-gray-600 rounded w-32 mb-4" />
                  <CollectionListSkeleton count={4} />
                </div>
              </div>
              <div className="lg:col-span-3">
                <div className="mb-6">
                  <div className="animate-pulse h-10 bg-gray-200 dark:bg-gray-700 rounded w-full" />
                </div>
                <SavedContentSkeleton count={6} />
              </div>
            </div>
          </div>
        </div>
      </>
    }>
      <SavedPageContent />
    </Suspense>
  );
}
