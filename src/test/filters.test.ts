import { describe, expect, it } from 'vitest';
import {
  DEFAULT_FILTERS,
  comparatorFor,
  facetsFor,
  filterAndSort,
  matchesQuery,
  paginate,
  parseFilters,
  parsePage,
  playsInRange,
  serializeFilters,
  statsFor,
  completionPct,
  isDefaultFilters,
} from '../lib/filters';
import type { Campaign, Play } from '../lib/types';

function campaign(overrides: Partial<Campaign> & Pick<Campaign, 'id' | 'name'>): Campaign {
  return {
    advertiser: 'Test Advertiser',
    city: 'London',
    status: 'live',
    startDate: '2026-09-01',
    endDate: '2026-09-30',
    bookedPlays: 10,
    deliveredPlays: 5,
    screenCount: 4,
    creativeHue: 200,
    creativeCode: 'CR-1000',
    ...overrides,
  };
}

const FIXTURES: Campaign[] = [
  campaign({
    id: 'c-001',
    name: 'Zenith Motors',
    city: 'Austin',
    status: 'live',
    startDate: '2026-06-01',
    deliveredPlays: 90,
    bookedPlays: 100,
  }),
  campaign({
    id: 'c-002',
    name: 'Apex Telecom',
    city: 'Berlin',
    status: 'ended',
    startDate: '2026-01-05',
    deliveredPlays: 40,
    bookedPlays: 80,
  }),
  campaign({
    id: 'c-003',
    name: 'Basalt Bank',
    city: 'Austin',
    status: 'scheduled',
    startDate: '2026-11-20',
    deliveredPlays: 0,
    bookedPlays: 60,
  }),
  campaign({
    id: 'c-004',
    name: 'Cobalt Rail',
    city: 'Lisbon',
    status: 'live',
    startDate: '2026-03-10',
    deliveredPlays: 30,
    bookedPlays: 30,
  }),
];

describe('parsePage', () => {
  it('falls back to the default for junk instead of producing NaN', () => {
    expect(parsePage(null)).toBe(1);
    expect(parsePage('')).toBe(1);
    expect(parsePage('abc')).toBe(1);
    expect(parsePage('-4')).toBe(1);
    expect(parsePage('0')).toBe(1);
  });

  it('parses valid page numbers', () => {
    expect(parsePage('7')).toBe(7);
    expect(parsePage('3', 2)).toBe(3);
  });
});

describe('parseFilters / serializeFilters', () => {
  it('round-trips a full filter set', () => {
    const filters = {
      query: 'rail',
      status: 'live' as const,
      city: 'Austin',
      sort: 'bookedPlays' as const,
      dir: 'asc' as const,
      page: 3,
    };
    expect(parseFilters(serializeFilters(filters))).toEqual(filters);
  });

  it('drops unknown enum values rather than forwarding them to the API', () => {
    const parsed = parseFilters(new URLSearchParams('status=paused&sort=whatever&dir=sideways'));
    expect(parsed.status).toBe('all');
    expect(parsed.sort).toBe(DEFAULT_FILTERS.sort);
    expect(parsed.dir).toBe(DEFAULT_FILTERS.dir);
  });

  it('omits defaults so shared URLs stay short', () => {
    const qs = serializeFilters(DEFAULT_FILTERS).toString();
    expect(qs).toBe('');
    expect(isDefaultFilters(DEFAULT_FILTERS)).toBe(true);
    expect(isDefaultFilters({ ...DEFAULT_FILTERS, page: 1, status: 'live' })).toBe(false);
  });

  it('trims whitespace so a trailing space in the search box is not a filter', () => {
    expect(parseFilters(new URLSearchParams('query=%20%20rail%20%20')).query).toBe('rail');
  });
});

describe('matchesQuery', () => {
  it('matches name, advertiser, city and id case-insensitively', () => {
    expect(matchesQuery(FIXTURES[0] as Campaign, 'zenith')).toBe(true);
    expect(matchesQuery(FIXTURES[0] as Campaign, 'AUSTIN')).toBe(true);
    expect(matchesQuery(FIXTURES[0] as Campaign, 'c-001')).toBe(true);
    expect(matchesQuery(FIXTURES[0] as Campaign, 'nope')).toBe(false);
  });

  it('treats an empty query as match-all', () => {
    expect(matchesQuery(FIXTURES[1] as Campaign, '   ')).toBe(true);
  });
});

describe('filterAndSort', () => {
  it('applies query, status and city together', () => {
    const result = filterAndSort(FIXTURES, {
      ...DEFAULT_FILTERS,
      query: 'austin',
      status: 'live',
    });
    expect(result.map((c) => c.id)).toEqual(['c-001']);
  });

  it('sorts by booked plays in the requested direction', () => {
    const asc = filterAndSort(FIXTURES, { ...DEFAULT_FILTERS, sort: 'bookedPlays', dir: 'asc' });
    expect(asc.map((c) => c.bookedPlays)).toEqual([30, 60, 80, 100]);

    const desc = filterAndSort(FIXTURES, { ...DEFAULT_FILTERS, sort: 'bookedPlays', dir: 'desc' });
    expect(desc.map((c) => c.bookedPlays)).toEqual([100, 80, 60, 30]);
  });

  it('breaks ties on name so paging never shuffles rows', () => {
    const tied = [
      campaign({ id: 'c-010', name: 'Delta' }),
      campaign({ id: 'c-011', name: 'Alpha' }),
    ];
    const forward = filterAndSort(tied, { ...DEFAULT_FILTERS, sort: 'status', dir: 'asc' });
    const reversed = filterAndSort([...tied].reverse(), {
      ...DEFAULT_FILTERS,
      sort: 'status',
      dir: 'asc',
    });
    expect(forward.map((c) => c.name)).toEqual(['Alpha', 'Delta']);
    expect(reversed.map((c) => c.name)).toEqual(['Alpha', 'Delta']);
  });

  it('does not mutate the input array', () => {
    const input = [...FIXTURES];
    filterAndSort(input, { ...DEFAULT_FILTERS, sort: 'name', dir: 'asc' });
    expect(input.map((c) => c.id)).toEqual(FIXTURES.map((c) => c.id));
  });

  it('exposes a comparator usable on its own', () => {
    expect([...FIXTURES].sort(comparatorFor('name', 'asc')).map((c) => c.name)).toEqual([
      'Apex Telecom',
      'Basalt Bank',
      'Cobalt Rail',
      'Zenith Motors',
    ]);
  });
});

describe('paginate', () => {
  it('slices the requested page and reports totals', () => {
    const page = paginate(FIXTURES, 2, 2);
    expect(page.items.map((c) => c.id)).toEqual(['c-003', 'c-004']);
    expect(page.total).toBe(4);
    expect(page.totalPages).toBe(2);
  });

  it('clamps an out-of-range page to the last page instead of showing nothing', () => {
    const page = paginate(FIXTURES, 99, 2);
    expect(page.page).toBe(2);
    expect(page.items).toHaveLength(2);
  });

  it('reports one page for an empty list', () => {
    const page = paginate([], 3, 6);
    expect(page.totalPages).toBe(1);
    expect(page.items).toHaveLength(0);
  });
});

describe('facetsFor', () => {
  it('lists unique cities sorted, with unfiltered status counts', () => {
    const facets = facetsFor(FIXTURES);
    expect(facets.cities).toEqual(['Austin', 'Berlin', 'Lisbon']);
    expect(facets.statusCounts).toEqual({ live: 2, scheduled: 1, ended: 1 });
    expect(facets.totalCampaigns).toBe(4);
  });
});

describe('completionPct', () => {
  it('rounds to whole percent and clamps out-of-range data', () => {
    expect(
      completionPct(campaign({ id: 'x', name: 'x', deliveredPlays: 90, bookedPlays: 100 })),
    ).toBe(90);
    expect(completionPct(campaign({ id: 'x', name: 'x', deliveredPlays: 1, bookedPlays: 3 }))).toBe(
      33,
    );
    expect(
      completionPct(campaign({ id: 'x', name: 'x', deliveredPlays: 120, bookedPlays: 100 })),
    ).toBe(100);
    expect(completionPct(campaign({ id: 'x', name: 'x', deliveredPlays: 5, bookedPlays: 0 }))).toBe(
      0,
    );
  });
});

const PLAYS: Play[] = [
  {
    id: 'p1',
    campaignId: 'c-001',
    screenId: 'SHD-0001',
    screenName: 'Test',
    playedAt: '2026-06-10T08:00:00.000Z',
    durationSec: 30,
    status: 'verified',
    footfall: 10,
    spotCode: 'S1',
    creativeHue: 200,
  },
  {
    id: 'p2',
    campaignId: 'c-001',
    screenId: 'SHD-0002',
    screenName: 'Test',
    playedAt: '2026-06-12T08:00:00.000Z',
    durationSec: 30,
    status: 'flagged',
    footfall: 20,
    spotCode: 'S2',
    creativeHue: 200,
  },
  {
    id: 'p3',
    campaignId: 'c-001',
    screenId: 'SHD-0003',
    screenName: 'Test',
    playedAt: '2026-06-15T08:00:00.000Z',
    durationSec: 30,
    status: 'unverified',
    footfall: 30,
    spotCode: 'S3',
    creativeHue: 200,
  },
];

describe('playsInRange', () => {
  it('returns everything when no bounds are given', () => {
    expect(playsInRange(PLAYS, null, null)).toHaveLength(3);
  });

  it('treats both bounds as inclusive', () => {
    expect(
      playsInRange(PLAYS, '2026-06-10T08:00:00.000Z', '2026-06-12T08:00:00.000Z').map((p) => p.id),
    ).toEqual(['p1', 'p2']);
    expect(playsInRange(PLAYS, '2026-06-12T00:00:00.000Z', null).map((p) => p.id)).toEqual([
      'p2',
      'p3',
    ]);
    expect(playsInRange(PLAYS, null, '2026-06-10T23:59:59.000Z').map((p) => p.id)).toEqual(['p1']);
  });

  it('returns an empty list for an inverted range', () => {
    expect(
      playsInRange(PLAYS, '2026-06-15T00:00:00.000Z', '2026-06-10T00:00:00.000Z'),
    ).toHaveLength(0);
  });
});

describe('statsFor', () => {
  it('derives delivered, verified, flagged and completion from the rows on screen', () => {
    expect(statsFor(PLAYS, 10)).toEqual({
      delivered: 3,
      booked: 10,
      verified: 1,
      flagged: 1,
      completion: 30,
    });
  });

  it('never reports over 100% completion', () => {
    expect(statsFor(PLAYS, 1).completion).toBe(100);
    expect(statsFor([], 0).completion).toBe(0);
  });
});
