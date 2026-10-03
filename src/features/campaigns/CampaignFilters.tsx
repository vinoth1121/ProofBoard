import type { ReactNode } from 'react';
import type { CampaignListFacets, CampaignSortKey, CampaignStatus } from '../../lib/types';
import type { CampaignFiltersController } from './useCampaignFilters';
import styles from './campaigns.module.css';

const STATUS_OPTIONS: readonly { value: CampaignStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'live', label: 'Live' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'ended', label: 'Ended' },
];

const SORT_OPTIONS: readonly { value: CampaignSortKey; label: string }[] = [
  { value: 'startDate', label: 'Start date' },
  { value: 'name', label: 'Campaign name' },
  { value: 'status', label: 'Status' },
  { value: 'bookedPlays', label: 'Booked plays' },
  { value: 'completion', label: 'Completion %' },
];

export interface CampaignFiltersProps {
  readonly controller: CampaignFiltersController;
  readonly facets: CampaignListFacets | null;
  /** Rendered in the summary line: "Showing 1–6 of 24". */
  readonly summary: ReactNode;
  readonly isRefreshing: boolean;
}

export function CampaignFilters({
  controller,
  facets,
  summary,
  isRefreshing,
}: CampaignFiltersProps) {
  const { filters, searchDraft } = controller;
  const counts = facets?.statusCounts;

  return (
    <div className={styles.filters} role="search" aria-label="Filter campaigns">
      <div className={styles.filterRow}>
        <div className={`${styles.field} ${styles.fieldGrow}`}>
          <label className={styles.label} htmlFor="campaign-search">
            Search
          </label>
          <div className={styles.searchField}>
            <span className={styles.searchIcon} aria-hidden="true">
              ⌕
            </span>
            <input
              id="campaign-search"
              className={`${styles.input} ${styles.searchInput}`}
              type="search"
              value={searchDraft}
              placeholder="Advertiser, campaign, city or id…"
              autoComplete="off"
              spellCheck={false}
              onChange={(event) => controller.onSearchChange(event.target.value)}
            />
          </div>
        </div>

        <div className={styles.field}>
          <span className={styles.label} id="status-filter-label">
            Status
          </span>
          <div
            className={styles.segmented}
            role="group"
            aria-labelledby="status-filter-label"
            aria-busy={isRefreshing}
          >
            {STATUS_OPTIONS.map((option) => {
              const active = filters.status === option.value;
              const count = counts?.[option.value as CampaignStatus];
              return (
                <button
                  key={option.value}
                  type="button"
                  className={`${styles.segment} ${active ? styles.segmentActive : ''}`}
                  aria-pressed={active}
                  onClick={() => controller.setStatus(option.value)}
                >
                  {option.label}
                  {count !== undefined ? (
                    <span className={styles.segmentCount}>{count}</span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="city-filter">
            City
          </label>
          <select
            id="city-filter"
            className={styles.select}
            value={filters.city}
            onChange={(event) => controller.setCity(event.target.value)}
          >
            <option value="">All cities</option>
            {(facets?.cities ?? []).map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="sort-filter">
            Sort by
          </label>
          <div className={styles.sortGroup}>
            <select
              id="sort-filter"
              className={styles.select}
              value={filters.sort}
              onChange={(event) => controller.setSort(event.target.value as CampaignSortKey)}
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              className={styles.dirButton}
              onClick={controller.toggleDirection}
              aria-label={`Sort ${filters.dir === 'asc' ? 'ascending' : 'descending'}. Switch direction.`}
              title={`Currently ${filters.dir === 'asc' ? 'ascending' : 'descending'}`}
            >
              {filters.dir === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>
      </div>

      <div className={styles.filterSummary}>
        <p className={styles.summaryText} aria-live="polite" data-testid="result-summary">
          {summary}
        </p>
        {!controller.isPristine ? (
          <button type="button" className={styles.linkButton} onClick={controller.resetAll}>
            Clear all filters
          </button>
        ) : null}
      </div>
    </div>
  );
}
