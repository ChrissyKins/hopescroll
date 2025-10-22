import { useMemo, useState } from 'react';

/**
 * Generic search hook for filtering items based on query
 * @param items - Array of items to search through
 * @param searchFields - Function that returns searchable string for an item
 * @returns Filtered items and search controls
 */
export function useSearch<T>(
  items: T[],
  searchFields: (item: T) => string[]
) {
  const [query, setQuery] = useState('');

  const filteredItems = useMemo(() => {
    if (!query.trim()) {
      return items;
    }

    const lowerQuery = query.toLowerCase();

    return items.filter((item) => {
      const fields = searchFields(item);
      return fields.some((field) =>
        String(field).toLowerCase().includes(lowerQuery)
      );
    });
  }, [items, query, searchFields]);

  const clearSearch = () => setQuery('');

  return {
    query,
    setQuery,
    clearSearch,
    filteredItems,
    resultCount: filteredItems.length,
    totalCount: items.length,
  };
}
