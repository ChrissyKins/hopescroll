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
  const hasPlayedRef = useRef(false);

  // Use refs to store callbacks to avoid recreating player
  const onPlayRef = useRef(onPlay);
  const onEndedRef = useRef(onEnded);

  // Update refs when callbacks change
  useEffect(() => {
    onPlayRef.current = onPlay;
    onEndedRef.current = onEnded;
  }, [onPlay, onEnded]);

  useEffect(() => {
    // Load YouTube IFrame API if not already loaded
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];

      // Insert into DOM, or append to head if no script tags exist
      if (firstScriptTag?.parentNode) {
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      } else {
        document.head.appendChild(tag);
      }

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
            if (event.data === 1 && !hasPlayedRef.current) {
              hasPlayedRef.current = true;
              onPlayRef.current?.();
            }
            // YT.PlayerState.ENDED = 0
            if (event.data === 0) {
              onEndedRef.current?.();
            }
          },
        },
      });
    }
  }, [isReady, videoId]);

  return (
    <div className="aspect-video bg-black">
      <div ref={containerRef} className="w-full h-full"></div>
    </div>
  );
}
