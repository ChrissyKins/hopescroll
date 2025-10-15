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
  const [isInSources, setIsInSources] = useState(false);
  const [isCheckingSources, setIsCheckingSources] = useState(false);
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
        checkIfInSources(data.data); // Don't await - run in background
      } else {
        setError('No videos available. Try adjusting your length filter or adding more sources.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load video');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRecommendedVideo = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (minDuration !== null) params.append('minDuration', minDuration.toString());
      if (maxDuration !== null) params.append('maxDuration', maxDuration.toString());

      // Optionally pass current video for related recommendations
      if (currentVideo) {
        const videoId = getYouTubeVideoId(currentVideo.content.url);
        if (videoId) {
          params.append('relatedTo', videoId);
        }
      }

      const response = await fetch(`/api/watch/recommended?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch recommended video');
      }

      const data = await response.json();

      if (data.data) {
        setCurrentVideo(data.data);
        setIsPlaying(true);
        checkIfInSources(data.data); // Don't await - run in background
      } else {
        setError('No recommendations available at the moment. Try again later.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load recommended video');
    } finally {
      setIsLoading(false);
    }
  };

  const checkIfInSources = async (video: FeedItem) => {
    if (video.content.sourceType !== 'YOUTUBE') return;

    setIsCheckingSources(true);
    try {
      const response = await fetch('/api/sources');
      if (response.ok) {
        const data = await response.json();
        const sources = data.data || [];
        const inSources = sources.some(
          (s: any) => s.type === 'YOUTUBE' && s.sourceId === video.content.sourceId
        );
        setIsInSources(inSources);
      }
    } catch (err) {
      console.error('Error checking sources:', err);
    } finally {
      setIsCheckingSources(false);
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

  const handleDiscover = async () => {
    // Destroy current player
    if (playerRef.current) {
      playerRef.current.destroy();
      playerRef.current = null;
    }
    setIsPlaying(false);
    await fetchRecommendedVideo();
  };

  const handleAddToSources = async () => {
    if (!currentVideo || currentVideo.content.sourceType !== 'YOUTUBE') return;

    try {
      const response = await fetch('/api/sources', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'YOUTUBE',
          sourceId: currentVideo.content.sourceId,
        }),
      });

      if (response.ok) {
        setIsInSources(true);
      }
    } catch (err) {
      console.error('Error adding to sources:', err);
    }
  };

  const handleRemoveFromSources = async () => {
    if (!currentVideo || currentVideo.content.sourceType !== 'YOUTUBE') return;

    try {
      // First get the source ID
      const sourcesResponse = await fetch('/api/sources');
      if (!sourcesResponse.ok) return;

      const sourcesData = await sourcesResponse.json();
      const sources = sourcesData.data || [];
      const source = sources.find(
        (s: any) => s.type === 'YOUTUBE' && s.sourceId === currentVideo.content.sourceId
      );

      if (source) {
        const response = await fetch(`/api/sources/${source.id}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          setIsInSources(false);
        }
      }
    } catch (err) {
      console.error('Error removing from sources:', err);
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
            <div className="border-b border-gray-800 p-4 md:p-5">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                {/* Left: Video Title and Info */}
                <div className="flex-1 min-w-0">
                  <h1 className="text-base md:text-lg font-semibold text-white mb-1.5 line-clamp-2">
                    {currentVideo.content.title}
                  </h1>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
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
                    {currentVideo.isRecommended && (
                      <>
                        <span>•</span>
                        <span className="bg-purple-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                          RECOMMENDED
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Right: Compact Action Buttons */}
                <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0 flex-wrap">
                  {currentVideo.content.sourceType === 'YOUTUBE' && (
                    <>
                      {isInSources ? (
                        <button
                          onClick={handleRemoveFromSources}
                          className="flex items-center gap-1.5 px-3 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-all text-xs border border-red-600/30"
                          title="Remove from Sources"
                          disabled={isCheckingSources}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                          </svg>
                          <span className="hidden sm:inline">Remove</span>
                        </button>
                      ) : (
                        <button
                          onClick={handleAddToSources}
                          className="flex items-center gap-1.5 px-3 py-2 bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded-lg transition-all text-xs border border-green-600/30"
                          title="Add to Sources"
                          disabled={isCheckingSources}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          <span className="hidden sm:inline">Add</span>
                        </button>
                      )}
                    </>
                  )}

                  <button
                    onClick={handleSave}
                    className="flex items-center gap-1.5 px-3 py-2 bg-gray-800/50 hover:bg-gray-700 text-gray-300 rounded-lg transition-all text-xs"
                    title="Save for Later"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                    <span className="hidden sm:inline">Save</span>
                  </button>

                  <button
                    onClick={handleNotNow}
                    className="flex items-center gap-1.5 px-3 py-2 bg-gray-800/50 hover:bg-gray-700 text-gray-300 rounded-lg transition-all text-xs"
                    title="Not Now"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="hidden sm:inline">Later</span>
                  </button>

                  <button
                    onClick={handleDiscover}
                    className="flex items-center gap-1.5 px-3 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 rounded-lg transition-all text-xs border border-purple-600/30"
                    title="Discover Something New"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    <span className="hidden md:inline">Discover</span>
                  </button>

                  <button
                    onClick={handleNext}
                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all text-xs font-medium ml-1"
                  >
                    <span>Next</span>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Length Filter Section */}
            <div className="px-5 py-4 border-b border-gray-800">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-medium text-gray-400">Video Length</span>
              </div>

              {/* Filter Chips */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => handleDurationFilterChange(null, null)}
                  className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                    isFilterActive(null, null) && !showCustom
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-gray-800/80 text-gray-300 hover:bg-gray-750 border border-gray-700/50'
                  }`}
                >
                  Any Length
                </button>

                <button
                  onClick={() => handleDurationFilterChange(180, null)}
                  className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                    isFilterActive(180, null)
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-gray-800/80 text-gray-300 hover:bg-gray-750 border border-gray-700/50'
                  }`}
                >
                  3+ min
                </button>

                <button
                  onClick={() => handleDurationFilterChange(300, 600)}
                  className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                    isFilterActive(300, 600)
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-gray-800/80 text-gray-300 hover:bg-gray-750 border border-gray-700/50'
                  }`}
                >
                  5-10 min
                </button>

                <button
                  onClick={() => handleDurationFilterChange(900, 1500)}
                  className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                    isFilterActive(900, 1500)
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-gray-800/80 text-gray-300 hover:bg-gray-750 border border-gray-700/50'
                  }`}
                >
                  15-25 min
                </button>

                <button
                  onClick={() => handleDurationFilterChange(1800, 3600)}
                  className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                    isFilterActive(1800, 3600)
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-gray-800/80 text-gray-300 hover:bg-gray-750 border border-gray-700/50'
                  }`}
                >
                  30-60 min
                </button>

                <button
                  onClick={() => setShowCustom(!showCustom)}
                  className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                    showCustom
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-gray-800/80 text-gray-300 hover:bg-gray-750 border border-gray-700/50'
                  }`}
                >
                  Custom
                </button>
              </div>

              {/* Custom Duration Input */}
              {showCustom && (
                <div className="mt-3 bg-gray-850 rounded-lg p-3.5 border border-gray-700/50">
                  <div className="flex flex-col sm:flex-row gap-2 items-end">
                    <div className="flex-1">
                      <label className="block text-xs text-gray-500 mb-1.5">Min (minutes)</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="e.g., 5"
                        value={customMin}
                        onChange={(e) => setCustomMin(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-900/80 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs text-gray-500 mb-1.5">Max (minutes)</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="e.g., 20"
                        value={customMax}
                        onChange={(e) => setCustomMax(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-900/80 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <button
                      onClick={handleCustomDuration}
                      className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-all shadow-md"
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
