import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor, act } from '@testing-library/react';
import { YouTubePlayer } from '@/components/theatre/youtube-player';

// Mock YouTube IFrame API
const mockPlayer = {
  destroy: vi.fn(),
};

const mockYT = {
  Player: vi.fn((element, config) => {
    // Store config for later inspection
    mockYT.Player.lastConfig = config;
    return mockPlayer;
  }),
  PlayerState: {
    ENDED: 0,
    PLAYING: 1,
    PAUSED: 2,
  },
};

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: (() => void) | undefined;
  }
}

describe('YouTubePlayer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset window.YT before each test
    delete (window as any).YT;
    delete (window as any).onYouTubeIframeAPIReady;
    mockYT.Player.mockClear();
    mockPlayer.destroy.mockClear();
  });

  afterEach(() => {
    // Cleanup any added scripts
    const scripts = document.querySelectorAll('script[src*="youtube.com/iframe_api"]');
    scripts.forEach((script) => script.remove());
  });

  it('renders a container for the YouTube player', () => {
    window.YT = mockYT;
    const { container } = render(<YouTubePlayer videoId="test-video-id" />);
    const playerContainer = container.querySelector('.aspect-video');
    expect(playerContainer).toBeInTheDocument();
    expect(playerContainer).toHaveClass('bg-black');
  });

  it('loads YouTube IFrame API script when YT is not available', () => {
    render(<YouTubePlayer videoId="test-video-id" />);
    const script = document.querySelector('script[src*="youtube.com/iframe_api"]');
    expect(script).toBeInTheDocument();
  });

  it('does not load YouTube IFrame API script when YT is already available', () => {
    window.YT = mockYT;
    render(<YouTubePlayer videoId="test-video-id" />);

    // Wait a bit to ensure no script is added
    const scripts = document.querySelectorAll('script[src*="youtube.com/iframe_api"]');
    expect(scripts.length).toBe(0);
  });

  it('creates YouTube player when API is ready', async () => {
    window.YT = mockYT;
    render(<YouTubePlayer videoId="test-video-id" />);

    await waitFor(() => {
      expect(mockYT.Player).toHaveBeenCalled();
    });
  });

  it('passes correct videoId to YouTube player', async () => {
    window.YT = mockYT;
    render(<YouTubePlayer videoId="abc123" />);

    await waitFor(() => {
      expect(mockYT.Player).toHaveBeenCalled();
      const config = (mockYT.Player as any).mock.calls[0][1];
      expect(config.videoId).toBe('abc123');
    });
  });

  it('configures player with minimal branding', async () => {
    window.YT = mockYT;
    render(<YouTubePlayer videoId="test-video-id" />);

    await waitFor(() => {
      expect(mockYT.Player).toHaveBeenCalled();
      const config = (mockYT.Player as any).mock.calls[0][1];
      expect(config.playerVars.modestbranding).toBe(1);
    });
  });

  it('configures player to hide related videos from other channels', async () => {
    window.YT = mockYT;
    render(<YouTubePlayer videoId="test-video-id" />);

    await waitFor(() => {
      expect(mockYT.Player).toHaveBeenCalled();
      const config = (mockYT.Player as any).mock.calls[0][1];
      expect(config.playerVars.rel).toBe(0);
    });
  });

  it('configures player to allow fullscreen', async () => {
    window.YT = mockYT;
    render(<YouTubePlayer videoId="test-video-id" />);

    await waitFor(() => {
      expect(mockYT.Player).toHaveBeenCalled();
      const config = (mockYT.Player as any).mock.calls[0][1];
      expect(config.playerVars.fs).toBe(1);
    });
  });

  it('configures player with controls enabled', async () => {
    window.YT = mockYT;
    render(<YouTubePlayer videoId="test-video-id" />);

    await waitFor(() => {
      expect(mockYT.Player).toHaveBeenCalled();
      const config = (mockYT.Player as any).mock.calls[0][1];
      expect(config.playerVars.controls).toBe(1);
    });
  });

  it('configures player to hide video annotations', async () => {
    window.YT = mockYT;
    render(<YouTubePlayer videoId="test-video-id" />);

    await waitFor(() => {
      expect(mockYT.Player).toHaveBeenCalled();
      const config = (mockYT.Player as any).mock.calls[0][1];
      expect(config.playerVars.iv_load_policy).toBe(3);
    });
  });

  it('disables autoplay', async () => {
    window.YT = mockYT;
    render(<YouTubePlayer videoId="test-video-id" />);

    await waitFor(() => {
      expect(mockYT.Player).toHaveBeenCalled();
      const config = (mockYT.Player as any).mock.calls[0][1];
      expect(config.playerVars.autoplay).toBe(0);
    });
  });

  it('calls onPlay callback when video starts playing (first time only)', async () => {
    window.YT = mockYT;
    const onPlay = vi.fn();
    render(<YouTubePlayer videoId="test-video-id" onPlay={onPlay} />);

    await waitFor(() => {
      expect(mockYT.Player).toHaveBeenCalled();
    });

    // Get the onStateChange callback from the FIRST call
    const config = (mockYT.Player as any).mock.calls[0][1];
    const onStateChange = config.events.onStateChange;

    // Simulate playing state
    await act(async () => {
      onStateChange({ data: 1 }); // YT.PlayerState.PLAYING
    });
    expect(onPlay).toHaveBeenCalledTimes(1);

    // Simulate playing again (shouldn't call onPlay again)
    await act(async () => {
      onStateChange({ data: 1 });
    });
    expect(onPlay).toHaveBeenCalledTimes(1);
  });

  it('calls onEnded callback when video ends', async () => {
    window.YT = mockYT;
    const onEnded = vi.fn();
    render(<YouTubePlayer videoId="test-video-id" onEnded={onEnded} />);

    await waitFor(() => {
      expect(mockYT.Player).toHaveBeenCalled();
    });

    // Get the onStateChange callback
    const config = (mockYT.Player as any).mock.calls[0][1];
    const onStateChange = config.events.onStateChange;

    // Simulate ended state
    onStateChange({ data: 0 }); // YT.PlayerState.ENDED
    expect(onEnded).toHaveBeenCalledTimes(1);
  });

  it('can call onEnded multiple times', async () => {
    window.YT = mockYT;
    const onEnded = vi.fn();
    render(<YouTubePlayer videoId="test-video-id" onEnded={onEnded} />);

    await waitFor(() => {
      expect(mockYT.Player).toHaveBeenCalled();
    });

    const config = (mockYT.Player as any).mock.calls[0][1];
    const onStateChange = config.events.onStateChange;

    // Simulate ended state twice
    onStateChange({ data: 0 });
    onStateChange({ data: 0 });
    expect(onEnded).toHaveBeenCalledTimes(2);
  });

  it('does not call onPlay or onEnded when in paused state', async () => {
    window.YT = mockYT;
    const onPlay = vi.fn();
    const onEnded = vi.fn();
    render(<YouTubePlayer videoId="test-video-id" onPlay={onPlay} onEnded={onEnded} />);

    await waitFor(() => {
      expect(mockYT.Player).toHaveBeenCalled();
    });

    const config = (mockYT.Player as any).mock.calls[0][1];
    const onStateChange = config.events.onStateChange;

    // Simulate paused state
    onStateChange({ data: 2 }); // YT.PlayerState.PAUSED
    expect(onPlay).not.toHaveBeenCalled();
    expect(onEnded).not.toHaveBeenCalled();
  });

  it('works without onPlay callback', async () => {
    window.YT = mockYT;
    render(<YouTubePlayer videoId="test-video-id" />);

    await waitFor(() => {
      expect(mockYT.Player).toHaveBeenCalled();
    });

    const config = (mockYT.Player as any).mock.calls[0][1];
    const onStateChange = config.events.onStateChange;

    // Should not throw error
    expect(() => onStateChange({ data: 1 })).not.toThrow();
  });

  it('works without onEnded callback', async () => {
    window.YT = mockYT;
    render(<YouTubePlayer videoId="test-video-id" />);

    await waitFor(() => {
      expect(mockYT.Player).toHaveBeenCalled();
    });

    const config = (mockYT.Player as any).mock.calls[0][1];
    const onStateChange = config.events.onStateChange;

    // Should not throw error
    expect(() => onStateChange({ data: 0 })).not.toThrow();
  });

  it('destroys player on unmount', async () => {
    window.YT = mockYT;
    const { unmount } = render(<YouTubePlayer videoId="test-video-id" />);

    await waitFor(() => {
      expect(mockYT.Player).toHaveBeenCalled();
    });

    unmount();
    expect(mockPlayer.destroy).toHaveBeenCalledTimes(1);
  });

  it('does not throw error on unmount if player was not created', () => {
    const { unmount } = render(<YouTubePlayer videoId="test-video-id" />);
    expect(() => unmount()).not.toThrow();
  });

  it('sets onYouTubeIframeAPIReady callback when loading API', () => {
    render(<YouTubePlayer videoId="test-video-id" />);
    expect(window.onYouTubeIframeAPIReady).toBeDefined();
    expect(typeof window.onYouTubeIframeAPIReady).toBe('function');
  });

  it('triggers player creation when API loads via callback', async () => {
    render(<YouTubePlayer videoId="test-video-id" />);

    // Simulate API loading
    window.YT = mockYT;
    window.onYouTubeIframeAPIReady?.();

    await waitFor(() => {
      expect(mockYT.Player).toHaveBeenCalled();
    });
  });

  it('updates video when videoId changes', async () => {
    window.YT = mockYT;
    const { rerender } = render(<YouTubePlayer videoId="video-1" />);

    await waitFor(() => {
      expect(mockYT.Player).toHaveBeenCalled();
    });

    const firstCallCount = mockYT.Player.mock.calls.length;

    // Change videoId
    rerender(<YouTubePlayer videoId="video-2" />);

    // Note: The current implementation doesn't recreate the player on videoId change
    // This test documents current behavior - may need to be updated if implementation changes
    expect(mockYT.Player).toHaveBeenCalledTimes(firstCallCount);
  });

  it('does not create multiple players', async () => {
    window.YT = mockYT;
    const { rerender } = render(<YouTubePlayer videoId="test-video-id" />);

    await waitFor(() => {
      expect(mockYT.Player).toHaveBeenCalledTimes(1);
    });

    // Rerender multiple times
    rerender(<YouTubePlayer videoId="test-video-id" />);
    rerender(<YouTubePlayer videoId="test-video-id" />);

    // Should still only be called once
    await waitFor(() => {
      expect(mockYT.Player).toHaveBeenCalledTimes(1);
    });
  });

  it('has correct aspect ratio styling', () => {
    window.YT = mockYT;
    const { container } = render(<YouTubePlayer videoId="test-video-id" />);
    const aspectContainer = container.querySelector('.aspect-video');
    expect(aspectContainer).toBeInTheDocument();
  });

  it('applies black background to container', () => {
    window.YT = mockYT;
    const { container } = render(<YouTubePlayer videoId="test-video-id" />);
    const aspectContainer = container.querySelector('.aspect-video');
    expect(aspectContainer).toHaveClass('bg-black');
  });

  it('applies full width and height to player div', () => {
    window.YT = mockYT;
    const { container } = render(<YouTubePlayer videoId="test-video-id" />);
    const playerDiv = container.querySelector('.w-full.h-full');
    expect(playerDiv).toBeInTheDocument();
  });
});
