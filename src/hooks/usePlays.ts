import { useCallback, useRef, useState } from 'react';
import { fetchPlays, flagPlay as postFlagPlay } from '../lib/api';
import { statsFor } from '../lib/filters';
import type { PlaysResponse } from '../lib/types';
import { useRequest } from './useRequest';
import type { RequestState } from './useRequest';

export interface PlaysQuery {
  readonly campaignId: string;
  /** Inclusive ISO timestamp lower bound, or null for "from the start". */
  readonly from: string | null;
  /** Inclusive ISO timestamp upper bound, or null for "until the end". */
  readonly to: string | null;
}

export interface PlaysState extends RequestState<PlaysResponse> {
  /** Optimistically mark a play as suspicious; rolls back if the write fails. */
  readonly flagPlay: (playId: string) => void;
  /** Play ids whose flag write is still in flight. */
  readonly pendingFlags: ReadonlySet<string>;
  /** playId -> human-readable failure message from the last rollback. */
  readonly flagErrors: ReadonlyMap<string, string>;
  readonly clearFlagError: (playId: string) => void;
}

function applyFlagLocally(payload: PlaysResponse, playId: string): PlaysResponse {
  let touched = false;
  const items = payload.items.map((play) => {
    if (play.id !== playId || play.status === 'flagged') return play;
    touched = true;
    return { ...play, status: 'flagged' as const };
  });
  if (!touched) return payload;
  // Recompute rather than increment so the header stats never drift from the
  // rows on screen, whichever way the flag landed.
  return { ...payload, items, stats: statsFor(items, payload.stats.booked) };
}

export function usePlays({ campaignId, from, to }: PlaysQuery): PlaysState {
  const qs = new URLSearchParams();
  if (from !== null) qs.set('from', from);
  if (to !== null) qs.set('to', to);
  const query = qs.toString();

  const fetcher = useCallback(
    (signal: AbortSignal) => fetchPlays(campaignId, { from, to }, signal),
    [campaignId, from, to],
  );

  const request = useRequest<PlaysResponse>(fetcher, `${campaignId}|${query}`);

  const [pendingFlags, setPendingFlags] = useState<ReadonlySet<string>>(new Set());
  const [flagErrors, setFlagErrors] = useState<ReadonlyMap<string, string>>(new Map());

  // Snapshot for rollback, keyed by playId, so an out-of-order failure cannot
  // restore stale data over a newer flag.
  const snapshots = useRef(new Map<string, PlaysResponse | null>());

  const flagPlay = useCallback(
    (playId: string) => {
      if (pendingFlags.has(playId)) return;

      snapshots.current.set(playId, request.data);
      setPendingFlags((prev) => new Set(prev).add(playId));
      setFlagErrors((prev) => {
        if (!prev.has(playId)) return prev;
        const next = new Map(prev);
        next.delete(playId);
        return next;
      });

      // Optimistic: paint the flag immediately, no waiting on the network.
      request.mutate((current) => (current === null ? null : applyFlagLocally(current, playId)));

      postFlagPlay(campaignId, playId)
        .then(() => {
          snapshots.current.delete(playId);
          setPendingFlags((prev) => {
            const next = new Set(prev);
            next.delete(playId);
            return next;
          });
        })
        .catch((cause: unknown) => {
          // Rollback to the exact snapshot taken before the optimistic write.
          const snapshot = snapshots.current.get(playId) ?? null;
          snapshots.current.delete(playId);
          request.mutate(() => snapshot);

          setPendingFlags((prev) => {
            const next = new Set(prev);
            next.delete(playId);
            return next;
          });
          setFlagErrors((prev) => {
            const next = new Map(prev);
            next.set(playId, cause instanceof Error ? cause.message : 'Could not flag this play.');
            return next;
          });
        });
    },
    [campaignId, pendingFlags, request],
  );

  const clearFlagError = useCallback((playId: string) => {
    setFlagErrors((prev) => {
      if (!prev.has(playId)) return prev;
      const next = new Map(prev);
      next.delete(playId);
      return next;
    });
  }, []);

  return { ...request, flagPlay, pendingFlags, flagErrors, clearFlagError };
}
