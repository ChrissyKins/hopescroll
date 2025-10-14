'use client';

import { useEffect, useCallback } from 'react';
import { YouTubePlayer } from './youtube-player';
import type { FeedItem } from '@/domain/feed/feed-generator';

interface TheatreModeProps {
  item: FeedItem | null;
  onClose: () => void;
  onNext?: () => void;
  onMarkWatched?: (contentId: string, duration?: number) => void;
}

export function TheatreMode({ item, onClose, onNext, onMarkWatched }: TheatreModeProps) {
  // Handle ESC key to close
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (item) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [item, handleKeyDown]);

  if (!item) {
    return null;
  }

  const handleBackgroundClick = (e: React.MouseEvent) => {
    // Only close if clicking the background, not the content
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handlePlay = () => {
    // Mark as watched when playback starts
    if (onMarkWatched) {
      onMarkWatched(item.content.id);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={handleBackgroundClick}
    >
      <div className="relative w-full max-w-6xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors"
          aria-label="Close theatre mode"
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Content info */}
        <div className="bg-gray-900 rounded-t-lg p-4">
          <h2 className="text-xl font-semibold text-white mb-2">{item.content.title}</h2>
          <div className="flex items-center gap-3 text-sm text-gray-400">
            <span className="font-medium text-gray-300">{item.sourceDisplayName}</span>
            <span>•</span>
            <span className="uppercase text-xs bg-gray-800 px-2 py-1 rounded">{item.content.sourceType}</span>
            {item.isNew && (
              <>
                <span>•</span>
                <span className="text-blue-400 font-semibold">NEW</span>
              </>
            )}
          </div>
        </div>

        {/* Player */}
        <div className="bg-black rounded-b-lg overflow-hidden">
          {item.content.sourceType === 'YOUTUBE' && (
            <YouTubePlayer
              videoId={item.content.originalId}
              onPlay={handlePlay}
            />
          )}
          {item.content.sourceType !== 'YOUTUBE' && (
            <div className="aspect-video flex items-center justify-center bg-gray-900">
              <div className="text-center p-8">
                <p className="text-white mb-4">
                  Player for {item.content.sourceType} not yet implemented
                </p>
                <a
                  href={item.content.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded transition-colors"
                >
                  Open in new tab
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="mt-4 flex justify-between items-center">
          <div className="text-gray-400 text-sm">
            <kbd className="px-2 py-1 bg-gray-800 rounded text-xs">ESC</kbd> to close
          </div>
          {onNext && (
            <button
              onClick={onNext}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded transition-colors flex items-center gap-2"
            >
              Next in feed
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>

        {/* Description (if available) */}
        {item.content.description && (
          <div className="mt-4 bg-gray-900 rounded-lg p-4 max-h-40 overflow-y-auto">
            <h3 className="text-white font-semibold mb-2">Description</h3>
            <p className="text-gray-400 text-sm whitespace-pre-wrap">{item.content.description}</p>
          </div>
        )}
      </div>
    </div>
  );
}
