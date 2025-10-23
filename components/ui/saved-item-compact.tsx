'use client';

import { Button } from './button';

interface Collection {
  id: string;
  name: string;
  color: string | null;
}

interface SavedItemCompactProps {
  id: string;
  content: {
    id: string;
    title: string;
    url: string;
    sourceType: string;
    duration: number | null;
  };
  sourceDisplayName: string;
  savedAt: string;
  notes: string | null;
  collection: Collection | null;
  selectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
  onOpen: (url: string) => void;
  onRemove: (savedItemId: string) => void;
}

export function SavedItemCompact({
  id,
  content,
  sourceDisplayName,
  savedAt,
  notes,
  collection,
  selectionMode = false,
  isSelected = false,
  onToggleSelect,
  onOpen,
  onRemove,
}: SavedItemCompactProps) {
  const formatDuration = (seconds: number | null) => {
    if (!seconds) return null;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatSavedDate = (date: string) => {
    const now = new Date();
    const savedDate = new Date(date);
    const diff = now.getTime() - savedDate.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return '1d';
    if (days < 7) return `${days}d`;
    if (days < 30) return `${Math.floor(days / 7)}w`;
    if (days < 365) return `${Math.floor(days / 30)}mo`;
    return `${Math.floor(days / 365)}y`;
  };

  return (
    <div className={`bg-gray-900 rounded-lg px-4 py-3 hover:bg-gray-800 transition-all flex items-center gap-4 ${
      isSelected ? 'ring-2 ring-blue-500' : ''
    }`}>
      {/* Checkbox in selection mode */}
      {selectionMode && onToggleSelect && (
        <div className="flex-shrink-0">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(id)}
            className="w-5 h-5 rounded border-2 border-gray-600 bg-gray-800 text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer"
            aria-label={`Select ${content.title}`}
          />
        </div>
      )}

      {/* Title and metadata */}
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-medium text-white truncate mb-1">
          {content.title}
        </h3>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span className="truncate">{sourceDisplayName}</span>
          <span className="text-gray-600">•</span>
          <span>{formatSavedDate(savedAt)}</span>
          {content.duration && (
            <>
              <span className="text-gray-600">•</span>
              <span>{formatDuration(content.duration)}</span>
            </>
          )}
          {collection && (
            <>
              <span className="text-gray-600">•</span>
              <span className="truncate">{collection.name}</span>
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <Button variant="primary" size="sm" onClick={() => onOpen(content.url)}>
          Open
        </Button>
        <Button variant="danger" size="sm" onClick={() => onRemove(id)}>
          Remove
        </Button>
      </div>
    </div>
  );
}

export type { SavedItemCompactProps };
