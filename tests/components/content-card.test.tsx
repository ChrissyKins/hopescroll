import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ContentCard } from '@/components/feed/content-card';
import type { FeedItem } from '@/domain/feed/feed-generator';

// Mock Next.js Image component
vi.mock('next/image', () => ({
  default: (props: any) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />;
  },
}));

describe('ContentCard', () => {
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
      duration: 630, // 10:30
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
    onWatch: vi.fn(),
    onSave: vi.fn(),
    onDismiss: vi.fn(),
    onNotNow: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders content title', () => {
    render(<ContentCard item={mockFeedItem} {...mockHandlers} />);
    expect(screen.getByText('Test Video Title')).toBeInTheDocument();
  });

  it('renders content description', () => {
    render(<ContentCard item={mockFeedItem} {...mockHandlers} />);
    expect(screen.getByText('This is a test video description')).toBeInTheDocument();
  });

  it('renders source display name', () => {
    render(<ContentCard item={mockFeedItem} {...mockHandlers} />);
    expect(screen.getByText('Test Channel')).toBeInTheDocument();
  });

  it('renders source type badge', () => {
    render(<ContentCard item={mockFeedItem} {...mockHandlers} />);
    expect(screen.getByText('YOUTUBE')).toBeInTheDocument();
  });

  it('renders NEW badge when isNew is true', () => {
    render(<ContentCard item={mockFeedItem} {...mockHandlers} />);
    expect(screen.getByText('NEW')).toBeInTheDocument();
  });

  it('does not render NEW badge when isNew is false', () => {
    const item = { ...mockFeedItem, isNew: false };
    render(<ContentCard item={item} {...mockHandlers} />);
    expect(screen.queryByText('NEW')).not.toBeInTheDocument();
  });

  it('formats duration correctly (MM:SS)', () => {
    render(<ContentCard item={mockFeedItem} {...mockHandlers} />);
    expect(screen.getByText('10:30')).toBeInTheDocument();
  });

  it('handles null duration gracefully', () => {
    const item = {
      ...mockFeedItem,
      content: { ...mockFeedItem.content, duration: null },
    };
    render(<ContentCard item={item} {...mockHandlers} />);
    expect(screen.queryByText(/:/)).not.toBeInTheDocument();
  });

  it('formats published date as "Today" for same day', () => {
    const item = {
      ...mockFeedItem,
      content: { ...mockFeedItem.content, publishedAt: new Date() },
    };
    render(<ContentCard item={item} {...mockHandlers} />);
    expect(screen.getByText('Today')).toBeInTheDocument();
  });

  it('formats published date as "Yesterday" for previous day', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const item = {
      ...mockFeedItem,
      content: { ...mockFeedItem.content, publishedAt: yesterday },
    };
    render(<ContentCard item={item} {...mockHandlers} />);
    expect(screen.getByText('Yesterday')).toBeInTheDocument();
  });

  it('formats published date as "X days ago" for recent dates', () => {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const item = {
      ...mockFeedItem,
      content: { ...mockFeedItem.content, publishedAt: threeDaysAgo },
    };
    render(<ContentCard item={item} {...mockHandlers} />);
    expect(screen.getByText('3 days ago')).toBeInTheDocument();
  });

  it('calls onWatch when Watch button is clicked', () => {
    render(<ContentCard item={mockFeedItem} {...mockHandlers} />);
    const watchButton = screen.getByText('Watch');
    fireEvent.click(watchButton);
    expect(mockHandlers.onWatch).toHaveBeenCalledWith('content-123');
    expect(mockHandlers.onWatch).toHaveBeenCalledTimes(1);
  });

  it('calls onSave when Save button is clicked', () => {
    render(<ContentCard item={mockFeedItem} {...mockHandlers} />);
    const saveButton = screen.getByTitle('Save for Later');
    fireEvent.click(saveButton);
    expect(mockHandlers.onSave).toHaveBeenCalledWith('content-123');
    expect(mockHandlers.onSave).toHaveBeenCalledTimes(1);
  });

  it('calls onNotNow when Not Now button is clicked', () => {
    render(<ContentCard item={mockFeedItem} {...mockHandlers} />);
    const notNowButton = screen.getByTitle('Not Now');
    fireEvent.click(notNowButton);
    expect(mockHandlers.onNotNow).toHaveBeenCalledWith('content-123');
    expect(mockHandlers.onNotNow).toHaveBeenCalledTimes(1);
  });

  it('calls onDismiss when Dismiss button is clicked', () => {
    render(<ContentCard item={mockFeedItem} {...mockHandlers} />);
    const dismissButton = screen.getByTitle('Dismiss');
    fireEvent.click(dismissButton);
    expect(mockHandlers.onDismiss).toHaveBeenCalledWith('content-123');
    expect(mockHandlers.onDismiss).toHaveBeenCalledTimes(1);
  });

  it('renders all four action buttons', () => {
    render(<ContentCard item={mockFeedItem} {...mockHandlers} />);
    expect(screen.getByText('Watch')).toBeInTheDocument();
    expect(screen.getByTitle('Save for Later')).toBeInTheDocument();
    expect(screen.getByTitle('Not Now')).toBeInTheDocument();
    expect(screen.getByTitle('Dismiss')).toBeInTheDocument();
  });

  it('handles missing description gracefully', () => {
    const item = {
      ...mockFeedItem,
      content: { ...mockFeedItem.content, description: null },
    };
    render(<ContentCard item={item} {...mockHandlers} />);
    expect(screen.getByText('Test Video Title')).toBeInTheDocument();
    // Description shouldn't be rendered
    expect(screen.queryByText('This is a test video description')).not.toBeInTheDocument();
  });

  it('handles missing thumbnail gracefully', () => {
    const item = {
      ...mockFeedItem,
      content: { ...mockFeedItem.content, thumbnailUrl: null },
    };
    render(<ContentCard item={item} {...mockHandlers} />);
    expect(screen.getByText('Test Video Title')).toBeInTheDocument();
    // Card should still render without thumbnail
  });

  it('applies hover styles to Watch button', () => {
    render(<ContentCard item={mockFeedItem} {...mockHandlers} />);
    const watchButton = screen.getByText('Watch');
    expect(watchButton).toHaveClass('hover:bg-blue-700');
  });

  it('displays duration with zero-padded seconds', () => {
    const item = {
      ...mockFeedItem,
      content: { ...mockFeedItem.content, duration: 305 }, // 5:05
    };
    render(<ContentCard item={item} {...mockHandlers} />);
    expect(screen.getByText('5:05')).toBeInTheDocument();
  });

  it('formats long durations correctly (hours)', () => {
    const item = {
      ...mockFeedItem,
      content: { ...mockFeedItem.content, duration: 3665 }, // 61:05 (1 hour 1 minute 5 seconds)
    };
    render(<ContentCard item={item} {...mockHandlers} />);
    expect(screen.getByText('61:05')).toBeInTheDocument();
  });

  it('renders with correct responsive classes', () => {
    const { container } = render(<ContentCard item={mockFeedItem} {...mockHandlers} />);
    const card = container.querySelector('.rounded-lg');
    expect(card).toHaveClass('shadow-md', 'hover:shadow-lg');
  });
});
