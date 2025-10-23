'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Button } from './button';
import { CollectionSelector } from './collection-selector';
import { PencilIcon, CheckIcon, XMarkIcon, ArrowRightIcon } from './icons';

interface Collection {
  id: string;
  name: string;
  color: string | null;
}

interface SavedItemListProps {
  id: string;
  content: {
    id: string;
    title: string;
    url: string;
    sourceType: string;
    thumbnailUrl: string | null;
    duration: number | null;
  };
  sourceDisplayName: string;
  savedAt: string;
  notes: string | null;
  collection: Collection | null;
  collections: Collection[];
  selectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
  onOpen: (url: string) => void;
  onRemove: (savedItemId: string) => void;
  onMoveToFeed: (contentId: string) => void;
  onUpdateNotes: (savedItemId: string, notes: string) => void;
  onChangeCollection: (savedItemId: string, collectionId: string | null) => void;
}

export function SavedItemList({
  id,
  content,
  sourceDisplayName,
  savedAt,
  notes,
  collection,
  collections,
  selectionMode = false,
  isSelected = false,
  onToggleSelect,
  onOpen,
  onRemove,
  onMoveToFeed,
  onUpdateNotes,
  onChangeCollection,
}: SavedItemListProps) {
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [editedNotes, setEditedNotes] = useState(notes || '');

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
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    if (days < 365) return `${Math.floor(days / 30)}mo ago`;
    return `${Math.floor(days / 365)}y ago`;
  };

  const handleSaveNotes = () => {
    onUpdateNotes(id, editedNotes.trim());
    setIsEditingNotes(false);
  };

  const handleCancelEdit = () => {
    setEditedNotes(notes || '');
    setIsEditingNotes(false);
  };

  return (
    <div className={`bg-gray-900 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all flex ${
      isSelected ? 'ring-2 ring-blue-500' : ''
    }`}>
      {/* Checkbox in selection mode */}
      {selectionMode && onToggleSelect && (
        <div className="flex items-center justify-center px-4">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(id)}
            className="w-5 h-5 rounded border-2 border-gray-600 bg-gray-800 text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer"
            aria-label={`Select ${content.title}`}
          />
        </div>
      )}

      {/* Thumbnail */}
      <div className="relative bg-black w-48 flex-shrink-0">
        {content.thumbnailUrl && (
          <Image
            src={content.thumbnailUrl}
            alt={content.title}
            fill
            className="object-cover"
            loading="lazy"
            quality={85}
          />
        )}
        {content.duration && (
          <span className="absolute bottom-2 right-2 bg-black/75 text-white text-xs font-semibold px-2 py-1 rounded backdrop-blur-sm">
            {formatDuration(content.duration)}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 p-4 flex flex-col">
        <div className="flex-1">
          {/* Title */}
          <h3 className="text-base font-medium text-white line-clamp-2 mb-2">
            {content.title}
          </h3>

          {/* Metadata */}
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
            <span className="font-medium">{sourceDisplayName}</span>
            <span className="text-gray-600">•</span>
            <span>{formatSavedDate(savedAt)}</span>
            {collection && (
              <>
                <span className="text-gray-600">•</span>
                <span>{collection.name}</span>
              </>
            )}
          </div>

          {/* Notes */}
          {(notes || isEditingNotes) && (
            <div className="mb-2">
              {isEditingNotes ? (
                <div className="space-y-2">
                  <textarea
                    value={editedNotes}
                    onChange={(e) => setEditedNotes(e.target.value)}
                    placeholder="Add your notes here..."
                    className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm text-gray-300 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    rows={2}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button variant="primary" size="sm" onClick={handleSaveNotes}>
                      Save
                    </Button>
                    <Button variant="neutral" size="sm" onClick={handleCancelEdit}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic line-clamp-2">
                  &ldquo;{notes}&rdquo;
                </p>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-2">
          <Button variant="primary" size="sm" onClick={() => onOpen(content.url)}>
            Open
          </Button>
          {!isEditingNotes && (
            <Button variant="ghost" size="sm" onClick={() => setIsEditingNotes(true)}>
              <PencilIcon className="w-4 h-4 mr-1" />
              {notes ? 'Edit Note' : 'Add Note'}
            </Button>
          )}
          <Button variant="neutral" size="sm" onClick={() => onMoveToFeed(content.id)}>
            Move to Feed
          </Button>
          <Button variant="danger" size="sm" onClick={() => onRemove(id)}>
            Remove
          </Button>
        </div>
      </div>
    </div>
  );
}

export type { SavedItemListProps };
