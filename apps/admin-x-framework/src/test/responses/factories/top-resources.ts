type TopResourceMetaField = { name: 'source' | 'visits'; type: 'String' | 'UInt64' };
type TopResourceDataRow = { source: string; visits: number };
type TopResourceStatistics = {
    elapsed: number;
    rows_read: number;
    bytes_read: number;
};

type TopResourcesResponse = {
    meta: TopResourceMetaField[];
    data: TopResourceDataRow[];
    rows: number;
    rows_before_limit_at_least: number;
    statistics: TopResourceStatistics;
};

export function topResources(overrides: Partial<TopResourcesResponse> = {}): TopResourcesResponse {
    return {
        meta: [
            {name: 'source', type: 'String'},
            {name: 'visits', type: 'UInt64'}
        ],
        data: [
            {source: 'example.com', visits: 2}
        ],
        rows: 1,
        rows_before_limit_at_least: 1,
        statistics: {
            elapsed: 0.019804668,
            rows_read: 151,
            bytes_read: 14625
        },
        ...overrides
    };
}
