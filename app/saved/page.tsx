'use client';

import { useState, useEffect } from 'react';
import { Navigation } from '@/components/navigation';
import { ContentCard } from '@/components/feed/content-card';
import { useToast } from '@/components/ui';

interface SavedItem {
  id: string;
  collection: string | null;
  savedAt: string;
  notes: string | null;
  content: any;
}

export default function SavedPage() {
  const [saved, setSaved] = useState<SavedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const toast = useToast();

  useEffect(() => {
    fetchSaved();
  }, []);

  const fetchSaved = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch('/api/saved');
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
  };

  const handleUnsave = async (contentId: string) => {
    try {
      // Remove from saved via interaction service
      const response = await fetch(`/api/content/${contentId}/unsave`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to remove from saved');
      }

      toast.success('Removed from saved content');
      // Refresh list
      await fetchSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove from saved');
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
                <p className="text-gray-600 dark:text-gray-400">
                  Loading saved content...
                </p>
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

  if (saved.length === 0) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
              Saved Content
            </h1>
            <div className="text-center py-12">
              <p className="text-gray-600 dark:text-gray-400 mb-8">
                You haven&apos;t saved any content yet.
              </p>
              <a
                href="/feed"
                className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded"
              >
                Browse Feed
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
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Saved Content
            </h1>
            <span className="text-gray-600 dark:text-gray-400">
              {saved.length} {saved.length === 1 ? 'item' : 'items'}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {saved.map((item) => (
              <div key={item.id} className="relative">
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
                <div className="mt-2 flex items-center justify-between">
                  {item.collection && (
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Collection: {item.collection}
                    </span>
                  )}
                  <button
                    onClick={() => handleUnsave(item.content.id)}
                    className="text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                  >
                    Remove
                  </button>
                </div>
                {item.notes && (
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 italic">
                    &ldquo;{item.notes}&rdquo;
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
