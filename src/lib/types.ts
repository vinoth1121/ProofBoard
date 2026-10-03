/** Domain types shared by the mock API, hooks and UI. */

export type CampaignStatus = 'live' | 'scheduled' | 'ended';

export type CampaignSortKey = 'name' | 'status' | 'startDate' | 'bookedPlays' | 'completion';

export type SortDirection = 'asc' | 'desc';

export type PlayStatus = 'verified' | 'unverified' | 'flagged';

export interface Campaign {
  readonly id: string;
  readonly name: string;
  readonly advertiser: string;
  readonly city: string;
  readonly status: CampaignStatus;
  /** ISO-8601 date (yyyy-mm-dd). */
  readonly startDate: string;
  /** ISO-8601 date (yyyy-mm-dd). */
  readonly endDate: string;
  readonly bookedPlays: number;
  readonly deliveredPlays: number;
  readonly screenCount: number;
  /** Base hue (0-360) driving the generated SVG proof thumbnail. */
  readonly creativeHue: number;
  readonly creativeCode: string;
}

export interface Play {
  readonly id: string;
  readonly campaignId: string;
  readonly screenId: string;
  readonly screenName: string;
  /** ISO-8601 timestamp. */
  readonly playedAt: string;
  readonly durationSec: number;
  readonly status: PlayStatus;
  /** Number of people captured by the screen's camera module. */
  readonly footfall: number;
  readonly spotCode: string;
  readonly creativeHue: number;
}

export interface CampaignListFacets {
  readonly cities: readonly string[];
  readonly statuses: readonly CampaignStatus[];
  /** Unfiltered count per status, so the filter chips can show real totals. */
  readonly statusCounts: Readonly<Record<CampaignStatus, number>>;
  readonly totalCampaigns: number;
}

export interface CampaignListResponse {
  readonly items: readonly Campaign[];
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
  readonly totalPages: number;
  readonly facets: CampaignListFacets;
}

export interface PlayStats {
  readonly delivered: number;
  readonly booked: number;
  readonly verified: number;
  readonly flagged: number;
  readonly completion: number;
}

export interface PlaysResponse {
  readonly items: readonly Play[];
  readonly total: number;
  /** Aggregate stats for the (possibly date-filtered) set. */
  readonly stats: PlayStats;
}

export interface FlagPlayResponse {
  readonly playId: string;
  readonly status: PlayStatus;
  readonly flaggedAt: string;
}

export interface ApiErrorBody {
  readonly error: string;
  readonly message: string;
}

/** Filters held in the URL query string. All fields optional strings. */
export interface CampaignListFilters {
  readonly query: string;
  readonly status: CampaignStatus | 'all';
  readonly city: string;
  readonly sort: CampaignSortKey;
  readonly dir: SortDirection;
  readonly page: number;
}
