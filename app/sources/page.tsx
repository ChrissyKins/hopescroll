'use client';

import { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import { Navigation } from '@/components/navigation';
import { useToast, useConfirmDialog, Search, EmptyState, VideoIcon, UnwatchedIcon, SourceIcon, SourceGridSkeleton, Button, Badge, Spinner, ToggleSwitch, CheckIcon, TrashIcon } from '@/components/ui';
import { ChannelAutocomplete, ChannelResult } from '@/components/ui/channel-autocomplete';
import { useSearch } from '@/hooks/use-search';
import { useCachedFetch } from '@/hooks/use-cached-fetch';

interface ContentSource {
  id: string;
  type: string;
  sourceId: string;
  displayName: string;
  avatarUrl: string | null;
  isMuted: boolean;
  lastFetchStatus: string;
  errorMessage: string | null;
  videoStats?: {
    totalFetched: number;
    unwatched: number;
  };
}

type SortOption = 'name-asc' | 'name-desc' | 'recent' | 'unwatched' | 'status';

export default function SourcesPage() {
  const [newSourceId, setNewSourceId] = useState('');
  const [sourceType, setSourceType] = useState('YOUTUBE');
  const [isAdding, setIsAdding] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [fetchMessage, setFetchMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('name-asc');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChannel, setSelectedChannel] = useState<ChannelResult | null>(null);
  const [optimisticUpdates, setOptimisticUpdates] = useState<Record<string, Partial<ContentSource>>>({});

  const toast = useToast();
  const { confirm, ConfirmDialog } = useConfirmDialog();

  // Fetch sources with caching
  const { data: sources, isLoading, error, refetch } = useCachedFetch<ContentSource[]>({
    cacheKey: 'sources',
    fetcher: async () => {
      const response = await fetch('/api/sources');
      if (!response.ok) {
        throw new Error('Failed to fetch sources');
      }
      const data = await response.json();
      return data.data;
    },
    ttl: 30000, // 30 seconds
  });

  // Apply optimistic updates to sources
  const sourcesWithOptimisticUpdates = useMemo(() => {
    if (!sources) return null;
    return sources.map(source => ({
      ...source,
      ...optimisticUpdates[source.id],
    }));
  }, [sources, optimisticUpdates]);

  // Auto-refresh while sources are being fetched (pending status)
  useEffect(() => {
    if (!sources) return;

    const hasPending = sources.some(s => s.lastFetchStatus === 'pending');
    if (!hasPending) return;

    // Poll every 3 seconds while pending (silent = no loading spinner)
    const interval = setInterval(() => {
      refetch(true); // Silent refetch
    }, 3000);

    return () => clearInterval(interval);
  }, [sources, refetch]);

  // Search functionality
  const { query, setQuery, clearSearch, filteredItems, resultCount, totalCount } = useSearch(
    sourcesWithOptimisticUpdates || [],
    (source) => [source.displayName, source.sourceId, source.type]
  );

  // Sorting functionality
  const sortedItems = useMemo(() => {
    const items = [...filteredItems];

    switch (sortBy) {
      case 'name-asc':
        return items.sort((a, b) => a.displayName.localeCompare(b.displayName));
      case 'name-desc':
        return items.sort((a, b) => b.displayName.localeCompare(a.displayName));
      case 'unwatched':
        return items.sort((a, b) => {
          const aUnwatched = a.videoStats?.unwatched || 0;
          const bUnwatched = b.videoStats?.unwatched || 0;
          return bUnwatched - aUnwatched;
        });
      case 'status':
        return items.sort((a, b) => {
          const statusOrder = { success: 0, pending: 1, error: 2 };
          const aOrder = statusOrder[a.lastFetchStatus as keyof typeof statusOrder] ?? 3;
          const bOrder = statusOrder[b.lastFetchStatus as keyof typeof statusOrder] ?? 3;
          return aOrder - bOrder;
        });
      case 'recent':
        // Sort by most recent (success status first, then by name as proxy)
        return items.sort((a, b) => {
          if (a.lastFetchStatus === 'success' && b.lastFetchStatus !== 'success') return -1;
          if (a.lastFetchStatus !== 'success' && b.lastFetchStatus === 'success') return 1;
          return a.displayName.localeCompare(b.displayName);
        });
      default:
        return items;
    }
  }, [filteredItems, sortBy]);

  const handleChannelSelect = (channel: ChannelResult) => {
    setSelectedChannel(channel);
    setSearchQuery(channel.displayName);
    setNewSourceId(channel.channelId);
  };

  const handleAddSource = async (e: React.FormEvent) => {
    e.preventDefault();

    // For YouTube, use selected channel or manual input
    const sourceIdToUse = sourceType === 'YOUTUBE' && selectedChannel
      ? selectedChannel.channelId
      : newSourceId.trim();

    if (!sourceIdToUse) return;

    try {
      setIsAdding(true);
      const response = await fetch('/api/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: sourceType,
          sourceId: sourceIdToUse,
          displayName: selectedChannel?.displayName,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to add source');
      }

      // Show success message - fetching happens in background
      toast.success('Source added! Fetching videos in the background...');

      // Refresh sources list immediately to show the new source
      await refetch();
      setNewSourceId('');
      setSearchQuery('');
      setSelectedChannel(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add source');
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteSource = async (sourceId: string) => {
    const confirmed = await confirm({
      title: 'Remove Source',
      message: 'Are you sure you want to remove this source? This action cannot be undone.',
      confirmLabel: 'Remove',
      variant: 'danger',
    });

    if (!confirmed) return;

    try {
      const response = await fetch(`/api/sources/${sourceId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete source');
      }

      toast.success('Source removed successfully');
      // Refresh sources list
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete source');
    }
  };

  const handleToggleMute = async (source: ContentSource) => {
    const newMutedState = !source.isMuted;

    // Optimistic update - show the change immediately
    setOptimisticUpdates(prev => ({
      ...prev,
      [source.id]: { isMuted: newMutedState },
    }));

    // Update the API in the background
    try {
      const response = await fetch(`/api/sources/${source.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isMuted: newMutedState,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update source');
      }

      // Silently refetch to get confirmed data, then clear optimistic update
      await refetch(true);

      // Clear optimistic update after refetch completes
      setOptimisticUpdates(prev => {
        const newUpdates = { ...prev };
        delete newUpdates[source.id];
        return newUpdates;
      });
    } catch (err) {
      // Rollback optimistic update on error
      setOptimisticUpdates(prev => {
        const newUpdates = { ...prev };
        delete newUpdates[source.id];
        return newUpdates;
      });
      toast.error(err instanceof Error ? err.message : 'Failed to update source');
      await refetch();
    }
  };

  const handleRefreshContent = async () => {
    if (!sources || sources.length === 0) {
      setFetchMessage({ type: 'error', text: 'Add sources first before fetching content' });
      return;
    }

    try {
      setIsFetching(true);
      setFetchMessage(null);

      const response = await fetch('/api/sources/fetch', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch content');
      }

      const result = await response.json();
      const stats = result.data.stats;

      setFetchMessage({
        type: 'success',
        text: `Fetched content from ${stats.successCount}/${stats.totalSources} sources. Found ${stats.newItemsCount} new items!`,
      });

      // Refresh sources list to show updated status
      await refetch();
    } catch (err) {
      setFetchMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to fetch content',
      });
    } finally {
      setIsFetching(false);
    }
  };

  // Removed blocking loading state - we'll show skeletons inline instead

  if (error) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-red-800 dark:text-red-300 mb-2">
                Error loading sources
              </h2>
              <p className="text-red-600 dark:text-red-400">{error}</p>
              <div className="mt-4">
                <Button
                  variant="danger"
                  onClick={() => refetch()}
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

  return (
    <>
      <Navigation />
      <ConfirmDialog />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
            Content Sources
          </h1>

          {/* Add Source Form */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Add New Source
            </h2>
            <form onSubmit={handleAddSource} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Source Type
                </label>
                <select
                  value={sourceType}
                  onChange={(e) => setSourceType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="YOUTUBE">YouTube</option>
                  <option value="RSS">RSS Feed</option>
                  <option value="PODCAST">Podcast</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {sourceType === 'YOUTUBE' && 'Search for Channel'}
                  {sourceType === 'RSS' && 'Feed URL'}
                  {sourceType === 'PODCAST' && 'Podcast Feed URL'}
                </label>
                {sourceType === 'YOUTUBE' ? (
                  <ChannelAutocomplete
                    value={searchQuery}
                    onChange={(val) => {
                      setSearchQuery(val);
                      // Clear selection if user starts typing
                      if (selectedChannel && val !== selectedChannel.displayName) {
                        setSelectedChannel(null);
                        setNewSourceId('');
                      }
                    }}
                    onSelect={handleChannelSelect}
                    placeholder="Type to search for a YouTube channel..."
                    disabled={isAdding}
                  />
                ) : (
                  <input
                    type="text"
                    value={newSourceId}
                    onChange={(e) => setNewSourceId(e.target.value)}
                    placeholder={
                      sourceType === 'RSS'
                        ? 'Enter feed URL'
                        : 'Enter podcast feed URL'
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  />
                )}
              </div>

              {/* Channel Preview */}
              {selectedChannel && sourceType === 'YOUTUBE' && (
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Selected Channel
                  </h3>
                  <div className="flex items-start gap-3">
                    <Image
                      src={selectedChannel.avatarUrl}
                      alt={selectedChannel.displayName}
                      width={64}
                      height={64}
                      className="rounded-full"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-gray-900 dark:text-white font-medium">
                        {selectedChannel.displayName}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {selectedChannel.subscriberCount
                          ? `${(selectedChannel.subscriberCount / 1000000).toFixed(1)}M subscribers`
                          : 'No subscriber data'}
                      </p>
                      {selectedChannel.description && (
                        <p className="text-sm text-gray-500 dark:text-gray-500 mt-1 line-clamp-2">
                          {selectedChannel.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                disabled={isAdding || (sourceType === 'YOUTUBE' && !selectedChannel && !newSourceId.trim())}
                loading={isAdding}
              >
                {isAdding ? 'Adding...' : 'Add Source'}
              </Button>
            </form>
          </div>

          {/* Sources List */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Your Sources ({sources?.length || 0})
                </h2>
                <Button
                  onClick={handleRefreshContent}
                  variant="success"
                  disabled={isFetching || !sources || sources.length === 0}
                  loading={isFetching}
                >
                  {isFetching ? (
                    <>Fetching...</>
                  ) : (
                    <>
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span>Refresh Content</span>
                    </>
                  )}
                </Button>
              </div>

              {fetchMessage && (
                <div className={`mb-4 p-4 rounded-lg ${
                  fetchMessage.type === 'success'
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300'
                    : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300'
                }`}>
                  {fetchMessage.text}
                </div>
              )}

              {/* Search and Sort */}
              {sources && sources.length > 0 && (
                <div className="mb-4 space-y-4">
                  <Search
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onClear={clearSearch}
                    placeholder="Search sources by name, ID, or type..."
                    resultCount={resultCount}
                    totalCount={totalCount}
                  />

                  <div className="flex items-center gap-2">
                    <label htmlFor="sort" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Sort by:
                    </label>
                    <select
                      id="sort"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as SortOption)}
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    >
                      <option value="name-asc">Name (A-Z)</option>
                      <option value="name-desc">Name (Z-A)</option>
                      <option value="unwatched">Most Unwatched</option>
                      <option value="status">Status</option>
                      <option value="recent">Recently Active</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Show loading skeleton while data is loading */}
              {isLoading ? (
                <SourceGridSkeleton count={6} />
              ) : !sourcesWithOptimisticUpdates || sourcesWithOptimisticUpdates.length === 0 ? (
                <EmptyState
                  icon={<SourceIcon className="w-16 h-16 text-gray-400" />}
                  heading="No content sources yet"
                  description="Add YouTube channels, RSS feeds, or podcasts to start building your curated feed. Sources you add will automatically fetch new content within the last 7 days."
                  primaryAction={{
                    label: "Add Your First Source",
                    onClick: () => {
                      const input = document.querySelector('input[placeholder*="Enter YouTube"]') as HTMLInputElement;
                      input?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      input?.focus();
                    }
                  }}
                />
              ) : sortedItems.length === 0 ? (
                <p className="text-gray-600 dark:text-gray-400 text-center py-8">
                  No sources match your search.
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
                  {sortedItems.map((source) => (
                    <div
                      key={source.id}
                      className={`relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:shadow-lg hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200 flex flex-col group ${
                        source.isMuted ? 'opacity-50 grayscale' : ''
                      }`}
                    >
                      {/* Delete button - top right */}
                      <button
                        onClick={() => handleDeleteSource(source.id)}
                        className="absolute top-1.5 right-1.5 p-1 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors opacity-0 group-hover:opacity-100 z-10"
                        aria-label="Remove source"
                      >
                        <TrashIcon className="w-3.5 h-3.5" />
                      </button>

                      {/* Avatar */}
                      <div className="flex justify-center mb-2">
                        {source.avatarUrl && (
                          <Image
                            src={source.avatarUrl}
                            alt={source.displayName}
                            width={56}
                            height={56}
                            className="rounded-full"
                          />
                        )}
                      </div>

                      {/* Display name */}
                      <h3 className="font-medium text-gray-900 dark:text-white text-center mb-1 line-clamp-2 text-xs leading-tight">
                        {source.displayName}
                      </h3>

                      {/* Stats - compact */}
                      {source.videoStats && (
                        <div className="flex items-center justify-center gap-3 text-xs mb-2">
                          <span className="flex items-center gap-0.5 text-blue-600 dark:text-blue-400">
                            <VideoIcon className="w-3 h-3" />
                            {source.videoStats.totalFetched}
                          </span>
                          <span className="flex items-center gap-0.5 text-green-600 dark:text-green-400">
                            <UnwatchedIcon className="w-3 h-3" />
                            {source.videoStats.unwatched}
                          </span>
                        </div>
                      )}

                      {/* Error message - compact */}
                      {source.errorMessage && (
                        <p className="text-xs text-red-500 text-center mb-1.5 line-clamp-1">
                          {source.errorMessage}
                        </p>
                      )}

                      {/* Bottom controls - more compact */}
                      <div className="flex items-center justify-between pt-2 mt-auto border-t border-gray-200 dark:border-gray-700">
                        {/* Mute toggle */}
                        <ToggleSwitch
                          checked={!source.isMuted}
                          onChange={() => handleToggleMute(source)}
                          size="sm"
                        />

                        {/* Status indicator */}
                        <div className="flex items-center">
                          {source.lastFetchStatus === 'pending' && (
                            <Spinner size="sm" variant="primary" />
                          )}
                          {source.lastFetchStatus === 'success' && (
                            <CheckIcon className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                          )}
                          {source.lastFetchStatus === 'error' && (
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500" title="Error" />
                          )}
                        </div>
                      </div>
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
