'use client';

import { useState, useEffect } from 'react';
import { Navigation } from '@/components/navigation';
import { Search } from '@/components/ui';
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
    switch (type) {
      case 'WATCHED':
        return '👁️';
      case 'SAVED':
        return '⭐';
      case 'DISMISSED':
        return '❌';
      case 'NOT_NOW':
        return '⏭️';
      case 'BLOCKED':
        return '🚫';
      default:
        return '•';
    }
  };

  if (isLoading) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400">Loading history...</p>
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
                Error loading history
              </h2>
              <p className="text-red-600 dark:text-red-400">{error}</p>
              <button
                onClick={fetchHistory}
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
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                    filterType === type
                      ? 'bg-blue-600 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {type === 'all' ? 'All' : type.replace('_', ' ')}
                </button>
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
            <div className="text-center py-12">
              <p className="text-gray-600 dark:text-gray-400">
                No history found for this filter.
              </p>
            </div>
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
                        <span
                          className={`px-2 py-1 text-xs rounded ${
                            item.type === 'WATCHED'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                              : item.type === 'SAVED'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                              : item.type === 'DISMISSED'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                              : item.type === 'NOT_NOW'
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {item.type}
                        </span>
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
