/**
 * Pure filtering / sorting / pagination logic.
 *
 * Deliberately framework-free: the campaign list UI, the URL serialiser and
 * the MSW handlers all call into this module, so what you see in the browser
 * and what the "server" returns can never drift apart. This is the module the
 * test suite leans on hardest.
 */

import type {
  Campaign,
  CampaignListFilters,
  CampaignListFacets,
  CampaignSortKey,
  CampaignStatus,
  Play,
  PlayStats,
  SortDirection,
} from './types';

export const SORT_KEYS: readonly CampaignSortKey[] = [
  'name',
  'status',
  'startDate',
  'bookedPlays',
  'completion',
] as const;

export const STATUSES: readonly CampaignStatus[] = ['live', 'scheduled', 'ended'] as const;

export const DEFAULT_FILTERS: CampaignListFilters = {
  query: '',
  status: 'all',
  city: '',
  sort: 'startDate',
  dir: 'desc',
  page: 1,
};

export const DEFAULT_PAGE_SIZE = 6;

function isStatus(value: string): value is CampaignStatus {
  return (STATUSES as readonly string[]).includes(value);
}

function isSortKey(value: string): value is CampaignSortKey {
  return (SORT_KEYS as readonly string[]).includes(value);
}

function isSortDirection(value: string): value is SortDirection {
  return value === 'asc' || value === 'desc';
}

/** `?page=abc` -> 1. Any junk yields the default rather than NaN. */
export function parsePage(raw: string | null, fallback = 1): number {
  if (raw === null || raw.trim() === '') return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return parsed;
}

/**
 * Read filter state out of a query string. Unknown or malformed values are
 * dropped rather than passed through to the API.
 */
export function parseFilters(params: URLSearchParams): CampaignListFilters {
  const statusRaw = params.get('status') ?? '';
  const sortRaw = params.get('sort') ?? '';
  const dirRaw = params.get('dir') ?? '';
  return {
    query: (params.get('query') ?? '').trim(),
    status: isStatus(statusRaw) ? statusRaw : 'all',
    city: (params.get('city') ?? '').trim(),
    sort: isSortKey(sortRaw) ? sortRaw : DEFAULT_FILTERS.sort,
    dir: isSortDirection(dirRaw) ? dirRaw : DEFAULT_FILTERS.dir,
    page: parsePage(params.get('page')),
  };
}

/**
 * Inverse of `parseFilters`. Defaults are omitted so shared URLs stay short
 * and legible: `/campaigns?status=live` rather than
 * `/campaigns?status=live&sort=startDate&dir=desc&page=1`.
 */
export function serializeFilters(filters: CampaignListFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.query !== '') params.set('query', filters.query);
  if (filters.status !== 'all') params.set('status', filters.status);
  if (filters.city !== '') params.set('city', filters.city);
  if (filters.sort !== DEFAULT_FILTERS.sort) params.set('sort', filters.sort);
  if (filters.dir !== DEFAULT_FILTERS.dir) params.set('dir', filters.dir);
  if (filters.page > 1) params.set('page', String(filters.page));
  return params;
}

/** True when no filter is doing any work — used for the "reset" affordance. */
export function isDefaultFilters(filters: CampaignListFilters): boolean {
  return serializeFilters(filters).toString() === serializeFilters(DEFAULT_FILTERS).toString();
}

/** Percentage of booked plays that were delivered, clamped to [0, 100]. */
export function completionPct(campaign: Campaign): number {
  if (campaign.bookedPlays <= 0) return 0;
  const pct = (campaign.deliveredPlays / campaign.bookedPlays) * 100;
  return Math.min(100, Math.max(0, Math.round(pct)));
}

/** Case- and accent-insensitive substring match over name + advertiser. */
export function matchesQuery(campaign: Campaign, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (needle === '') return true;
  const haystack =
    `${campaign.name} ${campaign.advertiser} ${campaign.city} ${campaign.id}`.toLowerCase();
  return haystack.includes(needle);
}

const STATUS_RANK: Record<CampaignStatus, number> = { live: 0, scheduled: 1, ended: 2 };

/** Comparator factory for a sort key + direction. */
export function comparatorFor(key: CampaignSortKey, dir: SortDirection) {
  const sign = dir === 'asc' ? 1 : -1;
  return (a: Campaign, b: Campaign): number => {
    let delta = 0;
    switch (key) {
      case 'name':
        delta = a.name.localeCompare(b.name);
        break;
      case 'status':
        delta = STATUS_RANK[a.status] - STATUS_RANK[b.status];
        break;
      case 'startDate':
        delta = a.startDate.localeCompare(b.startDate);
        break;
      case 'bookedPlays':
        delta = a.bookedPlays - b.bookedPlays;
        break;
      case 'completion':
        delta = completionPct(a) - completionPct(b);
        break;
    }
    // Ties always fall back to name so paging is stable — otherwise rows can
    // shuffle between pages on refetch.
    if (delta === 0) return a.name.localeCompare(b.name);
    return delta * sign;
  };
}

/** Search + filter + sort, no pagination. */
export function filterAndSort(
  campaigns: readonly Campaign[],
  filters: CampaignListFilters,
): Campaign[] {
  const out = campaigns.filter((c) => {
    if (!matchesQuery(c, filters.query)) return false;
    if (filters.status !== 'all' && c.status !== filters.status) return false;
    if (filters.city !== '' && c.city !== filters.city) return false;
    return true;
  });
  return out.sort(comparatorFor(filters.sort, filters.dir));
}

export interface Page<T> {
  readonly items: readonly T[];
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
  readonly totalPages: number;
}

/**
 * Slice into a page. Out-of-range pages (e.g. `?page=99`) clamp to the last
 * non-empty page instead of rendering an empty grid.
 */
export function paginate<T>(
  items: readonly T[],
  page: number,
  pageSize = DEFAULT_PAGE_SIZE,
): Page<T> {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    page: safePage,
    pageSize,
    total,
    totalPages,
  };
}

export function facetsFor(campaigns: readonly Campaign[]): CampaignListFacets {
  const cities = [...new Set(campaigns.map((c) => c.city))].sort((a, b) => a.localeCompare(b));
  const statusCounts: Record<CampaignStatus, number> = { live: 0, scheduled: 0, ended: 0 };
  for (const campaign of campaigns) statusCounts[campaign.status] += 1;
  return {
    cities,
    statuses: STATUSES,
    statusCounts,
    totalCampaigns: campaigns.length,
  };
}

/** Inclusive ISO-timestamp window filter, used by the plays endpoint. */
export function playsInRange(
  plays: readonly Play[],
  fromIso: string | null,
  toIso: string | null,
): Play[] {
  const from = fromIso !== null && fromIso !== '' ? fromIso : null;
  const to = toIso !== null && toIso !== '' ? toIso : null;
  if (from === null && to === null) return [...plays];
  return plays.filter((p) => {
    if (from !== null && p.playedAt < from) return false;
    if (to !== null && p.playedAt > to) return false;
    return true;
  });
}

export function statsFor(plays: readonly Play[], booked: number): PlayStats {
  const delivered = plays.length;
  const verified = plays.filter((p) => p.status === 'verified').length;
  const flagged = plays.filter((p) => p.status === 'flagged').length;
  const completion = booked <= 0 ? 0 : Math.min(100, Math.round((delivered / booked) * 100));
  return { delivered, booked, verified, flagged, completion };
}
