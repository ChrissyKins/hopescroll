'use client';

import { useState, useEffect } from 'react';
import { Navigation } from '@/components/navigation';

interface ContentSource {
  id: string;
  type: string;
  sourceId: string;
  displayName: string;
  avatarUrl: string | null;
  isMuted: boolean;
  lastFetchStatus: string;
  errorMessage: string | null;
}

export default function SourcesPage() {
  const [sources, setSources] = useState<ContentSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newSourceId, setNewSourceId] = useState('');
  const [sourceType, setSourceType] = useState('YOUTUBE');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    fetchSources();
  }, []);

  const fetchSources = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch('/api/sources');
      if (!response.ok) {
        throw new Error('Failed to fetch sources');
      }
      const data = await response.json();
      setSources(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sources');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSourceId.trim()) return;

    try {
      setIsAdding(true);
      const response = await fetch('/api/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: sourceType,
          sourceId: newSourceId.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to add source');
      }

      // Refresh sources list
      await fetchSources();
      setNewSourceId('');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to add source');
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteSource = async (sourceId: string) => {
    if (!confirm('Are you sure you want to remove this source?')) return;

    try {
      const response = await fetch(`/api/sources/${sourceId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete source');
      }

      // Refresh sources list
      await fetchSources();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete source');
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

      // Refresh sources list
      await fetchSources();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update source');
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
                <p className="text-gray-600 dark:text-gray-400">Loading sources...</p>
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
                Error loading sources
              </h2>
              <p className="text-red-600 dark:text-red-400">{error}</p>
              <button
                onClick={fetchSources}
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
                  {sourceType === 'YOUTUBE' && 'Channel ID (e.g., UCHnyfMqiRRG1u-2MsSQLbXA)'}
                  {sourceType === 'RSS' && 'Feed URL'}
                  {sourceType === 'PODCAST' && 'Podcast Feed URL'}
                </label>
                <input
                  type="text"
                  value={newSourceId}
                  onChange={(e) => setNewSourceId(e.target.value)}
                  placeholder={
                    sourceType === 'YOUTUBE'
                      ? 'Enter YouTube channel ID'
                      : 'Enter feed URL'
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isAdding}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded transition-colors"
              >
                {isAdding ? 'Adding...' : 'Add Source'}
              </button>
            </form>
          </div>

          {/* Sources List */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Your Sources ({sources.length})
              </h2>
              {sources.length === 0 ? (
                <p className="text-gray-600 dark:text-gray-400 text-center py-8">
                  No sources yet. Add your first source above!
                </p>
              ) : (
                <div className="space-y-4">
                  {sources.map((source) => (
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
                          {source.errorMessage && (
                            <p className="text-sm text-red-500 mt-1">
                              Error: {source.errorMessage}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <span
                            className={`px-2 py-1 text-xs rounded ${
                              source.lastFetchStatus === 'success'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                                : source.lastFetchStatus === 'error'
                                ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                            }`}
                          >
                            {source.lastFetchStatus}
                          </span>
                          {source.isMuted && (
                            <span className="px-2 py-1 text-xs rounded bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
                              Muted
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={() => handleToggleMute(source)}
                          className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded transition-colors"
                        >
                          {source.isMuted ? 'Unmute' : 'Mute'}
                        </button>
                        <button
                          onClick={() => handleDeleteSource(source.id)}
                          className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                        >
                          Remove
                        </button>
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
