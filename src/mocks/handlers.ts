/**
 * MSW REST handlers.
 *
 * This is the only "backend" in ProofBoard — it runs inside the browser in
 * every environment (dev, preview and the deployed production build), which is
 * why the live demo works with no server at all.
 */

import { HttpResponse, delay } from 'msw';
import { http } from 'msw';
import {
  CAMPAIGNS,
  PAGE_SIZE,
  allPlaysFor,
  applyFlagOverride,
  getCampaign,
  getPlay,
  nextLatencyMs,
  shouldFail,
  stampFlag,
} from './db';
import {
  facetsFor,
  filterAndSort,
  paginate,
  parseFilters,
  playsInRange,
  statsFor,
} from '../lib/filters';
import type {
  ApiErrorBody,
  CampaignListResponse,
  FlagPlayResponse,
  PlaysResponse,
} from '../lib/types';

const API = '/api';

function badRequest(message: string, error = 'bad_request') {
  return HttpResponse.json<ApiErrorBody>({ error, message }, { status: 400 });
}

function serverError(message: string) {
  return HttpResponse.json<ApiErrorBody>({ error: 'internal_error', message }, { status: 500 });
}

function notFound(message: string) {
  return HttpResponse.json<ApiErrorBody>({ error: 'not_found', message }, { status: 404 });
}

export const handlers = [
  /** GET /api/campaigns?query=&status=&city=&sort=&page= */
  http.get(`${API}/campaigns`, async ({ request }) => {
    await delay(nextLatencyMs());

    const url = new URL(request.url);
    const filters = parseFilters(url.searchParams);
    const pageSizeRaw = Number.parseInt(url.searchParams.get('pageSize') ?? '', 10);
    const pageSize =
      Number.isFinite(pageSizeRaw) && pageSizeRaw > 0 ? Math.min(48, pageSizeRaw) : PAGE_SIZE;

    const matched = filterAndSort(CAMPAIGNS, filters);
    const page = paginate(matched, filters.page, pageSize);

    const body: CampaignListResponse = {
      items: page.items,
      page: page.page,
      pageSize: page.pageSize,
      total: page.total,
      totalPages: page.totalPages,
      facets: facetsFor(CAMPAIGNS),
    };
    return HttpResponse.json(body);
  }),

  /** GET /api/campaigns/:id */
  http.get(`${API}/campaigns/:id`, async ({ params }) => {
    await delay(nextLatencyMs());
    const campaign = getCampaign(String(params.id));
    if (!campaign) return notFound(`No campaign with id "${String(params.id)}".`);
    const plays = allPlaysFor(campaign.id);
    return HttpResponse.json({
      ...campaign,
      playsTotal: plays.length,
      stats: statsFor(plays, campaign.bookedPlays),
    });
  }),

  /** GET /api/campaigns/:id/plays?from=&to= — ~10% of requests fail on purpose. */
  http.get(`${API}/campaigns/:id/plays`, async ({ params, request }) => {
    await delay(nextLatencyMs());

    if (shouldFail()) {
      return serverError(
        'Screen registry timed out while reconciling play logs (simulated fault).',
      );
    }

    const id = String(params.id);
    const campaign = getCampaign(id);
    if (!campaign) return notFound(`No campaign with id "${id}".`);

    const url = new URL(request.url);
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    const plays = playsInRange(allPlaysFor(id), from, to);

    const body: PlaysResponse = {
      items: plays,
      total: plays.length,
      stats: statsFor(plays, campaign.bookedPlays),
    };
    return HttpResponse.json(body);
  }),

  /** POST /api/campaigns/:id/flag-play — powers the optimistic update demo. */
  http.post(`${API}/campaigns/:id/flag-play`, async ({ params, request }) => {
    await delay(nextLatencyMs());

    const campaignId = String(params.id);
    if (!getCampaign(campaignId)) return notFound(`No campaign with id "${campaignId}".`);

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return badRequest('Expected a JSON body with a playId.');
    }
    const playId =
      typeof payload === 'object' && payload !== null && 'playId' in payload
        ? String((payload as { playId: unknown }).playId)
        : '';

    if (playId === '') return badRequest('Field "playId" is required.');

    // Simulated write conflict: the flag endpoint is deliberately less
    // reliable than the reads so rollback is actually observable.
    if (shouldFail()) {
      return HttpResponse.json<ApiErrorBody>(
        {
          error: 'write_conflict',
          message: 'Screen registry rejected the flag (simulated fault).',
        },
        { status: 409 },
      );
    }

    const play = getPlay(playId) ?? applyFlagOverride(playId);
    if (!play || play.campaignId !== campaignId) {
      return notFound(`Play "${playId}" does not belong to campaign "${campaignId}".`);
    }

    stampFlag(playId);
    const body: FlagPlayResponse = {
      playId,
      status: 'flagged',
      flaggedAt: new Date().toISOString(),
    };
    return HttpResponse.json(body, { status: 201 });
  }),
];
