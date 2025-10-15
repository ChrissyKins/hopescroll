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
  const [customMin, setCustomMin] = useState<string>('');
  const [customMax, setCustomMax] = useState<string>('');
  const [showCustom, setShowCustom] = useState(false);
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
    setShowCustom(false);
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

  const handleCustomDuration = () => {
    const min = customMin ? parseInt(customMin) * 60 : null;
    const max = customMax ? parseInt(customMax) * 60 : null;
    handleDurationFilterChange(min, max);
  };

  const isFilterActive = (min: number | null, max: number | null) => {
    return minDuration === min && maxDuration === max;
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
      <div className="min-h-screen bg-gray-950">
        <Navigation />
        <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 3rem)' }}>
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Finding a video for you...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !currentVideo) {
    return (
      <div className="min-h-screen bg-gray-950">
        <Navigation />
        <div className="flex items-center justify-center p-4" style={{ height: 'calc(100vh - 3rem)' }}>
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
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <Navigation />
      <div className="bg-gray-950">
        {/* Video Player Container - Full Width, Responsive Height */}
        <div className="w-full flex-shrink-0" style={{ maxHeight: 'calc(100vh - 3rem)', height: 'min(calc(100vh - 3rem), calc(100vw * 9 / 16))' }}>
          {/* Video Player - Full Width */}
          <div className="relative bg-black w-full h-full" ref={containerRef}>
            <div id={`player-${currentVideo.content.id}`} className="w-full h-full" />
          </div>
        </div>

        {/* Content Below Video */}
        <div className="bg-gray-950">
          <div className="max-w-4xl mx-auto">
            {/* Video Info & Controls */}
            <div className="border-b border-gray-900 p-4">
              {/* Video Title and Info */}
              <div className="mb-4">
                <h1 className="text-lg md:text-xl font-bold text-white mb-2">
                  {currentVideo.content.title}
                </h1>
                <div className="flex items-center gap-2 text-xs md:text-sm text-gray-400">
                  <span className="font-medium text-gray-300">{currentVideo.sourceDisplayName}</span>
                  {currentVideo.content.duration && (
                    <>
                      <span>•</span>
                      <span>{formatDuration(currentVideo.content.duration)}</span>
                    </>
                  )}
                  {currentVideo.isNew && (
                    <>
                      <span>•</span>
                      <span className="bg-blue-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                        NEW
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 md:gap-3">
                <button
                  onClick={handleSave}
                  className="flex items-center gap-1.5 md:gap-2 px-4 md:px-5 py-2 md:py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-full transition-all text-xs md:text-sm"
                  title="Save for Later"
                >
                  <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                  <span>Save</span>
                </button>

                <button
                  onClick={handleNotNow}
                  className="flex items-center gap-1.5 md:gap-2 px-4 md:px-5 py-2 md:py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-full transition-all text-xs md:text-sm"
                  title="Not Now"
                >
                  <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Not Now</span>
                </button>

                <button
                  onClick={handleNext}
                  className="flex items-center gap-1.5 md:gap-2 px-5 md:px-6 py-2 md:py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-full transition-all text-xs md:text-sm"
                >
                  <span>Next Video</span>
                  <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                  </svg>
                </button>

                <button
                  onClick={handleDismiss}
                  className="flex items-center gap-1.5 md:gap-2 px-4 md:px-5 py-2 md:py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-full transition-all text-xs md:text-sm"
                  title="Dismiss"
                >
                  <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span>Dismiss</span>
                </button>
              </div>
            </div>

            {/* Length Filter Section */}
            <div className="p-4 border-b border-gray-900">
              {/* Compact Filter Bar */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm text-gray-400">Length:</span>

                <button
                  onClick={() => handleDurationFilterChange(180, null)}
                  className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                    isFilterActive(180, null)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  3+ min
                </button>

                <button
                  onClick={() => handleDurationFilterChange(300, 600)}
                  className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                    isFilterActive(300, 600)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  5-10 min
                </button>

                <button
                  onClick={() => handleDurationFilterChange(900, 1500)}
                  className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                    isFilterActive(900, 1500)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  15-25 min
                </button>

                <button
                  onClick={() => handleDurationFilterChange(1800, 3600)}
                  className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                    isFilterActive(1800, 3600)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  30-60 min
                </button>

                <button
                  onClick={() => handleDurationFilterChange(null, null)}
                  className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                    isFilterActive(null, null) && !showCustom
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  Any
                </button>

                <button
                  onClick={() => setShowCustom(!showCustom)}
                  className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                    showCustom
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  Custom
                </button>
              </div>

              {/* Custom Duration Input */}
              {showCustom && (
                <div className="mt-3 bg-gray-800 rounded-lg p-3 border border-gray-700">
                  <div className="flex flex-col sm:flex-row gap-2 items-end">
                    <div className="flex-1">
                      <input
                        type="number"
                        min="0"
                        placeholder="Min (minutes)"
                        value={customMin}
                        onChange={(e) => setCustomMin(e.target.value)}
                        className="w-full px-3 py-1.5 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="flex-1">
                      <input
                        type="number"
                        min="0"
                        placeholder="Max (minutes)"
                        value={customMax}
                        onChange={(e) => setCustomMax(e.target.value)}
                        className="w-full px-3 py-1.5 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <button
                      onClick={handleCustomDuration}
                      className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-all"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
