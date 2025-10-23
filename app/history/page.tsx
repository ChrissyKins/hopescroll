'use client';

import { useState, useEffect } from 'react';
import { Navigation } from '@/components/navigation';
import { Search, EmptyState, HistoryIcon, WatchedIcon, StarIcon, DismissedIcon, NotNowIcon, BlockedIcon, HistoryListSkeleton, Button, Badge } from '@/components/ui';
import { useSearch } from '@/hooks/use-search';

interface HistoryItem {
  id: string;
  type: string;
  timestamp: string;
  watchDuration?: number;
  completionRate?: number;
  content: any;
}

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');

  // Search functionality
  const { query, setQuery, clearSearch, filteredItems, resultCount, totalCount } = useSearch(
    history,
    (item) => [
      item.content?.title || '',
      item.content?.sourceId || '',
      item.type
    ]
  );

  useEffect(() => {
    fetchHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterType]);

  const fetchHistory = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const url =
        filterType === 'all'
          ? '/api/history'
          : `/api/history?type=${filterType.toUpperCase()}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch history');
      }
      const data = await response.json();
      setHistory(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load history');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getInteractionIcon = (type: string) => {
    const iconClass = "w-5 h-5";
    switch (type) {
      case 'WATCHED':
        return <WatchedIcon className={iconClass} />;
      case 'SAVED':
        return <StarIcon className={iconClass} />;
      case 'DISMISSED':
        return <DismissedIcon className={iconClass} />;
      case 'NOT_NOW':
        return <NotNowIcon className={iconClass} />;
      case 'BLOCKED':
        return <BlockedIcon className={iconClass} />;
      default:
        return <span className="w-5 h-5 flex items-center justify-center">•</span>;
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
                Interaction History
              </h1>
            </div>

            {/* Filter Tabs Skeleton */}
            <div className="flex space-x-2 mb-6 overflow-x-auto">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="animate-pulse h-10 bg-gray-200 dark:bg-gray-700 rounded-lg w-24"
                />
              ))}
            </div>

            {/* Search Skeleton */}
            <div className="mb-6">
              <div className="animate-pulse h-10 bg-gray-200 dark:bg-gray-700 rounded w-full" />
            </div>

            {/* History List Skeleton */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <HistoryListSkeleton count={8} />
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
                Error loading history
              </h2>
              <p className="text-red-600 dark:text-red-400">{error}</p>
              <div className="mt-4">
                <Button
                  variant="danger"
                  onClick={fetchHistory}
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Interaction History
            </h1>
          </div>

          {/* Filter Tabs */}
          <div className="flex space-x-2 mb-6 overflow-x-auto">
            {['all', 'watched', 'saved', 'dismissed', 'not_now', 'blocked'].map(
              (type) => (
                <Button
                  key={type}
                  variant={filterType === type ? 'primary' : 'ghost'}
                  onClick={() => setFilterType(type)}
                >
                  {type === 'all' ? 'All' : type.replace('_', ' ')}
                </Button>
              )
            )}
          </div>

          {/* Search */}
          {history.length > 0 && (
            <div className="mb-6">
              <Search
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onClear={clearSearch}
                placeholder="Search by title, source, or interaction type..."
                resultCount={resultCount}
                totalCount={totalCount}
              />
            </div>
          )}

          {history.length === 0 ? (
            <EmptyState
              icon={<HistoryIcon className="w-16 h-16 text-gray-400" />}
              heading="No interaction history"
              description="Your watched, saved, and dismissed content will be tracked here. Start browsing your feed to build up your history."
              primaryAction={{
                label: "Go to Feed",
                onClick: () => window.location.href = '/scroll'
              }}
            />
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 dark:text-gray-400">
                No history items match your search.
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
              <div className="p-6 space-y-4">
                {filteredItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start space-x-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <div className="text-2xl">{getInteractionIcon(item.type)}</div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            {item.content.title}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {item.content.sourceId} •{' '}
                            {formatDate(item.timestamp)}
                          </p>
                        </div>
                        <a
                          href={item.content.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          View
                        </a>
                      </div>
                      <div className="flex items-center space-x-4 mt-2">
                        <Badge
                          variant={
                            item.type === 'WATCHED'
                              ? 'success'
                              : item.type === 'SAVED'
                              ? 'info'
                              : item.type === 'DISMISSED'
                              ? 'error'
                              : item.type === 'NOT_NOW'
                              ? 'warning'
                              : 'neutral'
                          }
                          size="sm"
                        >
                          {item.type}
                        </Badge>
                        {item.watchDuration && (
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            Watched: {formatDuration(item.watchDuration)}
                          </span>
                        )}
                        {item.completionRate && (
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            {Math.round(item.completionRate * 100)}% complete
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
