'use client';

import { useState, useEffect, useCallback } from 'react';
import { Navigation } from '@/components/navigation';
import { ContentCard } from '@/components/feed/content-card';
import {
  useToast,
  Search,
  EmptyState,
  SavedIcon,
  CollectionManager,
  CollectionSelector,
  SavedContentSkeleton,
  CollectionListSkeleton,
} from '@/components/ui';
import { useSearch } from '@/hooks/use-search';

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
  content: any;
}

export default function SavedPage() {
  const [saved, setSaved] = useState<SavedItem[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const toast = useToast();

  // Search functionality
  const { query, setQuery, clearSearch, filteredItems, resultCount, totalCount } = useSearch(
    saved,
    (item) => [
      item.content?.title || '',
      item.notes || '',
      item.collection?.name || '',
      item.content?.sourceDisplayName || ''
    ]
  );

  const fetchCollections = useCallback(async () => {
    try {
      const response = await fetch('/api/collections');
      if (!response.ok) {
        throw new Error('Failed to fetch collections');
      }
      const data = await response.json();
      setCollections(data.data);
    } catch (err) {
      console.error('Failed to load collections:', err);
    }
  }, []);

  const fetchSaved = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const url = selectedCollectionId
        ? `/api/saved?collectionId=${selectedCollectionId}`
        : '/api/saved';

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch saved content');
      }
      const data = await response.json();
      setSaved(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load saved content');
    } finally {
      setIsLoading(false);
    }
  }, [selectedCollectionId]);

  useEffect(() => {
    fetchCollections();
    fetchSaved();
  }, [fetchCollections, fetchSaved]);

  useEffect(() => {
    fetchSaved();
  }, [selectedCollectionId, fetchSaved]);

  const handleUnsave = async (contentId: string) => {
    try {
      const response = await fetch(`/api/content/${contentId}/unsave`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to remove from saved');
      }

      toast.success('Removed from saved content');
      await Promise.all([fetchSaved(), fetchCollections()]);
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
      await Promise.all([fetchSaved(), fetchCollections()]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update collection');
    }
  };

  const handleCollectionsChange = () => {
    fetchCollections();
    fetchSaved();
  };

  const handleSelectCollection = (collectionId: string | null) => {
    setSelectedCollectionId(collectionId);
    clearSearch();
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
              <button
                onClick={fetchSaved}
                className="mt-4 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  const totalSavedCount = collections.reduce((sum, c) => sum + c.itemCount, 0);

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
            <span className="text-gray-600 dark:text-gray-400">
              {saved.length} {saved.length === 1 ? 'item' : 'items'}
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar - Collections */}
            <div className="lg:col-span-1">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Collections
                </h2>
                <CollectionManager
                  collections={collections}
                  selectedCollectionId={selectedCollectionId}
                  onSelectCollection={handleSelectCollection}
                  onCollectionsChange={handleCollectionsChange}
                />
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3">
              {/* Search */}
              <div className="mb-6">
                <Search
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onClear={clearSearch}
                  placeholder="Search by title, notes, collection, or source..."
                  resultCount={resultCount}
                  totalCount={totalCount}
                />
              </div>

              {filteredItems.length === 0 ? (
                <p className="text-gray-600 dark:text-gray-400 text-center py-8">
                  No saved items match your search.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {filteredItems.map((item) => (
                    <div key={item.id} className="flex flex-col gap-3">
                      <ContentCard
                        item={{
                          content: item.content,
                          position: 0,
                          isNew: false,
                          sourceDisplayName: '',
                          interactionState: null,
                        }}
                        onWatch={() => {}}
                        onSave={() => {}}
                        onDismiss={() => {}}
                        onNotNow={() => {}}
                      />

                      <div className="flex items-center justify-between gap-2">
                        <CollectionSelector
                          collections={collections}
                          selectedCollectionId={item.collectionId}
                          onSelect={(collectionId) =>
                            handleCollectionChange(item.id, collectionId)
                          }
                        />

                        <button
                          onClick={() => handleUnsave(item.content.id)}
                          className="text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 px-3 py-1.5"
                        >
                          Remove
                        </button>
                      </div>

                      {item.notes && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 italic px-1">
                          &ldquo;{item.notes}&rdquo;
                        </p>
                      )}

                      {item.collection && (
                        <div className="flex items-center gap-2 px-1">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{
                              backgroundColor: item.collection.color || '#3B82F6',
                            }}
                          />
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {item.collection.name}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
