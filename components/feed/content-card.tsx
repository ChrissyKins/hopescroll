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

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all group">
      {/* Thumbnail */}
      {content.thumbnailUrl && (
        <div
          className="relative aspect-video cursor-pointer"
          onClick={() => onWatch(content.id)}
        >
          <Image
            src={content.thumbnailUrl}
            alt={content.title}
            fill
            sizes="(max-width: 768px) 100vw, 672px"
            className="object-cover"
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
      )}

      {/* Content */}
      <div className="p-5">
        {/* Title - clickable */}
        <h3
          className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-2 mb-3 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          onClick={() => onWatch(content.id)}
        >
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
  );
}
