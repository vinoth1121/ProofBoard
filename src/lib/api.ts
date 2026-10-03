/** Thin typed fetch wrapper around the MSW-backed REST surface. */

import type {
  Campaign,
  CampaignListResponse,
  FlagPlayResponse,
  PlayStats,
  PlaysResponse,
} from './types';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

interface ErrorPayload {
  readonly error?: unknown;
  readonly message?: unknown;
}

/**
 * Whether this runtime's `fetch` accepts an `AbortSignal` produced by
 * `globalThis.AbortController`.
 *
 * They are normally the same realm, but not everywhere: under Vitest's jsdom
 * environment the controller is jsdom's while `fetch` is Node's undici, which
 * rejects a foreign signal outright. Probing once with the platform's own
 * `Request` keeps request cancellation working in browsers and degrades to
 * "no signal" — where the caller's abort guard still does its job — in
 * environments that cannot support it.
 */
const acceptsAbortSignal = ((): boolean => {
  try {
    const RequestCtor = globalThis.Request;
    if (typeof RequestCtor !== 'function') return false;
    const probe = new RequestCtor('http://localhost/', {
      signal: new AbortController().signal,
    });
    return probe.signal !== null;
  } catch {
    return false;
  }
})();

function withSignal(signal: AbortSignal | undefined): RequestInit {
  if (signal === undefined || !acceptsAbortSignal) return {};
  return { signal };
}

/**
 * Resolve API paths against the current origin.
 *
 * Same-origin absolute URLs keep MSW's fetch interceptor on the happy path in
 * every runtime: the browser worker matches on path, and under Node (tests) a
 * relative URL combined with an `AbortSignal` bypasses interception entirely.
 */
function apiUrl(path: string): string {
  if (typeof window === 'undefined' || window.location.origin === 'null') return path;
  return new URL(path, window.location.origin).toString();
}

async function readError(response: Response): Promise<ApiError> {
  let code = `http_${response.status}`;
  let message = `Request failed with status ${response.status}.`;
  try {
    const payload = (await response.json()) as ErrorPayload;
    if (typeof payload.error === 'string') code = payload.error;
    if (typeof payload.message === 'string' && payload.message !== '') message = payload.message;
  } catch {
    /* body was not JSON — keep the generic message */
  }
  return new ApiError(message, response.status, code);
}

async function request<T>(input: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(input, init);
  } catch (cause) {
    throw new ApiError(
      'Network unreachable — the play registry could not be contacted.',
      0,
      'network_error',
    );
  }
  if (!response.ok) throw await readError(response);
  return (await response.json()) as T;
}

export interface CampaignDetail extends Campaign {
  readonly playsTotal: number;
  readonly stats: PlayStats;
}

export async function fetchCampaigns(
  params: URLSearchParams,
  signal?: AbortSignal,
): Promise<CampaignListResponse> {
  const qs = params.toString();
  return request<CampaignListResponse>(
    apiUrl(`/api/campaigns${qs === '' ? '' : `?${qs}`}`),
    withSignal(signal),
  );
}

export async function fetchCampaign(id: string, signal?: AbortSignal): Promise<CampaignDetail> {
  return request<CampaignDetail>(
    apiUrl(`/api/campaigns/${encodeURIComponent(id)}`),
    withSignal(signal),
  );
}

export async function fetchPlays(
  id: string,
  range: { from: string | null; to: string | null },
  signal?: AbortSignal,
): Promise<PlaysResponse> {
  const params = new URLSearchParams();
  if (range.from !== null) params.set('from', range.from);
  if (range.to !== null) params.set('to', range.to);
  const qs = params.toString();
  return request<PlaysResponse>(
    apiUrl(`/api/campaigns/${encodeURIComponent(id)}/plays${qs === '' ? '' : `?${qs}`}`),
    withSignal(signal),
  );
}

export async function flagPlay(
  campaignId: string,
  playId: string,
  note?: string,
): Promise<FlagPlayResponse> {
  return request<FlagPlayResponse>(
    apiUrl(`/api/campaigns/${encodeURIComponent(campaignId)}/flag-play`),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playId, ...(note !== undefined ? { note } : {}) }),
    },
  );
}
