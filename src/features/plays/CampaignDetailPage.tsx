import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { BlueprintSheet, DimensionLine, TitleBlock } from '../../components/Blueprint';
import { PlayTableSkeleton, StatsSkeleton, FilmStripSkeleton } from '../../components/Skeleton';
import { BlueprintButton, EmptyState, ErrorState } from '../../components/States';
import { CampaignStatusTag } from '../../components/Tag';
import { usePlays } from '../../hooks/usePlays';
import { useRequest } from '../../hooks/useRequest';
import { fetchCampaign } from '../../lib/api';
import type { CampaignDetail } from '../../lib/api';
import { formatCount, formatDayMonth, formatSpanDays } from '../../lib/format';
import { CampaignNotFound } from './DetailStates';
import { DateRangeFilter } from './DateRangeFilter';
import { FilmStripTimeline } from './FilmStripTimeline';
import { PlayTable } from './PlayTable';
import { ProofModal } from './ProofModal';
import { StatsHeader } from './StatsHeader';
import styles from './plays.module.css';

/** Read `from` / `to` out of the query string; invalid values are ignored. */
function parseRange(params: URLSearchParams): { from: string | null; to: string | null } {
  const from = params.get('from');
  const to = params.get('to');
  const isIso = (value: string | null): value is string =>
    value !== null && !Number.isNaN(new Date(value).getTime());
  return { from: isIso(from) ? from : null, to: isIso(to) ? to : null };
}

/**
 * Campaign detail — the proof-of-play workspace. Split into its own chunk via
 * React.lazy in the router, because it is the heaviest view by far.
 */
export default function CampaignDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const range = useMemo(() => parseRange(searchParams), [searchParams]);

  const campaignRequest = useRequest<CampaignDetail>(
    useCallback((signal: AbortSignal) => fetchCampaign(id, signal), [id]),
    id,
    { enabled: id !== '' },
  );
  const campaign = campaignRequest.data;

  const playsRequest = usePlays({
    campaignId: id,
    from: range.from,
    to: range.to,
  });

  const [modalIndex, setModalIndex] = useState<number | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const plays = useMemo(() => playsRequest.data?.items ?? [], [playsRequest.data]);

  const rangeActive = range.from !== null || range.to !== null;

  const setRange = useCallback(
    (next: { from: string | null; to: string | null }) => {
      const params = new URLSearchParams(searchParams);
      if (next.from === null) params.delete('from');
      else params.set('from', next.from);
      if (next.to === null) params.delete('to');
      else params.set('to', next.to);
      // Range changes are refinements of the current view: replace, don't push.
      setSearchParams(params, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  // Close the modal if the underlying play list changes underneath it.
  useEffect(() => {
    if (modalIndex !== null && modalIndex > plays.length - 1) setModalIndex(null);
  }, [modalIndex, plays.length]);

  if (id === '' || (campaignRequest.status === 'error' && campaignRequest.error?.status === 404)) {
    return (
      <div className={styles.page}>
        <CampaignNotFound id={id} />
      </div>
    );
  }

  if (campaignRequest.error !== null && campaign === null) {
    return (
      <div className={styles.page}>
        <Link to="/campaigns" className={styles.backLink}>
          ← All campaigns
        </Link>
        <BlueprintSheet>
          <ErrorState
            title="Campaign sheet unavailable"
            message={campaignRequest.error.message}
            code={`${campaignRequest.error.code} · ${campaignRequest.error.status || 'no status'}`}
            onRetry={campaignRequest.reload}
          />
        </BlueprintSheet>
      </div>
    );
  }

  if (campaign === null) {
    return (
      <div className={styles.page}>
        <Link to="/campaigns" className={styles.backLink}>
          ← All campaigns
        </Link>
        <BlueprintSheet>
          <div className={styles.headMain}>
            <span className={styles.campaignId}>{id.toUpperCase()}</span>
            <h1 className={styles.campaignName}>Loading campaign…</h1>
            <StatsSkeleton />
          </div>
        </BlueprintSheet>
      </div>
    );
  }

  const stats = playsRequest.data?.stats;
  const firstPlay = plays[0];
  const lastPlay = plays[plays.length - 1];

  const windowLabel =
    firstPlay !== undefined && lastPlay !== undefined
      ? `${formatDayMonth(lastPlay.playedAt)} → ${formatDayMonth(firstPlay.playedAt)}`
      : 'No frames in window';

  return (
    <div className={styles.page}>
      <Link to="/campaigns" className={styles.backLink}>
        ← All campaigns
      </Link>

      <div className={styles.headGrid}>
        <BlueprintSheet className={styles.headMain} tone="raised">
          <div className={styles.headEyebrow}>
            <span className={styles.campaignId}>{campaign.id.toUpperCase()}</span>
            <CampaignStatusTag status={campaign.status} />
          </div>
          <h1 className={styles.campaignName}>{campaign.name}</h1>
          <p className={styles.headMeta}>
            <span>
              City <b>{campaign.city}</b>
            </span>
            <span>
              Screens <b>{campaign.screenCount}</b>
            </span>
            <span>
              Creative <b>{campaign.creativeCode}</b>
            </span>
            <span>
              Flight <b>{formatSpanDays(campaign.startDate, campaign.endDate)}</b>
            </span>
          </p>
          <DimensionLine
            label={`${formatDayMonth(campaign.startDate)} → ${formatDayMonth(campaign.endDate)}`}
            over="sheet-raised"
          />
        </BlueprintSheet>

        {stats !== undefined ? <StatsHeader stats={stats} /> : <StatsSkeleton />}
      </div>

      <BlueprintSheet tone="inset">
        <DateRangeFilter
          from={range.from}
          to={range.to}
          flightStart={campaign.startDate}
          flightEnd={campaign.endDate}
          isActive={rangeActive}
          onChange={setRange}
        />
      </BlueprintSheet>

      <BlueprintSheet>
        {playsRequest.isPending ? (
          <FilmStripSkeleton />
        ) : (
          <FilmStripTimeline
            plays={plays}
            activeIndex={Math.min(activeIndex, Math.max(0, plays.length - 1))}
            onSelect={(index) => {
              setActiveIndex(index);
              setModalIndex(index);
            }}
            caption={`${formatCount(plays.length)} ${plays.length === 1 ? 'frame' : 'frames'} · ${windowLabel}`}
          />
        )}
      </BlueprintSheet>

      {playsRequest.error !== null && playsRequest.data === null ? (
        <BlueprintSheet>
          <ErrorState
            title="Play log did not load"
            message={`${playsRequest.error.message} The list endpoint fails intermittently on purpose so this path is never theoretical — retry, and it will come back.`}
            code={`${playsRequest.error.code} · ${playsRequest.error.status || 'no status'}`}
            onRetry={playsRequest.reload}
          />
        </BlueprintSheet>
      ) : null}

      {playsRequest.data !== null && plays.length === 0 ? (
        <BlueprintSheet>
          <EmptyState
            variant="range"
            title="No plays in this window"
            message="Nothing was captured between these dates. Widen the range, or go back to the full flight."
            action={
              rangeActive ? (
                <BlueprintButton onClick={() => setRange({ from: null, to: null })}>
                  Show full flight
                </BlueprintButton>
              ) : undefined
            }
          />
        </BlueprintSheet>
      ) : null}

      {plays.length > 0 ? (
        <BlueprintSheet>
          <TitleBlock
            title="Play log"
            meta={`${formatCount(plays.length)} records in window`}
            headingLevel={2}
          />
          {playsRequest.isRefreshing ? (
            <div className={styles.tableStale}>
              <PlayTableSkeleton rows={6} />
            </div>
          ) : (
            <PlayTable
              plays={plays}
              pendingFlags={playsRequest.pendingFlags}
              onOpenProof={(index) => {
                setActiveIndex(index);
                setModalIndex(index);
              }}
              onFlag={playsRequest.flagPlay}
            />
          )}
        </BlueprintSheet>
      ) : null}

      {playsRequest.flagErrors.size > 0 ? (
        <div className={styles.flagToast} role="alert">
          <span aria-hidden="true">⚠</span>
          <span className={styles.flagToastMessage}>
            {(() => {
              const [first] = [...playsRequest.flagErrors.values()];
              const count = playsRequest.flagErrors.size;
              return `${count === 1 ? 'Flag was' : `${count} flags were`} rolled back — ${
                first ?? 'the registry rejected the write'
              }`;
            })()}
          </span>
          <BlueprintButton variant="ghost" onClick={playsRequest.reload}>
            Reload plays
          </BlueprintButton>
          <BlueprintButton
            variant="ghost"
            onClick={() => {
              for (const playId of playsRequest.flagErrors.keys())
                playsRequest.clearFlagError(playId);
            }}
          >
            Dismiss
          </BlueprintButton>
        </div>
      ) : null}

      {modalIndex !== null ? (
        <ProofModal
          plays={plays}
          index={modalIndex}
          campaignName={campaign.name}
          onIndexChange={setModalIndex}
          onClose={() => setModalIndex(null)}
          pendingFlags={playsRequest.pendingFlags}
          onFlag={playsRequest.flagPlay}
        />
      ) : null}
    </div>
  );
}
