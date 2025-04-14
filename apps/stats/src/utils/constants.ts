export const RANGE_OPTIONS = [
    {name: 'Today', value: 1},
    {name: 'Last 7 days', value: 7},
    {name: 'Last 30 days', value: 30 + 1},
    {name: 'Last 3 months', value: 90 + 1},
    {name: 'Year to date', value: 365 + 1},
    {name: 'Last 12 months', value: 12 * (30 + 1)},
    {name: 'All time', value: 1000}
];

export const DEFAULT_RANGE_KEY = 2;