import { useCallback } from 'react';
import { fetchCampaigns } from '../lib/api';
import { serializeFilters } from '../lib/filters';
import type { CampaignListFilters, CampaignListResponse } from '../lib/types';
import { useRequest } from './useRequest';
import type { RequestState } from './useRequest';

/**
 * Campaign list data source. The `key` is derived from the serialised filters,
 * which means every filter change produces exactly one new request, and
 * changing a filter that does not alter the query string issues none.
 */
export function useCampaigns(filters: CampaignListFilters): RequestState<CampaignListResponse> {
  const qs = serializeFilters(filters).toString();

  const fetcher = useCallback(
    (signal: AbortSignal) => fetchCampaigns(new URLSearchParams(qs), signal),
    [qs],
  );

  return useRequest<CampaignListResponse>(fetcher, qs);
}
