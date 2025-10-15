'use client';

import { useState, useEffect, useRef } from 'react';
import { Navigation } from '@/components/navigation';
import type { FeedItem } from '@/domain/feed/feed-generator';

export default function WatchPage() {
  const [currentVideo, setCurrentVideo] = useState<FeedItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [minDuration, setMinDuration] = useState<number | null>(null);
  const [maxDuration, setMaxDuration] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const playerRef = useRef<YT.Player | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchRandomVideo();
  }, []);

  const fetchRandomVideo = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (minDuration !== null) params.append('minDuration', minDuration.toString());
      if (maxDuration !== null) params.append('maxDuration', maxDuration.toString());

      const response = await fetch(`/api/watch/random?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch video');
      }

      const data = await response.json();

      if (data.data) {
        setCurrentVideo(data.data);
        setIsPlaying(true);
      } else {
        setError('No videos available. Try adjusting your length filter or adding more sources.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load video');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNext = async () => {
    // Destroy current player
    if (playerRef.current) {
      playerRef.current.destroy();
      playerRef.current = null;
    }
    setIsPlaying(false);
    await fetchRandomVideo();
  };

  const handleSave = async () => {
    if (!currentVideo) return;
    try {
      await fetch(`/api/content/${currentVideo.content.id}/save`, {
        method: 'POST',
      });
      handleNext();
    } catch (err) {
      console.error('Error saving content:', err);
    }
  };

  const handleDismiss = async () => {
    if (!currentVideo) return;
    try {
      await fetch(`/api/content/${currentVideo.content.id}/dismiss`, {
        method: 'POST',
      });
      handleNext();
    } catch (err) {
      console.error('Error dismissing content:', err);
    }
  };

  const handleNotNow = async () => {
    if (!currentVideo) return;
    try {
      await fetch(`/api/content/${currentVideo.content.id}/not-now`, {
        method: 'POST',
      });
      handleNext();
    } catch (err) {
      console.error('Error marking not now:', err);
    }
  };

  const handleMarkWatched = async () => {
    if (!currentVideo) return;
    try {
      await fetch(`/api/content/${currentVideo.content.id}/watch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ watchDuration: 0 }),
      });
    } catch (err) {
      console.error('Error marking as watched:', err);
    }
  };

  const handleDurationFilterChange = (min: number | null, max: number | null) => {
    setMinDuration(min);
    setMaxDuration(max);
    // Destroy current player and fetch new video
    if (playerRef.current) {
      playerRef.current.destroy();
      playerRef.current = null;
    }
    setIsPlaying(false);
    setTimeout(() => {
      fetchRandomVideo();
    }, 100);
  };

  const getYouTubeVideoId = (url: string): string | null => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    return match ? match[1] : null;
  };

  const videoId = currentVideo?.content.sourceType === 'YOUTUBE'
    ? getYouTubeVideoId(currentVideo.content.url)
    : null;

  useEffect(() => {
    if (!isPlaying || !videoId || !currentVideo) return;

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

      playerRef.current = new window.YT.Player(`player-${currentVideo.content.id}`, {
        videoId: videoId!,
        playerVars: {
          autoplay: 1,
          modestbranding: 1,
          rel: 0,
          vq: 'hd1080',
          hd: 1,
        },
        events: {
          onStateChange: (event: YT.OnStateChangeEvent) => {
            if (event.data === window.YT.PlayerState.PLAYING) {
              // Mark as watched after 3 seconds
              setTimeout(() => handleMarkWatched(), 3000);
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
  }, [isPlaying, videoId, currentVideo]);

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return null;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Finding a video for you...</p>
          </div>
        </div>
      </>
    );
  }

  if (error || !currentVideo) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
          <div className="max-w-md text-center">
            <h2 className="text-2xl font-bold text-white mb-4">
              {error || 'No videos available'}
            </h2>
            <p className="text-gray-400 mb-6">
              Try adjusting your length filter or add some content sources.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={fetchRandomVideo}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-full transition-all"
              >
                Try Again
              </button>
              <a
                href="/sources"
                className="bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 px-6 rounded-full transition-all"
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
      <div className="min-h-screen bg-gray-900">
        {/* Length Filter Bar - Fixed at top */}
        <div className="fixed top-16 left-0 right-0 bg-gray-800/95 backdrop-blur-sm z-40 border-b border-gray-700">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center justify-center gap-2">
              <span className="text-sm text-gray-400 mr-2">Length:</span>
              <button
                onClick={() => handleDurationFilterChange(300, 600)}
                className={`px-4 py-1.5 text-sm rounded-full border transition-all ${
                  minDuration === 300 && maxDuration === 600
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                }`}
              >
                5-10min
              </button>
              <button
                onClick={() => handleDurationFilterChange(900, 1500)}
                className={`px-4 py-1.5 text-sm rounded-full border transition-all ${
                  minDuration === 900 && maxDuration === 1500
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                }`}
              >
                15-25min
              </button>
              <button
                onClick={() => handleDurationFilterChange(1800, 3600)}
                className={`px-4 py-1.5 text-sm rounded-full border transition-all ${
                  minDuration === 1800 && maxDuration === 3600
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                }`}
              >
                30-60min
              </button>
              <button
                onClick={() => handleDurationFilterChange(null, null)}
                className={`px-4 py-1.5 text-sm rounded-full border transition-all ${
                  minDuration === null && maxDuration === null
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Any Length
              </button>
            </div>
          </div>
        </div>

        {/* Video Player Container - Theatre Mode */}
        <div className="pt-24 pb-8 px-4">
          <div className="max-w-6xl mx-auto">
            {/* Video Player */}
            <div className="relative bg-black aspect-video rounded-lg overflow-hidden shadow-2xl" ref={containerRef}>
              <div id={`player-${currentVideo.content.id}`} className="w-full h-full" />
            </div>

            {/* Video Info */}
            <div className="mt-6 mb-8">
              <h1 className="text-2xl font-bold text-white mb-2">
                {currentVideo.content.title}
              </h1>
              <div className="flex items-center gap-3 text-gray-400">
                <span className="font-medium text-gray-300">{currentVideo.sourceDisplayName}</span>
                <span>•</span>
                {currentVideo.content.duration && (
                  <>
                    <span>{formatDuration(currentVideo.content.duration)}</span>
                    <span>•</span>
                  </>
                )}
                {currentVideo.isNew && (
                  <span className="bg-blue-500 text-white text-xs font-semibold px-2.5 py-0.5 rounded-full">
                    NEW
                  </span>
                )}
              </div>
              {currentVideo.content.description && (
                <p className="mt-4 text-gray-400 line-clamp-3">
                  {currentVideo.content.description}
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-full transition-all"
                title="Save for Later"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
                <span>Save</span>
              </button>

              <button
                onClick={handleNotNow}
                className="flex items-center gap-2 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-full transition-all"
                title="Not Now"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Not Now</span>
              </button>

              <button
                onClick={handleNext}
                className="flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-full transition-all"
              >
                <span>Next Video</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
              </button>

              <button
                onClick={handleDismiss}
                className="flex items-center gap-2 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-full transition-all"
                title="Dismiss"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span>Dismiss</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
