import { BlueprintSheet, DimensionLine } from '../../components/Blueprint';
import { CampaignGridSkeleton } from '../../components/Skeleton';
import { BlueprintButton, EmptyState, ErrorState } from '../../components/States';
import { useCampaigns } from '../../hooks/useCampaigns';
import { formatCount, formatPercent } from '../../lib/format';
import { CampaignCard } from './CampaignCard';
import { CampaignFilters } from './CampaignFilters';
import { Pagination } from './Pagination';
import { useCampaignFilters } from './useCampaignFilters';
import styles from './campaigns.module.css';

/**
 * Campaign list — the "sheet index". All filter state lives in the query
 * string, so the address bar is the state and every view is shareable.
 */
export default function CampaignListPage() {
  const controller = useCampaignFilters();
  const { filters } = controller;
  const { data, error, isPending, isRefreshing, reload } = useCampaigns(filters);

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const page = data?.page ?? filters.page;
  const totalPages = data?.totalPages ?? 1;
  const pageSize = data?.pageSize ?? 6;

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = total === 0 ? 0 : Math.min(page * pageSize, total);

  const summary =
    error !== null && data === null ? (
      'Request failed — showing nothing'
    ) : (
      <>
        Showing <b>{formatCount(from)}</b>–<b>{formatCount(to)}</b> of <b>{formatCount(total)}</b>{' '}
        matching{isRefreshing ? ' · updating' : ''}
      </>
    );

  return (
    <div className={styles.page}>
      <div className={styles.pageHead}>
        <div>
          <h1 className={styles.pageTitle}>Campaign index</h1>
          <p className={styles.pageLede}>
            Every outdoor booking in the network, with the number of plays actually delivered
            against what was booked. Open a campaign to inspect its proof-of-play timeline.
          </p>
        </div>
        <div className={styles.pageStats}>
          <div className={styles.pageStat}>
            <span className={styles.pageStatValue}>
              {formatCount(data?.facets.totalCampaigns ?? 0)}
            </span>
            <span className={styles.pageStatLabel}>Campaigns</span>
          </div>
          <div className={styles.pageStat}>
            <span className={styles.pageStatValue}>
              {formatCount(data?.facets.statusCounts.live ?? 0)}
            </span>
            <span className={styles.pageStatLabel}>Live now</span>
          </div>
          <div className={styles.pageStat}>
            <span className={styles.pageStatValue}>
              {formatCount(data?.facets.cities.length ?? 0)}
            </span>
            <span className={styles.pageStatLabel}>Cities</span>
          </div>
        </div>
      </div>

      <BlueprintSheet tone="inset">
        <CampaignFilters
          controller={controller}
          facets={data?.facets ?? null}
          summary={summary}
          isRefreshing={isRefreshing}
        />
      </BlueprintSheet>

      {isPending ? <CampaignGridSkeleton count={pageSize} /> : null}

      {error !== null && data === null ? (
        <BlueprintSheet>
          <ErrorState
            title="Campaign index unavailable"
            message={error.message}
            code={`${error.code} · ${error.status || 'no status'}`}
            onRetry={reload}
            secondary={
              !controller.isPristine ? (
                <BlueprintButton variant="ghost" onClick={controller.resetAll}>
                  Clear filters
                </BlueprintButton>
              ) : undefined
            }
          />
        </BlueprintSheet>
      ) : null}

      {data !== null && total === 0 ? (
        <BlueprintSheet>
          <EmptyState
            title="No campaigns match this filter"
            message={
              filters.query !== ''
                ? `Nothing in the index matches “${filters.query}” with the current status and city filters.`
                : 'No campaigns in the index match the current status and city filters.'
            }
            action={
              <BlueprintButton onClick={controller.resetAll}>Reset all filters</BlueprintButton>
            }
          />
        </BlueprintSheet>
      ) : null}

      {data !== null && total > 0 ? (
        <>
          <DimensionLine label={`${formatPercent(total)} campaigns plotted`} />
          <div
            className={`${styles.grid} ${isRefreshing ? styles.gridStale : ''}`}
            aria-busy={isRefreshing}
          >
            {items.map((campaign) => (
              <CampaignCard key={campaign.id} campaign={campaign} />
            ))}
          </div>
          <BlueprintSheet tone="inset">
            <Pagination
              page={page}
              totalPages={totalPages}
              total={total}
              pageSize={pageSize}
              shown={items.length}
              onChange={controller.goToPage}
            />
          </BlueprintSheet>
        </>
      ) : null}
    </div>
  );
}
