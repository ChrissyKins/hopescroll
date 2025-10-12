'use client';

import { useState, useEffect } from 'react';
import { ContentCard } from '@/components/feed/content-card';
import { Navigation } from '@/components/navigation';
import type { FeedItem } from '@/domain/feed/feed-generator';

export default function FeedPage() {
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    // For now, just record the interaction
    // Later we'll open theatre mode
    handleAction('watch', contentId);
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

  if (feed.length === 0) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center py-12">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                Your feed is empty
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-8">
                Add some content sources to get started!
              </p>
              <a
                href="/sources"
                className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded"
              >
                Add Sources
              </a>
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
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Your Feed</h1>
            <button
              onClick={fetchFeed}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors"
            >
              Refresh
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {feed.map((item) => (
              <ContentCard
                key={item.content.id}
                item={item}
                onWatch={handleWatch}
                onSave={handleSave}
                onDismiss={handleDismiss}
                onNotNow={handleNotNow}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
