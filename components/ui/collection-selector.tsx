'use client';

import { useState, useRef, useEffect } from 'react';
import { CollectionIcon, ChevronDownIcon } from './icons';

export interface Collection {
  id: string;
  name: string;
  color: string | null;
}

interface CollectionSelectorProps {
  collections: Collection[];
  selectedCollectionId: string | null;
  onSelect: (collectionId: string | null) => void;
  disabled?: boolean;
}

export function CollectionSelector({
  collections,
  selectedCollectionId,
  onSelect,
  disabled = false,
}: CollectionSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedCollection = collections.find((c) => c.id === selectedCollectionId);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleSelect = (collectionId: string | null) => {
    onSelect(collectionId);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
          disabled
            ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
            : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
        }`}
      >
        {selectedCollection ? (
          <>
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: selectedCollection.color || '#3B82F6' }}
            />
            <span className="truncate max-w-[150px]">{selectedCollection.name}</span>
          </>
        ) : (
          <>
            <CollectionIcon className="w-4 h-4" />
            <span>No collection</span>
          </>
        )}
        <ChevronDownIcon
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50 max-h-64 overflow-y-auto">
          <button
            onClick={() => handleSelect(null)}
            className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-sm"
          >
            <CollectionIcon className="w-4 h-4 text-gray-400" />
            <span className="text-gray-700 dark:text-gray-300">No collection</span>
            {selectedCollectionId === null && (
              <span className="ml-auto text-blue-600 dark:text-blue-400">✓</span>
            )}
          </button>

          {collections.length > 0 && (
            <>
              <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
              {collections.map((collection) => (
                <button
                  key={collection.id}
                  onClick={() => handleSelect(collection.id)}
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-sm"
                >
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: collection.color || '#3B82F6' }}
                  />
                  <span className="text-gray-700 dark:text-gray-300 truncate flex-1">
                    {collection.name}
                  </span>
                  {selectedCollectionId === collection.id && (
                    <span className="ml-auto text-blue-600 dark:text-blue-400">✓</span>
                  )}
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
