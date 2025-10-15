'use client';

import { useState, useEffect } from 'react';
import { ContentCard } from '@/components/feed/content-card';
import { Navigation } from '@/components/navigation';
import { TheatreMode } from '@/components/theatre/theatre-mode';
import type { FeedItem } from '@/domain/feed/feed-generator';

export default function FeedPage() {
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentItem, setCurrentItem] = useState<FeedItem | null>(null);
  const [isUpdatingFilter, setIsUpdatingFilter] = useState(false);

  useEffect(() => {
    fetchFeed();
  }, []);

  const fetchFeed = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch('/api/feed');
      if (!response.ok) {
        throw new Error('Failed to fetch feed');
      }
      const data = await response.json();
      setFeed(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load feed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = async (action: string, contentId: string) => {
    try {
      const response = await fetch(`/api/content/${contentId}/${action}`, {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error(`Failed to ${action} content`);
      }
      // Optimistically remove from feed
      setFeed((prev) => prev.filter((item) => item.content.id !== contentId));
    } catch (err) {
      console.error(`Error ${action}ing content:`, err);
      // Could show toast notification here
    }
  };

  const handleWatch = (contentId: string) => {
    // Open theatre mode with the selected content
    const item = feed.find((item) => item.content.id === contentId);
    if (item) {
      setCurrentItem(item);
    }
  };

  const handleCloseTheatre = () => {
    setCurrentItem(null);
  };

  const handleMarkWatched = async (contentId: string, duration?: number) => {
    try {
      const response = await fetch(`/api/content/${contentId}/watch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ watchDuration: duration }),
      });
      if (!response.ok) {
        throw new Error('Failed to mark as watched');
      }
      // Remove from feed after marking as watched
      setFeed((prev) => prev.filter((item) => item.content.id !== contentId));
    } catch (err) {
      console.error('Error marking content as watched:', err);
    }
  };

  const handleNextInFeed = () => {
    if (!currentItem) return;

    // Find the index of the current item
    const currentIndex = feed.findIndex((item) => item.content.id === currentItem.content.id);

    // Get the next item (or wrap to first)
    const nextIndex = (currentIndex + 1) % feed.length;
    const nextItem = feed[nextIndex];

    if (nextItem) {
      setCurrentItem(nextItem);
    }
  };

  const handleSave = (contentId: string) => {
    handleAction('save', contentId);
  };

  const handleDismiss = (contentId: string) => {
    handleAction('dismiss', contentId);
  };

  const handleNotNow = (contentId: string) => {
    handleAction('not-now', contentId);
  };

  const handleDurationFilterChange = async (minDuration: number | null, maxDuration: number | null) => {
    try {
      setIsUpdatingFilter(true);
      const response = await fetch('/api/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minDuration, maxDuration }),
      });

      if (!response.ok) {
        throw new Error('Failed to update duration filter');
      }

      // Refresh the feed with new filters
      await fetchFeed();
    } catch (err) {
      console.error('Error updating duration filter:', err);
    } finally {
      setIsUpdatingFilter(false);
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
                <p className="text-gray-600 dark:text-gray-400">Loading your feed...</p>
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
                Error loading feed
              </h2>
              <p className="text-red-600 dark:text-red-400">{error}</p>
              <button
                onClick={fetchFeed}
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

  const handleClearInteractions = async () => {
    if (!confirm('This will clear all your watch history and interactions. Continue?')) {
      return;
    }

    try {
      const response = await fetch('/api/debug/clear-interactions', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to clear interactions');
      }

      // Refresh feed after clearing
      await fetchFeed();
    } catch (err) {
      console.error('Error clearing interactions:', err);
      alert('Failed to clear interactions');
    }
  };

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header - sticky, minimal */}
        <div className="sticky top-0 z-10 bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200/50 dark:border-gray-800/50">
          <div className="max-w-2xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">HopeScroll</h1>
              <button
                onClick={fetchFeed}
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                Refresh
              </button>
            </div>

            {/* Duration Filter Presets - Pill style */}
            <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-2">
              <button
                onClick={() => handleDurationFilterChange(300, 600)}
                disabled={isUpdatingFilter}
                className="px-4 py-1.5 text-sm bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full border border-gray-200 dark:border-gray-700 transition-all disabled:opacity-50 whitespace-nowrap"
              >
                5-10min
              </button>
              <button
                onClick={() => handleDurationFilterChange(900, 1500)}
                disabled={isUpdatingFilter}
                className="px-4 py-1.5 text-sm bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full border border-gray-200 dark:border-gray-700 transition-all disabled:opacity-50 whitespace-nowrap"
              >
                15-25min
              </button>
              <button
                onClick={() => handleDurationFilterChange(1800, 3600)}
                disabled={isUpdatingFilter}
                className="px-4 py-1.5 text-sm bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full border border-gray-200 dark:border-gray-700 transition-all disabled:opacity-50 whitespace-nowrap"
              >
                30-60min
              </button>
              <button
                onClick={() => handleDurationFilterChange(null, null)}
                disabled={isUpdatingFilter}
                className="px-4 py-1.5 text-sm bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full border border-gray-200 dark:border-gray-700 transition-all disabled:opacity-50 whitespace-nowrap"
              >
                Any Length
              </button>
              {isUpdatingFilter && (
                <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  Updating...
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Feed - centered single column */}
        <div className="max-w-2xl mx-auto px-4 py-6">
          {feed.length === 0 ? (
            <div className="text-center py-20">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-3">
                Your feed is empty
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-2">
                Add some content sources to get started!
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mb-8">
                If you have sources but no content shows, try changing the length filter above or clearing your watch history below.
              </p>
              <div className="flex items-center justify-center gap-3">
                <a
                  href="/sources"
                  className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-full transition-all"
                >
                  Add Sources
                </a>
                <button
                  onClick={handleClearInteractions}
                  className="inline-block bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-medium py-3 px-6 rounded-full transition-all"
                >
                  Clear Watch History
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {feed.map((item) => (
                <ContentCard
                  key={item.content.id}
                  item={item}
                  onWatch={handleWatch}
                  onSave={handleSave}
                  onDismiss={handleDismiss}
                  onNotNow={handleNotNow}
                  onExpandToTheatre={handleWatch}
                  onMarkWatched={(contentId) => handleMarkWatched(contentId)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Theatre Mode */}
      <TheatreMode
        item={currentItem}
        onClose={handleCloseTheatre}
        onNext={handleNextInFeed}
        onMarkWatched={handleMarkWatched}
      />
    </>
  );
}
