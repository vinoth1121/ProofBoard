import { describe, expect, it } from 'vitest';
import { CAMPAIGNS, PLAYS_BY_CAMPAIGN, SCREENS, TOTAL_PLAYS, ANCHOR_ISO } from '../mocks/db';
import { completionPct, filterAndSort, paginate, parseFilters } from '../lib/filters';
import { createRng } from '../lib/rng';

const ANCHOR = new Date(ANCHOR_ISO).getTime();
const DAY_MS = 86_400_000;

describe('seeded dataset', () => {
  it('seeds exactly 24 campaigns', () => {
    expect(CAMPAIGNS).toHaveLength(24);
  });

  it('seeds more than 400 plays', () => {
    expect(TOTAL_PLAYS).toBeGreaterThan(400);
  });

  it('uses unique, well-formed campaign ids', () => {
    const ids = CAMPAIGNS.map((c) => c.id);
    expect(new Set(ids).size).toBe(24);
    for (const id of ids) expect(id).toMatch(/^c-\d{3}$/);
  });

  it('keeps flight dates consistent with campaign status', () => {
    for (const campaign of CAMPAIGNS) {
      const start = new Date(`${campaign.startDate}T00:00:00.000Z`).getTime();
      const end = new Date(`${campaign.endDate}T00:00:00.000Z`).getTime();
      expect(end).toBeGreaterThan(start);

      if (campaign.status === 'live') {
        expect(start).toBeLessThanOrEqual(ANCHOR);
        expect(end).toBeGreaterThan(ANCHOR);
      }
      if (campaign.status === 'scheduled') expect(start).toBeGreaterThan(ANCHOR);
      if (campaign.status === 'ended') expect(end).toBeLessThan(ANCHOR);
    }
  });

  it('never books more plays than are delivered beyond a scheduled shortfall', () => {
    for (const campaign of CAMPAIGNS) {
      expect(campaign.bookedPlays).toBeGreaterThanOrEqual(campaign.deliveredPlays);
      expect(completionPct(campaign)).toBeGreaterThanOrEqual(0);
      expect(completionPct(campaign)).toBeLessThanOrEqual(100);
    }
  });

  it('generates plays only inside the campaign flight window, newest first', () => {
    for (const campaign of CAMPAIGNS) {
      const plays = PLAYS_BY_CAMPAIGN.get(campaign.id) ?? [];
      const start = new Date(`${campaign.startDate}T00:00:00.000Z`).getTime();
      const end = new Date(`${campaign.endDate}T23:59:59.000Z`).getTime();

      for (const play of plays) {
        const at = new Date(play.playedAt).getTime();
        expect(at).toBeGreaterThanOrEqual(start - DAY_MS);
        expect(at).toBeLessThanOrEqual(end);
        expect(play.campaignId).toBe(campaign.id);
      }

      const timestamps = plays.map((p) => p.playedAt);
      expect([...timestamps].sort((a, b) => b.localeCompare(a))).toEqual(timestamps);
    }
  });

  it('only references screens that exist, and screens belong to the campaign city', () => {
    const screenById = new Map(SCREENS.map((s) => [s.id, s]));
    for (const campaign of CAMPAIGNS) {
      const plays = PLAYS_BY_CAMPAIGN.get(campaign.id) ?? [];
      for (const play of plays) {
        const screen = screenById.get(play.screenId);
        expect(screen).toBeDefined();
        expect(screen?.city).toBe(campaign.city);
      }
    }
  });

  it('is reproducible: the same seed yields the same sequence', () => {
    const a = createRng(1234);
    const b = createRng(1234);
    const seqA = Array.from({ length: 12 }, () => a.next());
    const seqB = Array.from({ length: 12 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('paginates and filters the generated universe without gaps', () => {
    const filters = parseFilters(new URLSearchParams('sort=name&dir=asc&pageSize=10'));
    const sorted = filterAndSort(CAMPAIGNS, filters);
    expect(sorted).toHaveLength(24);

    const page1 = paginate(sorted, 1, 10);
    const page2 = paginate(sorted, 2, 10);
    const page3 = paginate(sorted, 3, 10);

    expect(page1.items).toHaveLength(10);
    expect(page2.items).toHaveLength(10);
    expect(page3.items).toHaveLength(4);
    expect(page3.totalPages).toBe(3);

    const seen = [...page1.items, ...page2.items, ...page3.items].map((c) => c.id);
    expect(new Set(seen).size).toBe(24);
  });
});
