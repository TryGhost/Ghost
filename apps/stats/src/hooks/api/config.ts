// API endpoint configuration
export const STATS_API_ENDPOINTS = {
    KPI: 'api_kpis',
    TOP_SOURCES: 'api_top_sources',
    TOP_LOCATIONS: 'api_top_locations',
    ACTIVE_VISITORS: 'api_active_visitors'
} as const;

export type StatsApiEndpoint = typeof STATS_API_ENDPOINTS[keyof typeof STATS_API_ENDPOINTS];

// Common query parameter builder
export interface BaseStatsParams {
    site_uuid: string;
    date_from?: string;
    date_to?: string;
    timezone?: string;
    member_status?: string;
}

export interface ActiveVisitorsParams {
    site_uuid: string;
    _refresh?: number;
}

export type StatsQueryParams = BaseStatsParams | ActiveVisitorsParams;