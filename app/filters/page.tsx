'use client';

import { useState, useEffect } from 'react';
import { Navigation } from '@/components/navigation';
import { useToast, useConfirmDialog, Search, EmptyState, ShieldIcon, DurationSlider } from '@/components/ui';
import { useSearch } from '@/hooks/use-search';

interface FilterKeyword {
  id: string;
  keyword: string;
  isWildcard: boolean;
  createdAt: string;
}

interface UserPreferences {
  minDuration: number | null;
  maxDuration: number | null;
}

export default function FiltersPage() {
  const [keywords, setKeywords] = useState<FilterKeyword[]>([]);
  const [preferences, setPreferences] = useState<UserPreferences>({
    minDuration: null,
    maxDuration: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newKeyword, setNewKeyword] = useState('');
  const [isWildcard, setIsWildcard] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const toast = useToast();
  const { confirm, ConfirmDialog } = useConfirmDialog();

  // Search functionality for keywords
  const { query, setQuery, clearSearch, filteredItems, resultCount, totalCount } = useSearch(
    keywords,
    (keyword) => [keyword.keyword]
  );

  useEffect(() => {
    fetchFilters();
  }, []);

  const fetchFilters = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch('/api/filters');
      if (!response.ok) {
        throw new Error('Failed to fetch filters');
      }
      const data = await response.json();
      setKeywords(data.data.keywords);
      setPreferences({
        minDuration: data.data.preferences?.minDuration || null,
        maxDuration: data.data.preferences?.maxDuration || null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load filters');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddKeyword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyword.trim()) return;

    try {
      setIsAdding(true);
      const response = await fetch('/api/filters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword: newKeyword.trim(),
          isWildcard,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add keyword');
      }

      toast.success('Keyword filter added successfully');
      // Refresh filters list
      await fetchFilters();
      setNewKeyword('');
      setIsWildcard(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add keyword');
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteKeyword = async (keywordId: string) => {
    const confirmed = await confirm({
      title: 'Remove Keyword Filter',
      message: 'Are you sure you want to remove this keyword filter?',
      confirmLabel: 'Remove',
      variant: 'danger',
    });

    if (!confirmed) return;

    try {
      const response = await fetch(`/api/filters/${keywordId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete keyword');
      }

      toast.success('Keyword filter removed successfully');
      // Refresh filters list
      await fetchFilters();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete keyword');
    }
  };

  const handleUpdateDuration = async () => {
    try {
      const response = await fetch('/api/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          minDuration: preferences.minDuration,
          maxDuration: preferences.maxDuration,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update duration filters');
      }

      toast.success('Duration filters updated successfully');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update duration filters');
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
                <p className="text-gray-600 dark:text-gray-400">Loading filters...</p>
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
                Error loading filters
              </h2>
              <p className="text-red-600 dark:text-red-400">{error}</p>
              <button
                onClick={fetchFilters}
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
      <ConfirmDialog />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
            Content Filters
          </h1>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Keyword Filters */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Keyword Filters
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Block content containing specific words or phrases.
              </p>

              {/* Add Keyword Form */}
              <form onSubmit={handleAddKeyword} className="space-y-4 mb-6">
                <div>
                  <input
                    type="text"
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    placeholder="Enter keyword (e.g., 'election', '*politic*')"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isWildcard"
                    checked={isWildcard}
                    onChange={(e) => setIsWildcard(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                  />
                  <label
                    htmlFor="isWildcard"
                    className="ml-2 text-sm text-gray-700 dark:text-gray-300"
                  >
                    Wildcard match (partial words)
                  </label>
                </div>
                <button
                  type="submit"
                  disabled={isAdding}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded transition-colors"
                >
                  {isAdding ? 'Adding...' : 'Add Keyword'}
                </button>
              </form>

              {/* Search */}
              {keywords.length > 0 && (
                <div className="mb-4">
                  <Search
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onClear={clearSearch}
                    placeholder="Search keywords..."
                    resultCount={resultCount}
                    totalCount={totalCount}
                  />
                </div>
              )}

              {/* Keywords List */}
              <div className="space-y-2">
                {keywords.length === 0 ? (
                  <EmptyState
                    icon={<ShieldIcon className="w-16 h-16 text-gray-400" />}
                    heading="No keyword filters configured"
                    description="Create keyword filters to block content you don't want to see. You can filter by specific words or use wildcard matching for broader filtering."
                    primaryAction={{
                      label: "Add Your First Filter",
                      onClick: () => {
                        const input = document.querySelector('input[placeholder*="Enter keyword"]') as HTMLInputElement;
                        input?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        input?.focus();
                      }
                    }}
                  />
                ) : filteredItems.length === 0 ? (
                  <p className="text-gray-600 dark:text-gray-400 text-center py-4">
                    No keywords match your search.
                  </p>
                ) : (
                  filteredItems.map((keyword) => (
                    <div
                      key={keyword.id}
                      className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-gray-900 dark:text-white">
                          {keyword.keyword}
                        </span>
                        {keyword.isWildcard && (
                          <span className="px-2 py-1 text-xs rounded bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400">
                            wildcard
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteKeyword(keyword.id)}
                        className="text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                      >
                        Remove
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Duration Filters */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Duration Filters
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Filter content by length. Adjust the slider or enter precise values below.
              </p>

              <div className="space-y-6">
                {/* Visual Duration Slider */}
                <DurationSlider
                  min={preferences.minDuration}
                  max={preferences.maxDuration}
                  onChange={(min, max) =>
                    setPreferences({ minDuration: min, maxDuration: max })
                  }
                />

                {/* Quick Presets */}
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Quick Presets:
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() =>
                        setPreferences({ minDuration: 300, maxDuration: 600 })
                      }
                      className="px-3 py-2 text-sm bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded transition-colors"
                    >
                      Coffee Break (5-10min)
                    </button>
                    <button
                      onClick={() =>
                        setPreferences({ minDuration: 900, maxDuration: 1500 })
                      }
                      className="px-3 py-2 text-sm bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded transition-colors"
                    >
                      Meal Time (15-25min)
                    </button>
                    <button
                      onClick={() =>
                        setPreferences({ minDuration: 1800, maxDuration: 3600 })
                      }
                      className="px-3 py-2 text-sm bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded transition-colors"
                    >
                      Evening (30-60min)
                    </button>
                    <button
                      onClick={() =>
                        setPreferences({ minDuration: null, maxDuration: null })
                      }
                      className="px-3 py-2 text-sm bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded transition-colors"
                    >
                      Any Length
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleUpdateDuration}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors"
                >
                  Save Duration Filters
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
