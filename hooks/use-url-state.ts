import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import type { FilterState, SortOption, ViewMode } from '@/components/ui';

interface UrlState {
  filters: FilterState;
  sortBy: SortOption;
  view: ViewMode;
}

export function useUrlState(initialFilters: FilterState, initialSort: SortOption, initialView: ViewMode) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isHydrated, setIsHydrated] = useState(false);

  // Parse filters from URL
  const getStateFromUrl = useCallback((): UrlState => {
    const collectionId = searchParams.get('collection');
    const contentType = searchParams.get('type') as FilterState['contentType'] || 'all';
    const source = searchParams.get('source');
    const dateRange = searchParams.get('date') as FilterState['dateRange'] || 'all';
    const sortBy = searchParams.get('sort') as SortOption || initialSort;
    const view = searchParams.get('view') as ViewMode || initialView;

    return {
      filters: {
        collectionId: collectionId || null,
        contentType,
        source: source || null,
        dateRange,
      },
      sortBy,
      view,
    };
  }, [searchParams, initialSort, initialView]);

  // Initialize state from URL on first render
  const [state, setState] = useState<UrlState>(() => ({
    filters: initialFilters,
    sortBy: initialSort,
    view: initialView,
  }));

  // Hydrate from URL on mount
  useEffect(() => {
    if (!isHydrated) {
      const urlState = getStateFromUrl();
      setState(urlState);
      setIsHydrated(true);
    }
  }, [isHydrated, getStateFromUrl]);

  // Update URL when state changes (after hydration)
  const updateUrl = useCallback((newState: UrlState) => {
    if (!isHydrated) return;

    const params = new URLSearchParams();

    // Add filters to URL
    if (newState.filters.collectionId) {
      params.set('collection', newState.filters.collectionId);
    }
    if (newState.filters.contentType !== 'all') {
      params.set('type', newState.filters.contentType);
    }
    if (newState.filters.source) {
      params.set('source', newState.filters.source);
    }
    if (newState.filters.dateRange !== 'all') {
      params.set('date', newState.filters.dateRange);
    }

    // Add sort to URL
    if (newState.sortBy !== initialSort) {
      params.set('sort', newState.sortBy);
    }

    // Add view to URL
    if (newState.view !== initialView) {
      params.set('view', newState.view);
    }

    // Update URL without causing navigation
    const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname;
    router.replace(newUrl, { scroll: false });
  }, [router, initialSort, initialView, isHydrated]);

  // Update filters
  const setFilters = useCallback((filters: FilterState) => {
    setState((prev) => {
      const newState = { ...prev, filters };
      updateUrl(newState);
      return newState;
    });
  }, [updateUrl]);

  // Update sort
  const setSortBy = useCallback((sortBy: SortOption) => {
    setState((prev) => {
      const newState = { ...prev, sortBy };
      updateUrl(newState);
      return newState;
    });
  }, [updateUrl]);

  // Update view
  const setView = useCallback((view: ViewMode) => {
    setState((prev) => {
      const newState = { ...prev, view };
      updateUrl(newState);
      return newState;
    });
  }, [updateUrl]);

  return {
    filters: state.filters,
    sortBy: state.sortBy,
    view: state.view,
    setFilters,
    setSortBy,
    setView,
    isHydrated,
  };
}
