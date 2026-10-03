import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '../lib/api';

export type RequestStatus = 'idle' | 'loading' | 'success' | 'error';

export interface RequestState<T> {
  readonly data: T | null;
  readonly error: ApiError | null;
  readonly status: RequestStatus;
  /** First load: nothing to show yet, render a skeleton. */
  readonly isPending: boolean;
  /** Background reload: keep showing stale data, dim the view. */
  readonly isRefreshing: boolean;
  readonly reload: () => void;
  /** Locally patch the cached value — the basis for optimistic updates. */
  readonly mutate: (updater: (current: T | null) => T | null) => void;
}

/**
 * Minimal data-fetching hook: aborts stale requests, ignores out-of-order
 * responses, and exposes `isPending` vs `isRefreshing` so the UI can tell a
 * first load apart from a filter change.
 *
 * `key` must change whenever the request should be re-issued; it is compared
 * by value, so callers can pass a template string built from the filters.
 */
export function useRequest<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  key: string,
  { enabled = true }: { enabled?: boolean } = {},
): RequestState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [status, setStatus] = useState<RequestStatus>(enabled ? 'loading' : 'idle');
  const [nonce, setNonce] = useState(0);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  // Monotonic id: only the newest request may commit to state.
  const seqRef = useRef(0);

  useEffect(() => {
    if (!enabled) {
      setStatus('idle');
      return;
    }

    const seq = seqRef.current + 1;
    seqRef.current = seq;
    const controller = new AbortController();

    setStatus((prev) => (prev === 'success' ? 'success' : 'loading'));

    fetcherRef
      .current(controller.signal)
      .then((result) => {
        if (seqRef.current !== seq || controller.signal.aborted) return;
        setData(result);
        setError(null);
        setStatus('success');
      })
      .catch((cause: unknown) => {
        if (seqRef.current !== seq || controller.signal.aborted) return;
        setError(
          cause instanceof ApiError
            ? cause
            : new ApiError(cause instanceof Error ? cause.message : 'Unknown error', 0, 'unknown'),
        );
        setStatus('error');
      });

    return () => {
      controller.abort();
    };
  }, [key, nonce, enabled]);

  const reload = useCallback(() => {
    setNonce((n) => n + 1);
  }, []);

  const mutate = useCallback((updater: (current: T | null) => T | null) => {
    setData((current) => updater(current));
  }, []);

  return {
    data,
    error,
    status,
    isPending: status === 'loading' && data === null,
    isRefreshing: status === 'loading' && data !== null,
    reload,
    mutate,
  };
}
