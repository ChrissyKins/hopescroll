'use client';

import { useState, useEffect, useRef } from 'react';
import { Spinner } from './spinner';
import Image from 'next/image';

export interface ChannelResult {
  channelId: string;
  displayName: string;
  description: string;
  avatarUrl: string;
  subscriberCount?: number;
}

interface ChannelAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (channel: ChannelResult) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function ChannelAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = 'Search for a YouTube channel...',
  disabled = false,
}: ChannelAutocompleteProps) {
  const [results, setResults] = useState<ChannelResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isSelected, setIsSelected] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Search channels
  useEffect(() => {
    // Clear previous timeout
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Don't search if a channel was just selected
    if (isSelected) {
      return;
    }

    // Don't search if query is too short
    if (value.trim().length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    // Debounce search
    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/sources/search?q=${encodeURIComponent(value.trim())}&type=YOUTUBE`
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Search failed');
        }

        const data = await response.json();
        setResults(data.results || []);
        setShowDropdown(true);
        setHighlightedIndex(-1);
      } catch (err) {
        console.error('Channel search error:', err);
        setError(err instanceof Error ? err.message : 'Search failed');
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300); // 300ms debounce

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [value, isSelected]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || results.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < results.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < results.length) {
          handleSelect(results[highlightedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowDropdown(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  const handleSelect = (channel: ChannelResult) => {
    // Batch state updates to prevent race conditions
    setIsSelected(true); // Mark as selected to prevent search trigger
    setShowDropdown(false);
    setHighlightedIndex(-1);

    // Call onSelect after state is set
    requestAnimationFrame(() => {
      onSelect(channel);
      // Clear results after selection is complete
      setResults([]);
    });
  };

  const formatSubscriberCount = (count?: number): string => {
    if (!count) return 'No subscriber data';
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M subscribers`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K subscribers`;
    }
    return `${count} subscribers`;
  };

  return (
    <div className="relative">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <svg
            className="w-5 h-5 text-gray-400 dark:text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            const newValue = e.target.value;
            // Batch state updates
            if (isSelected) {
              setIsSelected(false);
            }
            onChange(newValue);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (results.length > 0 && !isSelected) {
              setShowDropdown(true);
            }
          }}
          placeholder={placeholder}
          disabled={disabled}
          className="
            w-full
            bg-white dark:bg-gray-800
            border border-gray-300 dark:border-gray-700
            rounded-lg
            pl-10
            pr-10
            py-2.5
            text-gray-900 dark:text-white
            placeholder-gray-500
            focus:outline-none
            focus:ring-2
            focus:ring-blue-600
            focus:border-transparent
            disabled:opacity-50
            disabled:cursor-not-allowed
          "
          autoComplete="off"
        />

        {isSearching && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
            <Spinner size="sm" />
          </div>
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && (results.length > 0 || error) && (
        <div
          ref={dropdownRef}
          className="
            absolute
            z-50
            w-full
            mt-2
            bg-white dark:bg-gray-800
            border border-gray-300 dark:border-gray-700
            rounded-lg
            shadow-xl
            max-h-96
            overflow-y-auto
          "
        >
          {error ? (
            <div className="p-4 text-center text-red-600 dark:text-red-400">
              <p className="text-sm">{error}</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {results.map((channel, index) => (
                <li key={channel.channelId}>
                  <button
                    type="button"
                    onClick={() => handleSelect(channel)}
                    className={`
                      w-full
                      p-4
                      flex
                      items-start
                      gap-3
                      hover:bg-gray-100 dark:hover:bg-gray-700
                      transition-colors
                      text-left
                      ${highlightedIndex === index ? 'bg-gray-100 dark:bg-gray-700' : ''}
                    `}
                  >
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      <Image
                        src={channel.avatarUrl}
                        alt={channel.displayName}
                        width={48}
                        height={48}
                        className="rounded-full"
                      />
                    </div>

                    {/* Channel info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-gray-900 dark:text-white font-medium truncate">
                        {channel.displayName}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                        {formatSubscriberCount(channel.subscriberCount)}
                      </p>
                      {channel.description && (
                        <p className="text-sm text-gray-500 dark:text-gray-500 line-clamp-2 mt-1">
                          {channel.description}
                        </p>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Helper text */}
      {!showDropdown && value.trim().length > 0 && value.trim().length < 2 && (
        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
          Type at least 2 characters to search
        </p>
      )}
    </div>
  );
}
