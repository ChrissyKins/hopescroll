'use client';

import { useState, useRef, useEffect } from 'react';
import { FilterIcon, SortIcon, ChevronDownIcon, XMarkIcon } from './icons';

export type ContentType = 'all' | 'video' | 'article' | 'podcast';
export type DateRange = 'all' | 'today' | 'week' | 'month' | 'year';
export type SortOption = 'date-desc' | 'date-asc' | 'title-asc' | 'title-desc' | 'source' | 'duration-asc' | 'duration-desc' | 'random';

interface FilterState {
  collectionId: string | null;
  contentType: ContentType;
  source: string | null;
  dateRange: DateRange;
}

interface FilterSortProps {
  // Filter values
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;

  // Sort value
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;

  // Available collections and sources for dropdown
  collections: Array<{ id: string; name: string }>;
  sources: string[];

  // Active filter count (for badge display)
  activeFilterCount?: number;
}

export function FilterSort({
  filters,
  onFiltersChange,
  sortBy,
  onSortChange,
  collections,
  sources,
  activeFilterCount = 0,
}: FilterSortProps) {
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);

  const filterRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setShowFilterMenu(false);
      }
      if (sortRef.current && !sortRef.current.contains(event.target as Node)) {
        setShowSortMenu(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFilterChange = (key: keyof FilterState, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFiltersChange({
      collectionId: null,
      contentType: 'all',
      source: null,
      dateRange: 'all',
    });
  };

  const hasActiveFilters = activeFilterCount > 0;

  const sortLabel = {
    'date-desc': 'Newest First',
    'date-asc': 'Oldest First',
    'title-asc': 'Title A-Z',
    'title-desc': 'Title Z-A',
    'source': 'Source',
    'duration-asc': 'Shortest',
    'duration-desc': 'Longest',
    'random': 'Random',
  }[sortBy];

  return (
    <div className="flex items-center gap-3">
      {/* Filter Dropdown */}
      <div className="relative" ref={filterRef}>
        <button
          onClick={() => setShowFilterMenu(!showFilterMenu)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <FilterIcon className="w-5 h-5" />
          <span className="text-sm font-medium">Filters</span>
          {hasActiveFilters && (
            <span className="px-2 py-0.5 bg-blue-600 text-white text-xs font-semibold rounded-full">
              {activeFilterCount}
            </span>
          )}
          <ChevronDownIcon className="w-4 h-4" />
        </button>

        {showFilterMenu && (
          <div className="absolute top-full mt-2 left-0 w-72 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50 overflow-hidden">
            <div className="p-4 space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between pb-2 border-b border-gray-700">
                <h3 className="text-sm font-semibold text-white">Filter Content</h3>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    <XMarkIcon className="w-3 h-3" />
                    Clear all
                  </button>
                )}
              </div>

              {/* Collection Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2">
                  Collection
                </label>
                <select
                  value={filters.collectionId || 'all'}
                  onChange={(e) => handleFilterChange('collectionId', e.target.value === 'all' ? null : e.target.value)}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Collections</option>
                  {collections.map((collection) => (
                    <option key={collection.id} value={collection.id}>
                      {collection.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Content Type Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2">
                  Content Type
                </label>
                <select
                  value={filters.contentType}
                  onChange={(e) => handleFilterChange('contentType', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Types</option>
                  <option value="video">Videos</option>
                  <option value="article">Articles</option>
                  <option value="podcast">Podcasts</option>
                </select>
              </div>

              {/* Source Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2">
                  Source
                </label>
                <select
                  value={filters.source || 'all'}
                  onChange={(e) => handleFilterChange('source', e.target.value === 'all' ? null : e.target.value)}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Sources</option>
                  {sources.map((source) => (
                    <option key={source} value={source}>
                      {source}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Range Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2">
                  Date Saved
                </label>
                <select
                  value={filters.dateRange}
                  onChange={(e) => handleFilterChange('dateRange', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">Last 7 Days</option>
                  <option value="month">Last 30 Days</option>
                  <option value="year">Last Year</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sort Dropdown */}
      <div className="relative" ref={sortRef}>
        <button
          onClick={() => setShowSortMenu(!showSortMenu)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <SortIcon className="w-5 h-5" />
          <span className="text-sm font-medium">Sort:</span>
          <span className="text-sm text-white">{sortLabel}</span>
          <ChevronDownIcon className="w-4 h-4" />
        </button>

        {showSortMenu && (
          <div className="absolute top-full mt-2 left-0 w-56 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50 overflow-hidden">
            <div className="py-2">
              {[
                { value: 'date-desc', label: 'Newest First' },
                { value: 'date-asc', label: 'Oldest First' },
                { value: 'title-asc', label: 'Title A-Z' },
                { value: 'title-desc', label: 'Title Z-A' },
                { value: 'source', label: 'Source' },
                { value: 'duration-asc', label: 'Shortest First' },
                { value: 'duration-desc', label: 'Longest First' },
                { value: 'random', label: 'Random Shuffle' },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    onSortChange(option.value as SortOption);
                    setShowSortMenu(false);
                  }}
                  className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                    sortBy === option.value
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export type { FilterState };
