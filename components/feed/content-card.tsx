'use client';

import { useState, useRef, useEffect, memo } from 'react';
import Image from 'next/image';
import type { FeedItem } from '@/domain/feed/feed-generator';

interface ContentCardProps {
  item: FeedItem;
  onWatch: (contentId: string) => void;
  onSave: (contentId: string) => void;
  onDismiss: (contentId: string) => void;
  onNotNow: (contentId: string) => void;
  onMarkWatched?: (contentId: string) => void;
}

export const ContentCard = memo(function ContentCard({ item, onWatch, onSave, onDismiss, onNotNow, onMarkWatched }: ContentCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasStartedPlaying, setHasStartedPlaying] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [pinnedPosition, setPinnedPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const playerRef = useRef<YT.Player | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { content, sourceDisplayName, isNew } = item;

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return null;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatPublishedDate = (date: Date | string) => {
    const now = new Date();
    const publishedDate = typeof date === 'string' ? new Date(date) : date;
    const diff = now.getTime() - publishedDate.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    if (days < 365) return `${Math.floor(days / 30)}mo ago`;
    return `${Math.floor(days / 365)}y ago`;
  };

  const getYouTubeVideoId = (url: string): string | null => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    return match ? match[1] : null;
  };

  const videoId = content.sourceType === 'YOUTUBE' ? getYouTubeVideoId(content.url) : null;

  useEffect(() => {
    if (!isPlaying || !videoId) return;

    // Load YouTube IFrame API
    const loadYouTubeAPI = () => {
      if (window.YT && window.YT.Player) {
        initPlayer();
        return;
      }

      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

      (window as any).onYouTubeIframeAPIReady = () => {
        initPlayer();
      };
    };

    const initPlayer = () => {
      if (!containerRef.current || playerRef.current) return;

      playerRef.current = new window.YT.Player(`player-${content.id}`, {
        videoId: videoId!,
        playerVars: {
          autoplay: 1,
          modestbranding: 1,
          rel: 0,
          vq: 'hd1080', // Request highest quality
          hd: 1,
        },
        events: {
          onStateChange: (event: YT.OnStateChangeEvent) => {
            if (event.data === window.YT.PlayerState.PLAYING && !hasStartedPlaying) {
              setHasStartedPlaying(true);
              // Mark as watched after a few seconds of playback (silently, without opening theatre)
              if (onMarkWatched) {
                setTimeout(() => onMarkWatched(content.id), 3000);
              }
            }
          },
        },
      });
    };

    loadYouTubeAPI();

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [isPlaying, videoId, content.id, hasStartedPlaying, onMarkWatched]);

  const handlePlayClick = () => {
    setIsPlaying(true);
  };

  const handleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const handlePin = () => {
    const newPinned = !isPinned;
    setIsPinned(newPinned);
    if (newPinned) {
      // Set initial position in bottom-right
      setPinnedPosition({
        x: window.innerWidth - 336, // 320px width + 16px margin
        y: window.innerHeight - 280  // approximate height + margin from bottom
      });
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - pinnedPosition.x,
      y: e.clientY - pinnedPosition.y,
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPinnedPosition({
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y,
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStart, pinnedPosition]);

  return (
    <>
      {/* Floating pinned video */}
      {isPinned && isPlaying && videoId && (
        <div
          className="fixed z-50 w-80 shadow-2xl rounded-lg overflow-hidden bg-white dark:bg-gray-800 select-none"
          style={{
            left: `${pinnedPosition.x}px`,
            top: `${pinnedPosition.y}px`,
          }}
        >
          <div
            className="p-2 bg-gray-100 dark:bg-gray-700 cursor-move flex items-center justify-between"
            onMouseDown={handleMouseDown}
          >
            <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-1 flex-1">{content.title}</p>
            <button
              onClick={handlePin}
              className="ml-2 p-1 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-400 rounded transition-all"
              title="Unpin"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="relative bg-black aspect-video" ref={isPinned ? containerRef : undefined}>
            <div id={`player-${content.id}`} className="w-full h-full" />
          </div>
        </div>
      )}

      <div className="relative group">
        <div className={`bg-white dark:bg-gray-800 overflow-hidden shadow-sm transition-all duration-300 ${
          isExpanded ? 'scale-125' : 'hover:shadow-md'
        }`}>
        {/* Video Player or Thumbnail - no rounded corners on video itself */}
        <div className={`relative bg-black aspect-video ${isPinned ? 'opacity-20' : ''}`} ref={!isPinned ? containerRef : undefined}>
            {isPlaying && videoId && !isPinned ? (
              // YouTube player (only show when not pinned)
              <div id={`player-${content.id}`} className="w-full h-full" />
            ) : isPinned ? (
              // Placeholder when pinned
              <div className="w-full h-full flex items-center justify-center">
                <p className="text-white text-sm">Playing in pinned window</p>
              </div>
            ) : (
              // Thumbnail with play button
              content.thumbnailUrl && (
                <div
                  className="relative w-full h-full cursor-pointer"
                  onClick={handlePlayClick}
                >
                  <Image
                    src={content.thumbnailUrl}
                    alt={content.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 672px"
                    className="object-cover"
                    loading="lazy"
                    quality={85}
                  />
                  {/* Overlay gradient for better text readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                  {/* Play button overlay on hover */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-16 h-16 bg-white/90 dark:bg-gray-900/90 rounded-full flex items-center justify-center backdrop-blur-sm">
                      <svg className="w-6 h-6 text-gray-900 dark:text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="absolute top-3 left-3 flex gap-2">
                    {isNew && (
                      <span className="bg-blue-500 text-white text-xs font-semibold px-2.5 py-1 rounded-full backdrop-blur-sm">
                        NEW
                      </span>
                    )}
                  </div>
                  {content.duration && (
                    <span className="absolute bottom-3 right-3 bg-black/75 text-white text-xs font-semibold px-2.5 py-1 rounded-full backdrop-blur-sm">
                      {formatDuration(content.duration)}
                    </span>
                  )}
                </div>
              )
            )}
        </div>

        {/* Content */}
        <div className="p-5">
            {/* Title */}
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-2 mb-3">
              {content.title}
            </h3>

            {/* Metadata */}
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
              <span className="font-medium">{sourceDisplayName}</span>
              <span className="text-gray-400 dark:text-gray-600">•</span>
              <span>{formatPublishedDate(content.publishedAt)}</span>
            </div>

            {/* Action buttons - clean, spaced out */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
              <div className="flex gap-2">
                <button
                  onClick={() => onSave(content.id)}
                  className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-all"
                  title="Save for Later"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                </button>
                <button
                  onClick={() => onNotNow(content.id)}
                  className="p-2 text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-all"
                  title="Not Now"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
                <button
                  onClick={() => onDismiss(content.id)}
                  className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-all"
                  title="Dismiss"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Source type badge - subtle */}
              <span className="text-xs text-gray-500 dark:text-gray-500 uppercase tracking-wide">
                {content.sourceType}
              </span>
            </div>
          </div>
      </div>

      {/* Floating buttons - positioned in whitespace to the right */}
      <div className="absolute top-4 -right-12 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all">
        <button
          onClick={handleExpand}
          className="p-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-full transition-all"
          title={isExpanded ? "Collapse" : "Expand"}
        >
          <svg
            className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {isPlaying && !isPinned && (
          <button
            onClick={handlePin}
            className="p-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-full transition-all"
            title="Pin video"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </button>
        )}
      </div>
    </div>
    </>
  );
});
