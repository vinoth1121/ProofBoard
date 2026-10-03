/**
 * Seeded mock dataset.
 *
 * Everything below is derived from a fixed integer seed and a fixed anchor
 * date, so the data is byte-identical on every reload, in every browser, and
 * for every visitor — which matters because the product pitch is "shareable
 * views". The only mutable state is the flag-override map (session lifetime).
 */

import { mockApiConfig } from './config';
import { createRng } from '../lib/rng';
import type { Campaign, CampaignStatus, Play, PlayStatus } from '../lib/types';

/** Fixed reference point for the generated universe. */
export const ANCHOR_ISO = '2026-10-01T00:00:00.000Z';
const ANCHOR = new Date(ANCHOR_ISO).getTime();
const DAY_MS = 86_400_000;

/** Flip to 0 in tests to make the API deterministic. */
export const PAGE_SIZE = 6;

const ADVERTISERS = [
  'Aperture Coffee',
  'Northwind Rail',
  'Halcyon Telco',
  'Meridian Bank',
  'Volt & Vale',
  'Cobalt Insurance',
  'Fjord Athletic',
  'Lantern Optics',
  'Sable Brewing',
  'Orbit Streaming',
  'Verdant Grocers',
  'Kestrel Airways',
  'Indigo Studios',
  'Brass & Bell',
  'Pallas Fitness',
  'Solstice Energy',
] as const;

const PRODUCT_SUFFIX = [
  'OOH — Q4 Awareness',
  'OOH — Transit Takeover',
  'OOH — Billboard Burst',
  'OOH — Airport Domination',
  'OOH — Retail Wrap',
  'OOH — Stadium Loop',
  'OOH — Commuter Raster',
  'OOH — Waterfront Series',
] as const;

const CITIES = [
  'Amsterdam',
  'Austin',
  'Berlin',
  'Chicago',
  'Copenhagen',
  'Dublin',
  'Lisbon',
  'London',
  'Melbourne',
  'Montréal',
  'Oslo',
  'Portland',
  'Seoul',
  'Singapore',
  'Toronto',
  'Vancouver',
] as const;

const SCREEN_PREFIX = ['HARBOUR', 'MERIDIAN', 'NORTHGATE', 'QUARRY', 'STATION', 'CANAL'] as const;
const SCREEN_FORM = [
  'Digital 48-sheet',
  'LED Ribbon',
  'Transit Panel',
  'Video Wall',
  'Billboard Pro',
] as const;
const ZONES = ['Level 2', 'Concourse', 'Junction', 'Quay', 'Bridge', 'Ring Road'] as const;

/** Global screen inventory. Campaigns draw from it so screen IDs stay coherent. */
interface Screen {
  readonly id: string;
  readonly name: string;
  readonly city: string;
}

function buildScreens(): Screen[] {
  const rng = createRng(0x5c_4e_e5);
  const screens: Screen[] = [];
  let n = 0;
  for (const city of CITIES) {
    const count = rng.int(3, 5);
    for (let i = 0; i < count; i += 1) {
      n += 1;
      screens.push({
        id: `SHD-${pad(n, 4)}`,
        name: `${rng.pick(SCREEN_PREFIX)} ${rng.pick(SCREEN_FORM)} · ${rng.pick(ZONES)}`,
        city,
      });
    }
  }
  return screens;
}

function pad(value: number, width: number): string {
  return value.toString().padStart(width, '0');
}

function isoDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export const SCREENS: readonly Screen[] = buildScreens();

function buildCampaigns(): Campaign[] {
  const rng = createRng(0xb0_0a_24);
  const campaigns: Campaign[] = [];

  for (let i = 0; i < 24; i += 1) {
    const advertiser = ADVERTISERS[i % ADVERTISERS.length] ?? 'Unknown Advertiser';
    const suffix =
      PRODUCT_SUFFIX[Math.floor(i / ADVERTISERS.length) % PRODUCT_SUFFIX.length] ?? 'OOH';
    const city = CITIES[rng.int(0, CITIES.length - 1)] ?? 'London';

    // Status is derived from position on the calendar rather than picked at
    // random, so flight dates and status can never contradict each other.
    const bucket = i % 3;
    const status: CampaignStatus = bucket === 0 ? 'live' : bucket === 1 ? 'scheduled' : 'ended';

    let startMs: number;
    let endMs: number;
    if (status === 'live') {
      startMs = ANCHOR - rng.int(6, 70) * DAY_MS;
      endMs = ANCHOR + rng.int(4, 80) * DAY_MS;
    } else if (status === 'scheduled') {
      startMs = ANCHOR + rng.int(3, 60) * DAY_MS;
      endMs = startMs + rng.int(14, 70) * DAY_MS;
    } else {
      startMs = ANCHOR - rng.int(120, 260) * DAY_MS;
      endMs = startMs + rng.int(20, 90) * DAY_MS;
    }
    // Anchor the whole universe on a midnight boundary so flights read as
    // whole days rather than half-days.
    startMs -= startMs % DAY_MS;
    endMs -= endMs % DAY_MS;

    const screenCount = rng.int(4, 12);
    // A campaign that has not started yet has, by definition, no proof of play.
    const delivered = status === 'scheduled' ? 0 : rng.int(18, 62);
    const booked = delivered + (status === 'scheduled' ? rng.int(24, 60) : rng.int(2, 9));

    campaigns.push({
      id: `c-${pad(i + 1, 3)}`,
      name: `${advertiser} ${suffix}`,
      advertiser,
      city,
      status,
      startDate: isoDate(startMs),
      endDate: isoDate(endMs),
      bookedPlays: booked,
      deliveredPlays: delivered,
      screenCount,
      creativeHue: rng.int(0, 359),
      creativeCode: `CR-${rng.int(1000, 9999)}`,
    });
  }

  return campaigns;
}

export const CAMPAIGNS: readonly Campaign[] = buildCampaigns();

function buildPlays(campaign: Campaign): Play[] {
  const rng = createRng(hashSeed(campaign.id));
  const cityScreens = SCREENS.filter((s) => s.city === campaign.city);
  const pool = cityScreens.length > 0 ? cityScreens : [...SCREENS];
  const span = Math.min(campaign.deliveredPlays, 64);
  const startMs = new Date(`${campaign.startDate}T00:00:00.000Z`).getTime();
  const hardEndMs = new Date(`${campaign.endDate}T23:59:59.000Z`).getTime();
  const windowStart = startMs;
  const windowEnd = Math.min(hardEndMs, ANCHOR);
  // Nothing can be captured before the campaign starts or after it ends; a
  // flight that has not opened yet yields an empty log.
  if (windowEnd <= windowStart) return [];
  const windowSize = windowEnd - windowStart;

  const plays: Play[] = [];
  for (let i = 0; i < span; i += 1) {
    const screen = rng.pick(pool);
    const offset = rng.int(0, Math.floor(windowSize / 1000));
    const secondsInDay = rng.pick([6, 7, 8, 9, 12, 13, 17, 18, 19, 20, 21, 22]);
    const playedMs = Math.min(windowStart + offset * 1000 + secondsInDay * 3_600_000, windowEnd);
    const roll = rng.next();
    const status: PlayStatus = roll < 0.05 ? 'flagged' : roll < 0.12 ? 'unverified' : 'verified';
    plays.push({
      id: `${campaign.id}-p${pad(i + 1, 3)}`,
      campaignId: campaign.id,
      screenId: screen.id,
      screenName: screen.name,
      playedAt: new Date(playedMs).toISOString(),
      durationSec: rng.pick([15, 20, 30, 30, 45, 60]),
      status,
      footfall: rng.int(0, 240),
      spotCode: `${campaign.creativeCode}-S${rng.int(1, 6)}`,
      creativeHue: (campaign.creativeHue + rng.int(-14, 14) + 360) % 360,
    });
  }

  return plays.sort((a, b) => b.playedAt.localeCompare(a.playedAt));
}

function hashSeed(input: string): number {
  let h = 0x811c_9dc5;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x0100_0193);
  }
  return h >>> 0;
}

/** campaignId -> plays (newest first) */
export const PLAYS_BY_CAMPAIGN: ReadonlyMap<string, readonly Play[]> = new Map(
  CAMPAIGNS.map((c) => [c.id, buildPlays(c)] as const),
);

/** Mutable session state: user-flagged plays, applied on top of seed data. */
const flaggedOverrides = new Map<string, string>();

export function applyFlagOverride(playId: string): Play | undefined {
  const stampedAt = flaggedOverrides.get(playId);
  if (stampedAt === undefined) return undefined;
  for (const plays of PLAYS_BY_CAMPAIGN.values()) {
    const match = plays.find((p) => p.id === playId);
    if (match)
      return {
        ...match,
        status: 'flagged',
        playedAt: match.playedAt,
        durationSec: match.durationSec,
      };
  }
  return undefined;
}

export function isFlagged(playId: string): boolean {
  return flaggedOverrides.has(playId);
}

export function stampFlag(playId: string): void {
  flaggedOverrides.set(playId, new Date().toISOString());
}

export function getPlay(playId: string): Play | undefined {
  const override = applyFlagOverride(playId);
  if (override) return override;
  for (const plays of PLAYS_BY_CAMPAIGN.values()) {
    const match = plays.find((p) => p.id === playId);
    if (match) return match;
  }
  return undefined;
}

export function getCampaign(id: string): Campaign | undefined {
  return CAMPAIGNS.find((c) => c.id === id);
}

export function allPlaysFor(campaignId: string): Play[] {
  const seeded = PLAYS_BY_CAMPAIGN.get(campaignId) ?? [];
  return seeded.map((p) => (flaggedOverrides.has(p.id) ? { ...p, status: 'flagged' } : p));
}

/** Total plays in the universe — asserted in tests to stay above 400. */
export const TOTAL_PLAYS: number = [...PLAYS_BY_CAMPAIGN.values()].reduce(
  (sum, plays) => sum + plays.length,
  0,
);

/**
 * Artificial latency + failure injection, used to prove the UI's loading and
 * error paths. Reads the live mock config, and uses a dedicated RNG so that
 * neither affects the seed data.
 */
const chaos = createRng(0xf4_11_000);

export function nextLatencyMs(): number {
  const { latencyMinMs, latencyMaxMs } = mockApiConfig;
  if (latencyMaxMs <= latencyMinMs) return latencyMinMs;
  return chaos.int(latencyMinMs, latencyMaxMs);
}

export function shouldFail(): boolean {
  return chaos.chance(mockApiConfig.failureRate);
}

export function totalCampaignCount(): number {
  return CAMPAIGNS.length;
}
