/**
 * Loading Skeleton Components
 *
 * Provides placeholder components that match actual content layouts
 * while data is loading, improving perceived performance.
 */

export function SourceCardSkeleton() {
  return (
    <div className="animate-pulse flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
      <div className="flex items-center space-x-4 flex-1">
        {/* Avatar */}
        <div className="w-12 h-12 bg-gray-300 dark:bg-gray-600 rounded-full" />

        {/* Content */}
        <div className="flex-1 space-y-2">
          {/* Display name */}
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-48" />
          {/* Source type and ID */}
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-64" />
          {/* Stats */}
          <div className="flex items-center gap-3 mt-1">
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-28" />
          </div>
        </div>

        {/* Badges */}
        <div className="flex items-center space-x-2">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-16" />
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center space-x-2 ml-4">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16" />
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-20" />
      </div>
    </div>
  );
}

export function SourceListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <SourceCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function SourceGridCardSkeleton() {
  return (
    <div className="animate-pulse relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-1 py-2 flex flex-col">
      {/* Avatar */}
      <div className="w-12 h-12 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mb-1.5" />

      {/* Display name */}
      <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-3/4 mx-auto mb-1" />
      <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/2 mx-auto mb-1" />

      {/* Stats */}
      <div className="flex items-center justify-center gap-2 mb-1.5">
        <div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded w-10" />
        <div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded w-12" />
      </div>

      {/* Bottom controls */}
      <div className="flex items-center justify-between pt-1.5 mt-auto border-t border-gray-200 dark:border-gray-700">
        <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-9" />
        <div className="h-3.5 w-3.5 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
    </div>
  );
}

export function SourceGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <SourceGridCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function KeywordCardSkeleton() {
  return (
    <div className="animate-pulse flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
      <div className="flex items-center space-x-2">
        {/* Keyword text */}
        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-32" />
        {/* Badge - always show for consistent SSR/client rendering */}
        <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-16" />
      </div>
      {/* Remove button */}
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16" />
    </div>
  );
}

export function KeywordListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <KeywordCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ContentCardSkeleton() {
  return (
    <div className="animate-pulse border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800">
      {/* Thumbnail */}
      <div className="w-full h-48 bg-gray-300 dark:bg-gray-600" />

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Title */}
        <div className="h-5 bg-gray-300 dark:bg-gray-600 rounded w-full" />
        <div className="h-5 bg-gray-300 dark:bg-gray-600 rounded w-3/4" />

        {/* Source info */}
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-48" />

        {/* Stats/badges */}
        <div className="flex items-center gap-2">
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-16" />
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-20" />
        </div>
      </div>
    </div>
  );
}

export function SavedContentSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col gap-3">
          <ContentCardSkeleton />
          {/* Collection selector and actions */}
          <div className="flex items-center justify-between gap-2">
            <div className="animate-pulse h-8 bg-gray-200 dark:bg-gray-700 rounded w-40" />
            <div className="animate-pulse h-8 bg-gray-200 dark:bg-gray-700 rounded w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function HistoryItemSkeleton() {
  return (
    <div className="animate-pulse flex items-start space-x-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
      {/* Icon */}
      <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-full" />

      {/* Content */}
      <div className="flex-1 space-y-2">
        {/* Title and link */}
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
          </div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-12" />
        </div>

        {/* Badges and stats */}
        <div className="flex items-center space-x-4">
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-20" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-28" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24" />
        </div>
      </div>
    </div>
  );
}

export function HistoryListSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <HistoryItemSkeleton key={i} />
      ))}
    </div>
  );
}

export function CollectionItemSkeleton() {
  return (
    <div className="animate-pulse flex items-center space-x-2 p-2 rounded-lg">
      {/* Color dot */}
      <div className="w-3 h-3 bg-gray-300 dark:bg-gray-600 rounded-full" />
      {/* Name */}
      <div className="flex-1 h-4 bg-gray-300 dark:bg-gray-600 rounded" />
      {/* Count badge */}
      <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-8" />
    </div>
  );
}

export function CollectionListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <CollectionItemSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Generic page skeleton with header and content area
 */
export function PageSkeleton({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </div>
    </div>
  );
}
