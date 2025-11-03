'use client';

import { InputHTMLAttributes, useEffect, useRef } from 'react';

export interface SearchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'className'> {
  onClear?: () => void;
  resultCount?: number;
  totalCount?: number;
}

export function Search({
  value,
  onClear,
  resultCount,
  totalCount,
  placeholder = 'Search...',
  ...props
}: SearchProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut: Cmd/Ctrl+F
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const showClear = value && String(value).length > 0;

  return (
    <div className="space-y-2">
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
          placeholder={placeholder}
          className="
            w-full
            bg-white dark:bg-gray-800
            border border-gray-300 dark:border-gray-700
            rounded-lg
            pl-10
            pr-10
            py-2.5
            text-gray-900 dark:text-white
            placeholder-gray-400 dark:placeholder-gray-500
            focus:outline-none
            focus:ring-2
            focus:ring-blue-600
            focus:border-transparent
          "
          {...props}
        />

        {showClear && (
          <button
            onClick={onClear}
            className="
              absolute
              inset-y-0
              right-0
              flex
              items-center
              pr-3
              text-gray-400 dark:text-gray-400
              hover:text-gray-600 dark:hover:text-gray-200
              transition-colors
            "
            aria-label="Clear search"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {resultCount !== undefined && totalCount !== undefined && (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {resultCount === totalCount ? (
            `Showing all ${totalCount} items`
          ) : (
            <>
              Showing <span className="text-gray-900 dark:text-white font-medium">{resultCount}</span> of{' '}
              {totalCount} items
            </>
          )}
        </p>
      )}
    </div>
  );
}
