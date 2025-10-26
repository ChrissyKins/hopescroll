'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import { Navigation } from '@/components/navigation';
import { useToast, useConfirmDialog, Search, EmptyState, VideoIcon, UnwatchedIcon, SourceIcon, SourceListSkeleton, Button, Badge, Spinner } from '@/components/ui';
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

  // Search functionality
  const { query, setQuery, clearSearch, filteredItems, resultCount, totalCount } = useSearch(
    sources || [],
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

      const result = await response.json();
      const newItemsCount = result.data?.newItemsCount || 0;

      // Show success message with fetch results
      if (newItemsCount > 0) {
        setFetchMessage({
          type: 'success',
          text: `Source added successfully! Fetched ${newItemsCount} new items.`,
        });
      } else {
        setFetchMessage({
          type: 'success',
          text: 'Source added successfully! No new content found (may be outside the 7-day window).',
        });
      }

      // Refresh sources list
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
    try {
      const response = await fetch(`/api/sources/${source.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isMuted: !source.isMuted,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update source');
      }

      toast.success(`Source ${source.isMuted ? 'unmuted' : 'muted'} successfully`);
      // Refresh sources list
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update source');
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

  if (isLoading) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
              Content Sources
            </h1>

            {/* Add Source Form Skeleton */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
              <div className="animate-pulse space-y-4">
                <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-48 mb-4" />
                <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-full" />
                <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-full" />
                <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-full" />
              </div>
            </div>

            {/* Sources List Skeleton */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="animate-pulse h-6 bg-gray-300 dark:bg-gray-600 rounded w-48 mb-4" />
              <SourceListSkeleton count={5} />
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
                      <h4 className="text-white font-medium">
                        {selectedChannel.displayName}
                      </h4>
                      <p className="text-sm text-gray-400">
                        {selectedChannel.subscriberCount
                          ? `${(selectedChannel.subscriberCount / 1000000).toFixed(1)}M subscribers`
                          : 'No subscriber data'}
                      </p>
                      {selectedChannel.description && (
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">
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

              {!sources || sources.length === 0 ? (
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
                <div className="space-y-4">
                  {sortedItems.map((source) => (
                    <div
                      key={source.id}
                      className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <div className="flex items-center space-x-4 flex-1">
                        {source.avatarUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={source.avatarUrl}
                            alt={source.displayName}
                            className="w-12 h-12 rounded-full"
                          />
                        )}
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            {source.displayName}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {source.type} • {source.sourceId}
                          </p>
                          {source.videoStats && (
                            <div className="flex items-center gap-3 mt-1 text-sm">
                              <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                                <VideoIcon className="w-4 h-4" />
                                {source.videoStats.totalFetched} fetched
                              </span>
                              <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                <UnwatchedIcon className="w-4 h-4" />
                                {source.videoStats.unwatched} unwatched
                              </span>
                            </div>
                          )}
                          {source.errorMessage && (
                            <p className="text-sm text-red-500 mt-1">
                              Error: {source.errorMessage}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge
                            variant={
                              source.lastFetchStatus === 'success'
                                ? 'success'
                                : source.lastFetchStatus === 'error'
                                ? 'error'
                                : 'neutral'
                            }
                            size="sm"
                          >
                            {source.lastFetchStatus}
                          </Badge>
                          {source.isMuted && (
                            <Badge variant="warning" size="sm">
                              Muted
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        <Button
                          variant="neutral"
                          size="sm"
                          onClick={() => handleToggleMute(source)}
                        >
                          {source.isMuted ? 'Unmute' : 'Mute'}
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDeleteSource(source.id)}
                        >
                          Remove
                        </Button>
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
