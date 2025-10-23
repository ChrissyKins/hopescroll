'use client';

import { Button } from './button';
import { CollectionSelector } from './collection-selector';
import { TrashIcon, ArrowRightIcon, XMarkIcon } from './icons';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';

interface Collection {
  id: string;
  name: string;
  color: string | null;
}

interface BulkActionToolbarProps {
  selectedCount: number;
  totalCount: number;
  collections: Collection[];
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onBulkRemove: () => void;
  onBulkMoveToCollection: (collectionId: string | null) => void;
  onBulkMoveToFeed: () => void;
  onBulkExport: () => void;
  onExitSelection: () => void;
}

export function BulkActionToolbar({
  selectedCount,
  totalCount,
  collections,
  onSelectAll,
  onDeselectAll,
  onBulkRemove,
  onBulkMoveToCollection,
  onBulkMoveToFeed,
  onBulkExport,
  onExitSelection,
}: BulkActionToolbarProps) {
  const allSelected = selectedCount === totalCount && totalCount > 0;

  return (
    <div className="sticky top-0 z-20 bg-gray-800 border border-gray-700 rounded-lg p-4 shadow-lg">
      <div className="flex flex-wrap items-center gap-4 justify-between">
        {/* Left side - Selection info and controls */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-white font-medium">
              {selectedCount} selected
            </span>
            {selectedCount > 0 && (
              <span className="text-gray-400 text-sm">
                of {totalCount}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!allSelected ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={onSelectAll}
              >
                Select All
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDeselectAll}
              >
                Deselect All
              </Button>
            )}
          </div>
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center gap-3">
          {selectedCount > 0 && (
            <>
              {/* Move to Collection */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-300">Move to:</span>
                <CollectionSelector
                  collections={collections}
                  selectedCollectionId={null}
                  onSelect={onBulkMoveToCollection}
                />
              </div>

              {/* Move to Feed */}
              <Button
                variant="neutral"
                size="sm"
                onClick={onBulkMoveToFeed}
              >
                <ArrowRightIcon className="w-4 h-4 mr-1" />
                Move to Feed
              </Button>

              {/* Export */}
              <Button
                variant="primary"
                size="sm"
                onClick={onBulkExport}
              >
                <ArrowDownTrayIcon className="w-4 h-4 mr-1" />
                Export
              </Button>

              {/* Remove */}
              <Button
                variant="danger"
                size="sm"
                onClick={onBulkRemove}
              >
                <TrashIcon className="w-4 h-4 mr-1" />
                Remove
              </Button>
            </>
          )}

          {/* Exit Selection Mode */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onExitSelection}
          >
            <XMarkIcon className="w-4 h-4 mr-1" />
            Exit
          </Button>
        </div>
      </div>
    </div>
  );
}
