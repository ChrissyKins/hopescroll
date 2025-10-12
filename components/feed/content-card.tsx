import Image from 'next/image';
import type { FeedItem } from '@/domain/feed/feed-generator';

interface ContentCardProps {
  item: FeedItem;
  onWatch: (contentId: string) => void;
  onSave: (contentId: string) => void;
  onDismiss: (contentId: string) => void;
  onNotNow: (contentId: string) => void;
}

export function ContentCard({ item, onWatch, onSave, onDismiss, onNotNow }: ContentCardProps) {
  const { content, sourceDisplayName, isNew } = item;

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return null;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatPublishedDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    if (days < 365) return `${Math.floor(days / 30)} months ago`;
    return `${Math.floor(days / 365)} years ago`;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      {content.thumbnailUrl && (
        <div className="relative aspect-video">
          <Image
            src={content.thumbnailUrl}
            alt={content.title}
            fill
            className="object-cover"
          />
          {isNew && (
            <span className="absolute top-2 left-2 bg-blue-500 text-white text-xs font-semibold px-2 py-1 rounded">
              NEW
            </span>
          )}
          {content.duration && (
            <span className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs font-semibold px-2 py-1 rounded">
              {formatDuration(content.duration)}
            </span>
          )}
        </div>
      )}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-2">
            {content.title}
          </h3>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-3">
          <span className="font-medium">{sourceDisplayName}</span>
          <span>•</span>
          <span>{formatPublishedDate(content.publishedAt)}</span>
          <span>•</span>
          <span className="text-xs uppercase bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">
            {content.sourceType}
          </span>
        </div>
        {content.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-4">
            {content.description}
          </p>
        )}
        <div className="flex gap-2">
          <button
            onClick={() => onWatch(content.id)}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-4 rounded transition-colors"
          >
            Watch
          </button>
          <button
            onClick={() => onSave(content.id)}
            className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white text-sm font-medium py-2 px-4 rounded transition-colors"
            title="Save for Later"
          >
            ⭐
          </button>
          <button
            onClick={() => onNotNow(content.id)}
            className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white text-sm font-medium py-2 px-4 rounded transition-colors"
            title="Not Now"
          >
            ⏭️
          </button>
          <button
            onClick={() => onDismiss(content.id)}
            className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white text-sm font-medium py-2 px-4 rounded transition-colors"
            title="Dismiss"
          >
            ❌
          </button>
        </div>
      </div>
    </div>
  );
}
