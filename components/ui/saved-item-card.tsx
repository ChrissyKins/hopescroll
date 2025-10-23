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

interface SavedItemCardProps {
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

export function SavedItemCard({
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
}: SavedItemCardProps) {
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

    if (days === 0) return 'Saved today';
    if (days === 1) return 'Saved yesterday';
    if (days < 7) return `Saved ${days}d ago`;
    if (days < 30) return `Saved ${Math.floor(days / 7)}w ago`;
    if (days < 365) return `Saved ${Math.floor(days / 30)}mo ago`;
    return `Saved ${Math.floor(days / 365)}y ago`;
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
    <div className={`bg-gray-900 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all ${
      isSelected ? 'ring-2 ring-blue-500' : ''
    }`}>
      {/* Thumbnail */}
      <div className="relative bg-black aspect-video">
        {selectionMode && onToggleSelect && (
          <div className="absolute top-3 left-3 z-10">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggleSelect(id)}
              className="w-5 h-5 rounded border-2 border-white bg-gray-800/75 text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer"
              aria-label={`Select ${content.title}`}
            />
          </div>
        )}
        {content.thumbnailUrl && (
          <Image
            src={content.thumbnailUrl}
            alt={content.title}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover"
            loading="lazy"
            quality={85}
          />
        )}
        {content.duration && (
          <span className="absolute bottom-3 right-3 bg-black/75 text-white text-xs font-semibold px-2.5 py-1 rounded backdrop-blur-sm">
            {formatDuration(content.duration)}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Title */}
        <h3 className="text-lg font-medium text-white line-clamp-2">
          {content.title}
        </h3>

        {/* Metadata */}
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <span className="font-medium">{sourceDisplayName}</span>
          <span className="text-gray-600">•</span>
          <span>{formatSavedDate(savedAt)}</span>
        </div>

        {/* Collection */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-300">Collection:</span>
          <CollectionSelector
            collections={collections}
            selectedCollectionId={collection?.id || null}
            onSelect={(collectionId) => onChangeCollection(id, collectionId)}
          />
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-300">Notes:</span>
            {!isEditingNotes && (
              <button
                onClick={() => setIsEditingNotes(true)}
                className="p-1 text-gray-400 hover:text-blue-400 transition-colors"
                title="Edit notes"
              >
                <PencilIcon className="w-4 h-4" />
              </button>
            )}
          </div>

          {isEditingNotes ? (
            <div className="space-y-2">
              <textarea
                value={editedNotes}
                onChange={(e) => setEditedNotes(e.target.value)}
                placeholder="Add your notes here..."
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={3}
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSaveNotes}
                  className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
                >
                  <CheckIcon className="w-4 h-4" />
                  Save
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="flex items-center gap-1 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded transition-colors"
                >
                  <XMarkIcon className="w-4 h-4" />
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">
              {notes ? `"${notes}"` : 'No notes yet'}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-700">
          <Button
            variant="primary"
            size="sm"
            onClick={() => onOpen(content.url)}
          >
            Open
          </Button>
          <Button
            variant="neutral"
            size="sm"
            onClick={() => onMoveToFeed(content.id)}
          >
            <ArrowRightIcon className="w-4 h-4 mr-1" />
            Move to Feed
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => onRemove(id)}
          >
            Remove
          </Button>
        </div>
      </div>
    </div>
  );
}

export type { SavedItemCardProps };
