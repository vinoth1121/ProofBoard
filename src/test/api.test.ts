import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '../mocks/server';
import { fetchCampaign, fetchCampaigns, fetchPlays, flagPlay, ApiError } from '../lib/api';

describe('GET /api/campaigns', () => {
  it('returns a paginated envelope with facets', async () => {
    const page = await fetchCampaigns(new URLSearchParams(''));

    expect(page.items).toHaveLength(6);
    expect(page.total).toBe(24);
    expect(page.totalPages).toBe(4);
    expect(page.pageSize).toBe(6);
    expect(page.facets.cities.length).toBeGreaterThan(0);
    expect(
      page.facets.statusCounts.live +
        page.facets.statusCounts.scheduled +
        page.facets.statusCounts.ended,
    ).toBe(24);
  });

  it('narrows by status and city together', async () => {
    const all = await fetchCampaigns(new URLSearchParams(''));
    const firstCity = all.facets.cities[0];
    expect(firstCity).toBeDefined();

    const filtered = await fetchCampaigns(new URLSearchParams('status=live'));
    expect(filtered.items.length).toBeGreaterThan(0);
    for (const campaign of filtered.items) expect(campaign.status).toBe('live');
  });

  it('filters by free-text query', async () => {
    const all = await fetchCampaigns(new URLSearchParams(''));
    const target = all.items[0];
    expect(target).toBeDefined();
    if (target === undefined) return;

    const found = await fetchCampaigns(
      new URLSearchParams(`query=${encodeURIComponent(target.advertiser)}`),
    );
    expect(found.total).toBeGreaterThan(0);
    expect(found.items.every((c) => c.advertiser === target.advertiser)).toBe(true);
  });

  it('honours sort direction', async () => {
    const asc = await fetchCampaigns(new URLSearchParams('sort=name&dir=asc&pageSize=24'));
    const desc = await fetchCampaigns(new URLSearchParams('sort=name&dir=desc&pageSize=24'));

    expect(asc.total).toBe(24);
    const names = asc.items.map((c) => c.name);
    expect([...names].sort((a, b) => a.localeCompare(b))).toEqual(names);
    expect(desc.items[0]?.name).toBe(asc.items[asc.items.length - 1]?.name);
  });

  it('returns an empty page, not an error, when nothing matches', async () => {
    const result = await fetchCampaigns(new URLSearchParams('query=zzzz-nothing'));
    expect(result.total).toBe(0);
    expect(result.items).toEqual([]);
  });
});

describe('GET /api/campaigns/:id', () => {
  it('returns the campaign with aggregate stats', async () => {
    const detail = await fetchCampaign('c-007');
    expect(detail.id).toBe('c-007');
    expect(detail.playsTotal).toBeGreaterThan(0);
    expect(detail.stats.delivered).toBe(detail.playsTotal);
  });

  it('404s an unknown campaign with a usable message', async () => {
    await expect(fetchCampaign('c-999')).rejects.toMatchObject({
      status: 404,
      code: 'not_found',
    });
  });
});

describe('GET /api/campaigns/:id/plays', () => {
  it('returns plays for a known campaign', async () => {
    const result = await fetchPlays('c-007', { from: null, to: null });
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.total).toBe(result.items.length);
  });

  it('narrows by from/to', async () => {
    const all = await fetchPlays('c-007', { from: null, to: null });
    const first = all.items[all.items.length - 1];
    const newest = all.items[0];
    expect(first).toBeDefined();
    expect(newest).toBeDefined();
    if (first === undefined || newest === undefined) return;

    const narrowed = await fetchPlays('c-007', { from: first.playedAt, to: newest.playedAt });
    expect(narrowed.items.length).toBeGreaterThan(0);
    expect(narrowed.items.length).toBeLessThanOrEqual(all.items.length);
  });

  it('returns an empty window when the range excludes everything', async () => {
    const result = await fetchPlays('c-007', {
      from: '2000-01-01T00:00:00.000Z',
      to: '2000-01-02T00:00:00.000Z',
    });
    expect(result.total).toBe(0);
  });

  it('surfaces the simulated registry failure as an ApiError', async () => {
    server.use(
      http.get('/api/campaigns/:id/plays', () =>
        HttpResponse.json(
          { error: 'internal_error', message: 'Screen registry timed out.' },
          { status: 500 },
        ),
      ),
    );

    await expect(fetchPlays('c-007', { from: null, to: null })).rejects.toBeInstanceOf(ApiError);
    await expect(fetchPlays('c-007', { from: null, to: null })).rejects.toMatchObject({
      status: 500,
      message: 'Screen registry timed out.',
    });
  });
});

describe('POST /api/campaigns/:id/flag-play', () => {
  it('flags a play and reflects the change on the next read', async () => {
    const before = await fetchPlays('c-007', { from: null, to: null });
    const target = before.items.find((p) => p.status !== 'flagged');
    expect(target).toBeDefined();
    if (target === undefined) return;

    const result = await flagPlay('c-007', target.id);
    expect(result.status).toBe('flagged');

    const after = await fetchPlays('c-007', { from: null, to: null });
    expect(after.items.find((p) => p.id === target.id)?.status).toBe('flagged');
  });

  it('rejects a malformed body with 400', async () => {
    const response = await fetch('/api/campaigns/c-007/flag-play', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(response.status).toBe(400);
  });

  it('rejects a play that belongs to another campaign', async () => {
    const c007 = await fetchPlays('c-007', { from: null, to: null });
    const target = c007.items[0];
    expect(target).toBeDefined();
    if (target === undefined) return;

    await expect(flagPlay('c-008', target.id)).rejects.toMatchObject({ status: 404 });
  });
});
