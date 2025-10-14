import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TheatreMode } from '@/components/theatre/theatre-mode';
import type { FeedItem } from '@/domain/feed/feed-generator';

// Mock YouTubePlayer component
vi.mock('@/components/theatre/youtube-player', () => ({
  YouTubePlayer: ({ videoId, onPlay }: any) => (
    <div data-testid="youtube-player" data-video-id={videoId}>
      <button onClick={onPlay} data-testid="mock-play-button">
        Play
      </button>
    </div>
  ),
}));

describe('TheatreMode', () => {
  const mockFeedItem: FeedItem = {
    content: {
      id: 'content-123',
      sourceType: 'YOUTUBE',
      sourceId: 'channel-1',
      originalId: 'video-abc',
      title: 'Test Video Title',
      description: 'This is a test video description',
      thumbnailUrl: 'https://example.com/thumbnail.jpg',
      url: 'https://youtube.com/watch?v=abc',
      duration: 630,
      publishedAt: new Date('2024-10-01'),
      fetchedAt: new Date(),
      lastSeenInFeed: new Date(),
    },
    position: 0,
    isNew: true,
    sourceDisplayName: 'Test Channel',
    interactionState: null,
  };

  const mockHandlers = {
    onClose: vi.fn(),
    onNext: vi.fn(),
    onMarkWatched: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    document.body.style.overflow = 'unset';
  });

  afterEach(() => {
    document.body.style.overflow = 'unset';
  });

  it('renders nothing when item is null', () => {
    const { container } = render(
      <TheatreMode item={null} onClose={mockHandlers.onClose} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders content title', () => {
    render(<TheatreMode item={mockFeedItem} {...mockHandlers} />);
    expect(screen.getByText('Test Video Title')).toBeInTheDocument();
  });

  it('renders source display name', () => {
    render(<TheatreMode item={mockFeedItem} {...mockHandlers} />);
    expect(screen.getByText('Test Channel')).toBeInTheDocument();
  });

  it('renders source type badge', () => {
    render(<TheatreMode item={mockFeedItem} {...mockHandlers} />);
    expect(screen.getByText('YOUTUBE')).toBeInTheDocument();
  });

  it('renders NEW badge when isNew is true', () => {
    render(<TheatreMode item={mockFeedItem} {...mockHandlers} />);
    expect(screen.getByText('NEW')).toBeInTheDocument();
  });

  it('does not render NEW badge when isNew is false', () => {
    const item = { ...mockFeedItem, isNew: false };
    render(<TheatreMode item={item} {...mockHandlers} />);
    expect(screen.queryByText('NEW')).not.toBeInTheDocument();
  });

  it('renders description when available', () => {
    render(<TheatreMode item={mockFeedItem} {...mockHandlers} />);
    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByText('This is a test video description')).toBeInTheDocument();
  });

  it('does not render description section when description is null', () => {
    const item = {
      ...mockFeedItem,
      content: { ...mockFeedItem.content, description: null },
    };
    render(<TheatreMode item={item} {...mockHandlers} />);
    expect(screen.queryByText('Description')).not.toBeInTheDocument();
  });

  it('renders YouTube player for YouTube content', () => {
    render(<TheatreMode item={mockFeedItem} {...mockHandlers} />);
    const player = screen.getByTestId('youtube-player');
    expect(player).toBeInTheDocument();
    expect(player).toHaveAttribute('data-video-id', 'video-abc');
  });

  it('renders fallback UI for non-YouTube content', () => {
    const item = {
      ...mockFeedItem,
      content: { ...mockFeedItem.content, sourceType: 'TWITCH' as any },
    };
    render(<TheatreMode item={item} {...mockHandlers} />);
    expect(screen.getByText(/Player for TWITCH not yet implemented/)).toBeInTheDocument();
    expect(screen.getByText('Open in new tab')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    render(<TheatreMode item={mockFeedItem} {...mockHandlers} />);
    const closeButton = screen.getByLabelText('Close theatre mode');
    fireEvent.click(closeButton);
    expect(mockHandlers.onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when background is clicked', () => {
    render(<TheatreMode item={mockFeedItem} {...mockHandlers} />);
    const background = screen.getByRole('button', { name: 'Close theatre mode' })
      .closest('.fixed');

    if (background) {
      fireEvent.click(background);
      // Should be called from clicking background
      expect(mockHandlers.onClose).toHaveBeenCalled();
    }
  });

  it('does not call onClose when clicking on content', () => {
    render(<TheatreMode item={mockFeedItem} {...mockHandlers} />);
    const contentArea = screen.getByText('Test Video Title');
    fireEvent.click(contentArea);
    expect(mockHandlers.onClose).not.toHaveBeenCalled();
  });

  it('calls onClose when ESC key is pressed', () => {
    render(<TheatreMode item={mockFeedItem} {...mockHandlers} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(mockHandlers.onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose when other keys are pressed', () => {
    render(<TheatreMode item={mockFeedItem} {...mockHandlers} />);
    fireEvent.keyDown(document, { key: 'Enter' });
    fireEvent.keyDown(document, { key: 'Space' });
    expect(mockHandlers.onClose).not.toHaveBeenCalled();
  });

  it('renders Next in feed button when onNext is provided', () => {
    render(<TheatreMode item={mockFeedItem} {...mockHandlers} />);
    expect(screen.getByText('Next in feed')).toBeInTheDocument();
  });

  it('does not render Next in feed button when onNext is not provided', () => {
    render(
      <TheatreMode
        item={mockFeedItem}
        onClose={mockHandlers.onClose}
        onMarkWatched={mockHandlers.onMarkWatched}
      />
    );
    expect(screen.queryByText('Next in feed')).not.toBeInTheDocument();
  });

  it('calls onNext when Next in feed button is clicked', () => {
    render(<TheatreMode item={mockFeedItem} {...mockHandlers} />);
    const nextButton = screen.getByText('Next in feed');
    fireEvent.click(nextButton);
    expect(mockHandlers.onNext).toHaveBeenCalledTimes(1);
  });

  it('calls onMarkWatched when video starts playing', () => {
    render(<TheatreMode item={mockFeedItem} {...mockHandlers} />);
    const playButton = screen.getByTestId('mock-play-button');
    fireEvent.click(playButton);
    expect(mockHandlers.onMarkWatched).toHaveBeenCalledWith('content-123');
    expect(mockHandlers.onMarkWatched).toHaveBeenCalledTimes(1);
  });

  it('does not call onMarkWatched if handler is not provided', () => {
    render(
      <TheatreMode
        item={mockFeedItem}
        onClose={mockHandlers.onClose}
        onNext={mockHandlers.onNext}
      />
    );
    const playButton = screen.getByTestId('mock-play-button');
    fireEvent.click(playButton);
    // Should not throw error
    expect(mockHandlers.onMarkWatched).not.toHaveBeenCalled();
  });

  it('prevents body scroll when modal is open', () => {
    render(<TheatreMode item={mockFeedItem} {...mockHandlers} />);
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('restores body scroll when modal is closed', () => {
    const { unmount } = render(<TheatreMode item={mockFeedItem} {...mockHandlers} />);
    expect(document.body.style.overflow).toBe('hidden');
    unmount();
    expect(document.body.style.overflow).toBe('unset');
  });

  it('removes event listener on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');
    const { unmount } = render(<TheatreMode item={mockFeedItem} {...mockHandlers} />);
    unmount();
    expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
  });

  it('renders ESC keyboard hint', () => {
    render(<TheatreMode item={mockFeedItem} {...mockHandlers} />);
    expect(screen.getByText('ESC')).toBeInTheDocument();
    expect(screen.getByText('to close')).toBeInTheDocument();
  });

  it('has correct styling for dark overlay', () => {
    const { container } = render(<TheatreMode item={mockFeedItem} {...mockHandlers} />);
    const overlay = container.querySelector('.fixed');
    expect(overlay).toHaveClass('bg-black', 'bg-opacity-90', 'backdrop-blur-sm');
  });

  it('renders fallback link with correct attributes for non-YouTube content', () => {
    const item = {
      ...mockFeedItem,
      content: {
        ...mockFeedItem.content,
        sourceType: 'TWITCH' as any,
        url: 'https://twitch.tv/video/123',
      },
    };
    render(<TheatreMode item={item} {...mockHandlers} />);
    const link = screen.getByText('Open in new tab');
    expect(link).toHaveAttribute('href', 'https://twitch.tv/video/123');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('positions close button correctly', () => {
    render(<TheatreMode item={mockFeedItem} {...mockHandlers} />);
    const closeButton = screen.getByLabelText('Close theatre mode');
    expect(closeButton).toHaveClass('absolute', '-top-12', 'right-0');
  });

  it('applies hover styles to close button', () => {
    render(<TheatreMode item={mockFeedItem} {...mockHandlers} />);
    const closeButton = screen.getByLabelText('Close theatre mode');
    expect(closeButton).toHaveClass('hover:text-gray-300', 'transition-colors');
  });

  it('applies hover styles to Next button', () => {
    render(<TheatreMode item={mockFeedItem} {...mockHandlers} />);
    const nextButton = screen.getByText('Next in feed');
    expect(nextButton).toHaveClass('hover:bg-blue-700', 'transition-colors');
  });

  it('handles long descriptions with scrollable container', () => {
    const item = {
      ...mockFeedItem,
      content: {
        ...mockFeedItem.content,
        description: 'A'.repeat(1000),
      },
    };
    render(<TheatreMode item={item} {...mockHandlers} />);
    const descriptionContainer = screen.getByText('Description').parentElement;
    expect(descriptionContainer).toHaveClass('max-h-40', 'overflow-y-auto');
  });

  it('preserves description whitespace and line breaks', () => {
    const item = {
      ...mockFeedItem,
      content: {
        ...mockFeedItem.content,
        description: 'Line 1\nLine 2\n  Indented line',
      },
    };
    render(<TheatreMode item={item} {...mockHandlers} />);
    const description = screen.getByText(/Line 1/);
    expect(description).toHaveClass('whitespace-pre-wrap');
  });
});
