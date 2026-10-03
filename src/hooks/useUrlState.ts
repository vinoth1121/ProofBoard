import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Two-way binding between component state and the URL query string.
 *
 * Every list view in ProofBoard keeps its filter state here, so the address
 * bar is the single source of truth: back/forward buttons move between filter
 * states, and any view can be copied out of the address bar and shared.
 */

export interface UrlStateOptions {
  /** Push a history entry (default) instead of replacing the current one. */
  readonly replace?: boolean;
}

export interface UrlState<T> {
  /** Current parsed value. */
  readonly value: T;
  /** Merge a patch into the URL, leaving untouched keys alone. */
  readonly set: (patch: Partial<T>, options?: UrlStateOptions) => void;
  /** Restore the serializer's default (empty) query string. */
  readonly reset: (options?: UrlStateOptions) => void;
  /** Raw params, for building links that preserve current state. */
  readonly params: URLSearchParams;
  /** True when the query string carries no meaningful state. */
  readonly isPristine: boolean;
}

export function useUrlState<T>(
  parse: (params: URLSearchParams) => T,
  serialize: (value: T) => URLSearchParams,
): UrlState<T> {
  const [searchParams, setSearchParams] = useSearchParams();

  // `searchParams.toString()` is the identity of the URL state; depending on
  // the object itself would re-parse on every router render.
  const queryString = searchParams.toString();

  const value = useMemo<T>(() => parse(new URLSearchParams(queryString)), [parse, queryString]);

  const set = useCallback(
    (patch: Partial<T>, options?: UrlStateOptions) => {
      const current = parse(new URLSearchParams(queryString));
      const next = { ...current, ...patch };
      setSearchParams(serialize(next), { replace: options?.replace ?? false });
    },
    [parse, queryString, serialize, setSearchParams],
  );

  const reset = useCallback(
    (options?: UrlStateOptions) => {
      setSearchParams(new URLSearchParams(), { replace: options?.replace ?? false });
    },
    [setSearchParams],
  );

  return {
    value,
    set,
    reset,
    params: searchParams,
    isPristine: queryString === '',
  };
}
