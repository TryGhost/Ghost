export const STATS_RANGE_OPTIONS = [
    {name: 'Today', value: 1},
    {name: 'Last 7 days', value: 7},
    {name: 'Last 30 days', value: 30 + 1},
    {name: 'Last 3 months', value: 90 + 1},
    {name: 'Year to date', value: 365 + 1},
    {name: 'Last 12 months', value: 12 * (30 + 1)},
    {name: 'All time', value: 1000}
];

export const STATS_DEFAULT_RANGE_KEY = 2;

export const STATS_LABEL_MAPPINGS = {
    // Countries
    US: 'United States',
    TWN: 'Taiwan',

    // Technical
    'mobile-ios': 'iOS',
    'mobile-android': 'Android',
    macos: 'macOS',

    // Sources
    'google.com': 'Google',
    'ghost.org': 'Ghost',
    'bing.com': 'Bing',
    'bsky.app': 'Bluesky',
    'yahoo.com': 'Yahoo',
    'duckduckgo.com': 'DuckDuckGo'
};

export const STATS_DEFAULT_SOURCE_ICON_URL = 'https://static.ghost.org/v5.0.0/images/globe-icon.svg';
