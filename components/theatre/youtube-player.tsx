'use client';

import { useEffect, useRef, useState } from 'react';

interface YouTubePlayerProps {
  videoId: string;
  onPlay?: () => void;
  onEnded?: () => void;
}

// YouTube IFrame Player API types
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export function YouTubePlayer({ videoId, onPlay, onEnded }: YouTubePlayerProps) {
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);

  useEffect(() => {
    // Load YouTube IFrame API if not already loaded
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

      window.onYouTubeIframeAPIReady = () => {
        setIsReady(true);
      };
    } else {
      setIsReady(true);
    }

    return () => {
      // Cleanup player on unmount
      if (playerRef.current) {
        playerRef.current.destroy();
      }
    };
  }, []);

  useEffect(() => {
    if (isReady && containerRef.current && !playerRef.current) {
      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId: videoId,
        playerVars: {
          autoplay: 0,
          modestbranding: 1, // Minimal YouTube branding
          rel: 0, // Don't show related videos from other channels
          fs: 1, // Allow fullscreen
          controls: 1,
          iv_load_policy: 3, // Hide video annotations
        },
        events: {
          onStateChange: (event: any) => {
            // YT.PlayerState.PLAYING = 1
            if (event.data === 1 && !hasPlayed) {
              setHasPlayed(true);
              onPlay?.();
            }
            // YT.PlayerState.ENDED = 0
            if (event.data === 0) {
              onEnded?.();
            }
          },
        },
      });
    }
  }, [isReady, videoId, onPlay, onEnded, hasPlayed]);

  return (
    <div className="aspect-video bg-black">
      <div ref={containerRef} className="w-full h-full"></div>
    </div>
  );
}
