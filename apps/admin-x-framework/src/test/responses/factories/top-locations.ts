type TopLocationMetaField = { name: 'location' | 'visits'; type: 'String' | 'UInt64' };
type TopLocationDataRow = { location: string; visits: number };
type TopLocationStatistics = {
    elapsed: number;
    rows_read: number;
    bytes_read: number;
};

type TopLocationsResponse = {
    meta: TopLocationMetaField[];
    data: TopLocationDataRow[];
    rows: number;
    rows_before_limit_at_least: number;
    statistics: TopLocationStatistics;
};

export function topLocations(overrides: Partial<TopLocationsResponse> = {}): TopLocationsResponse {
    return {
        meta: [
            {name: 'location', type: 'String'},
            {name: 'visits', type: 'UInt64'}
        ],
        data: [
            {location: 'GB', visits: 3}
        ],
        rows: 1,
        rows_before_limit_at_least: 1,
        statistics: {
            elapsed: 0.5,
            rows_read: 100,
            bytes_read: 10000
        },
        ...overrides
    };
}
