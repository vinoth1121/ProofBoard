import { useCallback, useEffect, useState } from 'react';
import { parseFilters, serializeFilters } from '../../lib/filters';
import type { CampaignListFilters } from '../../lib/types';
import { useDebouncedCallback } from '../../hooks/useDebounce';
import { useUrlState } from '../../hooks/useUrlState';

/**
 * Bridges the URL query string and the campaign list UI.
 *
 * The search box keeps a local draft so typing stays responsive, then commits
 * to the URL on a debounce. Every commit resets to page 1, because a filter
 * change invalidates the current offset. Filter commits use `replace` so a
 * search does not fill the back button with one entry per keystroke.
 */
export interface CampaignFiltersController {
  readonly filters: CampaignListFilters;
  readonly searchDraft: string;
  readonly onSearchChange: (value: string) => void;
  readonly onSearchClear: () => void;
  readonly setStatus: (status: CampaignListFilters['status']) => void;
  readonly setCity: (city: string) => void;
  readonly setSort: (sort: CampaignListFilters['sort']) => void;
  readonly toggleDirection: () => void;
  readonly goToPage: (page: number) => void;
  readonly resetAll: () => void;
  readonly isPristine: boolean;
}

export function useCampaignFilters(): CampaignFiltersController {
  const url = useUrlState(parseFilters, serializeFilters);
  const filters = url.value;

  const [searchDraft, setSearchDraft] = useState(filters.query);

  // Follow the URL when it changes from outside the input (back button, reset,
  // a shared link) without clobbering what the user is mid-way through typing.
  useEffect(() => {
    setSearchDraft(filters.query);
  }, [filters.query]);

  const commitSearch = useDebouncedCallback((value: string) => {
    url.set({ query: value, page: 1 }, { replace: true });
  }, 320);

  const onSearchChange = useCallback(
    (value: string) => {
      setSearchDraft(value);
      commitSearch(value);
    },
    [commitSearch],
  );

  const onSearchClear = useCallback(() => {
    setSearchDraft('');
    url.set({ query: '', page: 1 });
  }, [url]);

  const setStatus = useCallback(
    (status: CampaignListFilters['status']) => url.set({ status, page: 1 }),
    [url],
  );

  const setCity = useCallback((city: string) => url.set({ city, page: 1 }), [url]);

  const setSort = useCallback(
    (sort: CampaignListFilters['sort']) => url.set({ sort, page: 1 }),
    [url],
  );

  const toggleDirection = useCallback(
    () => url.set({ dir: filters.dir === 'asc' ? 'desc' : 'asc' }),
    [filters.dir, url],
  );

  const goToPage = useCallback((page: number) => url.set({ page }), [url]);

  const resetAll = useCallback(() => {
    setSearchDraft('');
    url.reset();
  }, [url]);

  return {
    filters,
    searchDraft,
    onSearchChange,
    onSearchClear,
    setStatus,
    setCity,
    setSort,
    toggleDirection,
    goToPage,
    resetAll,
    isPristine: url.isPristine,
  };
}
